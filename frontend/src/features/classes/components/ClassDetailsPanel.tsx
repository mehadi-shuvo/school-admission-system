import { X } from "lucide-react";
import { ErrorState } from "../../../components/feedback/ErrorState";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { Button } from "../../../components/ui/Button";
import { ApiError } from "../../../lib/api/client";
import type { AdmissionClass, HoldCreated } from "../../../types/api";
import { HoldForm } from "../../holds/components/HoldForm";
import { AvailabilityBadge } from "./AvailabilityBadge";
import { SeatAvailability } from "./SeatAvailability";
import { getAvailabilityMetrics } from "../utils/availability";
import { toDisplayError } from "../utils/requestError";

interface ClassDetailsPanelProps {
  fallbackClass: AdmissionClass;
  admissionClass: AdmissionClass | null;
  isLoading: boolean;
  error: unknown;
  onClose: () => void;
  onRefresh: () => void;
  onHoldCreated: (hold: HoldCreated, className: string) => void;
}

export function ClassDetailsPanel({ fallbackClass, admissionClass, isLoading, error, onClose, onRefresh, onHoldCreated }: ClassDetailsPanelProps) {
  const currentClass = admissionClass ?? fallbackClass;
  const availability = getAvailabilityMetrics(currentClass);
  const displayError = error ? toDisplayError(error, "details") : null;

  return (
    <aside aria-labelledby="class-details-title" className="rounded-2xl border border-[#dce6f2] bg-white p-5 shadow-[0_12px_32px_rgba(18,52,91,0.08)] xl:sticky xl:top-24">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-wide text-[#237a67]">Class Details</p>
          <h2 className="mt-1 text-xl font-bold text-[#102a4c]" id="class-details-title">{currentClass.name}</h2>
        </div>
        <button aria-label="শ্রেণির বিস্তারিত বন্ধ করুন" className="grid size-10 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#12345b]" onClick={onClose} type="button"><X aria-hidden="true" className="size-5" /></button>
      </div>
      <div className="mt-4"><AvailabilityBadge admissionClass={currentClass} /></div>
      <div className="mt-5"><SeatAvailability admissionClass={currentClass} /></div>
      {isLoading ? <div className="mt-5"><LoadingState label="শ্রেণির তথ্য হালনাগাদ হচ্ছে" /></div> : null}
      {displayError ? (
        <div className="mt-5 space-y-3">
          <ErrorState correlationId={error instanceof ApiError ? error.correlationId : undefined} description={displayError.description} title={displayError.title} />
          <Button onClick={onRefresh}>আবার চেষ্টা করুন</Button>
        </div>
      ) : null}
      <div className="mt-6 border-t border-slate-100 pt-5">
        <h3 className="text-base font-bold text-[#102a4c]">Reserve Seat</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">ফর্ম জমা দেওয়ার সময় ভর্তি সেবা আসনের চূড়ান্ত অবস্থা যাচাই করবে।</p>
        {displayError && !admissionClass ? <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">সংরক্ষণের আগে শ্রেণির তথ্য আবার হালনাগাদ করুন।</p> : !availability.isReservable ? <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">এই শ্রেণিতে বর্তমানে কোনো খালি আসন নেই।</p> : <div className="mt-4"><HoldForm admissionClass={currentClass} onHoldCreated={(hold) => onHoldCreated(hold, currentClass.name)} onRefreshAvailability={onRefresh} /></div>}
      </div>
    </aside>
  );
}
