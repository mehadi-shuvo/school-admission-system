import { getAvailabilityMetrics } from "../utils/availability";
import type { AdmissionClass } from "../../../types/api";

export function AvailabilityBadge({ admissionClass }: { admissionClass: AdmissionClass }) {
  const { availableSeats, isReservable } = getAvailabilityMetrics(admissionClass);
  const label = isReservable ? `${availableSeats} seat${availableSeats === 1 ? "" : "s"} available` : "No seats available";

  return (
    <span className={isReservable
      ? "inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800"
      : "inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"}
    >
      {label}
    </span>
  );
}
