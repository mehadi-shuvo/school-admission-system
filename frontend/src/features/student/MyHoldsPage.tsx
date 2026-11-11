import { ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { EmptyState } from "../../components/feedback/EmptyState";
import { ErrorState } from "../../components/feedback/ErrorState";
import { LoadingState } from "../../components/feedback/LoadingState";
import { Button } from "../../components/ui/Button";
import { PageHeading } from "../../components/ui/PageHeading";
import { admissionApi } from "../../lib/api/admissionApi";
import { ApiError } from "../../lib/api/client";
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
    if (history.studentId && (!validStudentId || history.studentId !== studentId)) history.clear();
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
    if (history.studentId) void history.load(history.studentId);
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
      <PageHeading title="My Applications" description="আপনার জন্মনিবন্ধন নম্বর দিয়ে ভর্তি আবেদন ও সংরক্ষণের বর্তমান অবস্থা দেখুন।" />
      <section aria-labelledby="history-lookup-title" className="rounded-2xl border border-[#dce6f2] bg-white p-5 shadow-sm sm:p-6"><h2 className="text-xl font-bold text-[#102a4c]" id="history-lookup-title">Find your applications</h2><p className="mt-1 text-sm leading-6 text-slate-600">এই জন্মনিবন্ধন নম্বরটি পেজের উপরের নম্বরের সঙ্গে একই। এটি লগইন পদ্ধতি নয়, শুধু আবেদন খোঁজার জন্য ব্যবহৃত হয়।</p>
        <form className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-start" noValidate onSubmit={submitLookup}><div className="min-w-0 flex-1"><label className="block text-sm font-bold text-[#17365d]" htmlFor="history-student-id">Birth Registration Number</label><input aria-describedby="history-student-id-help history-student-id-error" aria-invalid={touched && !validStudentId} autoComplete="off" className="mt-2 block min-h-11 w-full rounded-xl border border-[#cbd8e7] px-3 text-slate-950 outline-none focus:border-[#12345b] focus:ring-2 focus:ring-blue-100" id="history-student-id" inputMode="numeric" maxLength={17} onBlur={() => setTouched(true)} onChange={(event) => setStudentId(event.target.value)} pattern="[0-9]{17}" placeholder="Enter your 17-digit birth registration number" type="text" value={studentId} /><p className="mt-2 text-sm text-slate-600" id="history-student-id-help">শুরুর শূন্য অক্ষুণ্ণ থাকবে।</p><p className="mt-1 min-h-5 text-sm text-red-700" id="history-student-id-error" role={touched && !validStudentId ? "alert" : undefined}>{touched && !validStudentId ? "ঠিক ১৭টি ইংরেজি সংখ্যা লিখুন।" : ""}</p></div><Button className="sm:mt-7" disabled={!validStudentId || history.isLoading} type="submit">{history.isLoading ? "Loading applications..." : "View Applications"}</Button></form>
        {history.studentId ? <button className="mt-2 text-sm font-bold text-[#12345b] underline underline-offset-4" onClick={switchStudent} type="button">Use another registration number</button> : null}
      </section>
      <section aria-labelledby="reservation-history-title"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold tracking-[0.08em] text-[#237a67]">Application Status</p><h2 className="mt-1 text-2xl font-bold text-[#102a4c]" id="reservation-history-title">My Applications</h2><p className="mt-1 text-sm text-slate-600">ভর্তি সেবা থেকে পাওয়া সর্বশেষ অবস্থা দেখানো হচ্ছে।</p></div>{history.studentId ? <Button onClick={refreshHistory}>Refresh</Button> : null}</div>
        <div aria-live="polite" className="mt-5">{history.isLoading ? <div className="rounded-2xl border border-[#dce6f2] bg-white p-6 shadow-sm"><LoadingState label="আবেদনের তথ্য লোড হচ্ছে" /></div> : null}{historyError ? <div className="space-y-3"><ErrorState correlationId={history.error instanceof ApiError ? history.error.correlationId : undefined} description={historyError.description} title={historyError.title} />{history.studentId ? <Button onClick={refreshHistory}>আবার চেষ্টা করুন</Button> : null}</div> : null}{!history.isLoading && !historyError && !history.studentId ? <EmptyState title="আবেদন দেখতে শিক্ষার্থী আইডি লিখুন" description="সঠিক শিক্ষার্থী আইডি দিয়ে খোঁজার পর আপনার আবেদনগুলো দেখা যাবে।" /> : null}{!history.isLoading && !historyError && history.hasLoaded && history.holds.length === 0 ? <EmptyState title="কোনো আবেদন পাওয়া যায়নি" description="এই শিক্ষার্থী আইডির জন্য কোনো বর্তমান বা পুরোনো আবেদন নেই।" /> : null}{!history.isLoading && !historyError && history.holds.length > 0 && history.studentId ? <div className="grid gap-5">{history.holds.map((hold) => <HoldCard hold={hold} key={hold.holdId} onElapsed={(holdId) => void reconcileElapsedHold(holdId)} onRefresh={refreshHistory} onStatusReconciled={reconcileLatestReservation} studentId={history.studentId!} />)}</div> : null}</div>
      </section>
      <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-[#17365d]"><ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[#237a67]" /><p>আপনার শিক্ষার্থী আইডি শুধু এই অ্যাসাইনমেন্টের আবেদন খোঁজার জন্য ব্যবহৃত হয়। এটি লগইন পদ্ধতি নয়।</p></div>
    </div>
  );
}
