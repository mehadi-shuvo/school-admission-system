using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Api.Common;
using SchoolAdmission.Api.Data;
using SchoolAdmission.Api.DTOs.Classes;
using SchoolAdmission.Api.DTOs.Holds;
using SchoolAdmission.Api.Entities;
using Xunit;

namespace SchoolAdmission.Api.Tests;

public sealed class BonusMultiProcessTests
{
    private static readonly Uri BackendA = GetRequiredUri("BONUS_BACKEND_A_URL");
    private static readonly Uri BackendB = GetRequiredUri("BONUS_BACKEND_B_URL");
    private static readonly string DatabaseConnection = GetRequiredSetting(
        "BONUS_DATABASE_CONNECTION");

    [BonusEnvironmentFact(DisplayName = "Bonus - Last Seat Race")]
    public async Task LastSeatRace_40StudentsAcrossTwoBackends_ProducesOneHold()
    {
        using var backendA = new HttpClient { BaseAddress = BackendA };
        using var backendB = new HttpClient { BaseAddress = BackendB };
        await WaitForBackendsAsync(backendA, backendB);

        var classId = await CreateClassAsync(backendA, totalSeats: 1);
        var requests = Enumerable.Range(1, 40)
            .Select(index => (Client: index <= 20 ? backendA : backendB, StudentId: StudentId(1, index)))
            .ToList();

        var statuses = await SendAtOnceAsync(requests, (request, cancellationToken) =>
            CreateHoldStatusAsync(request.Client, classId, request.StudentId, cancellationToken));

        Assert.Equal(1, statuses.Count(status => status == HttpStatusCode.Created));
        Assert.Equal(39, statuses.Count(status => status == HttpStatusCode.Conflict));
        Assert.DoesNotContain(statuses, status => (int)status >= 500);

        var fromA = await GetAvailabilityAsync(backendA, classId);
        var fromB = await GetAvailabilityAsync(backendB, classId);
        Assert.Equal(fromA, fromB);
        Assert.Equal(1, fromA.HeldSeats);
        Assert.Equal(0, fromA.ConfirmedSeats);
        Assert.Equal(0, fromA.AvailableSeats);

        var occupancy = await GetOccupancyAsync(classId);
        Assert.Equal(1, occupancy.Held);
        Assert.Equal(0, occupancy.Confirmed);
        Assert.True(occupancy.Held + occupancy.Confirmed <= 1);
    }

    [BonusEnvironmentFact(DisplayName = "Bonus - Same Student Cross-Process Race")]
    public async Task SameStudentRace_20RequestsAcrossTwoBackends_ProducesOneActiveHold()
    {
        using var backendA = new HttpClient { BaseAddress = BackendA };
        using var backendB = new HttpClient { BaseAddress = BackendB };
        await WaitForBackendsAsync(backendA, backendB);

        var classId = await CreateClassAsync(backendA, totalSeats: 20);
        const string studentId = "81000000000000001";
        var requests = Enumerable.Range(1, 20)
            .Select(index => (Client: index <= 10 ? backendA : backendB, StudentId: studentId))
            .ToList();

        var statuses = await SendAtOnceAsync(requests, (request, cancellationToken) =>
            CreateHoldStatusAsync(request.Client, classId, request.StudentId, cancellationToken));

        Assert.Equal(1, statuses.Count(status => status == HttpStatusCode.Created));
        Assert.Equal(19, statuses.Count(status => status == HttpStatusCode.Conflict));
        Assert.DoesNotContain(statuses, status => (int)status >= 500);

        var activeHolds = await GetActiveStudentHoldCountAsync(classId, studentId);
        Assert.Equal(1, activeHolds);
        Assert.True(activeHolds <= 1);
        Assert.Equal(await GetAvailabilityAsync(backendA, classId), await GetAvailabilityAsync(backendB, classId));
    }

