using Microsoft.EntityFrameworkCore;
using Npgsql;
using SchoolAdmission.Api.Common;
using SchoolAdmission.Api.Common.Exceptions;
using SchoolAdmission.Api.Data;
using SchoolAdmission.Api.DTOs.Classes;
using SchoolAdmission.Api.Entities;
using SchoolAdmission.Api.Interfaces;

namespace SchoolAdmission.Api.Services;

public sealed class ClassService : IClassService
{
    private const string ClassNameUniqueConstraint = "ux_admission_classes_name";

    private readonly AdmissionDbContext _dbContext;
    private readonly TimeProvider _timeProvider;

    public ClassService(
        AdmissionDbContext dbContext,
        TimeProvider timeProvider)
    {
        _dbContext = dbContext;
        _timeProvider = timeProvider;
    }

    public async Task<IReadOnlyList<ClassAvailabilityResponse>> GetAllAsync(
        CancellationToken cancellationToken)
    {
        var now = _timeProvider.GetUtcNow().UtcDateTime;

        var classes = await AvailabilityProjection(
                _dbContext.AdmissionClasses.AsNoTracking(),
                now)
            .OrderBy(admissionClass => admissionClass.Name)
            .ThenBy(admissionClass => admissionClass.Id)
            .ToListAsync(cancellationToken);

        return classes.Select(ToResponse)
            .ToList();
    }

    public async Task<ClassAvailabilityResponse?> GetByIdAsync(
        Guid classId,
        CancellationToken cancellationToken)
    {
        var now = _timeProvider.GetUtcNow().UtcDateTime;

        var admissionClass = await AvailabilityProjection(
                _dbContext.AdmissionClasses
                    .AsNoTracking()
                    .Where(admissionClass => admissionClass.Id == classId),
                now)
            .SingleOrDefaultAsync(cancellationToken);

        return admissionClass is null ? null : ToResponse(admissionClass);
    }

    public async Task<ClassResponse> CreateAsync(
        CreateClassRequest request,
        CancellationToken cancellationToken)
    {
        var name = request.Name?.Trim();

        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ClassValidationException("name", "Class name is required.");
        }

        if (name.Length > 150)
        {
            throw new ClassValidationException(
                "name",
                "Class name must be 150 characters or fewer.");
        }

        if (request.TotalSeats <= 0)
        {
            throw new ClassValidationException(
                "totalSeats",
                "Total seats must be greater than zero.");
        }

        var nameAlreadyExists = await _dbContext.AdmissionClasses
            .AsNoTracking()
            .AnyAsync(admissionClass => admissionClass.Name == name, cancellationToken);

        if (nameAlreadyExists)
        {
            throw new ClassNameConflictException();
        }

        var admissionClass = new AdmissionClass
        {
            Name = name,
            TotalSeats = request.TotalSeats
        };

        _dbContext.AdmissionClasses.Add(admissionClass);

        try
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception)
            when (IsClassNameUniqueViolation(exception))
        {
            throw new ClassNameConflictException();
        }

        return new ClassResponse(
            PublicId.ForClass(admissionClass.Id),
            admissionClass.Name,
            admissionClass.TotalSeats);
    }

    private static bool IsClassNameUniqueViolation(DbUpdateException exception)
    {
        return exception.InnerException is PostgresException postgresException &&
               postgresException.SqlState == PostgresErrorCodes.UniqueViolation &&
               postgresException.ConstraintName == ClassNameUniqueConstraint;
    }

    private static IQueryable<ClassAvailabilityProjection> AvailabilityProjection(
        IQueryable<AdmissionClass> classes,
        DateTime now)
    {
        return classes
            .Select(admissionClass => new ClassAvailabilityProjection(
                admissionClass.Id,
                admissionClass.Name,
                admissionClass.TotalSeats,
                admissionClass.Holds.Count(hold =>
                    hold.Status == HoldStatus.Held && hold.ExpiresAt > now),
                admissionClass.Holds.Count(hold =>
                    hold.Status == HoldStatus.Confirmed)));
    }

    private static ClassAvailabilityResponse ToResponse(
        ClassAvailabilityProjection admissionClass)
    {
        return new ClassAvailabilityResponse(
            PublicId.ForClass(admissionClass.Id),
            admissionClass.Name,
            admissionClass.TotalSeats,
            admissionClass.HeldSeats,
            admissionClass.ConfirmedSeats,
            admissionClass.TotalSeats -
                admissionClass.HeldSeats -
                admissionClass.ConfirmedSeats);
    }

    private sealed record ClassAvailabilityProjection(
        Guid Id,
        string Name,
        int TotalSeats,
        int HeldSeats,
        int ConfirmedSeats);
}
