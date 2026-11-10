export type HoldStatus = "HELD" | "CONFIRMED" | "CANCELLED" | "EXPIRED";

export interface AdmissionClass {
  id: string;
  name: string;
  totalSeats: number;
  heldSeats: number;
  confirmedSeats: number;
  availableSeats: number;
}

export interface ClassCreated {
  id: string;
  name: string;
  totalSeats: number;
}

export interface CreateClassInput {
  name: string;
  totalSeats: number;
}

export interface HoldCreated {
  holdId: string;
  classId: string;
  studentId: string;
  status: "HELD";
  expiresAt: string;
}

export interface HoldDetails {
  holdId: string;
  classId: string;
  status: HoldStatus;
  expiresAt: string;
}

export interface ConfirmHoldResponse {
  holdId: string;
  status: "CONFIRMED";
}

export interface StudentHold {
  holdId: string;
  classId: string;
  className: string;
  status: HoldStatus;
  expiresAt: string;
}
