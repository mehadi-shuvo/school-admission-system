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

    [HttpDelete("{holdId}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Cancel(
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

        var result = await _seatHoldService.CancelAsync(
            id,
            studentIds[0]!,
            cancellationToken);

        return result.Outcome switch
        {
            CancelHoldOutcome.Cancelled => NoContent(),
            CancelHoldOutcome.NotFound => NotFound(new ProblemDetails
            {
                Title = "Seat hold was not found.",
                Status = StatusCodes.Status404NotFound
            }),
            CancelHoldOutcome.Forbidden => StatusCode(
                StatusCodes.Status403Forbidden,
                new ProblemDetails
                {
                    Title = "The hold belongs to a different student.",
                    Status = StatusCodes.Status403Forbidden
                }),
            CancelHoldOutcome.Conflict => Conflict(new ProblemDetails
            {
                Title = "Seat hold cannot be cancelled.",
                Status = StatusCodes.Status409Conflict
            }),
            _ => throw new InvalidOperationException("Unexpected cancellation result.")
        };
    }

    [HttpPost("{holdId}/confirm")]
    [ProducesResponseType<ConfirmHoldResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ConfirmHoldResponse>> Confirm(
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

        var result = await _seatHoldService.ConfirmAsync(
            id,
            studentIds[0]!,
            cancellationToken);

        return result.Outcome switch
        {
            ConfirmHoldOutcome.Confirmed => Ok(result.Response),
            ConfirmHoldOutcome.NotFound => NotFound(new ProblemDetails
            {
                Title = "Seat hold was not found.",
                Status = StatusCodes.Status404NotFound
            }),
            ConfirmHoldOutcome.Forbidden => StatusCode(
                StatusCodes.Status403Forbidden,
                new ProblemDetails
                {
                    Title = "The hold belongs to a different student.",
                    Status = StatusCodes.Status403Forbidden
                }),
            ConfirmHoldOutcome.Conflict => Conflict(new ProblemDetails
            {
                Title = "Seat hold cannot be confirmed.",
                Status = StatusCodes.Status409Conflict
            }),
            _ => throw new InvalidOperationException("Unexpected confirmation result.")
        };
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

    private static bool IsStudentId(string? studentId)
    {
        return studentId is { Length: 17 } &&
               studentId.All(character => character is >= '0' and <= '9');
    }
}
