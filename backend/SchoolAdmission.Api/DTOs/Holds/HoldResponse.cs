namespace SchoolAdmission.Api.DTOs.Holds;

public sealed record HoldResponse(
    string HoldId,
    string ClassId,
    string StudentId,
    string Status,
    DateTime ExpiresAt
);
