import { ApiError } from "../../../lib/api/client";

export interface HoldDisplayError {
  title: string;
  description: string;
  isNetworkError: boolean;
  shouldRefresh: boolean;
}

export function toHoldDisplayError(error: unknown, operation: "history" | "confirm" | "cancel"): HoldDisplayError {
  if (error instanceof ApiError) {
    if (error.status === 400) {
      return { title: "Please check the request", description: "The admission service could not accept this request. Check the Student ID and try again.", isNetworkError: false, shouldRefresh: false };
    }
    if (error.status === 403) {
      return { title: "This reservation belongs to another student", description: "The Student ID entered does not own this reservation.", isNetworkError: false, shouldRefresh: false };
    }
    if (error.status === 404) {
      return { title: "Reservation not found", description: "This reservation may no longer exist. Refresh your history to reconcile it.", isNetworkError: false, shouldRefresh: true };
    }
    if (error.status === 409) {
      return {
        title: operation === "confirm" ? "This hold can no longer be confirmed" : "This hold can no longer be cancelled",
        description: operation === "confirm" ? "The hold may have expired or been cancelled. Refresh your history to see the server status." : "The hold may have expired or been confirmed. Refresh your history to see the server status.",
        isNetworkError: false,
        shouldRefresh: true
      };
    }
  }

  return {
    title: operation === "history" ? "Unable to load reservation history" : "We could not verify the result",
    description: operation === "history" ? "Check your connection and try again." : "The connection was lost after the request was sent, so it may have succeeded. Do not retry automatically; refresh status to reconcile with the admission service.",
    isNetworkError: true,
    shouldRefresh: false
  };
}
