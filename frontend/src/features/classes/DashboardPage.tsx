import { ArrowDown, CheckCircle2, Clock3, Search, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "../../components/feedback/EmptyState";
import { ErrorState } from "../../components/feedback/ErrorState";
import { LoadingState } from "../../components/feedback/LoadingState";
import { Button } from "../../components/ui/Button";
import type { AdmissionClass, HoldCreated } from "../../types/api";
import { ReservationSuccessPanel } from "../holds/components/ReservationSuccessPanel";
import { useReservation } from "../holds/context/ReservationContext";
import { ClassCard } from "./components/ClassCard";
import { ClassDetailsPanel } from "./components/ClassDetailsPanel";
import { useClassDetails } from "./hooks/useClassDetails";
import { useClasses } from "./hooks/useClasses";
import { toDisplayError } from "./utils/requestError";

const steps = [
  { number: "01", title: "Enter your details", description: "আপনার ১৭ সংখ্যার জন্মনিবন্ধন নম্বর লিখুন।" },
  { number: "02", title: "Choose a class", description: "আসন ও শ্রেণির তথ্য দেখে পছন্দ করুন।" },
  { number: "03", title: "Reserve your seat", description: "সাময়িকভাবে আপনার জন্য আসন রাখুন।" },
  { number: "04", title: "Confirm admission", description: "ডেমো নিশ্চিতকরণের মাধ্যমে ভর্তি সম্পন্ন করুন।" }
];

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
  const isInitialError = Boolean(displayError && classes.length === 0);
  const hasActiveFilter = Boolean(searchTerm.trim()) || availableOnly;

  return (
    <div className="space-y-12 pb-4 sm:space-y-16">
      <section className="overflow-hidden rounded-[1.75rem] border border-[#dce6f2] bg-white shadow-[0_18px_45px_rgba(18,52,91,0.08)]">
        <div className="grid gap-8 px-6 py-9 sm:px-10 sm:py-12 lg:grid-cols-[minmax(0,1.25fr)_minmax(17rem,0.75fr)] lg:items-center lg:px-14">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-[#18725e]"><ShieldCheck aria-hidden="true" className="size-4" /> Admissions</p>
            <h1 className="mt-5 text-3xl font-bold leading-tight tracking-tight text-[#102a4c] sm:text-4xl lg:text-5xl">আপনার সন্তানের উজ্জ্বল ভবিষ্যৎ শুরু হোক এখানেই</h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">A seamless admission experience — from application to confirmation.</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row"><a className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#12345b] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0b2749] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#12345b]" href="#classes">Apply for Admission <ArrowDown aria-hidden="true" className="size-4" /></a><a className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#cbd8e7] px-5 text-sm font-semibold text-[#12345b] transition hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#12345b]" href="#classes">Explore Classes</a></div>
          </div>
          <aside className="rounded-2xl border border-blue-100 bg-[#eef5fc] p-5 sm:p-6" aria-label="ভর্তির গুরুত্বপূর্ণ তথ্য">
            <Clock3 aria-hidden="true" className="size-7 text-[#237a67]" />
            <h2 className="mt-4 text-xl font-bold text-[#102a4c]">আসন সংরক্ষণের সময়সীমা</h2>
            <p className="mt-2 leading-7 text-slate-600">সাধারণভাবে একটি সাময়িক আসন ১০ মিনিট পর্যন্ত রাখা হয়। সময় শেষ হওয়ার আগে ডেমো ভর্তি ফি প্রদান করে ভর্তি নিশ্চিত করুন।</p>
            <p className="mt-4 border-t border-blue-100 pt-4 text-sm font-semibold text-[#237a67]">আসনের তথ্য সরাসরি ভর্তি সেবা থেকে হালনাগাদ হয়।</p>
          </aside>
        </div>
      </section>

      <section aria-labelledby="admission-process-title">
        <div className="mb-6 max-w-2xl"><p className="text-sm font-semibold tracking-[0.08em] text-[#237a67]">How It Works</p><h2 className="mt-2 text-2xl font-bold text-[#102a4c] sm:text-3xl" id="admission-process-title">Admission Process</h2></div>
        <ol className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{steps.map((step) => <li className="rounded-2xl border border-[#dce6f2] bg-white p-5 shadow-sm" key={step.number}><span className="text-sm font-bold text-[#237a67]">{step.number}</span><h3 className="mt-4 text-lg font-bold text-[#102a4c]">{step.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p></li>)}</ol>
      </section>

      {latestReservation ? <ReservationSuccessPanel reservation={latestReservation} /> : null}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_23rem]" id="classes">
        <section aria-labelledby="available-classes-title">
          <div className="rounded-2xl border border-[#dce6f2] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold tracking-[0.08em] text-[#237a67]">Application Status</p><h2 className="mt-1 text-2xl font-bold text-[#102a4c]" id="available-classes-title">Available Classes</h2><p className="mt-2 text-sm leading-6 text-slate-600">ভর্তি সেবা থেকে পাওয়া বর্তমান আসনের তথ্য দেখুন।</p></div><Button className="w-full sm:w-auto" onClick={() => void refresh()}>Check Availability</Button></div>
            <div className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"><div><label className="block text-sm font-bold text-[#17365d]" htmlFor="class-search">Search Classes</label><div className="relative mt-2"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" /><input className="block min-h-11 w-full rounded-xl border border-[#cbd8e7] bg-[#fbfdff] py-2 pl-10 pr-3 text-slate-950 outline-none focus:border-[#12345b] focus:ring-2 focus:ring-blue-100" id="class-search" onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search by class name" type="search" value={searchTerm} /></div></div><label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-[#dce6f2] px-3 text-sm font-semibold text-slate-700"><SlidersHorizontal aria-hidden="true" className="size-4 text-[#237a67]" /><input checked={availableOnly} className="size-4 accent-[#12345b]" onChange={(event) => setAvailableOnly(event.target.checked)} type="checkbox" />Available seats only</label></div>
          </div>
          <div aria-live="polite" className="mt-6">
            {isLoading ? <div className="rounded-2xl border border-[#dce6f2] bg-white p-8 shadow-sm"><LoadingState label="শ্রেণির তথ্য লোড হচ্ছে" /></div> : null}
            {isInitialError ? <div className="space-y-3"><ErrorState description={displayError!.description} title={displayError!.title} /><Button onClick={() => void refresh()}>আবার চেষ্টা করুন</Button></div> : null}
            {displayError && !isInitialError ? <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" role="status"><span>শেষ পাওয়া আসনের তথ্য দেখানো হচ্ছে। হালনাগাদ করা যায়নি।</span><button className="font-semibold text-[#12345b] underline underline-offset-4" onClick={() => void refresh()} type="button">আবার চেষ্টা করুন</button></div> : null}
            {!isLoading && !isInitialError && classes.length === 0 ? <EmptyState title="এখনও কোনো শ্রেণি পাওয়া যায়নি" description="ভর্তি সেবা থেকে এখনো কোনো শ্রেণির তথ্য আসেনি। পরে আবার দেখুন।" /> : null}
            {!isLoading && !isInitialError && classes.length > 0 && filteredClasses.length === 0 ? <EmptyState title="আপনার খোঁজের সঙ্গে কোনো শ্রেণি মেলেনি" description={hasActiveFilter ? "অনুসন্ধান বা আসনের ফিল্টার পরিবর্তন করুন।" : "কোনো মিল পাওয়া যায়নি।"} /> : null}
            {!isLoading && !isInitialError && filteredClasses.length > 0 ? <div className="grid gap-5 md:grid-cols-2">{filteredClasses.map((admissionClass) => <ClassCard admissionClass={admissionClass} key={admissionClass.id} onInspect={setSelectedClass} />)}</div> : null}
          </div>
        </section>
        {selectedClass ? <ClassDetailsPanel admissionClass={details.admissionClass} error={details.error} fallbackClass={selectedClass} isLoading={details.isLoading} onClose={() => setSelectedClass(null)} onHoldCreated={handleHoldCreated} onRefresh={() => void details.refresh()} /> : <aside className="rounded-2xl border border-dashed border-[#b9cbe0] bg-[#eef5fc] p-6 text-sm leading-7 text-slate-600 xl:sticky xl:top-24"><CheckCircle2 aria-hidden="true" className="size-6 text-[#237a67]" /><h2 className="mt-3 text-lg font-bold text-[#102a4c]">শ্রেণি সম্পর্কে জানুন</h2><p className="mt-2">যেকোনো শ্রেণির বিস্তারিত, আসনের অবস্থা এবং সাময়িক সংরক্ষণের ফর্ম দেখতে একটি কার্ড নির্বাচন করুন।</p></aside>}
      </div>

      <section className="rounded-2xl border border-[#dce6f2] bg-white p-6 shadow-sm sm:p-8" aria-labelledby="important-information-title"><div className="flex gap-3"><Clock3 aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-[#237a67]" /><div><h2 className="text-xl font-bold text-[#102a4c]" id="important-information-title">ভর্তির গুরুত্বপূর্ণ তথ্য</h2><p className="mt-2 max-w-3xl leading-7 text-slate-600">আসন সংরক্ষণ সাময়িক। সময় শেষ হওয়ার আগে ভর্তি নিশ্চিত না করলে আসনটি অন্য শিক্ষার্থীর জন্য আবার উন্মুক্ত হবে। ভর্তি নিশ্চিত করার ডেমো ধাপে কোনো আর্থিক তথ্য নেওয়া হয় না।</p></div></div></section>
    </div>
  );
}