    [BonusEnvironmentFact(DisplayName = "Bonus - Cross-Process Confirmation")]
    public async Task ConfirmationAcrossBackends_IsIdempotentAndPreservesCapacity()
    {
        using var backendA = new HttpClient { BaseAddress = BackendA };
        using var backendB = new HttpClient { BaseAddress = BackendB };
        await WaitForBackendsAsync(backendA, backendB);

        var classId = await CreateClassAsync(backendA, totalSeats: 1);
        const string studentId = "82000000000000001";
        var holdId = await CreateHoldAsync(backendA, classId, studentId);

        Assert.Equal(HttpStatusCode.OK, await ConfirmStatusAsync(backendB, holdId, studentId));

        var clients = Enumerable.Range(1, 20)
            .Select(index => index <= 10 ? backendA : backendB)
            .ToList();
        var statuses = await SendAtOnceAsync(clients, (client, cancellationToken) =>
            ConfirmStatusAsync(client, holdId, studentId, cancellationToken));

        Assert.All(statuses, status => Assert.Equal(HttpStatusCode.OK, status));
        Assert.Equal(HoldStatus.Confirmed, await GetHoldStatusAsync(holdId));

        var fromA = await GetAvailabilityAsync(backendA, classId);
        var fromB = await GetAvailabilityAsync(backendB, classId);
        Assert.Equal(fromA, fromB);
        Assert.Equal(0, fromA.HeldSeats);
        Assert.Equal(1, fromA.ConfirmedSeats);
        Assert.Equal(0, fromA.AvailableSeats);

        var occupancy = await GetOccupancyAsync(classId);
        Assert.Equal(0, occupancy.Held);
        Assert.Equal(1, occupancy.Confirmed);
        Assert.True(occupancy.Held + occupancy.Confirmed <= 1);
    }

    [BonusEnvironmentFact(DisplayName = "Bonus - Cross-Process Confirm Cancel Race")]
    public async Task ConfirmCancelRaceAcrossBackends_LeavesOneValidFinalState()
    {
        using var backendA = new HttpClient { BaseAddress = BackendA };
        using var backendB = new HttpClient { BaseAddress = BackendB };
        await WaitForBackendsAsync(backendA, backendB);

        var classId = await CreateClassAsync(backendA, totalSeats: 1);
        const string studentId = "83000000000000001";
        var holdId = await CreateHoldAsync(backendA, classId, studentId);

        using var start = new Barrier(2);
        var confirm = RunAtBarrierAsync(start, () => ConfirmStatusAsync(backendA, holdId, studentId));
        var cancel = RunAtBarrierAsync(start, () => CancelStatusAsync(backendB, holdId, studentId));
        var statuses = await Task.WhenAll(confirm, cancel);

        var finalStatus = await GetHoldStatusAsync(holdId);
        Assert.True(finalStatus is HoldStatus.Confirmed or HoldStatus.Cancelled);
        if (finalStatus == HoldStatus.Confirmed)
        {
            Assert.Contains(HttpStatusCode.OK, statuses);
            Assert.Contains(HttpStatusCode.Conflict, statuses);
        }
        else
        {
            Assert.Contains(HttpStatusCode.NoContent, statuses);
            Assert.Contains(HttpStatusCode.Conflict, statuses);
        }

        Assert.Equal(await GetAvailabilityAsync(backendA, classId), await GetAvailabilityAsync(backendB, classId));
        var occupancy = await GetOccupancyAsync(classId);
        Assert.True(occupancy.Held + occupancy.Confirmed <= 1);
    }

