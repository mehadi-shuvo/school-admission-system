import type { AdmissionClass } from "../../../types/api";

export interface AvailabilityMetrics {
  availableSeats: number;
  occupiedSeats: number;
  occupancyPercentage: number;
  progressValue: number;
  isReservable: boolean;
  hasInconsistentCounts: boolean;
}

export function getAvailabilityMetrics(admissionClass: AdmissionClass): AvailabilityMetrics {
  const occupiedSeats = admissionClass.heldSeats + admissionClass.confirmedSeats;
  const occupancyPercentage = admissionClass.totalSeats > 0
    ? (occupiedSeats / admissionClass.totalSeats) * 100
    : 0;
  const isFiniteCount = Number.isFinite(admissionClass.availableSeats)
    && Number.isFinite(admissionClass.totalSeats)
    && Number.isFinite(occupiedSeats);

  return {
    availableSeats: admissionClass.availableSeats,
    occupiedSeats,
    occupancyPercentage,
    // ARIA progress values must stay in their documented range. The text keeps
    // the API values visible when the source data is inconsistent.
    progressValue: Math.max(0, Math.min(100, occupancyPercentage)),
    isReservable: isFiniteCount && admissionClass.availableSeats > 0,
    hasInconsistentCounts: !isFiniteCount
      || admissionClass.totalSeats < 0
      || admissionClass.heldSeats < 0
      || admissionClass.confirmedSeats < 0
      || admissionClass.availableSeats < 0
      || occupiedSeats > admissionClass.totalSeats
      || occupiedSeats + admissionClass.availableSeats !== admissionClass.totalSeats
  };
}
