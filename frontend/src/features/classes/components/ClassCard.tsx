import { ArrowRight, Info } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import type { AdmissionClass } from "../../../types/api";
import { AvailabilityBadge } from "./AvailabilityBadge";
import { SeatAvailability } from "./SeatAvailability";
import { getAvailabilityMetrics } from "../utils/availability";

interface ClassCardProps {
  admissionClass: AdmissionClass;
  onInspect: (admissionClass: AdmissionClass) => void;
}

export function ClassCard({ admissionClass, onInspect }: ClassCardProps) {
  const { isReservable } = getAvailabilityMetrics(admissionClass);

  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold leading-7 text-slate-950">{admissionClass.name}</h2>
        <AvailabilityBadge admissionClass={admissionClass} />
      </div>
      <div className="mt-5"><SeatAvailability admissionClass={admissionClass} /></div>
      <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-100 pt-4">
        <Button className="flex-1" disabled={!isReservable} onClick={() => onInspect(admissionClass)}>
          Reserve seat <ArrowRight aria-hidden="true" className="ml-2 size-4" />
        </Button>
        <button className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-blue-800 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700" onClick={() => onInspect(admissionClass)} type="button">
          <Info aria-hidden="true" className="size-4" /> Details
        </button>
      </div>
      {!isReservable ? <p className="mt-3 text-xs leading-5 text-slate-500">Reservations are unavailable when the admission service reports no open seats.</p> : null}
    </article>
  );
}
