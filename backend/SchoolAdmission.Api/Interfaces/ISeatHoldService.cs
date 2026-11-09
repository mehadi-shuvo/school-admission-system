using SchoolAdmission.Api.DTOs.Holds;

namespace SchoolAdmission.Api.Interfaces;

public interface ISeatHoldService
{
    Task<HoldResponse?> CreateAsync(
        Guid classId,
        string studentId,
        CancellationToken cancellationToken);
}
