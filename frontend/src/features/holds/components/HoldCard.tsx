import { useEffect, useState } from "react";
import { Button } from "../../../components/ui/Button";
import { admissionApi } from "../../../lib/api/admissionApi";
import type { HoldStatus, StudentHold } from "../../../types/api";
import { HoldCountdown } from "./HoldCountdown";
import { HoldStatusBadge } from "./HoldStatusBadge";
import { toHoldDisplayError } from "../utils/holdError";

interface HoldCardProps {
  hold: StudentHold;
  studentId: string;
  onRefresh: () => void;
  onStatusReconciled: (holdId: string, status: HoldStatus) => void;
  onElapsed: (holdId: string) => void;
}

const descriptions: Record<HoldStatus, string> = {
  HELD: "This seat is temporarily reserved. Confirm it before the countdown ends.",
  CONFIRMED: "Your seat has been confirmed. Confirmed reservations cannot be cancelled here.",
  CANCELLED: "This temporary reservation was cancelled.",
  EXPIRED: "This temporary reservation has expired."
};

function formatExpiration(expiresAt: string): string {
  const parsed = new Date(expiresAt);
  return Number.isNaN(parsed.getTime()) ? expiresAt : parsed.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function HoldCard({ hold, studentId, onRefresh, onStatusReconciled, onElapsed }: HoldCardProps) {
  const [status, setStatus] = useState<HoldStatus>(hold.status);
  const [pendingAction, setPendingAction] = useState<"confirm" | "cancel" | null>(null);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [error, setError] = useState<{ operation: "confirm" | "cancel"; value: unknown } | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(false);

  useEffect(() => {
    setStatus(hold.status);
    if (hold.status !== "HELD") {
      setTimeElapsed(false);
    }
  }, [hold.status]);

  const isActive = status === "HELD" && !timeElapsed;
  const displayError = error ? toHoldDisplayError(error.value, error.operation) : null;

  async function confirmHold() {
    if (!isActive || pendingAction) return;
    setPendingAction("confirm");
    setError(null);
    try {
      const response = await admissionApi.confirmHold(hold.holdId, studentId);
      setStatus(response.status);
      onStatusReconciled(hold.holdId, response.status);
      onRefresh();
    } catch (requestError) {
      setError({ operation: "confirm", value: requestError });
      if (toHoldDisplayError(requestError, "confirm").shouldRefresh) onRefresh();
    } finally {
      setPendingAction(null);
    }
  }

  async function cancelHold() {
    if (!isActive || pendingAction) return;
    setPendingAction("cancel");
    setError(null);
    try {
      await admissionApi.cancelHold(hold.holdId, studentId);
      setStatus("CANCELLED");
      setShowCancelConfirmation(false);
      onStatusReconciled(hold.holdId, "CANCELLED");
      onRefresh();
    } catch (requestError) {
      setError({ operation: "cancel", value: requestError });
      if (toHoldDisplayError(requestError, "cancel").shouldRefresh) onRefresh();
    } finally {
      setPendingAction(null);
    }
  }

  function handleElapsed() {
    setTimeElapsed(true);
    onElapsed(hold.holdId);
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0"><h2 className="text-lg font-semibold text-slate-950">{hold.className}</h2><p className="mt-2 break-all font-mono text-xs text-slate-600">Hold ID: {hold.holdId}</p></div>
        <HoldStatusBadge status={status} />
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-600">{descriptions[status]}</p>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="font-medium text-slate-700">Expires</dt><dd className="mt-1 text-slate-900">{formatExpiration(hold.expiresAt)}</dd></div>{status === "HELD" ? <div><dt className="font-medium text-slate-700">Time remaining</dt><dd className="mt-1"><HoldCountdown expiresAt={hold.expiresAt} onElapsed={handleElapsed} /></dd></div> : null}</dl>
      {timeElapsed && status === "HELD" ? <p className="mt-4 text-sm text-amber-800" role="status">Time elapsed locally. The admission service will confirm the effective status.</p> : null}
      {displayError ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4" role="alert"><p className="font-semibold text-red-950">{displayError.title}</p><p className="mt-1 text-sm leading-6 text-red-800">{displayError.description}</p><button className="mt-3 text-sm font-semibold text-blue-800 underline underline-offset-4" onClick={onRefresh} type="button">Refresh status</button></div> : null}
      {isActive ? <div className="mt-5 flex flex-wrap gap-3"><Button disabled={pendingAction !== null} onClick={() => void confirmHold()}>{pendingAction === "confirm" ? "Confirming seat…" : "Confirm seat"}</Button>{showCancelConfirmation ? <div aria-labelledby={`cancel-title-${hold.holdId}`} className="w-full rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="font-semibold text-amber-950" id={`cancel-title-${hold.holdId}`}>Cancel this temporary hold?</p><p className="mt-1 text-sm text-amber-900">This releases the reservation and cannot be undone here.</p><div className="mt-3 flex gap-3"><Button className="bg-red-700 hover:bg-red-800" disabled={pendingAction !== null} onClick={() => void cancelHold()}>{pendingAction === "cancel" ? "Cancelling…" : "Yes, cancel hold"}</Button><button className="min-h-10 rounded-lg px-3 text-sm font-semibold text-slate-700 hover:bg-amber-100" disabled={pendingAction !== null} onClick={() => setShowCancelConfirmation(false)} type="button">Keep hold</button></div></div> : <button className="min-h-10 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700" disabled={pendingAction !== null} onClick={() => setShowCancelConfirmation(true)} type="button">Cancel hold</button>}</div> : null}
    </article>
  );
}
