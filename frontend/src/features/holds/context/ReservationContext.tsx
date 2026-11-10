import { createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren } from "react";
import type { HoldCreated, HoldStatus } from "../../../types/api";

export interface ReservationHandoff {
  hold: HoldCreated;
  className: string;
  reconciledStatus?: HoldStatus;
}

interface ReservationContextValue {
  studentId: string;
  setStudentId: (studentId: string) => void;
  clearStudentId: () => void;
  latestReservation: ReservationHandoff | null;
  setLatestReservation: (reservation: ReservationHandoff | null) => void;
  reconcileLatestReservation: (holdId: string, status: HoldStatus) => void;
  clearLatestReservation: () => void;
}

const ReservationContext = createContext<ReservationContextValue | null>(null);

export function ReservationProvider({ children }: PropsWithChildren) {
  const [studentId, setStudentIdState] = useState("");
  const [latestReservation, setLatestReservation] = useState<ReservationHandoff | null>(null);

  const setStudentId = useCallback((nextStudentId: string) => {
    setStudentIdState(nextStudentId);
    setLatestReservation((current) => current?.hold.studentId === nextStudentId ? current : null);
  }, []);

  const clearStudentId = useCallback(() => {
    setStudentIdState("");
    setLatestReservation(null);
  }, []);

  const setLatestReservationForStudent = useCallback((reservation: ReservationHandoff | null) => {
    setLatestReservation(reservation);
    if (reservation) {
      setStudentIdState(reservation.hold.studentId);
    }
  }, []);

  const value = useMemo(() => ({
    studentId,
    setStudentId,
    clearStudentId,
    latestReservation,
    setLatestReservation: setLatestReservationForStudent,
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
  }), [clearStudentId, latestReservation, setLatestReservationForStudent, setStudentId, studentId]);

  return <ReservationContext.Provider value={value}>{children}</ReservationContext.Provider>;
}

export function useReservation() {
  const context = useContext(ReservationContext);
  if (!context) {
    throw new Error("useReservation must be used within ReservationProvider.");
  }
  return context;
}
