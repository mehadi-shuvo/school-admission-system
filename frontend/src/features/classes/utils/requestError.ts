import { ApiError } from "../../../lib/api/client";

export interface DisplayError {
  title: string;
  description: string;
  isNetworkError: boolean;
  isConflict: boolean;
}

export function toDisplayError(error: unknown, action: "classes" | "details" | "hold"): DisplayError {
  if (error instanceof ApiError) {
    if (error.status === 400) {
      return {
        title: "Please check the reservation details",
        description: "The admission service could not accept this request. Check the 17-digit Student ID and try again.",
        isNetworkError: false,
        isConflict: false
      };
    }

    if (error.status === 404) {
      return {
        title: action === "classes" ? "Classes were not found" : "This class is no longer available",
        description: "The class may have been removed. Refresh classes to see the latest availability.",
        isNetworkError: false,
        isConflict: false
      };
    }

    if (error.status === 409) {
      return {
        title: "This reservation could not be created",
        description: "The class may now be full, or this Student ID may already have an active or confirmed reservation. Refresh availability before trying again.",
        isNetworkError: false,
        isConflict: true
      };
    }
  }

  return {
    title: action === "hold" ? "We could not verify the reservation" : "Unable to reach the admission service",
    description: action === "hold"
      ? "The connection was lost before the result was received. A hold may have been created; do not retry automatically. Check My Holds with the same Student ID before trying again."
      : "Check your connection and try again.",
    isNetworkError: true,
    isConflict: false
  };
}
