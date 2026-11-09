
namespace SchoolAdmission.Api.Entities;

public sealed class AdmissionClass
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Name { get; set; } = string.Empty;

    public int TotalSeats { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<SeatHold> Holds { get; set; }
        = new List<SeatHold>();
}
