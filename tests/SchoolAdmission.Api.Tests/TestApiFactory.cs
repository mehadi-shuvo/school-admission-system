using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using SchoolAdmission.Api.Common;
using SchoolAdmission.Api.Common.Exceptions;
using SchoolAdmission.Api.DTOs.Classes;
using SchoolAdmission.Api.Interfaces;

namespace SchoolAdmission.Api.Tests;

public sealed class TestApiFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<IClassService>();
            services.AddSingleton<TestClassService>();
            services.AddScoped<IClassService>(provider =>
                provider.GetRequiredService<TestClassService>());
        });
    }
}

public sealed class TestClassService : IClassService
{
    private readonly HashSet<string> _classNames = new(StringComparer.Ordinal);

    public Task<ClassResponse> CreateAsync(
        CreateClassRequest request,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var name = request.Name?.Trim();

        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ClassValidationException("name", "Class name is required.");
        }

        if (request.TotalSeats <= 0)
        {
            throw new ClassValidationException(
                "totalSeats",
                "Total seats must be greater than zero.");
        }

        if (!_classNames.Add(name))
        {
            throw new ClassNameConflictException();
        }

        return Task.FromResult(new ClassResponse(
            PublicId.ForClass(Guid.NewGuid()),
            name,
            request.TotalSeats));
    }
}

public sealed class FailingClassService : IClassService
{
    public Task<ClassResponse> CreateAsync(
        CreateClassRequest request,
        CancellationToken cancellationToken)
    {
        throw new InvalidOperationException("Database connection details must remain private.");
    }
}
