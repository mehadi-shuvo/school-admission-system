
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SchoolAdmission.Api.Entities;

namespace SchoolAdmission.Api.Data.Configurations;

public sealed class SeatHoldConfiguration
    : IEntityTypeConfiguration<SeatHold>
{
    public void Configure(EntityTypeBuilder<SeatHold> builder)
    {
        builder.ToTable("seat_holds", table =>
        {
            table.HasCheckConstraint(
                "ck_seat_holds_student_id",
                "student_id ~ '^[0-9]{17}$'");

            table.HasCheckConstraint(
                "ck_seat_holds_status",
                "status IN ('HELD', 'CONFIRMED', 'CANCELLED', 'EXPIRED')");

            table.HasCheckConstraint(
                "ck_seat_holds_expiry",
                "expires_at > created_at");
        });

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id)
            .HasColumnName("id")
            .HasColumnType("uuid")
            .ValueGeneratedNever();

        builder.Property(x => x.ClassId)
            .HasColumnName("class_id")
            .HasColumnType("uuid")
            .IsRequired();

        builder.Property(x => x.StudentId)
            .HasColumnName("student_id")
            .HasMaxLength(17)
            .IsRequired();

        builder.Property(x => x.Status)
            .HasColumnName("status")
            .HasMaxLength(20)
            .HasConversion(
                status => status.ToString().ToUpperInvariant(),
                value => Enum.Parse<HoldStatus>(value, true))
            .IsRequired();

        builder.Property(x => x.CreatedAt)
            .HasColumnName("created_at")
            .HasColumnType("timestamp with time zone")
            .HasDefaultValueSql("CURRENT_TIMESTAMP")
            .IsRequired();

        builder.Property(x => x.ExpiresAt)
            .HasColumnName("expires_at")
            .HasColumnType("timestamp with time zone")
            .IsRequired();

        builder.Property(x => x.ConfirmedAt)
            .HasColumnName("confirmed_at")
            .HasColumnType("timestamp with time zone");

        builder.Property(x => x.CancelledAt)
            .HasColumnName("cancelled_at")
            .HasColumnType("timestamp with time zone");

        builder.Property(x => x.ExpiredAt)
            .HasColumnName("expired_at")
            .HasColumnType("timestamp with time zone");

        builder.HasIndex(x => new { x.ClassId, x.StudentId })
            .IsUnique()
            .HasFilter("status IN ('HELD', 'CONFIRMED')")
            .HasDatabaseName("ux_seat_holds_active_student_class");

        builder.HasIndex(x => new
            {
                x.ClassId,
                x.Status,
                x.ExpiresAt
            })
            .HasDatabaseName("ix_seat_holds_capacity");

        builder.HasIndex(x => new
            {
                x.StudentId,
                x.CreatedAt
            })
            .HasDatabaseName("ix_seat_holds_student_history");
    }
}
