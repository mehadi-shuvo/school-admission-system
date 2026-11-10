import { createContext, useContext, useMemo, useState, type PropsWithChildren } from "react";
import type { HoldCreated, HoldStatus } from "../../../types/api";

export interface ReservationHandoff {
  hold: HoldCreated;
  className: string;
  reconciledStatus?: HoldStatus;
}

interface ReservationContextValue {
  latestReservation: ReservationHandoff | null;
  setLatestReservation: (reservation: ReservationHandoff | null) => void;
  reconcileLatestReservation: (holdId: string, status: HoldStatus) => void;
  clearLatestReservation: () => void;
}

const ReservationContext = createContext<ReservationContextValue | null>(null);

export function ReservationProvider({ children }: PropsWithChildren) {
  const [latestReservation, setLatestReservation] = useState<ReservationHandoff | null>(null);
  const value = useMemo(() => ({
    latestReservation,
    setLatestReservation,
    reconcileLatestReservation: (holdId: string, status: HoldStatus) => {
      setLatestReservation((current) => {
        if (!current || current.hold.holdId !== holdId) {
          return current;
        }
        return status === "CANCELLED" || status === "EXPIRED"
          ? null
          : { ...current, reconciledStatus: status };
      });
    },
    clearLatestReservation: () => setLatestReservation(null)
  }), [latestReservation]);

  return <ReservationContext.Provider value={value}>{children}</ReservationContext.Provider>;
}

export function useReservation() {
  const context = useContext(ReservationContext);
  if (!context) {
    throw new Error("useReservation must be used within ReservationProvider.");
  }
  return context;
}
