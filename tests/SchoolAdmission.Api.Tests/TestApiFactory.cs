using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using SchoolAdmission.Api.Common;
using SchoolAdmission.Api.Common.Exceptions;
using SchoolAdmission.Api.DTOs.Classes;
using SchoolAdmission.Api.DTOs.Holds;
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
            services.RemoveAll<ISeatHoldService>();
            services.AddSingleton<TestClassService>();
            services.AddSingleton<TestSeatHoldService>();
            services.AddScoped<IClassService>(provider =>
                provider.GetRequiredService<TestClassService>());
            services.AddScoped<ISeatHoldService>(provider =>
                provider.GetRequiredService<TestSeatHoldService>());
        });
    }
}

public sealed class TestClassService : IClassService
{
    private readonly HashSet<string> _classNames = new(StringComparer.Ordinal);
    private readonly Dictionary<Guid, ClassAvailabilityResponse> _classDetails = [];
    private IReadOnlyList<ClassAvailabilityResponse> _classes =
        Array.Empty<ClassAvailabilityResponse>();

    public Task<IReadOnlyList<ClassAvailabilityResponse>> GetAllAsync(
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        return Task.FromResult(_classes);
    }

    public Task<ClassAvailabilityResponse?> GetByIdAsync(
        Guid classId,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        _classDetails.TryGetValue(classId, out var response);
        return Task.FromResult(response);
    }

    public void SetClasses(params ClassAvailabilityResponse[] classes)
    {
        _classes = classes;
    }

    public void SetClassDetails(params ClassAvailabilityResponse[] classes)
    {
        foreach (var admissionClass in classes)
        {
            if (PublicId.TryParseClassId(admissionClass.Id, out var id))
            {
                _classDetails[id] = admissionClass;
            }
        }
    }

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
    public Task<ClassAvailabilityResponse?> GetByIdAsync(
        Guid classId,
        CancellationToken cancellationToken)
    {
        throw new InvalidOperationException("Database connection details must remain private.");
    }

    public Task<IReadOnlyList<ClassAvailabilityResponse>> GetAllAsync(
        CancellationToken cancellationToken)
    {
        throw new InvalidOperationException("Database connection details must remain private.");
    }

    public Task<ClassResponse> CreateAsync(
        CreateClassRequest request,
        CancellationToken cancellationToken)
    {
        throw new InvalidOperationException("Database connection details must remain private.");
    }
}

public sealed class TestSeatHoldService : ISeatHoldService
{
    private readonly Dictionary<(Guid ClassId, string StudentId), HoldResponse> _holds = [];
    private readonly HashSet<Guid> _knownClasses = [];
    private readonly HashSet<Guid> _fullClasses = [];

    public TimeSpan HoldDuration { get; set; } = TimeSpan.FromMinutes(10);

    public Task<HoldResponse?> CreateAsync(
        Guid classId,
        string studentId,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        if (!_knownClasses.Contains(classId))
        {
            return Task.FromResult<HoldResponse?>(null);
        }

        if (_fullClasses.Contains(classId) || _holds.ContainsKey((classId, studentId)))
        {
            throw new SeatHoldConflictException("Seat hold could not be created.");
        }

        var response = new HoldResponse(
            PublicId.ForHold(Guid.NewGuid()),
            PublicId.ForClass(classId),
            studentId,
            "HELD",
            DateTime.UtcNow.Add(HoldDuration));
        _holds.Add((classId, studentId), response);
        return Task.FromResult<HoldResponse?>(response);
    }

    public void SetKnownClasses(params Guid[] classIds)
    {
        foreach (var classId in classIds)
        {
            _knownClasses.Add(classId);
        }
    }

    public void SetFullClasses(params Guid[] classIds)
    {
        foreach (var classId in classIds)
        {
            _fullClasses.Add(classId);
        }
    }
}
