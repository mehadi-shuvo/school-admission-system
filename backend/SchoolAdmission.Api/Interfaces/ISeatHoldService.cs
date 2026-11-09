using SchoolAdmission.Api.DTOs.Holds;

namespace SchoolAdmission.Api.Interfaces;

public interface ISeatHoldService
{
    Task<HoldDetailsResponse?> GetByIdAsync(
        Guid holdId,
        CancellationToken cancellationToken);

    Task<HoldResponse?> CreateAsync(
        Guid classId,
        string studentId,
        CancellationToken cancellationToken);
}
