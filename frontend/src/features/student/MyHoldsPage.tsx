import { ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { EmptyState } from "../../components/feedback/EmptyState";
import { ErrorState } from "../../components/feedback/ErrorState";
import { LoadingState } from "../../components/feedback/LoadingState";
import { Button } from "../../components/ui/Button";
import { PageHeading } from "../../components/ui/PageHeading";
import { admissionApi } from "../../lib/api/admissionApi";
import { isValidStudentId } from "../../lib/utils/studentId";
import { HoldCard } from "../holds/components/HoldCard";
import { useReservation } from "../holds/context/ReservationContext";
import { useStudentHolds } from "../holds/hooks/useStudentHolds";
import { toHoldDisplayError } from "../holds/utils/holdError";

export function MyHoldsPage() {
  const { latestReservation, reconcileLatestReservation, studentId, setStudentId, clearStudentId } = useReservation();
  const history = useStudentHolds();
  const [touched, setTouched] = useState(false);
  const handoffStudentId = latestReservation?.hold.studentId;
  const fetchedHandoffFor = useRef<string | null>(null);
  const validStudentId = isValidStudentId(studentId);

  useEffect(() => {
    if (handoffStudentId && validStudentId && fetchedHandoffFor.current !== handoffStudentId) {
      fetchedHandoffFor.current = handoffStudentId;
      void history.load(handoffStudentId);
    }
  }, [handoffStudentId, history.load, validStudentId]);

  useEffect(() => {
    if (history.studentId && (!validStudentId || history.studentId !== studentId)) {
      history.clear();
    }
  }, [history.clear, history.studentId, studentId, validStudentId]);

  function submitLookup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    if (validStudentId) void history.load(studentId);
  }

  function switchStudent() {
    history.clear();
    clearStudentId();
    setTouched(false);
  }

  function refreshHistory() {
    if (history.studentId) {
      void history.load(history.studentId);
    }
  }

  async function reconcileElapsedHold(holdId: string) {
    if (!history.studentId) return;
    try {
      const currentHold = await admissionApi.getHold(holdId);
      reconcileLatestReservation(holdId, currentHold.status);
    } catch {
      // A history refresh below is the safer reconciliation path if details are unavailable.
    } finally {
      void history.load(history.studentId);
    }
  }

  const historyError = history.error ? toHoldDisplayError(history.error, "history") : null;

  return (
    <div className="space-y-8">
      <PageHeading title="My reservations" description="Use the assignment-defined student identifier to view and manage your own admission reservations." />
      <section aria-labelledby="history-lookup-title" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-950" id="history-lookup-title">Find reservation history</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">This Student ID is shared with the page header. It is a lookup identifier, not a sign-in method.</p>
        <form className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-start" noValidate onSubmit={submitLookup}><div className="min-w-0 flex-1"><label className="block text-sm font-semibold text-slate-900" htmlFor="history-student-id">Student ID</label><input aria-describedby="history-student-id-help history-student-id-error" aria-invalid={touched && !validStudentId} autoComplete="off" className="mt-2 block min-h-11 w-full rounded-lg border border-slate-300 px-3 text-slate-950 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100" id="history-student-id" inputMode="numeric" maxLength={17} onBlur={() => setTouched(true)} onChange={(event) => setStudentId(event.target.value)} pattern="[0-9]{17}" placeholder="17-digit Student ID" type="text" value={studentId} /><p className="mt-2 text-sm text-slate-600" id="history-student-id-help">Leading zeros are preserved.</p><p className="mt-1 min-h-5 text-sm text-red-700" id="history-student-id-error" role={touched && !validStudentId ? "alert" : undefined}>{touched && !validStudentId ? "Enter exactly 17 ASCII digits." : ""}</p></div><Button className="sm:mt-7" disabled={!validStudentId || history.isLoading} type="submit">{history.isLoading ? "Loading history…" : "View reservations"}</Button></form>
        {history.studentId ? <button className="mt-2 text-sm font-semibold text-blue-800 underline underline-offset-4" onClick={switchStudent} type="button">Use another Student ID</button> : null}
      </section>
      <section aria-labelledby="reservation-history-title">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-semibold text-slate-950" id="reservation-history-title">Reservation history</h2><p className="mt-1 text-sm text-slate-600">The admission service provides the effective reservation status.</p></div>{history.studentId ? <Button onClick={refreshHistory}>Refresh history</Button> : null}</div>
        <div aria-live="polite" className="mt-5">
          {history.isLoading ? <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><LoadingState label="Loading reservation history" /></div> : null}
          {historyError ? <div className="space-y-3"><ErrorState description={historyError.description} title={historyError.title} />{history.studentId ? <Button onClick={refreshHistory}>Retry</Button> : null}</div> : null}
          {!history.isLoading && !historyError && !history.studentId ? <EmptyState title="Enter a Student ID to view reservations" description="Reservation history is shown only after a valid Student ID lookup." /> : null}
          {!history.isLoading && !historyError && history.hasLoaded && history.holds.length === 0 ? <EmptyState title="No reservations found" description="There are no active or historical reservations for this Student ID." /> : null}
          {!history.isLoading && !historyError && history.holds.length > 0 && history.studentId ? <div className="grid gap-5">{history.holds.map((hold) => <HoldCard hold={hold} key={hold.holdId} onElapsed={(holdId) => void reconcileElapsedHold(holdId)} onRefresh={refreshHistory} onStatusReconciled={reconcileLatestReservation} studentId={history.studentId!} />)}</div> : null}
        </div>
      </section>
      <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-950"><ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-blue-700" /><p>Your student identifier is used only for the assignment-defined reservation lookup. It is not a sign-in method.</p></div>
    </div>
  );
}
