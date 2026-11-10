import { X } from "lucide-react";
import { ErrorState } from "../../../components/feedback/ErrorState";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { Button } from "../../../components/ui/Button";
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
    <aside aria-labelledby="class-details-title" className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm lg:sticky lg:top-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">Class details</p>
          <h2 className="mt-1 text-xl font-bold text-slate-950" id="class-details-title">{currentClass.name}</h2>
        </div>
        <button aria-label="Close class details" className="grid size-10 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700" onClick={onClose} type="button"><X aria-hidden="true" className="size-5" /></button>
      </div>
      <div className="mt-4"><AvailabilityBadge admissionClass={currentClass} /></div>
      <div className="mt-5"><SeatAvailability admissionClass={currentClass} /></div>
      {isLoading ? <div className="mt-5"><LoadingState label="Refreshing class details" /></div> : null}
      {displayError ? (
        <div className="mt-5 space-y-3">
          <ErrorState description={displayError.description} title={displayError.title} />
          <Button onClick={onRefresh}>Refresh details</Button>
        </div>
      ) : null}
      <div className="mt-6 border-t border-slate-100 pt-5">
        <h3 className="text-base font-semibold text-slate-950">Reserve a temporary seat</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">The admission service makes the final availability decision when you submit.</p>
        {displayError ? <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">Refresh class details before requesting a reservation.</p> : !availability.isReservable ? <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">This class currently has no reservable seats.</p> : <div className="mt-4"><HoldForm admissionClass={currentClass} onHoldCreated={(hold) => onHoldCreated(hold, currentClass.name)} onRefreshAvailability={onRefresh} /></div>}
      </div>
    </aside>
  );
}
