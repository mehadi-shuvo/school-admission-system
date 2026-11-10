import type {
  AdmissionClass,
  ClassCreated,
  ConfirmHoldResponse,
  CreateClassInput,
  HoldCreated,
  HoldDetails,
  StudentHold
} from "../../types/api";
import { apiRequest } from "./client";

export const admissionApi = {
  listClasses: (signal?: AbortSignal) =>
    apiRequest<AdmissionClass[]>("/classes", { signal }),
  getClass: (classId: string, signal?: AbortSignal) =>
    apiRequest<AdmissionClass>(`/classes/${classId}`, { signal }),
  createClass: (input: CreateClassInput, signal?: AbortSignal) =>
    apiRequest<ClassCreated>("/classes", { method: "POST", body: input, signal }),
  createHold: (classId: string, studentId: string, signal?: AbortSignal) =>
    apiRequest<HoldCreated>(`/classes/${classId}/holds`, {
      method: "POST",
      headers: { "X-Student-Id": studentId },
      signal
    }),
  getHold: (holdId: string, signal?: AbortSignal) =>
    apiRequest<HoldDetails>(`/holds/${holdId}`, { signal }),
  confirmHold: (holdId: string, studentId: string, signal?: AbortSignal) =>
    apiRequest<ConfirmHoldResponse>(`/holds/${holdId}/confirm`, {
      method: "POST",
      headers: { "X-Student-Id": studentId },
      signal
    }),
  cancelHold: (holdId: string, studentId: string, signal?: AbortSignal) =>
    apiRequest<void>(`/holds/${holdId}`, {
      method: "DELETE",
      headers: { "X-Student-Id": studentId },
      signal
    }),
  getStudentHolds: (studentId: string, signal?: AbortSignal) =>
    apiRequest<StudentHold[]>("/me/holds", {
      headers: { "X-Student-Id": studentId },
      signal
    })
};
