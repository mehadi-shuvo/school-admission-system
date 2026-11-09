using SchoolAdmission.Api.DTOs.Holds;

namespace SchoolAdmission.Api.Interfaces;

public interface ISeatHoldService
{
    Task<CancelHoldResult> CancelAsync(
        Guid holdId,
        string studentId,
        CancellationToken cancellationToken);

    Task<ConfirmHoldResult> ConfirmAsync(
        Guid holdId,
        string studentId,
        CancellationToken cancellationToken);

    Task<HoldDetailsResponse?> GetByIdAsync(
        Guid holdId,
        CancellationToken cancellationToken);

    Task<HoldResponse?> CreateAsync(
        Guid classId,
        string studentId,
        CancellationToken cancellationToken);
}
