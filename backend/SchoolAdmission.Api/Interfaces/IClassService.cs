using SchoolAdmission.Api.DTOs.Classes;

namespace SchoolAdmission.Api.Interfaces;

public interface IClassService
{
    Task<ClassResponse> CreateAsync(
        CreateClassRequest request,
        CancellationToken cancellationToken);
}
