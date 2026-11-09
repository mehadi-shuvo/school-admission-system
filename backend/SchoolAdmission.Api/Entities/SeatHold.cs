
namespace SchoolAdmission.Api.Entities;

public sealed class SeatHold
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid ClassId { get; set; }

    public AdmissionClass Class { get; set; } = null!;

    public string StudentId { get; set; } = string.Empty;

    public HoldStatus Status { get; set; } = HoldStatus.Held;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime ExpiresAt { get; set; }

    public DateTime? ConfirmedAt { get; set; }

    public DateTime? CancelledAt { get; set; }

    public DateTime? ExpiredAt { get; set; }
}
