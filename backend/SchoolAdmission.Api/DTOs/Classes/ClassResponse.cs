
namespace SchoolAdmission.Api.DTOs.Classes;

public sealed record ClassResponse(
    string Id,
    string Name,
    int TotalSeats
);
