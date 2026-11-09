using System.Net;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using SchoolAdmission.Api.Common;
using SchoolAdmission.Api.Entities;
using Xunit;

namespace SchoolAdmission.Api.Tests;

public sealed class HoldDetailsApiTests
{
    private static readonly DateTime Now = new(2026, 11, 9, 12, 0, 0, DateTimeKind.Utc);

    [Fact]
    public async Task GetById_WithActiveHeldHold_ReturnsExactContract()
    {
        using var factory = new TestApiFactory();
        var holdId = Guid.Parse("faad5df3-fbae-4bfa-9e48-61fc7eff9a6a");
        var classId = Guid.Parse("d17e0a1d-281b-4a71-878b-11f71d146207");
        var expiresAt = Now.AddMinutes(10);
        var service = factory.Services.GetRequiredService<TestSeatHoldService>();
        service.CurrentUtc = Now;
        service.SetHoldDetails(holdId, classId, HoldStatus.Held, expiresAt);
        using var client = factory.CreateClient();

        var response = await client.GetAsync($"/holds/{PublicId.ForHold(holdId)}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStreamAsync());
        var hold = document.RootElement;
        Assert.Equal(
            new[] { "classId", "expiresAt", "holdId", "status" },
            hold.EnumerateObject().Select(property => property.Name).Order());
        Assert.Equal(PublicId.ForHold(holdId), hold.GetProperty("holdId").GetString());
        Assert.Equal(PublicId.ForClass(classId), hold.GetProperty("classId").GetString());
        Assert.Equal("HELD", hold.GetProperty("status").GetString());
        Assert.Equal(expiresAt, hold.GetProperty("expiresAt").GetDateTime());
    }

    [Theory]
    [InlineData(HoldStatus.Expired, -1, "EXPIRED")]
    [InlineData(HoldStatus.Held, -1, "EXPIRED")]
    [InlineData(HoldStatus.Held, 0, "EXPIRED")]
    [InlineData(HoldStatus.Confirmed, -1, "CONFIRMED")]
    [InlineData(HoldStatus.Cancelled, -1, "CANCELLED")]
    public async Task GetById_ReturnsCorrectEffectiveStatus(
        HoldStatus storedStatus,
        int expiryOffsetMinutes,
        string expectedStatus)
    {
        using var factory = new TestApiFactory();
        var holdId = Guid.NewGuid();
        var classId = Guid.NewGuid();
        var expiresAt = Now.AddMinutes(expiryOffsetMinutes);
        var service = factory.Services.GetRequiredService<TestSeatHoldService>();
        service.CurrentUtc = Now;
        service.SetHoldDetails(holdId, classId, storedStatus, expiresAt);
        using var client = factory.CreateClient();

        var response = await client.GetAsync($"/holds/{PublicId.ForHold(holdId)}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStreamAsync());
        Assert.Equal(expectedStatus, document.RootElement.GetProperty("status").GetString());
        Assert.Equal(expiresAt, document.RootElement.GetProperty("expiresAt").GetDateTime());
    }

    [Fact]
    public async Task GetById_WithUnknownValidId_ReturnsNotFound()
    {
        using var factory = new TestApiFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync(
            "/holds/h_00000000000040008000000000000000");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Theory]
    [InlineData("c_faad5df3fbae4bfa9e4861fc7eff9a6a")]
    [InlineData("h_not-a-guid")]
    [InlineData("invalid-id")]
    public async Task GetById_WithMalformedId_ReturnsBadRequest(string holdId)
    {
        using var factory = new TestApiFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync($"/holds/{holdId}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
