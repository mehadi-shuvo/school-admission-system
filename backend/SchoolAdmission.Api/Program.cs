using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Api.Data;
using SchoolAdmission.Api.Interfaces;
using SchoolAdmission.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();
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
builder.Services.AddHealthChecks()
    .AddDbContextCheck<AdmissionDbContext>("database");

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

app.UseExceptionHandler();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}


app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/health");

app.Run();

public partial class Program
{
}
