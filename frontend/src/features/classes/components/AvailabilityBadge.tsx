import { getAvailabilityMetrics } from "../utils/availability";
import type { AdmissionClass } from "../../../types/api";

export function AvailabilityBadge({ admissionClass }: { admissionClass: AdmissionClass }) {
  const { availableSeats, isReservable } = getAvailabilityMetrics(admissionClass);
  const label = isReservable ? `${availableSeats} Available` : "No Seats Available";

  return (
    <span className={isReservable
      ? "inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800"
      : "inline-flex rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-800"}
    >
      {label}
    </span>
  );
}
