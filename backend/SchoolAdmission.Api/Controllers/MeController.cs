using Microsoft.AspNetCore.Mvc;
using SchoolAdmission.Api.DTOs.Holds;
using SchoolAdmission.Api.Interfaces;

namespace SchoolAdmission.Api.Controllers;

[ApiController]
[Route("me")]
public sealed class MeController : ControllerBase
{
    private readonly ISeatHoldService _seatHoldService;

    public MeController(ISeatHoldService seatHoldService)
    {
        _seatHoldService = seatHoldService;
    }

    [HttpGet("holds")]
    [ProducesResponseType<IReadOnlyList<StudentHoldResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IReadOnlyList<StudentHoldResponse>>>
        GetHolds(CancellationToken cancellationToken)
    {
        if (!Request.Headers.TryGetValue("X-Student-Id", out var studentIds) ||
            studentIds.Count != 1 ||
            !IsStudentId(studentIds[0]))
        {
            return BadRequest(new ProblemDetails
            {
                Title = "X-Student-Id must be exactly 17 ASCII digits.",
                Status = StatusCodes.Status400BadRequest
            });
        }

        var response = await _seatHoldService.GetStudentHoldsAsync(
            studentIds[0]!,
            cancellationToken);
        return Ok(response);
    }

    private static bool IsStudentId(string? studentId)
    {
        return studentId is { Length: 17 } &&
               studentId.All(character => character is >= '0' and <= '9');
    }
}
