using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi;
using SchoolAdmission.Api.Data;
using SchoolAdmission.Api.Interfaces;
using SchoolAdmission.Api.Middleware;
using SchoolAdmission.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer((document, _, _) =>
    {
        document.Info.Title = "Onnorokom School Admission API";
        document.Info.Version = "v1";
        document.Info.Description = """
            API for class availability and admission reservations. Student-owned operations require the `X-Student-Id` header with exactly 17 ASCII digits; leading zeroes are significant. Holds reserve a seat until their expiry time. Capacity includes unexpired holds and confirmed admissions. Concurrent reservation conflicts return `409` rather than overbooking a class.
            """;
        return Task.CompletedTask;
    });
    options.AddOperationTransformer((operation, context, _) =>
    {
        if (RequiresStudentId(context.Description.HttpMethod, context.Description.RelativePath))
        {
            operation.Parameters ??= [];
            operation.Parameters.Add(new OpenApiParameter
            {
                Name = "X-Student-Id",
                In = ParameterLocation.Header,
                Required = true,
                Description = "Birth registration number: exactly 17 ASCII digits. Leading zeroes are significant.",
                Schema = new OpenApiSchema
                {
                    Type = JsonSchemaType.String,
                    MinLength = 17,
                    MaxLength = 17,
                    Pattern = "^[0-9]{17}$"
                }
            });
        }
        operation.Description = DescribeOperation(
            context.Description.HttpMethod,
            context.Description.RelativePath);
        return Task.CompletedTask;
    });
});
builder.Services.AddProblemDetails();
builder.Services.AddSingleton<TimeProvider>(TimeProvider.System);
var holdDurationSeconds = GetPositiveIntegerSetting(
    builder.Configuration,
    "HOLD_DURATION_SECONDS",
    600);
var expiryScanIntervalSeconds = GetPositiveIntegerSetting(
    builder.Configuration,
    "HOLD_EXPIRY_SCAN_INTERVAL_SECONDS",
    30);
builder.Services.AddSingleton(new HoldSettings(
    TimeSpan.FromSeconds(holdDurationSeconds)));
builder.Services.AddSingleton(new HoldExpirySettings(
    TimeSpan.FromSeconds(expiryScanIntervalSeconds)));
builder.Services.AddDbContext<AdmissionDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("AdmissionDb");

    if (string.IsNullOrWhiteSpace(connectionString))
    {
        throw new InvalidOperationException(
            "Connection string 'ConnectionStrings:AdmissionDb' must be configured.");
    }

    options.UseNpgsql(connectionString);
});
builder.Services.AddScoped<IClassService, ClassService>();
builder.Services.AddScoped<ISeatHoldService, SeatHoldService>();
if (!builder.Environment.IsEnvironment("Testing"))
{
    builder.Services.AddHostedService<HoldExpiryBackgroundService>();
}
builder.Services.AddHealthChecks()
    .AddDbContextCheck<AdmissionDbContext>("database", tags: ["ready"]);

var app = builder.Build();

if (args.Contains("--migrate", StringComparer.Ordinal))
{
    using var scope = app.Services.CreateScope();
    var logger = scope.ServiceProvider
        .GetRequiredService<ILoggerFactory>()
        .CreateLogger("DatabaseMigration");
    var dbContext = scope.ServiceProvider.GetRequiredService<AdmissionDbContext>();

    logger.LogInformation("Applying EF Core migrations.");
    dbContext.Database.Migrate();
    logger.LogInformation("EF Core migrations completed.");
    return;
}

app.UseMiddleware<RequestCorrelationLoggingMiddleware>();
app.UseExceptionHandler();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}


app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/health");
app.MapHealthChecks("/health/ready", new()
{
    Predicate = registration => registration.Tags.Contains("ready")
});

app.Run();

static int GetPositiveIntegerSetting(
    IConfiguration configuration,
    string name,
    int defaultValue)
{
    var configuredValue = configuration[name];

    if (configuredValue is null)
    {
        return defaultValue;
    }

    if (!int.TryParse(configuredValue, out var value) || value <= 0)
    {
        throw new InvalidOperationException($"{name} must be a positive integer.");
    }

    return value;
}

static string DescribeOperation(string? method, string? path)
{
    return (method?.ToUpperInvariant(), path) switch
    {
        ("GET", "classes") =>
            "Lists classes with total, held, confirmed, and currently available seats.",
        ("POST", "classes") =>
            "Creates a class. Names are unique and capacity must be a positive integer.",
        ("GET", "classes/{classId}") =>
            "Gets one class with current seat availability.",
        ("POST", "classes/{classId}/holds") =>
            "Creates a temporary reservation. Requires `X-Student-Id` with exactly 17 ASCII digits. A hold expires at the returned timestamp; full classes and duplicate active reservations return `409`.",
        ("GET", "holds/{holdId}") =>
            "Gets the effective status of one reservation, including logical expiry.",
        ("POST", "holds/{holdId}/confirm") =>
            "Confirms a reservation for its owner. Requires `X-Student-Id` with exactly 17 ASCII digits. Repeated confirmation is idempotent; expired or cancelled holds return `409`.",
        ("DELETE", "holds/{holdId}") =>
            "Cancels a reservation for its owner and releases its seat. Requires `X-Student-Id` with exactly 17 ASCII digits. Repeated cancellation is idempotent; confirmed or expired holds return `409`.",
        ("GET", "me/holds") =>
            "Lists the caller's reservation history. Requires `X-Student-Id` with exactly 17 ASCII digits.",
        _ => operationDescription(method, path)
    };

    static string operationDescription(string? httpMethod, string? relativePath) =>
        $"{httpMethod?.ToUpperInvariant()} /{relativePath}";
}

static bool RequiresStudentId(string? method, string? path)
{
    return (method?.ToUpperInvariant(), path) is
        ("POST", "classes/{classId}/holds") or
        ("POST", "holds/{holdId}/confirm") or
        ("DELETE", "holds/{holdId}") or
        ("GET", "me/holds");
}

public partial class Program
{
}
