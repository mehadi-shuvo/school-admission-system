using System.Net;
using Microsoft.Extensions.DependencyInjection;
using SchoolAdmission.Api.Common;
using SchoolAdmission.Api.Entities;
using Xunit;

namespace SchoolAdmission.Api.Tests;

public sealed class HoldCancellationApiTests
{
    private static readonly DateTime Now = new(2026, 11, 9, 12, 0, 0, DateTimeKind.Utc);
    private const string OwnerId = "00123456789012345";

    [Fact]
    public async Task Cancel_WithActiveOwnedHold_ReturnsNoContentAndTransitionsOnce()
    {
        using var factory = new TestApiFactory();
        var holdId = Guid.NewGuid();
        var service = SetHold(factory, holdId, HoldStatus.Held, Now.AddMinutes(1));
        using var client = factory.CreateClient();
        using var request = CancelRequest(holdId, OwnerId);

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Empty(await response.Content.ReadAsByteArrayAsync());
        Assert.Equal(1, service.CancellationTransitions);
        var detail = await service.GetByIdAsync(holdId, CancellationToken.None);
        Assert.NotNull(detail);
        Assert.Equal("CANCELLED", detail.Status);
    }

    [Fact]
    public async Task Cancel_RepeatedRequestIsIdempotentAndPreservesCancelledAt()
    {
        using var factory = new TestApiFactory();
        var holdId = Guid.NewGuid();
        var service = SetHold(factory, holdId, HoldStatus.Held, Now.AddMinutes(1));
        using var client = factory.CreateClient();

        using var firstRequest = CancelRequest(holdId, OwnerId);
        using var secondRequest = CancelRequest(holdId, OwnerId);
        var first = await client.SendAsync(firstRequest);
        var cancelledAt = service.GetCancelledAt(holdId);
        service.CurrentUtc = Now.AddMinutes(1);
        var second = await client.SendAsync(secondRequest);

        Assert.Equal(HttpStatusCode.NoContent, first.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, second.StatusCode);
        Assert.Equal(1, service.CancellationTransitions);
        Assert.Equal(cancelledAt, service.GetCancelledAt(holdId));
    }

    [Theory]
    [InlineData(HoldStatus.Held, -1)]
    [InlineData(HoldStatus.Held, 0)]
    [InlineData(HoldStatus.Expired, 1)]
    [InlineData(HoldStatus.Confirmed, 1)]
    public async Task Cancel_WhenHoldCannotBeCancelled_ReturnsConflict(
        HoldStatus status,
        int expiryOffsetMinutes)
    {
        using var factory = new TestApiFactory();
        var holdId = Guid.NewGuid();
        SetHold(factory, holdId, status, Now.AddMinutes(expiryOffsetMinutes));
        using var client = factory.CreateClient();
        using var request = CancelRequest(holdId, OwnerId);

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Cancel_WhenOwnerDoesNotMatch_ReturnsForbidden()
    {
        using var factory = new TestApiFactory();
        var holdId = Guid.NewGuid();
        SetHold(factory, holdId, HoldStatus.Held, Now.AddMinutes(1));
        using var client = factory.CreateClient();
        using var request = CancelRequest(holdId, "00123456789012346");

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Cancel_WithUnknownHold_ReturnsNotFound()
    {
        using var factory = new TestApiFactory();
        using var client = factory.CreateClient();
        using var request = CancelRequest(Guid.NewGuid(), OwnerId);

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Theory]
    [InlineData("c_9e3aaf4aed6643f2a40e22ce1d0d42f4")]
    [InlineData("h_not-a-guid")]
    [InlineData("invalid-id")]
    public async Task Cancel_WithMalformedId_ReturnsBadRequest(string holdId)
    {
        using var factory = new TestApiFactory();
        using var client = factory.CreateClient();
        using var request = CancelRequest(holdId, OwnerId);

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Theory]
    [InlineData("")]
    [InlineData("1234567890123456")]
    [InlineData("123456789012345678")]
    [InlineData("1234567890123456a")]
    public async Task Cancel_WithInvalidStudentId_ReturnsBadRequest(string studentId)
    {
        using var factory = new TestApiFactory();
        using var client = factory.CreateClient();
        using var request = CancelRequest(Guid.NewGuid(), studentId);

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Cancel_WithoutStudentId_ReturnsBadRequest()
    {
        using var factory = new TestApiFactory();
        using var client = factory.CreateClient();

        var response = await client.DeleteAsync($"/holds/{PublicId.ForHold(Guid.NewGuid())}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Cancel_WithMultipleStudentIdValues_ReturnsBadRequest()
    {
        using var factory = new TestApiFactory();
        using var client = factory.CreateClient();
        using var request = new HttpRequestMessage(
            HttpMethod.Delete,
            $"/holds/{PublicId.ForHold(Guid.NewGuid())}");
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

    private static HttpRequestMessage CancelRequest(Guid holdId, string studentId)
    {
        return CancelRequest(PublicId.ForHold(holdId), studentId);
    }

    private static HttpRequestMessage CancelRequest(string holdId, string studentId)
    {
        var request = new HttpRequestMessage(HttpMethod.Delete, $"/holds/{holdId}");
        request.Headers.Add("X-Student-Id", studentId);
        return request;
    }
}
