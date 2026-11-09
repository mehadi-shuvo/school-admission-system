using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace SchoolAdmission.Api.Data;

/// <summary>
/// Provides EF tooling with the same configuration convention as the application.
/// </summary>
public sealed class AdmissionDbContextFactory
    : IDesignTimeDbContextFactory<AdmissionDbContext>
{
    public AdmissionDbContext CreateDbContext(string[] args)
    {
        var configuration = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json", optional: true)
            .AddEnvironmentVariables()
            .Build();

        var connectionString = configuration.GetConnectionString("AdmissionDb");

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "Set ConnectionStrings__AdmissionDb before using EF Core tooling.");
        }

        var options = new DbContextOptionsBuilder<AdmissionDbContext>()
            .UseNpgsql(connectionString)
            .Options;

        return new AdmissionDbContext(options);
    }
}
