using Microsoft.EntityFrameworkCore;
using Npgsql;
using SchoolAdmission.Api.Common;
using SchoolAdmission.Api.Common.Exceptions;
using SchoolAdmission.Api.Data;
using SchoolAdmission.Api.DTOs.Holds;
using SchoolAdmission.Api.Entities;
using SchoolAdmission.Api.Interfaces;

namespace SchoolAdmission.Api.Services;

public sealed class SeatHoldService : ISeatHoldService
{
    private const string ActiveStudentClassConstraint =
        "ux_seat_holds_active_student_class";

    private readonly AdmissionDbContext _dbContext;
    private readonly TimeProvider _timeProvider;
    private readonly HoldSettings _settings;

    public SeatHoldService(
        AdmissionDbContext dbContext,
        TimeProvider timeProvider,
        HoldSettings settings)
    {
        _dbContext = dbContext;
        _timeProvider = timeProvider;
        _settings = settings;
    }

    public async Task<HoldDetailsResponse?> GetByIdAsync(
        Guid holdId,
        CancellationToken cancellationToken)
    {
        var now = _timeProvider.GetUtcNow().UtcDateTime;

        var hold = await _dbContext.SeatHolds
            .AsNoTracking()
            .Where(seatHold => seatHold.Id == holdId)
            .Select(seatHold => new HoldDetailsProjection(
                seatHold.Id,
                seatHold.ClassId,
                seatHold.Status,
                seatHold.ExpiresAt))
            .SingleOrDefaultAsync(cancellationToken);

        if (hold is null)
        {
            return null;
        }

        var effectiveStatus = hold.Status == HoldStatus.Held &&
                              hold.ExpiresAt <= now
            ? HoldStatus.Expired
            : hold.Status;

        return new HoldDetailsResponse(
            PublicId.ForHold(hold.Id),
            PublicId.ForClass(hold.ClassId),
            effectiveStatus.ToString().ToUpperInvariant(),
            hold.ExpiresAt);
    }

    public async Task<ConfirmHoldResult> ConfirmAsync(
        Guid holdId,
        string studentId,
        CancellationToken cancellationToken)
    {
        var classId = await _dbContext.SeatHolds
            .AsNoTracking()
            .Where(seatHold => seatHold.Id == holdId)
            .Select(seatHold => (Guid?)seatHold.ClassId)
            .SingleOrDefaultAsync(cancellationToken);

        if (classId is null)
        {
            return new ConfirmHoldResult(ConfirmHoldOutcome.NotFound);
        }

        await using var transaction = await _dbContext.Database
            .BeginTransactionAsync(cancellationToken);

        var admissionClass = await _dbContext.AdmissionClasses
            .FromSqlInterpolated(
                $"SELECT * FROM admission_classes WHERE id = {classId.Value} FOR UPDATE")
            .SingleOrDefaultAsync(cancellationToken);

        if (admissionClass is null)
        {
            return new ConfirmHoldResult(ConfirmHoldOutcome.NotFound);
        }

        var hold = await _dbContext.SeatHolds
            .SingleOrDefaultAsync(seatHold => seatHold.Id == holdId, cancellationToken);

        if (hold is null)
        {
            return new ConfirmHoldResult(ConfirmHoldOutcome.NotFound);
        }

        if (hold.StudentId != studentId)
        {
            return new ConfirmHoldResult(ConfirmHoldOutcome.Forbidden);
        }

        var now = _timeProvider.GetUtcNow().UtcDateTime;

        if (hold.Status == HoldStatus.Confirmed)
        {
            await transaction.CommitAsync(cancellationToken);
            return Confirmed(holdId);
        }

        if (hold.Status == HoldStatus.Held && hold.ExpiresAt <= now)
        {
            hold.Status = HoldStatus.Expired;
            hold.ExpiredAt = now;
            await _dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return new ConfirmHoldResult(ConfirmHoldOutcome.Conflict);
        }

        if (hold.Status is HoldStatus.Expired or HoldStatus.Cancelled)
        {
            await transaction.CommitAsync(cancellationToken);
            return new ConfirmHoldResult(ConfirmHoldOutcome.Conflict);
        }

        hold.Status = HoldStatus.Confirmed;
        hold.ConfirmedAt = now;
        await _dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return Confirmed(holdId);
    }

