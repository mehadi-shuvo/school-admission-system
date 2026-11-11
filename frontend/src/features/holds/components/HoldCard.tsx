import { CheckCircle2, Clock3, LoaderCircle, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  HELD: "আপনার জন্য আসনটি সাময়িকভাবে সংরক্ষিত আছে। সময় শেষ হওয়ার আগে ভর্তি নিশ্চিত করুন।",
  CONFIRMED: "আপনার ভর্তি নিশ্চিত হয়েছে। নিশ্চিত ভর্তি এই পৃষ্ঠা থেকে বাতিল করা যায় না।",
  CANCELLED: "এই সাময়িক আসন সংরক্ষণ বাতিল করা হয়েছে।",
  EXPIRED: "এই সাময়িক আসন সংরক্ষণের সময় শেষ হয়েছে।"
};

function formatExpiration(expiresAt: string): string {
  const parsed = new Date(expiresAt);
  return Number.isNaN(parsed.getTime()) ? expiresAt : parsed.toLocaleString("bn-BD", { dateStyle: "medium", timeStyle: "short" });
}

export function HoldCard({ hold, studentId, onRefresh, onStatusReconciled, onElapsed }: HoldCardProps) {
  const [status, setStatus] = useState<HoldStatus>(hold.status);
  const [pendingAction, setPendingAction] = useState<"confirm" | "cancel" | null>(null);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [error, setError] = useState<{ operation: "confirm" | "cancel"; value: unknown } | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(false);
  const [confirmationSucceeded, setConfirmationSucceeded] = useState(false);
  const mountedRef = useRef(true);
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      activeRequest.current?.abort();
    };
  }, []);

  useEffect(() => {
    setStatus(hold.status);
    setConfirmationSucceeded(false);
    if (hold.status !== "HELD") setTimeElapsed(false);
  }, [hold.status]);

  const isActive = status === "HELD" && !timeElapsed;
  const displayError = error ? toHoldDisplayError(error.value, error.operation) : null;

  async function confirmHold() {
    if (!isActive || pendingAction) return;
    const controller = new AbortController();
    activeRequest.current = controller;
    setPendingAction("confirm");
    setError(null);
    setConfirmationSucceeded(false);
    try {
      const response = await admissionApi.confirmHold(hold.holdId, studentId, controller.signal);
      if (!mountedRef.current || controller.signal.aborted) return;
      setStatus(response.status);
      setConfirmationSucceeded(true);
      onStatusReconciled(hold.holdId, response.status);
      onRefresh();
    } catch (requestError) {
      if (!mountedRef.current || controller.signal.aborted) return;
      setError({ operation: "confirm", value: requestError });
      if (toHoldDisplayError(requestError, "confirm").shouldRefresh) onRefresh();
    } finally {
      if (mountedRef.current && !controller.signal.aborted) setPendingAction(null);
      if (activeRequest.current === controller) activeRequest.current = null;
    }
  }

  async function cancelHold() {
    if (!isActive || pendingAction) return;
    const controller = new AbortController();
    activeRequest.current = controller;
    setPendingAction("cancel");
    setError(null);
    try {
      await admissionApi.cancelHold(hold.holdId, studentId, controller.signal);
      if (!mountedRef.current || controller.signal.aborted) return;
      setStatus("CANCELLED");
      setShowCancelConfirmation(false);
      onStatusReconciled(hold.holdId, "CANCELLED");
      onRefresh();
    } catch (requestError) {
      if (!mountedRef.current || controller.signal.aborted) return;
      setError({ operation: "cancel", value: requestError });
      if (toHoldDisplayError(requestError, "cancel").shouldRefresh) onRefresh();
    } finally {
      if (mountedRef.current && !controller.signal.aborted) setPendingAction(null);
      if (activeRequest.current === controller) activeRequest.current = null;
    }
  }

  function handleElapsed() {
    setTimeElapsed(true);
    onElapsed(hold.holdId);
  }

  return (
    <article className="rounded-2xl border border-[#dce6f2] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><p className="text-xs font-bold tracking-wide text-[#237a67]">Application Status</p><h2 className="mt-1 text-xl font-bold text-[#102a4c]">{hold.className}</h2><p className="mt-2 break-all font-mono text-xs text-slate-500">Reservation ID: {hold.holdId}</p></div><HoldStatusBadge status={status} /></div>
      <p className="mt-4 text-sm leading-7 text-slate-600">{descriptions[status]}</p>
      <dl className="mt-5 grid gap-3 rounded-xl bg-[#f6f9fd] p-4 text-sm sm:grid-cols-2"><div><dt className="flex items-center gap-2 font-bold text-[#17365d]"><Clock3 aria-hidden="true" className="size-4 text-[#237a67]" />সময়সীমা</dt><dd className="mt-2 text-slate-900">{formatExpiration(hold.expiresAt)}</dd></div>{status === "HELD" ? <div><dt className="font-bold text-[#17365d]">বাকি সময়</dt><dd className="mt-2"><HoldCountdown expiresAt={hold.expiresAt} onElapsed={handleElapsed} /></dd></div> : null}</dl>
      {timeElapsed && status === "HELD" ? <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900" role="status">এই ডিভাইসে সময় শেষ হয়েছে। ভর্তি সেবা থেকে সর্বশেষ অবস্থা যাচাই করা হচ্ছে।</p> : null}
      {confirmationSucceeded ? <div className="mt-4 flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4" role="status"><CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-emerald-700" /><p className="text-sm font-semibold leading-6 text-emerald-950">Admission Confirmed</p></div> : null}
      {displayError ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4" role="alert"><p className="font-bold text-red-950">{error?.operation === "confirm" ? "Unable to confirm admission. Please try again." : displayError.title}</p><p className="mt-1 text-sm leading-6 text-red-800">{error?.operation === "confirm" ? "এটি একটি সিমুলেটেড নিশ্চিতকরণ; কোনো প্রকৃত পেমেন্ট নেওয়া হয় না।" : displayError.description}</p><button className="mt-3 text-sm font-bold text-[#12345b] underline underline-offset-4" onClick={onRefresh} type="button">Check latest status</button></div> : null}
      {isActive ? <div className="mt-5 flex flex-wrap gap-3"><div className="min-w-[14rem] flex-1"><h3 className="mb-3 text-base font-bold text-[#102a4c]">Admission Confirmation</h3><Button className="w-full" disabled={pendingAction !== null} onClick={() => void confirmHold()}>{pendingAction === "confirm" ? <><LoaderCircle aria-hidden="true" className="mr-2 size-4 animate-spin motion-reduce:animate-none" />Processing your admission...</> : "Confirm Admission"}</Button><p aria-live="polite" className="mt-2 text-xs leading-5 text-slate-600">{pendingAction === "confirm" ? "অনুগ্রহ করে অপেক্ষা করুন" : "এটি একটি সিমুলেটেড পেমেন্ট নিশ্চিতকরণ; কোনো প্রকৃত অর্থপ্রদান প্রক্রিয়া করা হয় না।"}</p></div>{showCancelConfirmation ? <div aria-labelledby={`cancel-title-${hold.holdId}`} className="w-full rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="font-bold text-amber-950" id={`cancel-title-${hold.holdId}`}>সাময়িক সংরক্ষণ বাতিল করবেন?</p><p className="mt-1 text-sm leading-6 text-amber-900">বাতিল করলে আসনটি অন্য শিক্ষার্থীর জন্য উন্মুক্ত হবে।</p><div className="mt-3 flex flex-wrap gap-3"><Button className="bg-red-700 hover:bg-red-800" disabled={pendingAction !== null} onClick={() => void cancelHold()}>{pendingAction === "cancel" ? "Cancelling..." : "Yes, Cancel Reservation"}</Button><button className="min-h-11 rounded-xl px-3 text-sm font-bold text-slate-700 hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#12345b]" disabled={pendingAction !== null} onClick={() => setShowCancelConfirmation(false)} type="button">Keep Reservation</button></div></div> : <button className="min-h-11 rounded-xl border border-[#cbd8e7] px-4 text-sm font-bold text-[#17365d] hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#12345b]" disabled={pendingAction !== null} onClick={() => setShowCancelConfirmation(true)} type="button">Cancel Reservation</button>}</div> : null}
      {status === "CONFIRMED" ? <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-emerald-800"><ShieldCheck aria-hidden="true" className="size-4" />Admission Confirmed</p> : null}
    </article>
  );
}
