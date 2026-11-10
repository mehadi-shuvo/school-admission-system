namespace SchoolAdmission.Api.DTOs.Holds;

public sealed record StudentHoldResponse(
    string HoldId,
    string ClassId,
    string ClassName,
    string Status,
    DateTime ExpiresAt);
