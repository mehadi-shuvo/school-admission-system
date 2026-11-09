
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SchoolAdmission.Api.Entities;

namespace SchoolAdmission.Api.Data.Configurations;

public sealed class AdmissionClassConfiguration
    : IEntityTypeConfiguration<AdmissionClass>
{
    public void Configure(
        EntityTypeBuilder<AdmissionClass> builder)
    {
        builder.ToTable("admission_classes", table =>
        {
            table.HasCheckConstraint(
                "ck_admission_classes_total_seats_positive",
                "total_seats > 0");
        });

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id)
            .HasColumnName("id")
            .HasColumnType("uuid")
            .ValueGeneratedNever();

        builder.Property(x => x.Name)
            .HasColumnName("name")
            .HasMaxLength(150)
            .IsRequired();

        builder.HasIndex(x => x.Name)
            .IsUnique()
            .HasDatabaseName("ux_admission_classes_name");

        builder.Property(x => x.TotalSeats)
            .HasColumnName("total_seats")
            .IsRequired();

        builder.Property(x => x.CreatedAt)
            .HasColumnName("created_at")
            .HasColumnType("timestamp with time zone")
            .HasDefaultValueSql("CURRENT_TIMESTAMP")
            .IsRequired();

        builder.HasMany(x => x.Holds)
            .WithOne(x => x.Class)
            .HasForeignKey(x => x.ClassId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