    public async Task<CancelHoldResult> CancelAsync(
        Guid holdId,
        string studentId,
        CancellationToken cancellationToken)
    {
        var classId = await _dbContext.SeatHolds
            .AsNoTracking()
            .Where(seatHold => seatHold.Id == holdId)
            .Select(seatHold => (Guid?)seatHold.ClassId)
            .SingleOrDefaultAsync(cancellationToken);

        if (classId is null)
        {
            return new CancelHoldResult(CancelHoldOutcome.NotFound);
        }

        await using var transaction = await _dbContext.Database
            .BeginTransactionAsync(cancellationToken);

        var admissionClass = await _dbContext.AdmissionClasses
            .FromSqlInterpolated(
                $"SELECT * FROM admission_classes WHERE id = {classId.Value} FOR UPDATE")
            .SingleOrDefaultAsync(cancellationToken);

        if (admissionClass is null)
        {
            return new CancelHoldResult(CancelHoldOutcome.NotFound);
        }

        var hold = await _dbContext.SeatHolds
            .SingleOrDefaultAsync(seatHold => seatHold.Id == holdId, cancellationToken);

        if (hold is null)
        {
            return new CancelHoldResult(CancelHoldOutcome.NotFound);
        }

        if (hold.StudentId != studentId)
        {
            return new CancelHoldResult(CancelHoldOutcome.Forbidden);
        }

        var now = _timeProvider.GetUtcNow().UtcDateTime;

        if (hold.Status == HoldStatus.Cancelled)
        {
            await transaction.CommitAsync(cancellationToken);
            return new CancelHoldResult(CancelHoldOutcome.Cancelled);
        }

        if (hold.Status == HoldStatus.Held && hold.ExpiresAt <= now)
        {
            hold.Status = HoldStatus.Expired;
            hold.ExpiredAt = now;
            await _dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return new CancelHoldResult(CancelHoldOutcome.Conflict);
        }

        if (hold.Status is HoldStatus.Expired or HoldStatus.Confirmed)
        {
            await transaction.CommitAsync(cancellationToken);
            return new CancelHoldResult(CancelHoldOutcome.Conflict);
        }

        hold.Status = HoldStatus.Cancelled;
        hold.CancelledAt = now;
        await _dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return new CancelHoldResult(CancelHoldOutcome.Cancelled);
    }

    public async Task<HoldResponse?> CreateAsync(
        Guid classId,
        string studentId,
        CancellationToken cancellationToken)
    {
        await using var transaction = await _dbContext.Database
            .BeginTransactionAsync(cancellationToken);

        var admissionClass = await _dbContext.AdmissionClasses
            .FromSqlInterpolated($"SELECT * FROM admission_classes WHERE id = {classId} FOR UPDATE")
            .SingleOrDefaultAsync(cancellationToken);

        if (admissionClass is null)
        {
            return null;
        }

        var now = _timeProvider.GetUtcNow().UtcDateTime;

        await _dbContext.Database.ExecuteSqlInterpolatedAsync(
            $"UPDATE seat_holds SET status = 'EXPIRED', expired_at = {now} WHERE class_id = {classId} AND status = 'HELD' AND expires_at <= {now}",
            cancellationToken);

        var studentAlreadyHasReservation = await _dbContext.SeatHolds
            .AsNoTracking()
            .AnyAsync(hold =>
                hold.ClassId == classId &&
                hold.StudentId == studentId &&
                (hold.Status == HoldStatus.Held || hold.Status == HoldStatus.Confirmed),
                cancellationToken);

        if (studentAlreadyHasReservation)
        {
            throw new SeatHoldConflictException(
                "The student already has an active reservation for this class.");
        }

        var occupiedSeats = await _dbContext.SeatHolds
            .AsNoTracking()
            .CountAsync(hold =>
                hold.ClassId == classId &&
                (hold.Status == HoldStatus.Confirmed ||
                    (hold.Status == HoldStatus.Held && hold.ExpiresAt > now)),
                cancellationToken);

        if (occupiedSeats >= admissionClass.TotalSeats)
        {
            throw new SeatHoldConflictException(
                "No seats are available for this class.");
        }

        var hold = new SeatHold
        {
            ClassId = classId,
            StudentId = studentId,
            Status = HoldStatus.Held,
            CreatedAt = now,
            ExpiresAt = now.Add(_settings.Duration)
        };

        _dbContext.SeatHolds.Add(hold);

        try
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (IsActiveStudentClassViolation(exception))
        {
            throw new SeatHoldConflictException(
                "The student already has an active reservation for this class.");
        }

        return new HoldResponse(
            PublicId.ForHold(hold.Id),
            PublicId.ForClass(classId),
            studentId,
            "HELD",
            hold.ExpiresAt);
    }

    private static bool IsActiveStudentClassViolation(DbUpdateException exception)
    {
        return exception.InnerException is PostgresException postgresException &&
               postgresException.SqlState == PostgresErrorCodes.UniqueViolation &&
               postgresException.ConstraintName == ActiveStudentClassConstraint;
    }

    private static ConfirmHoldResult Confirmed(Guid holdId)
    {
        return new ConfirmHoldResult(
            ConfirmHoldOutcome.Confirmed,
            new ConfirmHoldResponse(PublicId.ForHold(holdId), "CONFIRMED"));
    }

    private sealed record HoldDetailsProjection(
        Guid Id,
        Guid ClassId,
        HoldStatus Status,
        DateTime ExpiresAt);
}
