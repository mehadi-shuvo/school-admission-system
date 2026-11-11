using System.Diagnostics;

namespace SchoolAdmission.Api.Middleware;

public sealed class RequestCorrelationLoggingMiddleware
{
    public const string CorrelationIdHeaderName = "X-Correlation-ID";
    private const int MaximumCorrelationIdLength = 64;
    private readonly RequestDelegate _next;

    public RequestCorrelationLoggingMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(
        HttpContext context,
        ILogger<RequestCorrelationLoggingMiddleware> logger)
    {
        var correlationId = GetCorrelationId(context.Request.Headers);
        context.Response.Headers[CorrelationIdHeaderName] = correlationId;

        using (logger.BeginScope(new Dictionary<string, object?>
        {
            ["CorrelationId"] = correlationId
        }))
        {
            var startedAt = Stopwatch.GetTimestamp();

            try
            {
                await _next(context);
            }
            finally
            {
                logger.LogInformation(
                    "HTTP request {CorrelationId} completed {Method} {Path} with {StatusCode} in {ElapsedMilliseconds}ms.",
                    correlationId,
                    context.Request.Method,
                    context.Request.Path.Value,
                    context.Response.StatusCode,
                    Stopwatch.GetElapsedTime(startedAt).TotalMilliseconds);
            }
        }
    }

    private static string GetCorrelationId(IHeaderDictionary headers)
    {
        if (headers.TryGetValue(CorrelationIdHeaderName, out var values) &&
            values.Count == 1 &&
            IsValidCorrelationId(values[0]))
        {
            return values[0]!;
        }

        return Guid.NewGuid().ToString("N");
    }

    private static bool IsValidCorrelationId(string? value)
    {
        return value is { Length: > 0 and <= MaximumCorrelationIdLength } &&
               value.All(character =>
                   character is >= 'a' and <= 'z' ||
                   character is >= 'A' and <= 'Z' ||
                   character is >= '0' and <= '9' ||
                   character is '-' or '_' or '.');
    }
}