    [BonusEnvironmentFact(DisplayName = "Bonus - Autonomous Expiry and Reuse")]
    public async Task AutonomousExpiry_ReleasesSeatWithoutAnHttpTrigger()
    {
        using var backendA = new HttpClient { BaseAddress = BackendA };
        using var backendB = new HttpClient { BaseAddress = BackendB };
        await WaitForBackendsAsync(backendA, backendB);

        var classId = await CreateClassAsync(backendA, totalSeats: 1);
        const string firstStudentId = "84000000000000001";
        const string secondStudentId = "84000000000000002";
        var holdId = await CreateHoldAsync(backendA, classId, firstStudentId);

        await WaitForPersistedExpiryAsync(holdId);
        Assert.Equal(HoldStatus.Expired, await GetHoldStatusAsync(holdId));

        Assert.Equal(
            HttpStatusCode.Created,
            await CreateHoldStatusAsync(backendB, classId, secondStudentId));
        Assert.Equal(
            HttpStatusCode.Conflict,
            await ConfirmStatusAsync(backendA, holdId, firstStudentId));

        var occupancy = await GetOccupancyAsync(classId);
        Assert.Equal(1, occupancy.Held);
        Assert.Equal(0, occupancy.Confirmed);
        Assert.True(occupancy.Held + occupancy.Confirmed <= 1);
    }

    private static async Task<HttpStatusCode> RunAtBarrierAsync(
        Barrier barrier,
        Func<Task<HttpStatusCode>> action)
    {
        await Task.Run(() => barrier.SignalAndWait(TimeSpan.FromSeconds(10)));
        return await action();
    }

    private static async Task<IReadOnlyList<HttpStatusCode>> SendAtOnceAsync<T>(
        IReadOnlyList<T> requests,
        Func<T, CancellationToken, Task<HttpStatusCode>> send)
    {
        using var ready = new CountdownEvent(requests.Count);
        var start = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        using var cancellation = new CancellationTokenSource(TimeSpan.FromSeconds(30));

        var tasks = requests.Select(async request =>
        {
            ready.Signal();
            await start.Task.WaitAsync(cancellation.Token);
            return await send(request, cancellation.Token);
        }).ToArray();

        Assert.True(ready.Wait(TimeSpan.FromSeconds(10)), "Concurrent request barrier was not reached.");
        start.SetResult();
        return await Task.WhenAll(tasks);
    }

    private static async Task WaitForBackendsAsync(params HttpClient[] clients)
    {
        var deadline = DateTime.UtcNow.AddSeconds(45);
        while (DateTime.UtcNow < deadline)
        {
            try
            {
                var responses = await Task.WhenAll(clients.Select(client => client.GetAsync("/health")));
                if (responses.All(response => response.StatusCode == HttpStatusCode.OK))
                {
                    foreach (var response in responses)
                    {
                        response.Dispose();
                    }

                    return;
                }

                foreach (var response in responses)
                {
                    response.Dispose();
                }
            }
            catch (HttpRequestException)
            {
                // The containers are still starting.
            }

            await Task.Delay(TimeSpan.FromMilliseconds(250));
        }

        throw new TimeoutException("Both bonus backend containers did not become healthy.");
    }

    private static async Task<Guid> CreateClassAsync(HttpClient client, int totalSeats)
    {
        using var response = await client.PostAsJsonAsync("/classes", new
        {
            name = $"Bonus class {Guid.NewGuid():N}",
            totalSeats
        });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ClassResponse>();
        Assert.NotNull(body);
        Assert.True(PublicId.TryParseClassId(body.Id, out var classId));
        return classId;
    }

    private static async Task<Guid> CreateHoldAsync(
        HttpClient client,
        Guid classId,
        string studentId)
    {
        using var request = CreateHoldRequest(classId, studentId);
        using var response = await client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<HoldResponse>();
        Assert.NotNull(body);
        Assert.True(PublicId.TryParseHoldId(body.HoldId, out var holdId));
        return holdId;
    }

    private static async Task<HttpStatusCode> CreateHoldStatusAsync(
        HttpClient client,
        Guid classId,
        string studentId,
        CancellationToken cancellationToken = default)
    {
        using var request = CreateHoldRequest(classId, studentId);
        using var response = await client.SendAsync(request, cancellationToken);
        return response.StatusCode;
    }

