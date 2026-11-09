using System.Net;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using SchoolAdmission.Api.Common;
using SchoolAdmission.Api.Entities;
using Xunit;

namespace SchoolAdmission.Api.Tests;

public sealed class HoldConfirmationApiTests
{
    private static readonly DateTime Now = new(2026, 11, 9, 12, 0, 0, DateTimeKind.Utc);
    private const string OwnerId = "00123456789012345";

    [Fact]
    public async Task Confirm_WithActiveOwnedHold_ReturnsExactConfirmedContract()
    {
        using var factory = new TestApiFactory();
        var holdId = Guid.Parse("9e3aaf4a-ed66-43f2-a40e-22ce1d0d42f4");
        var service = SetHold(factory, holdId, HoldStatus.Held, Now.AddMinutes(1));
        using var client = factory.CreateClient();
        using var request = ConfirmRequest(holdId, OwnerId);

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStreamAsync());
        var confirmed = document.RootElement;
        Assert.Equal(
            new[] { "holdId", "status" },
            confirmed.EnumerateObject().Select(property => property.Name).Order());
        Assert.Equal(PublicId.ForHold(holdId), confirmed.GetProperty("holdId").GetString());
        Assert.Equal("CONFIRMED", confirmed.GetProperty("status").GetString());
        Assert.Equal(1, service.ConfirmationTransitions);
    }

    [Fact]
    public async Task Confirm_RepeatedRequestIsIdempotent()
    {
        using var factory = new TestApiFactory();
        var holdId = Guid.NewGuid();
        var expiresAt = Now.AddMinutes(1);
        var service = SetHold(factory, holdId, HoldStatus.Held, expiresAt);
        using var client = factory.CreateClient();

        using var firstRequest = ConfirmRequest(holdId, OwnerId);
        using var secondRequest = ConfirmRequest(holdId, OwnerId);
        var first = await client.SendAsync(firstRequest);
        var second = await client.SendAsync(secondRequest);

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        Assert.Equal(1, service.ConfirmationTransitions);
        var detail = await service.GetByIdAsync(holdId, CancellationToken.None);
        Assert.NotNull(detail);
        Assert.Equal("CONFIRMED", detail.Status);
        Assert.Equal(expiresAt, detail.ExpiresAt);
    }

    [Theory]
    [InlineData(HoldStatus.Held, -1)]
    [InlineData(HoldStatus.Held, 0)]
    [InlineData(HoldStatus.Expired, 1)]
    [InlineData(HoldStatus.Cancelled, 1)]
    public async Task Confirm_WhenHoldCannotBeConfirmed_ReturnsConflict(
        HoldStatus status,
        int expiryOffsetMinutes)
    {
        using var factory = new TestApiFactory();
        var holdId = Guid.NewGuid();
        SetHold(factory, holdId, status, Now.AddMinutes(expiryOffsetMinutes));
        using var client = factory.CreateClient();
        using var request = ConfirmRequest(holdId, OwnerId);

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Confirm_WhenOwnerDoesNotMatch_ReturnsForbidden()
    {
        using var factory = new TestApiFactory();
        var holdId = Guid.NewGuid();
        SetHold(factory, holdId, HoldStatus.Held, Now.AddMinutes(1));
        using var client = factory.CreateClient();
        using var request = ConfirmRequest(holdId, "00123456789012346");

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Confirm_WithUnknownHold_ReturnsNotFound()
    {
        using var factory = new TestApiFactory();
        using var client = factory.CreateClient();
        using var request = ConfirmRequest(Guid.NewGuid(), OwnerId);

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Theory]
    [InlineData("c_9e3aaf4aed6643f2a40e22ce1d0d42f4")]
    [InlineData("h_not-a-guid")]
    [InlineData("invalid-id")]
    public async Task Confirm_WithMalformedId_ReturnsBadRequest(string holdId)
    {
        using var factory = new TestApiFactory();
        using var client = factory.CreateClient();
        using var request = ConfirmRequest(holdId, OwnerId);

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Theory]
    [InlineData("")]
    [InlineData("1234567890123456")]
    [InlineData("123456789012345678")]
    [InlineData("1234567890123456a")]
    public async Task Confirm_WithInvalidStudentId_ReturnsBadRequest(string studentId)
    {
        using var factory = new TestApiFactory();
        using var client = factory.CreateClient();
        using var request = ConfirmRequest(Guid.NewGuid(), studentId);

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Confirm_WithoutStudentId_ReturnsBadRequest()
    {
        using var factory = new TestApiFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsync($"/holds/{PublicId.ForHold(Guid.NewGuid())}/confirm", null);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Confirm_WithMultipleStudentIdValues_ReturnsBadRequest()
    {
        using var factory = new TestApiFactory();
        using var client = factory.CreateClient();
        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            $"/holds/{PublicId.ForHold(Guid.NewGuid())}/confirm");
        request.Headers.TryAddWithoutValidation(
            "X-Student-Id",
            [OwnerId, "00123456789012346"]);

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private static TestSeatHoldService SetHold(
        TestApiFactory factory,
        Guid holdId,
        HoldStatus status,
        DateTime expiresAt)
    {
        var service = factory.Services.GetRequiredService<TestSeatHoldService>();
        service.CurrentUtc = Now;
        service.SetHoldDetails(holdId, Guid.NewGuid(), status, expiresAt, OwnerId);
        return service;
    }

    private static HttpRequestMessage ConfirmRequest(Guid holdId, string studentId)
    {
        return ConfirmRequest(PublicId.ForHold(holdId), studentId);
    }

    private static HttpRequestMessage ConfirmRequest(string holdId, string studentId)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, $"/holds/{holdId}/confirm");
        request.Headers.Add("X-Student-Id", studentId);
        return request;
    }
}
