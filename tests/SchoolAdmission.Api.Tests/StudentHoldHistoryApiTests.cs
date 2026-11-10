using System.Net;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using SchoolAdmission.Api.Common;
using SchoolAdmission.Api.Entities;
using Xunit;

namespace SchoolAdmission.Api.Tests;

public sealed class StudentHoldHistoryApiTests
{
    private static readonly DateTime Now = new(2026, 11, 9, 12, 0, 0, DateTimeKind.Utc);
    private const string StudentA = "00123456789012345";
    private const string StudentB = "00123456789012346";

    [Fact]
    public async Task GetHolds_WithHistory_ReturnsExactArrayContractAndStudentIsolation()
    {
        using var factory = new TestApiFactory();
        var firstId = Guid.Parse("60e3ee40-7c74-45bc-aedc-507d1262ef5f");
        var classId = Guid.Parse("3589d3ef-5b21-4d27-a3c6-c86bc6bb4095");
        var service = factory.Services.GetRequiredService<TestSeatHoldService>();
        service.CurrentUtc = Now;
        service.SetStudentHolds(
            Hold(firstId, classId, "Class 6", HoldStatus.Held, Now.AddMinutes(5), StudentA, Now),
            Hold(Guid.NewGuid(), Guid.NewGuid(), "Other class", HoldStatus.Held, Now.AddMinutes(5), StudentB, Now.AddMinutes(1)));
        using var client = factory.CreateClient();
        using var request = HistoryRequest(StudentA);

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStreamAsync());
        Assert.Equal(JsonValueKind.Array, document.RootElement.ValueKind);
        var hold = Assert.Single(document.RootElement.EnumerateArray());
        Assert.Equal(
            new[] { "classId", "className", "expiresAt", "holdId", "status" },
            hold.EnumerateObject().Select(property => property.Name).Order());
        Assert.Equal(PublicId.ForHold(firstId), hold.GetProperty("holdId").GetString());
        Assert.Equal(PublicId.ForClass(classId), hold.GetProperty("classId").GetString());
        Assert.Equal("Class 6", hold.GetProperty("className").GetString());
        Assert.Equal("HELD", hold.GetProperty("status").GetString());
        Assert.Equal(DateTimeKind.Utc, hold.GetProperty("expiresAt").GetDateTime().Kind);
        Assert.False(hold.TryGetProperty("studentId", out _));
    }

    [Fact]
    public async Task GetHolds_WithNoHistory_ReturnsEmptyArray()
    {
        using var factory = new TestApiFactory();
        using var client = factory.CreateClient();
        using var request = HistoryRequest(StudentA);

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStreamAsync());
        Assert.Equal(JsonValueKind.Array, document.RootElement.ValueKind);
        Assert.Empty(document.RootElement.EnumerateArray());
    }

    [Theory]
    [InlineData(HoldStatus.Held, -1, "EXPIRED")]
    [InlineData(HoldStatus.Held, 0, "EXPIRED")]
    [InlineData(HoldStatus.Confirmed, -1, "CONFIRMED")]
    [InlineData(HoldStatus.Cancelled, -1, "CANCELLED")]
    [InlineData(HoldStatus.Expired, 1, "EXPIRED")]
    public async Task GetHolds_ReturnsCorrectEffectiveStatus(
        HoldStatus status,
        int expiryOffsetMinutes,
        string expectedStatus)
    {
        using var factory = new TestApiFactory();
        var service = factory.Services.GetRequiredService<TestSeatHoldService>();
        service.CurrentUtc = Now;
        service.SetStudentHolds(Hold(
            Guid.NewGuid(),
            Guid.NewGuid(),
            "Class",
            status,
            Now.AddMinutes(expiryOffsetMinutes),
            StudentA,
            Now));
        using var client = factory.CreateClient();
        using var request = HistoryRequest(StudentA);

        var response = await client.SendAsync(request);

        using var document = JsonDocument.Parse(await response.Content.ReadAsStreamAsync());
        Assert.Equal(expectedStatus, document.RootElement[0].GetProperty("status").GetString());
    }

    [Fact]
    public async Task GetHolds_OrdersNewestFirstThenHoldId()
    {
        using var factory = new TestApiFactory();
        var older = Guid.Parse("00000000-0000-4000-8000-000000000002");
        var tiedHigher = Guid.Parse("00000000-0000-4000-8000-000000000003");
        var tiedLower = Guid.Parse("00000000-0000-4000-8000-000000000001");
        var service = factory.Services.GetRequiredService<TestSeatHoldService>();
        service.CurrentUtc = Now;
        service.SetStudentHolds(
            Hold(older, Guid.NewGuid(), "Older", HoldStatus.Held, Now.AddMinutes(1), StudentA, Now.AddMinutes(-1)),
            Hold(tiedHigher, Guid.NewGuid(), "Higher", HoldStatus.Held, Now.AddMinutes(1), StudentA, Now),
            Hold(tiedLower, Guid.NewGuid(), "Lower", HoldStatus.Held, Now.AddMinutes(1), StudentA, Now));
        using var client = factory.CreateClient();
        using var request = HistoryRequest(StudentA);

        var response = await client.SendAsync(request);

        using var document = JsonDocument.Parse(await response.Content.ReadAsStreamAsync());
        var ids = document.RootElement.EnumerateArray()
            .Select(hold => hold.GetProperty("holdId").GetString()!)
            .ToArray();
        Assert.Equal(
            [PublicId.ForHold(tiedLower), PublicId.ForHold(tiedHigher), PublicId.ForHold(older)],
            ids);
    }

    [Fact]
    public async Task GetHolds_ReturnsSeparateHistoricalRecordsForTheSameClass()
    {
        using var factory = new TestApiFactory();
        var classId = Guid.NewGuid();
        var service = factory.Services.GetRequiredService<TestSeatHoldService>();
        service.CurrentUtc = Now;
        service.SetStudentHolds(
            Hold(Guid.NewGuid(), classId, "Class", HoldStatus.Cancelled, Now.AddMinutes(-1), StudentA, Now),
            Hold(Guid.NewGuid(), classId, "Class", HoldStatus.Expired, Now.AddMinutes(-2), StudentA, Now.AddMinutes(-1)));
        using var client = factory.CreateClient();
        using var request = HistoryRequest(StudentA);

        var response = await client.SendAsync(request);

        using var document = JsonDocument.Parse(await response.Content.ReadAsStreamAsync());
        var holds = document.RootElement.EnumerateArray().ToArray();
        Assert.Equal(2, holds.Length);
        Assert.All(holds, hold => Assert.Equal(
            PublicId.ForClass(classId),
            hold.GetProperty("classId").GetString()));
    }

    [Theory]
    [InlineData("")]
    [InlineData("1234567890123456")]
    [InlineData("123456789012345678")]
    [InlineData("1234567890123456a")]
    [InlineData("١٢٣٤٥٦٧٨٩٠١٢٣٤٥٦٧")]
    public async Task GetHolds_WithInvalidStudentId_ReturnsBadRequest(string studentId)
    {
        using var factory = new TestApiFactory();
        using var client = factory.CreateClient();
        using var request = HistoryRequest(studentId);

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task GetHolds_WithoutStudentId_ReturnsBadRequest()
    {
        using var factory = new TestApiFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/me/holds");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task GetHolds_WithMultipleStudentIdValues_ReturnsBadRequest()
    {
        using var factory = new TestApiFactory();
        using var client = factory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Get, "/me/holds");
        request.Headers.TryAddWithoutValidation("X-Student-Id", [StudentA, StudentB]);

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private static TestSeatHoldService.TestStudentHold Hold(
        Guid holdId,
        Guid classId,
        string className,
        HoldStatus status,
        DateTime expiresAt,
        string studentId,
        DateTime createdAt)
    {
        return new TestSeatHoldService.TestStudentHold(
            holdId,
            classId,
            className,
            status,
            expiresAt,
            studentId,
            createdAt);
    }

    private static HttpRequestMessage HistoryRequest(string studentId)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "/me/holds");
        request.Headers.Add("X-Student-Id", studentId);
        return request;
    }
}
