namespace SchoolAdmission.Api.DTOs.Holds;

public sealed record ConfirmHoldResponse(
    string HoldId,
    string Status);
