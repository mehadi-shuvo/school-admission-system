using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SchoolAdmission.Api.Common;
using SchoolAdmission.Api.Data;
using SchoolAdmission.Api.DTOs.Classes;
using SchoolAdmission.Api.DTOs.Holds;
using SchoolAdmission.Api.Entities;
using Xunit;

namespace SchoolAdmission.Api.Tests;

[CollectionDefinition(nameof(PostgreSqlIntegrationCollection), DisableParallelization = true)]
public sealed class PostgreSqlIntegrationCollection;

[Collection(nameof(PostgreSqlIntegrationCollection))]
public sealed class PostgreSqlHoldIntegrationTests :
    IClassFixture<PostgreSqlApiFactory>,
    IAsyncLifetime
{
    private readonly PostgreSqlApiFactory _factory;

    public PostgreSqlHoldIntegrationTests(PostgreSqlApiFactory factory)
    {
        _factory = factory;
    }

    public Task InitializeAsync() => _factory.ResetAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task LastSeat_40ConcurrentStudents_ProducesOneHold()
    {
        using var client = _factory.CreateClient();
        var classId = await CreateClassAsync(client, "Last seat", totalSeats: 1);

        var statuses = await Task.WhenAll(Enumerable.Range(1, 40).Select(index =>
            CreateHoldStatusAsync(client, classId, StudentId(1, index))));

        Assert.Equal(1, statuses.Count(status => status == HttpStatusCode.Created));
        Assert.Equal(39, statuses.Count(status => status == HttpStatusCode.Conflict));
        Assert.DoesNotContain(HttpStatusCode.InternalServerError, statuses);
        Assert.Equal(1, await OccupiedCountAsync(classId));

        var admissionClass = await client.GetFromJsonAsync<ClassAvailabilityResponse>(
            $"/classes/{PublicId.ForClass(classId)}");
        Assert.NotNull(admissionClass);
        Assert.Equal(0, admissionClass.AvailableSeats);
    }

    [Fact]
    public async Task SameStudent_20ConcurrentRequests_ProducesOneActiveHold()
    {
        using var client = _factory.CreateClient();
        var classId = await CreateClassAsync(client, "Same student", totalSeats: 20);
        const string studentId = "20000000000000001";

        var statuses = await Task.WhenAll(Enumerable.Range(1, 20).Select(_ =>
            CreateHoldStatusAsync(client, classId, studentId)));

        Assert.Equal(1, statuses.Count(status => status == HttpStatusCode.Created));
        Assert.Equal(19, statuses.Count(status => status == HttpStatusCode.Conflict));
        Assert.Equal(1, await ActiveStudentHoldCountAsync(classId, studentId));
    }

    [Fact]
    public async Task Confirm_20ConcurrentRequests_IsIdempotent()
    {
        using var client = _factory.CreateClient();
        var classId = await CreateClassAsync(client, "Confirm concurrency", totalSeats: 1);
        const string studentId = "30000000000000001";
        var holdId = await CreateHoldAsync(client, classId, studentId);

        var statuses = await Task.WhenAll(Enumerable.Range(1, 20).Select(_ =>
            ConfirmStatusAsync(client, holdId, studentId)));

        Assert.All(statuses, status => Assert.Equal(HttpStatusCode.OK, status));
        var hold = await GetHoldAsync(holdId);
        Assert.Equal(HoldStatus.Confirmed, hold.Status);
        Assert.NotNull(hold.ConfirmedAt);
        Assert.Equal(1, await HoldRecordCountAsync(classId));
        Assert.Equal(1, await OccupiedCountAsync(classId));
    }

    [Fact]
    public async Task Cancel_20ConcurrentRequests_IsIdempotentAndReleasesSeat()
    {
        using var client = _factory.CreateClient();
        var classId = await CreateClassAsync(client, "Cancel concurrency", totalSeats: 1);
        const string studentId = "40000000000000001";
        var holdId = await CreateHoldAsync(client, classId, studentId);

        var statuses = await Task.WhenAll(Enumerable.Range(1, 20).Select(_ =>
            CancelStatusAsync(client, holdId, studentId)));

        Assert.All(statuses, status => Assert.Equal(HttpStatusCode.NoContent, status));
        var hold = await GetHoldAsync(holdId);
        Assert.Equal(HoldStatus.Cancelled, hold.Status);
        Assert.NotNull(hold.CancelledAt);
        Assert.Equal(0, await OccupiedCountAsync(classId));
    }

    [Fact]
    public async Task CancelAndConfirm_ConcurrentRequests_LeaveOneConsistentFinalState()
    {
        using var client = _factory.CreateClient();
        var classId = await CreateClassAsync(client, "Cancel confirm race", totalSeats: 1);
        const string studentId = "50000000000000001";
        var holdId = await CreateHoldAsync(client, classId, studentId);

        var cancel = CancelStatusAsync(client, holdId, studentId);
        var confirm = ConfirmStatusAsync(client, holdId, studentId);
        var statuses = await Task.WhenAll(cancel, confirm);

        var hold = await GetHoldAsync(holdId);
        Assert.True(hold.Status is HoldStatus.Cancelled or HoldStatus.Confirmed);
        if (hold.Status == HoldStatus.Cancelled)
        {
            Assert.Contains(HttpStatusCode.NoContent, statuses);
            Assert.Contains(HttpStatusCode.Conflict, statuses);
        }
        else
        {
            Assert.Contains(HttpStatusCode.OK, statuses);
            Assert.Contains(HttpStatusCode.Conflict, statuses);
        }
    }

    [Fact]
    public async Task ExpiredHold_CannotChangeAndSeatCanBeReused()
    {
        using var client = _factory.CreateClient();
        var classId = await CreateClassAsync(client, "Expiry reuse", totalSeats: 1);
        const string firstStudentId = "60000000000000001";
        var holdId = await CreateHoldAsync(client, classId, firstStudentId);
        await ExpireHoldAsync(holdId);

        var confirmStatus = await ConfirmStatusAsync(client, holdId, firstStudentId);
        var cancelStatus = await CancelStatusAsync(client, holdId, firstStudentId);
        var newHoldStatus = await CreateHoldStatusAsync(
            client,
            classId,
            "60000000000000002");

        Assert.Equal(HttpStatusCode.Conflict, confirmStatus);
        Assert.Equal(HttpStatusCode.Conflict, cancelStatus);
        Assert.Equal(HttpStatusCode.Created, newHoldStatus);
        Assert.Equal(HoldStatus.Expired, (await GetHoldAsync(holdId)).Status);
        Assert.Equal(2, await HoldRecordCountAsync(classId));
        Assert.Equal(1, await OccupiedCountAsync(classId));
    }

    [Fact]
    public async Task OccupancyAccounting_RemainsConsistentAcrossLifecycleChanges()
    {
        using var client = _factory.CreateClient();
        var classId = await CreateClassAsync(client, "Occupancy accounting", totalSeats: 2);
        const string firstStudentId = "70000000000000001";
        const string secondStudentId = "70000000000000002";
        var firstHoldId = await CreateHoldAsync(client, classId, firstStudentId);
        var secondHoldId = await CreateHoldAsync(client, classId, secondStudentId);

        await AssertAvailabilityAsync(client, classId, held: 2, confirmed: 0, available: 0);
        Assert.Equal(HttpStatusCode.OK, await ConfirmStatusAsync(client, firstHoldId, firstStudentId));
        await AssertAvailabilityAsync(client, classId, held: 1, confirmed: 1, available: 0);
        Assert.Equal(HttpStatusCode.NoContent, await CancelStatusAsync(client, secondHoldId, secondStudentId));
        await AssertAvailabilityAsync(client, classId, held: 0, confirmed: 1, available: 1);
    }

    private static string StudentId(int group, int sequence)
    {
        return $"{group:D1}{sequence:D16}";
    }

    private static async Task<Guid> CreateClassAsync(
        HttpClient client,
        string name,
        int totalSeats)
    {
        var response = await client.PostAsJsonAsync("/classes", new
        {
            name,
            totalSeats
        });
        response.EnsureSuccessStatusCode();
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
        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            $"/classes/{PublicId.ForClass(classId)}/holds");
        request.Headers.Add("X-Student-Id", studentId);
        var response = await client.SendAsync(request);
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<HoldResponse>();
        Assert.NotNull(body);
        Assert.True(PublicId.TryParseHoldId(body.HoldId, out var holdId));
        return holdId;
    }

    private static async Task<HttpStatusCode> CreateHoldStatusAsync(
        HttpClient client,
        Guid classId,
        string studentId)
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            $"/classes/{PublicId.ForClass(classId)}/holds");
        request.Headers.Add("X-Student-Id", studentId);
        using var response = await client.SendAsync(request);
        return response.StatusCode;
    }

    private static async Task<HttpStatusCode> ConfirmStatusAsync(
        HttpClient client,
        Guid holdId,
        string studentId)
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            $"/holds/{PublicId.ForHold(holdId)}/confirm");
        request.Headers.Add("X-Student-Id", studentId);
        using var response = await client.SendAsync(request);
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

    private async Task<SeatHold> GetHoldAsync(Guid holdId)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AdmissionDbContext>();
        return await dbContext.SeatHolds.SingleAsync(hold => hold.Id == holdId);
    }

    private async Task<int> OccupiedCountAsync(Guid classId)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AdmissionDbContext>();
        var now = DateTime.UtcNow;
        return await dbContext.SeatHolds.CountAsync(hold =>
            hold.ClassId == classId &&
            (hold.Status == HoldStatus.Confirmed ||
                (hold.Status == HoldStatus.Held && hold.ExpiresAt > now)));
    }

    private async Task<int> ActiveStudentHoldCountAsync(Guid classId, string studentId)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AdmissionDbContext>();
        return await dbContext.SeatHolds.CountAsync(hold =>
            hold.ClassId == classId &&
            hold.StudentId == studentId &&
            (hold.Status == HoldStatus.Held || hold.Status == HoldStatus.Confirmed));
    }

    private async Task<int> HoldRecordCountAsync(Guid classId)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AdmissionDbContext>();
        return await dbContext.SeatHolds.CountAsync(hold => hold.ClassId == classId);
    }

    private async Task ExpireHoldAsync(Guid holdId)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AdmissionDbContext>();
        var hold = await dbContext.SeatHolds.SingleAsync(entity => entity.Id == holdId);
        hold.CreatedAt = DateTime.UtcNow.AddMinutes(-2);
        hold.ExpiresAt = DateTime.UtcNow.AddMinutes(-1);
        await dbContext.SaveChangesAsync();
    }

    private static async Task AssertAvailabilityAsync(
        HttpClient client,
        Guid classId,
        int held,
        int confirmed,
        int available)
    {
        var admissionClass = await client.GetFromJsonAsync<ClassAvailabilityResponse>(
            $"/classes/{PublicId.ForClass(classId)}");
        Assert.NotNull(admissionClass);
        Assert.Equal(held, admissionClass.HeldSeats);
        Assert.Equal(confirmed, admissionClass.ConfirmedSeats);
        Assert.Equal(available, admissionClass.AvailableSeats);
        Assert.Equal(
            admissionClass.TotalSeats,
            admissionClass.HeldSeats +
            admissionClass.ConfirmedSeats +
            admissionClass.AvailableSeats);
    }
}