    private static HttpRequestMessage CreateHoldRequest(Guid classId, string studentId)
    {
        var request = new HttpRequestMessage(
            HttpMethod.Post,
            $"/classes/{PublicId.ForClass(classId)}/holds");
        request.Headers.Add("X-Student-Id", studentId);
        return request;
    }

    private static async Task<HttpStatusCode> ConfirmStatusAsync(
        HttpClient client,
        Guid holdId,
        string studentId,
        CancellationToken cancellationToken = default)
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            $"/holds/{PublicId.ForHold(holdId)}/confirm");
        request.Headers.Add("X-Student-Id", studentId);
        using var response = await client.SendAsync(request, cancellationToken);
        return response.StatusCode;
    }

    private static async Task<HttpStatusCode> CancelStatusAsync(
        HttpClient client,
        Guid holdId,
        string studentId)
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Delete,
            $"/holds/{PublicId.ForHold(holdId)}");
        request.Headers.Add("X-Student-Id", studentId);
        using var response = await client.SendAsync(request);
        return response.StatusCode;
    }

    private static async Task<ClassAvailabilityResponse> GetAvailabilityAsync(
        HttpClient client,
        Guid classId)
    {
        var response = await client.GetFromJsonAsync<ClassAvailabilityResponse>(
            $"/classes/{PublicId.ForClass(classId)}");
        return Assert.IsType<ClassAvailabilityResponse>(response);
    }

    private static async Task<HoldStatus> GetHoldStatusAsync(Guid holdId)
    {
        await using var dbContext = CreateDbContext();
        return await dbContext.SeatHolds
            .Where(hold => hold.Id == holdId)
            .Select(hold => hold.Status)
            .SingleAsync();
    }

    private static async Task<int> GetActiveStudentHoldCountAsync(Guid classId, string studentId)
    {
        await using var dbContext = CreateDbContext();
        return await dbContext.SeatHolds.CountAsync(hold =>
            hold.ClassId == classId &&
            hold.StudentId == studentId &&
            (hold.Status == HoldStatus.Held || hold.Status == HoldStatus.Confirmed));
    }

    private static async Task<(int Held, int Confirmed)> GetOccupancyAsync(Guid classId)
    {
        await using var dbContext = CreateDbContext();
        var now = DateTime.UtcNow;
        var holds = await dbContext.SeatHolds
            .Where(hold => hold.ClassId == classId)
            .Select(hold => new { hold.Status, hold.ExpiresAt })
            .ToListAsync();
        return (
            holds.Count(hold => hold.Status == HoldStatus.Held && hold.ExpiresAt > now),
            holds.Count(hold => hold.Status == HoldStatus.Confirmed));
    }

    private static async Task WaitForPersistedExpiryAsync(Guid holdId)
    {
        var deadline = DateTime.UtcNow.AddSeconds(30);
        while (DateTime.UtcNow < deadline)
        {
            if (await GetHoldStatusAsync(holdId) == HoldStatus.Expired)
            {
                return;
            }

            await Task.Delay(TimeSpan.FromMilliseconds(250));
        }

        throw new TimeoutException("The expiry worker did not persist an expired hold.");
    }

    private static AdmissionDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AdmissionDbContext>()
            .UseNpgsql(DatabaseConnection)
            .Options;
        return new AdmissionDbContext(options);
    }

    private static string StudentId(int group, int sequence) => $"{group:D1}{sequence:D16}";

    private static Uri GetRequiredUri(string name) => new(GetRequiredSetting(name));

    private static string GetRequiredSetting(string name) =>
        Environment.GetEnvironmentVariable(name) ??
        throw new InvalidOperationException($"{name} must be configured for bonus verification.");
}

public sealed class BonusEnvironmentFactAttribute : FactAttribute
{
    public BonusEnvironmentFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("BONUS_BACKEND_A_URL")) ||
            string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("BONUS_BACKEND_B_URL")) ||
            string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("BONUS_DATABASE_CONNECTION")))
        {
            Skip = "Requires the isolated docker-compose.bonus.yml environment.";
        }
    }
}
