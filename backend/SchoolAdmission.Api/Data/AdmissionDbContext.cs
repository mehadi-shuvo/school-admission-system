
using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Api.Entities;

namespace SchoolAdmission.Api.Data;

public sealed class AdmissionDbContext
    : DbContext
{
    public AdmissionDbContext(
        DbContextOptions<AdmissionDbContext> options)
        : base(options)
    {
    }

    public DbSet<AdmissionClass> AdmissionClasses
        => Set<AdmissionClass>();

    public DbSet<SeatHold> SeatHolds
        => Set<SeatHold>();

    protected override void OnModelCreating(
        ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.ApplyConfigurationsFromAssembly(
            typeof(AdmissionDbContext).Assembly);
    }
}
