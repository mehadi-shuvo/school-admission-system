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

    public ClassService(AdmissionDbContext dbContext)
    {
        _dbContext = dbContext;
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
}
