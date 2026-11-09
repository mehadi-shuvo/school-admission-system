using Microsoft.AspNetCore.Mvc;
using SchoolAdmission.Api.Common;
using SchoolAdmission.Api.Common.Exceptions;
using SchoolAdmission.Api.DTOs.Classes;
using SchoolAdmission.Api.Interfaces;

namespace SchoolAdmission.Api.Controllers;

[ApiController]
[Route("classes")]
public sealed class ClassesController : ControllerBase
{
    private readonly IClassService _classService;

    public ClassesController(IClassService classService)
    {
        _classService = classService;
    }

    [HttpGet]
    [ProducesResponseType<IReadOnlyList<ClassAvailabilityResponse>>(
        StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ClassAvailabilityResponse>>>
        GetAll(CancellationToken cancellationToken)
    {
        var response = await _classService.GetAllAsync(cancellationToken);
        return Ok(response);
    }

    [HttpGet("{classId}")]
    [ProducesResponseType<ClassAvailabilityResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ClassAvailabilityResponse>> GetById(
        string classId,
        CancellationToken cancellationToken)
    {
        if (!PublicId.TryParseClassId(classId, out var id))
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid admission class identifier.",
                Status = StatusCodes.Status400BadRequest
            });
        }

        var response = await _classService.GetByIdAsync(id, cancellationToken);

        if (response is null)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Admission class was not found.",
                Status = StatusCodes.Status404NotFound
            });
        }

        return Ok(response);
    }

    [HttpPost]
    [ProducesResponseType<ClassResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ClassResponse>> Create(
        [FromBody] CreateClassRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var response = await _classService.CreateAsync(request, cancellationToken);
            return StatusCode(StatusCodes.Status201Created, response);
        }
        catch (ClassValidationException exception)
        {
            ModelState.AddModelError(exception.Key, exception.Message);
            return ValidationProblem(ModelState);
        }
        catch (ClassNameConflictException exception)
        {
            return Conflict(new ProblemDetails
            {
                Title = "Admission class already exists.",
                Detail = exception.Message,
                Status = StatusCodes.Status409Conflict
            });
        }
    }
}
