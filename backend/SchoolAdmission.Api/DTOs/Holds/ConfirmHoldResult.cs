namespace SchoolAdmission.Api.DTOs.Holds;

public enum ConfirmHoldOutcome
{
    Confirmed,
    NotFound,
    Forbidden,
    Conflict
}

public sealed record ConfirmHoldResult(
    ConfirmHoldOutcome Outcome,
    ConfirmHoldResponse? Response = null);
