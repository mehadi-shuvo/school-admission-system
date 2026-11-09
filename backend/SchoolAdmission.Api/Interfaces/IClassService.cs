using SchoolAdmission.Api.DTOs.Classes;

namespace SchoolAdmission.Api.Interfaces;

public interface IClassService
{
    Task<IReadOnlyList<ClassAvailabilityResponse>> GetAllAsync(
        CancellationToken cancellationToken);

    Task<ClassResponse> CreateAsync(
        CreateClassRequest request,
        CancellationToken cancellationToken);
}
