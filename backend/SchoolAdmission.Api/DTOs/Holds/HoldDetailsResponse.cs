namespace SchoolAdmission.Api.DTOs.Holds;

public sealed record HoldDetailsResponse(
    string HoldId,
    string ClassId,
    string Status,
    DateTime ExpiresAt);
