using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Api.Data;

namespace SchoolAdmission.Api.Services;

public sealed class HoldExpiryBackgroundService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly TimeProvider _timeProvider;
    private readonly HoldExpirySettings _settings;
    private readonly ILogger<HoldExpiryBackgroundService> _logger;

    public HoldExpiryBackgroundService(
        IServiceScopeFactory scopeFactory,
        TimeProvider timeProvider,
        HoldExpirySettings settings,
        ILogger<HoldExpiryBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _timeProvider = timeProvider;
        _settings = settings;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await ExpireDueHoldsAsync(stoppingToken);

        using var timer = new PeriodicTimer(_settings.ScanInterval);

        try
        {
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                await ExpireDueHoldsAsync(stoppingToken);
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Graceful application shutdown.
        }
    }

    private async Task ExpireDueHoldsAsync(CancellationToken cancellationToken)
    {
        try
        {
            await using var scope = _scopeFactory.CreateAsyncScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AdmissionDbContext>();
            var now = _timeProvider.GetUtcNow().UtcDateTime;

            var expiredCount = await dbContext.Database.ExecuteSqlInterpolatedAsync(
                $"UPDATE seat_holds SET status = 'EXPIRED', expired_at = {now} WHERE status = 'HELD' AND expires_at <= {now}",
                cancellationToken);

            if (expiredCount > 0)
            {
                _logger.LogInformation("Persisted expiry for {ExpiredHoldCount} seat holds.", expiredCount);
            }
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Failed to process expired seat holds.");
        }
    }
}
