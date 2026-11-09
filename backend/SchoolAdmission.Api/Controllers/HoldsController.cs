using Microsoft.AspNetCore.Mvc;
using SchoolAdmission.Api.Common;
using SchoolAdmission.Api.DTOs.Holds;
using SchoolAdmission.Api.Interfaces;

namespace SchoolAdmission.Api.Controllers;

[ApiController]
[Route("holds")]
public sealed class HoldsController : ControllerBase
{
    private readonly ISeatHoldService _seatHoldService;

    public HoldsController(ISeatHoldService seatHoldService)
    {
        _seatHoldService = seatHoldService;
    }

    [HttpGet("{holdId}")]
    [ProducesResponseType<HoldDetailsResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<HoldDetailsResponse>> GetById(
        string holdId,
        CancellationToken cancellationToken)
    {
        if (!PublicId.TryParseHoldId(holdId, out var id))
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid hold identifier.",
                Status = StatusCodes.Status400BadRequest
            });
        }

        var response = await _seatHoldService.GetByIdAsync(id, cancellationToken);

        if (response is null)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Seat hold was not found.",
                Status = StatusCodes.Status404NotFound
            });
        }

        return Ok(response);
    }
}
