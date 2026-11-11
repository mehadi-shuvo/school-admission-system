using System.Net;
using Xunit;

namespace SchoolAdmission.Api.Tests;

[Collection(nameof(PostgreSqlIntegrationCollection))]
public sealed class ReadinessPostgreSqlApiTests : IClassFixture<PostgreSqlApiFactory>
{
    private readonly PostgreSqlApiFactory _factory;

    public ReadinessPostgreSqlApiTests(PostgreSqlApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Readiness_WhenPostgreSqlIsReachable_ReturnsHealthy()
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync("/health/ready");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Healthy", await response.Content.ReadAsStringAsync());
    }
}
