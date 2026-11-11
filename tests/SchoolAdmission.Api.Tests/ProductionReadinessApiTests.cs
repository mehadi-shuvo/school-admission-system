using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace SchoolAdmission.Api.Tests;

public sealed class ProductionReadinessApiTests
{
    [Fact]
    public async Task RequestWithoutCorrelationId_GeneratesAndReturnsSafeId()
    {
        using var factory = new TestApiFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/classes");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var correlationId = GetCorrelationId(response);
        Assert.Matches("^[A-Za-z0-9._-]{1,64}$", correlationId);
    }

    [Fact]
    public async Task RequestWithValidCorrelationId_PropagatesItToTheResponse()
    {
        const string correlationId = "admission-flow_42.abc-DEF";
        using var factory = new TestApiFactory();
        using var client = factory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Get, "/classes");
        request.Headers.Add("X-Correlation-ID", correlationId);

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(correlationId, GetCorrelationId(response));
    }

    [Theory]
    [InlineData("contains whitespace")]
    [InlineData("contains/slash")]
    public async Task RequestWithUnsafeCorrelationId_ReplacesItWithGeneratedValue(
        string unsafeCorrelationId)
    {
        using var factory = new TestApiFactory();
        using var client = factory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Get, "/classes");
        request.Headers.TryAddWithoutValidation("X-Correlation-ID", unsafeCorrelationId);

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var returnedCorrelationId = GetCorrelationId(response);
        Assert.NotEqual(unsafeCorrelationId, returnedCorrelationId);
        Assert.Matches("^[A-Za-z0-9._-]{1,64}$", returnedCorrelationId);
    }

    [Fact]
    public async Task RequestWithOversizedCorrelationId_ReplacesItWithGeneratedValue()
    {
        var oversizedCorrelationId = new string('a', 65);
        using var factory = new TestApiFactory();
        using var client = factory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Get, "/classes");
        request.Headers.Add("X-Correlation-ID", oversizedCorrelationId);

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var returnedCorrelationId = GetCorrelationId(response);
        Assert.NotEqual(oversizedCorrelationId, returnedCorrelationId);
        Assert.Matches("^[A-Za-z0-9._-]{1,64}$", returnedCorrelationId);
    }

    [Fact]
    public async Task Readiness_WhenDatabaseIsUnavailable_ReturnsServiceUnavailableWithoutDetails()
    {
        using var factory = new TestApiFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/health/ready");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal("Unhealthy", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task DevelopmentOpenApiDocument_ContainsAllAdmissionRoutesAndHeaderGuidance()
    {
        using var factory = new DevelopmentOpenApiFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/openapi/v1.json");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStreamAsync());
        var paths = document.RootElement.GetProperty("paths");
        Assert.True(paths.TryGetProperty("/classes", out var classes));
        Assert.True(classes.TryGetProperty("get", out _));
        Assert.True(classes.TryGetProperty("post", out _));
        Assert.True(paths.TryGetProperty("/classes/{classId}", out _));
        Assert.True(paths.TryGetProperty("/classes/{classId}/holds", out var createHold));
        Assert.Contains(
            "X-Student-Id",
            createHold.GetProperty("post").GetProperty("description").GetString());
        var studentIdParameter = createHold.GetProperty("post").GetProperty("parameters")
            .EnumerateArray()
            .Single(parameter => parameter.GetProperty("name").GetString() == "X-Student-Id");
        Assert.True(studentIdParameter.GetProperty("required").GetBoolean());
        Assert.Equal("header", studentIdParameter.GetProperty("in").GetString());
        Assert.Equal("^[0-9]{17}$", studentIdParameter.GetProperty("schema").GetProperty("pattern").GetString());
        Assert.True(paths.TryGetProperty("/holds/{holdId}", out _));
        Assert.True(paths.TryGetProperty("/holds/{holdId}/confirm", out _));
        Assert.True(paths.TryGetProperty("/me/holds", out _));
    }

    private static string GetCorrelationId(HttpResponseMessage response)
    {
        Assert.True(response.Headers.TryGetValues("X-Correlation-ID", out var values));
        return Assert.Single(values);
    }

    private sealed class DevelopmentOpenApiFactory : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Development");
            builder.ConfigureAppConfiguration((_, configuration) =>
            {
                configuration.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["ConnectionStrings:AdmissionDb"] =
                        "Host=127.0.0.1;Port=1;Database=openapi;Username=openapi;Password=openapi;Timeout=1"
                });
            });
        }
    }
}
