import { Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { ErrorState } from "../../components/feedback/ErrorState";
import { EmptyState } from "../../components/feedback/EmptyState";
import { LoadingState } from "../../components/feedback/LoadingState";
import { Button } from "../../components/ui/Button";
import { PageHeading } from "../../components/ui/PageHeading";
import type { AdmissionClass, HoldCreated } from "../../types/api";
import { ReservationSuccessPanel } from "../holds/components/ReservationSuccessPanel";
import { useReservation } from "../holds/context/ReservationContext";
import { ClassCard } from "./components/ClassCard";
import { ClassDetailsPanel } from "./components/ClassDetailsPanel";
import { useClasses } from "./hooks/useClasses";
import { useClassDetails } from "./hooks/useClassDetails";
import { toDisplayError } from "./utils/requestError";

export function DashboardPage() {
  const { classes, isLoading, error, refresh } = useClasses();
  const [searchTerm, setSearchTerm] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [selectedClass, setSelectedClass] = useState<AdmissionClass | null>(null);
  const details = useClassDetails(selectedClass?.id ?? null);
  const { latestReservation, setLatestReservation } = useReservation();

  const filteredClasses = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase();
    return classes.filter((admissionClass) => {
      const matchesSearch = !normalizedSearch || admissionClass.name.toLocaleLowerCase().includes(normalizedSearch);
      const matchesAvailability = !availableOnly || admissionClass.availableSeats > 0;
      return matchesSearch && matchesAvailability;
    });
  }, [availableOnly, classes, searchTerm]);

  function handleHoldCreated(hold: HoldCreated, className: string) {
    setLatestReservation({ hold, className });
    void refresh();
    void details.refresh();
  }

  const displayError = error ? toDisplayError(error, "classes") : null;
  const hasActiveFilter = Boolean(searchTerm.trim()) || availableOnly;

  return (
    <div className="space-y-8">
      <PageHeading title="Find the right class" description="Review live availability, then place a temporary seat reservation with your Student ID." />
      {latestReservation ? <ReservationSuccessPanel reservation={latestReservation} /> : null}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-labelledby="available-classes-title">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div><h2 className="text-lg font-semibold text-slate-950" id="available-classes-title">Available classes</h2><p className="mt-1 text-sm text-slate-600">Seat information comes directly from the admission service.</p></div>
              <Button className="w-full sm:w-auto" onClick={() => void refresh()}>Refresh classes</Button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <div>
                <label className="block text-sm font-semibold text-slate-900" htmlFor="class-search">Search classes</label>
                <div className="relative mt-2"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" /><input className="block min-h-11 w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-slate-950 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100" id="class-search" onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search by class name" type="search" value={searchTerm} /></div>
              </div>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-800"><SlidersHorizontal aria-hidden="true" className="size-4 text-slate-600" /><input checked={availableOnly} className="size-4 accent-blue-700" onChange={(event) => setAvailableOnly(event.target.checked)} type="checkbox" />Available only</label>
            </div>
          </div>
          <div aria-live="polite" className="mt-6">
            {isLoading ? <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"><LoadingState label="Loading classes" /></div> : null}
            {displayError ? <div className="space-y-3"><ErrorState description={displayError.description} title={displayError.title} /><Button onClick={() => void refresh()}>Retry</Button></div> : null}
            {!isLoading && !displayError && classes.length === 0 ? <EmptyState title="No classes are available" description="The admission service has not returned any classes yet. Please check again later." /> : null}
            {!isLoading && !displayError && classes.length > 0 && filteredClasses.length === 0 ? <EmptyState title="No classes match your search" description={hasActiveFilter ? "Try changing the search text or removing the availability filter." : "No matching classes were found."} /> : null}
            {!isLoading && !displayError && filteredClasses.length > 0 ? <div className="grid gap-5 md:grid-cols-2">{filteredClasses.map((admissionClass) => <ClassCard admissionClass={admissionClass} key={admissionClass.id} onInspect={setSelectedClass} />)}</div> : null}
          </div>
        </section>
        {selectedClass ? <ClassDetailsPanel admissionClass={details.admissionClass} error={details.error} fallbackClass={selectedClass} isLoading={details.isLoading} onClose={() => setSelectedClass(null)} onHoldCreated={handleHoldCreated} onRefresh={() => void details.refresh()} /> : <aside className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-6 text-slate-600 lg:sticky lg:top-6">Select a class to review its latest seat counts and reserve a temporary seat.</aside>}
      </div>
    </div>
  );
}
