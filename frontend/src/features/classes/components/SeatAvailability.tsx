import { getAvailabilityMetrics } from "../utils/availability";
import type { AdmissionClass } from "../../../types/api";

export function SeatAvailability({ admissionClass }: { admissionClass: AdmissionClass }) {
  const metrics = getAvailabilityMetrics(admissionClass);
  const percentageText = Number.isFinite(metrics.occupancyPercentage)
    ? `${Math.round(metrics.occupancyPercentage)}% occupied`
    : "Occupancy unavailable";

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Available seats</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{admissionClass.availableSeats}</p>
        </div>
        <p className="text-right text-sm font-medium text-slate-600">{percentageText}</p>
      </div>
      <div
        aria-label={`Seat occupancy: ${percentageText}`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={Math.round(metrics.progressValue)}
        className="h-2.5 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
      >
        <div className="h-full rounded-full bg-blue-700 transition-[width]" style={{ width: `${metrics.progressValue}%` }} />
      </div>
      <dl className="grid grid-cols-3 gap-2 text-xs text-slate-600">
        <div><dt className="text-slate-500">Held</dt><dd className="mt-1 font-semibold text-slate-800">{admissionClass.heldSeats}</dd></div>
        <div><dt className="text-slate-500">Confirmed</dt><dd className="mt-1 font-semibold text-slate-800">{admissionClass.confirmedSeats}</dd></div>
        <div><dt className="text-slate-500">Total</dt><dd className="mt-1 font-semibold text-slate-800">{admissionClass.totalSeats}</dd></div>
      </dl>
      {metrics.hasInconsistentCounts ? (
        <p className="text-xs leading-5 text-amber-800" role="note">Availability is reported by the admission service and may be updating. Refresh before reserving.</p>
      ) : null}
    </div>
  );
}
