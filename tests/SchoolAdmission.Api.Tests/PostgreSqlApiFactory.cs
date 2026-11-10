using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SchoolAdmission.Api.Data;
using Testcontainers.PostgreSql;
using Xunit;

namespace SchoolAdmission.Api.Tests;

public sealed class PostgreSqlApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _database = new PostgreSqlBuilder("postgres:17.4-alpine")
        .WithDatabase("school_admission_tests")
        .WithUsername("school_admission_tests")
        .WithPassword("school-admission-tests-password")
        .Build();

    public async Task InitializeAsync()
    {
        await _database.StartAsync();

        await using var scope = Services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AdmissionDbContext>();
        await dbContext.Database.MigrateAsync();
    }

    public async Task ResetAsync()
    {
        await using var scope = Services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AdmissionDbContext>();
        await dbContext.Database.ExecuteSqlRawAsync(
            "TRUNCATE TABLE seat_holds, admission_classes");
    }

    Task IAsyncLifetime.DisposeAsync() => DisposeContainerAsync();

    private async Task DisposeContainerAsync()
    {
        await base.DisposeAsync();
        await _database.DisposeAsync();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureAppConfiguration((_, configuration) =>
        {
            configuration.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:AdmissionDb"] = _database.GetConnectionString()
            });
        });
    }
}
