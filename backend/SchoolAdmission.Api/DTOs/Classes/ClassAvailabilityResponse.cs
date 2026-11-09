namespace SchoolAdmission.Api.DTOs.Classes;

public sealed record ClassAvailabilityResponse(
    string Id,
    string Name,
    int TotalSeats,
    int HeldSeats,
    int ConfirmedSeats,
    int AvailableSeats
);
