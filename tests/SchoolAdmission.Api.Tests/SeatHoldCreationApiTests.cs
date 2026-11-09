using System.Net;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using SchoolAdmission.Api.Common;
using Xunit;

namespace SchoolAdmission.Api.Tests;

public sealed class SeatHoldCreationApiTests
{
    [Fact]
    public async Task CreateHold_WithValidStudentId_ReturnsExactCreatedContract()
    {
        using var factory = new TestApiFactory();
        var classId = Guid.Parse("9f58e4ea-060f-4d49-983b-3c400b0ffdc8");
        var service = factory.Services.GetRequiredService<TestSeatHoldService>();
        service.SetKnownClasses(classId);
        using var client = factory.CreateClient();
        using var request = HoldRequest(PublicId.ForClass(classId), "00123456789012345");

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStreamAsync());
        var hold = document.RootElement;
        Assert.Equal(
            new[] { "classId", "expiresAt", "holdId", "status", "studentId" },
            hold.EnumerateObject().Select(property => property.Name).Order());
        Assert.Equal(PublicId.ForClass(classId), hold.GetProperty("classId").GetString());
        Assert.Equal("00123456789012345", hold.GetProperty("studentId").GetString());
        Assert.Equal("HELD", hold.GetProperty("status").GetString());
        Assert.StartsWith("h_", hold.GetProperty("holdId").GetString());
        Assert.Equal(DateTimeKind.Utc, hold.GetProperty("expiresAt").GetDateTime().Kind);
    }

    [Theory]
    [InlineData("")]
    [InlineData("1234567890123456")]
    [InlineData("123456789012345678")]
    [InlineData("1234567890123456x")]
    [InlineData("1234567890123456-")]
    public async Task CreateHold_WithInvalidStudentId_ReturnsBadRequest(string studentId)
    {
        using var factory = new TestApiFactory();
        using var client = factory.CreateClient();
        using var request = HoldRequest("c_9f58e4ea060f4d49983b3c400b0ffdc8", studentId);

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateHold_WithMissingStudentId_ReturnsBadRequest()
    {
        using var factory = new TestApiFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsync(
            "/classes/c_9f58e4ea060f4d49983b3c400b0ffdc8/holds",
            content: null);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateHold_WithMultipleStudentIdValues_ReturnsBadRequest()
    {
        using var factory = new TestApiFactory();
        using var client = factory.CreateClient();
        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            "/classes/c_9f58e4ea060f4d49983b3c400b0ffdc8/holds");
        request.Headers.TryAddWithoutValidation(
            "X-Student-Id",
            ["00123456789012345", "00123456789012346"]);

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Theory]
    [InlineData("h_9f58e4ea060f4d49983b3c400b0ffdc8")]
    [InlineData("c_not-a-guid")]
    [InlineData("not-a-public-id")]
    public async Task CreateHold_WithMalformedClassId_ReturnsBadRequest(string classId)
    {
        using var factory = new TestApiFactory();
        using var client = factory.CreateClient();
        using var request = HoldRequest(classId, "00123456789012345");

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateHold_WithUnknownClass_ReturnsNotFound()
    {
        using var factory = new TestApiFactory();
        using var client = factory.CreateClient();
        using var request = HoldRequest(
            "c_9f58e4ea060f4d49983b3c400b0ffdc8",
            "00123456789012345");

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task CreateHold_ForFullClass_ReturnsConflict()
    {
        using var factory = new TestApiFactory();
        var classId = Guid.Parse("d74952fe-a60b-47a1-9a6e-f2f5b350ea8c");
        var service = factory.Services.GetRequiredService<TestSeatHoldService>();
        service.SetKnownClasses(classId);
        service.SetFullClasses(classId);
        using var client = factory.CreateClient();
        using var request = HoldRequest(PublicId.ForClass(classId), "00123456789012345");

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task CreateHold_ForDuplicateStudent_ReturnsConflict()
    {
        using var factory = new TestApiFactory();
        var classId = Guid.Parse("10c8d835-8d08-4e4b-a17a-a8be5f5577ac");
        factory.Services.GetRequiredService<TestSeatHoldService>().SetKnownClasses(classId);
        using var client = factory.CreateClient();

        using var firstRequest = HoldRequest(PublicId.ForClass(classId), "00123456789012345");
        using var secondRequest = HoldRequest(PublicId.ForClass(classId), "00123456789012345");
        var first = await client.SendAsync(firstRequest);
        var second = await client.SendAsync(secondRequest);

        Assert.Equal(HttpStatusCode.Created, first.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
    }

    [Fact]
    public async Task CreateHold_UsesConfiguredDuration()
    {
        using var factory = new TestApiFactory();
        var classId = Guid.Parse("a00e5ef5-2091-4eef-9c34-3121b74c3c0e");
        var service = factory.Services.GetRequiredService<TestSeatHoldService>();
        service.SetKnownClasses(classId);
        service.HoldDuration = TimeSpan.FromSeconds(45);
        var before = DateTime.UtcNow;
        using var client = factory.CreateClient();
        using var request = HoldRequest(PublicId.ForClass(classId), "00123456789012345");

        var response = await client.SendAsync(request);

        using var document = JsonDocument.Parse(await response.Content.ReadAsStreamAsync());
        var expiresAt = document.RootElement.GetProperty("expiresAt").GetDateTime();
        Assert.InRange(expiresAt, before.AddSeconds(44), before.AddSeconds(46));
    }

    private static HttpRequestMessage HoldRequest(string classId, string studentId)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, $"/classes/{classId}/holds");
        request.Headers.Add("X-Student-Id", studentId);
        return request;
    }
}
