
using System.ComponentModel.DataAnnotations;

namespace SchoolAdmission.Api.DTOs.Classes;

public sealed class CreateClassRequest
{
    [Required(ErrorMessage = "Class name is required.")]
    [StringLength(150, MinimumLength = 1)]
    public string? Name { get; set; }

    [Range(1, int.MaxValue,
        ErrorMessage = "Total seats must be greater than zero.")]
    public int TotalSeats { get; set; }
}
