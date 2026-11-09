using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using SchoolAdmission.Api.Common;
using SchoolAdmission.Api.Common.Exceptions;
using SchoolAdmission.Api.DTOs.Classes;
using SchoolAdmission.Api.DTOs.Holds;
using SchoolAdmission.Api.Entities;
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
    private readonly Dictionary<Guid, TestHoldDetails> _holdDetails = [];
    private readonly HashSet<Guid> _knownClasses = [];
    private readonly HashSet<Guid> _fullClasses = [];

    public TimeSpan HoldDuration { get; set; } = TimeSpan.FromMinutes(10);

    public DateTime CurrentUtc { get; set; } = DateTime.UtcNow;

    public int ConfirmationTransitions { get; private set; }

    public int CancellationTransitions { get; private set; }

    public Task<CancelHoldResult> CancelAsync(
        Guid holdId,
        string studentId,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        if (!_holdDetails.TryGetValue(holdId, out var hold))
        {
            return Task.FromResult(new CancelHoldResult(CancelHoldOutcome.NotFound));
        }

        if (hold.StudentId != studentId)
        {
            return Task.FromResult(new CancelHoldResult(CancelHoldOutcome.Forbidden));
        }

        if (hold.Status == HoldStatus.Cancelled)
        {
            return Task.FromResult(new CancelHoldResult(CancelHoldOutcome.Cancelled));
        }

        if (hold.Status == HoldStatus.Held && hold.ExpiresAt <= CurrentUtc)
        {
            _holdDetails[holdId] = hold with { Status = HoldStatus.Expired };
            return Task.FromResult(new CancelHoldResult(CancelHoldOutcome.Conflict));
        }

        if (hold.Status is HoldStatus.Expired or HoldStatus.Confirmed)
        {
            return Task.FromResult(new CancelHoldResult(CancelHoldOutcome.Conflict));
        }

        _holdDetails[holdId] = hold with
        {
            Status = HoldStatus.Cancelled,
            CancelledAt = CurrentUtc
        };
        CancellationTransitions++;
        return Task.FromResult(new CancelHoldResult(CancelHoldOutcome.Cancelled));
    }

    public Task<ConfirmHoldResult> ConfirmAsync(
        Guid holdId,
        string studentId,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        if (!_holdDetails.TryGetValue(holdId, out var hold))
        {
            return Task.FromResult(new ConfirmHoldResult(ConfirmHoldOutcome.NotFound));
        }

        if (hold.StudentId != studentId)
        {
            return Task.FromResult(new ConfirmHoldResult(ConfirmHoldOutcome.Forbidden));
        }

        if (hold.Status == HoldStatus.Confirmed)
        {
            return Task.FromResult(Confirmed(holdId));
        }

        if (hold.Status == HoldStatus.Held && hold.ExpiresAt <= CurrentUtc)
        {
            _holdDetails[holdId] = hold with { Status = HoldStatus.Expired };
            return Task.FromResult(new ConfirmHoldResult(ConfirmHoldOutcome.Conflict));
        }

        if (hold.Status is HoldStatus.Expired or HoldStatus.Cancelled)
        {
            return Task.FromResult(new ConfirmHoldResult(ConfirmHoldOutcome.Conflict));
        }

        _holdDetails[holdId] = hold with { Status = HoldStatus.Confirmed };
        ConfirmationTransitions++;
        return Task.FromResult(Confirmed(holdId));
    }

    public Task<HoldDetailsResponse?> GetByIdAsync(
        Guid holdId,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        if (!_holdDetails.TryGetValue(holdId, out var hold))
        {
            return Task.FromResult<HoldDetailsResponse?>(null);
        }

        var effectiveStatus = hold.Status == HoldStatus.Held &&
                              hold.ExpiresAt <= CurrentUtc
            ? HoldStatus.Expired
            : hold.Status;

        return Task.FromResult<HoldDetailsResponse?>(new HoldDetailsResponse(
            PublicId.ForHold(holdId),
            PublicId.ForClass(hold.ClassId),
            effectiveStatus.ToString().ToUpperInvariant(),
            hold.ExpiresAt));
    }

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

        var holdId = Guid.NewGuid();
        var expiresAt = DateTime.UtcNow.Add(HoldDuration);
        var response = new HoldResponse(
            PublicId.ForHold(holdId),
            PublicId.ForClass(classId),
            studentId,
            "HELD",
            expiresAt);
        _holds.Add((classId, studentId), response);
        _holdDetails.Add(holdId, new TestHoldDetails(
            classId,
            HoldStatus.Held,
            expiresAt,
            studentId,
            null));
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

    public void SetHoldDetails(
        Guid holdId,
        Guid classId,
        HoldStatus status,
        DateTime expiresAt,
        string studentId = "00123456789012345",
        DateTime? cancelledAt = null)
    {
        _holdDetails[holdId] = new TestHoldDetails(
            classId,
            status,
            expiresAt,
            studentId,
            cancelledAt);
    }

    public DateTime? GetCancelledAt(Guid holdId)
    {
        return _holdDetails.TryGetValue(holdId, out var hold)
            ? hold.CancelledAt
            : null;
    }

    private sealed record TestHoldDetails(
        Guid ClassId,
        HoldStatus Status,
        DateTime ExpiresAt,
        string StudentId,
        DateTime? CancelledAt);

    private static ConfirmHoldResult Confirmed(Guid holdId)
    {
        return new ConfirmHoldResult(
            ConfirmHoldOutcome.Confirmed,
            new ConfirmHoldResponse(PublicId.ForHold(holdId), "CONFIRMED"));
    }
}
