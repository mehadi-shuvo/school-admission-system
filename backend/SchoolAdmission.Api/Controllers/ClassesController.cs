using Microsoft.AspNetCore.Mvc;
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
