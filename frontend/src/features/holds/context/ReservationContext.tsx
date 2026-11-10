import { createContext, useContext, useMemo, useState, type PropsWithChildren } from "react";
import type { HoldCreated } from "../../../types/api";

export interface ReservationHandoff {
  hold: HoldCreated;
  className: string;
}

interface ReservationContextValue {
  latestReservation: ReservationHandoff | null;
  setLatestReservation: (reservation: ReservationHandoff | null) => void;
}

const ReservationContext = createContext<ReservationContextValue | null>(null);

export function ReservationProvider({ children }: PropsWithChildren) {
  const [latestReservation, setLatestReservation] = useState<ReservationHandoff | null>(null);
  const value = useMemo(() => ({ latestReservation, setLatestReservation }), [latestReservation]);

  return <ReservationContext.Provider value={value}>{children}</ReservationContext.Provider>;
}

export function useReservation() {
  const context = useContext(ReservationContext);
  if (!context) {
    throw new Error("useReservation must be used within ReservationProvider.");
  }
  return context;
}
