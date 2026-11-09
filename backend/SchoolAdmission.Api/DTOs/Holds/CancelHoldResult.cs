namespace SchoolAdmission.Api.DTOs.Holds;

public enum CancelHoldOutcome
{
    Cancelled,
    NotFound,
    Forbidden,
    Conflict
}

public sealed record CancelHoldResult(CancelHoldOutcome Outcome);
