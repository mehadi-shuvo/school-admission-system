using System.Net;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using SchoolAdmission.Api.Common;
using SchoolAdmission.Api.Entities;
using SchoolAdmission.Api.Interfaces;
using Xunit;

namespace SchoolAdmission.Api.Tests;

public sealed class ErrorContractApiTests
{
    [Fact]
    public async Task MissingStudentId_Returns400ProblemDetailsAndCorrelationId()
    {
        using var factory = new TestApiFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/me/holds");

        await AssertProblemDetailsAsync(response, HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task OtherStudentConfirm_Returns403ProblemDetailsAndCorrelationId()
    {
        using var factory = new TestApiFactory();
        var holdId = Guid.NewGuid();
        factory.Services.GetRequiredService<TestSeatHoldService>().SetHoldDetails(
            holdId,
            Guid.NewGuid(),
            HoldStatus.Held,
            DateTime.UtcNow.AddMinutes(1));
        using var client = factory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Post, $"/holds/{PublicId.ForHold(holdId)}/confirm");
        request.Headers.Add("X-Student-Id", "00123456789012346");

        var response = await client.SendAsync(request);

        await AssertProblemDetailsAsync(response, HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task UnknownClass_Returns404ProblemDetailsAndCorrelationId()
    {
        using var factory = new TestApiFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/classes/c_00000000000040008000000000000000");

        await AssertProblemDetailsAsync(response, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task FullClass_Returns409ProblemDetailsAndCorrelationId()
    {
        using var factory = new TestApiFactory();
        var classId = Guid.NewGuid();
        var service = factory.Services.GetRequiredService<TestSeatHoldService>();
        service.SetKnownClasses(classId);
        service.SetFullClasses(classId);
        using var client = factory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Post, $"/classes/{PublicId.ForClass(classId)}/holds");
        request.Headers.Add("X-Student-Id", "00123456789012345");

        var response = await client.SendAsync(request);

        await AssertProblemDetailsAsync(response, HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task UnhandledServiceFailure_ReturnsSafe500ProblemDetailsAndCorrelationId()
    {
        using var factory = new TestApiFactory().WithWebHostBuilder(builder =>
            builder.ConfigureServices(services =>
            {
                services.RemoveAll<IClassService>();
                services.AddScoped<IClassService, FailingClassService>();
            }));
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/classes");

        await AssertProblemDetailsAsync(response, HttpStatusCode.InternalServerError);
    }

    private static async Task AssertProblemDetailsAsync(
        HttpResponseMessage response,
        HttpStatusCode expectedStatus)
    {
        Assert.Equal(expectedStatus, response.StatusCode);
        Assert.True(response.Headers.TryGetValues("X-Correlation-ID", out var values));
        Assert.Matches("^[A-Za-z0-9._-]{1,64}$", Assert.Single(values));

        var body = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("Database connection details", body);
        Assert.DoesNotContain("System.InvalidOperationException", body);
        using var document = JsonDocument.Parse(body);
        var problem = document.RootElement;
        Assert.Equal((int)expectedStatus, problem.GetProperty("status").GetInt32());
        Assert.False(string.IsNullOrWhiteSpace(problem.GetProperty("title").GetString()));
    }
}
