import { CheckCircle2, Info } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { CorrelationReference } from "../../components/feedback/CorrelationReference";
import { Button } from "../../components/ui/Button";
import { PageHeading } from "../../components/ui/PageHeading";
import { admissionApi } from "../../lib/api/admissionApi";
import { ApiError } from "../../lib/api/client";
import type { ClassCreated } from "../../types/api";
import { SystemHealthSection } from "./components/SystemHealthSection";

interface FormErrors {
  name?: string;
  totalSeats?: string;
}

function validate(name: string, totalSeats: string): FormErrors {
  const errors: FormErrors = {};
  if (!name.trim()) errors.name = "শ্রেণির নাম লিখুন।";
  if (!/^\d+$/.test(totalSeats) || Number(totalSeats) < 1 || !Number.isSafeInteger(Number(totalSeats))) {
    errors.totalSeats = "মোট আসনসংখ্যা ধনাত্মক পূর্ণসংখ্যা হতে হবে।";
  } else if (Number(totalSeats) > 2_147_483_647) {
    errors.totalSeats = "আসনসংখ্যা অনুমোদিত সীমার বেশি।";
  }
  return errors;
}

function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return "অনুরোধটির ফল নিশ্চিত করা যায়নি। শ্রেণিটি তৈরি হয়েছে কি না তালিকায় দেখে নিন।";
    if (error.status === 409) return error.problem?.detail ?? "এই নামে একটি শ্রেণি ইতোমধ্যে থাকতে পারে।";
    return error.problem?.detail ?? error.message;
  }
  return "শ্রেণি তৈরি করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।";
}

export function AdminClassesPage() {
  const [name, setName] = useState("");
  const [totalSeats, setTotalSeats] = useState("");
  const [touched, setTouched] = useState<{ name: boolean; totalSeats: boolean }>({ name: false, totalSeats: false });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<unknown>(null);
  const [createdClass, setCreatedClass] = useState<ClassCreated | null>(null);
  const errors = validate(name, totalSeats);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({ name: true, totalSeats: true });
    if (Object.keys(errors).length > 0 || isSubmitting) return;
    setIsSubmitting(true);
    setRequestError(null);
    try {
      const created = await admissionApi.createClass({ name: name.trim().replace(/\s+/g, " "), totalSeats: Number(totalSeats) });
      setCreatedClass(created);
      setName("");
      setTotalSeats("");
      setTouched({ name: false, totalSeats: false });
    } catch (error) {
      setRequestError(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeading title="Class Management" description="ভর্তি কার্যক্রমের জন্য নতুন শ্রেণি বা শিফট তৈরি করুন। এই অ্যাসাইনমেন্টের ডেমো সংস্করণে লগইন প্রয়োজন নেই।" />
      {createdClass ? <section className="flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5" role="status"><CheckCircle2 aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-emerald-700" /><div><h2 className="font-bold text-emerald-950">Class Created Successfully</h2><p className="mt-1 text-sm leading-6 text-emerald-900"><strong>{createdClass.name}</strong> শ্রেণিতে মোট {createdClass.totalSeats}টি আসন রাখা হয়েছে।</p><Link className="mt-3 inline-block text-sm font-bold text-[#12345b] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#12345b]" to="/#classes">Explore Classes</Link></div></section> : null}
      <section aria-labelledby="create-class-title" className="rounded-2xl border border-[#dce6f2] bg-white p-5 shadow-sm sm:p-7"><div className="flex gap-3"><Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[#237a67]" /><div><h2 className="text-xl font-bold text-[#102a4c]" id="create-class-title">Create Class</h2><p className="mt-1 text-sm leading-6 text-slate-600">শ্রেণির নাম ও সর্বোচ্চ আসনসংখ্যা লিখুন। একই নামে দুটি শ্রেণি তৈরি করা যাবে না।</p></div></div>
        <form className="mt-7 space-y-5" noValidate onSubmit={(event) => void submit(event)}>
          <div><label className="block text-sm font-bold text-[#17365d]" htmlFor="class-name">Class Name</label><input aria-describedby="class-name-error" aria-invalid={touched.name && Boolean(errors.name)} className="mt-2 block min-h-11 w-full rounded-xl border border-[#cbd8e7] px-3 text-slate-950 outline-none focus:border-[#12345b] focus:ring-2 focus:ring-blue-100" id="class-name" maxLength={150} onBlur={() => setTouched((current) => ({ ...current, name: true }))} onChange={(event) => setName(event.target.value)} value={name} /><p className="mt-2 min-h-5 text-sm text-red-700" id="class-name-error" role={touched.name && errors.name ? "alert" : undefined}>{touched.name ? errors.name : ""}</p></div>
          <div><label className="block text-sm font-bold text-[#17365d]" htmlFor="total-seats">Total Seats</label><input aria-describedby="total-seats-error total-seats-help" aria-invalid={touched.totalSeats && Boolean(errors.totalSeats)} className="mt-2 block min-h-11 w-full rounded-xl border border-[#cbd8e7] px-3 text-slate-950 outline-none focus:border-[#12345b] focus:ring-2 focus:ring-blue-100" id="total-seats" inputMode="numeric" onBlur={() => setTouched((current) => ({ ...current, totalSeats: true }))} onChange={(event) => setTotalSeats(event.target.value)} placeholder="e.g. 120" type="text" value={totalSeats} /><p className="mt-2 text-sm text-slate-600" id="total-seats-help">অন্তত একটি আসন রাখতে হবে।</p><p className="mt-1 min-h-5 text-sm text-red-700" id="total-seats-error" role={touched.totalSeats && errors.totalSeats ? "alert" : undefined}>{touched.totalSeats ? errors.totalSeats : ""}</p></div>
          {requestError ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-900" role="alert"><p>{describeError(requestError)}</p><CorrelationReference correlationId={requestError instanceof ApiError ? requestError.correlationId : undefined} /></div> : null}
          <Button disabled={isSubmitting} type="submit">{isSubmitting ? "Saving Class..." : "Save Class"}</Button>
        </form>
      </section>
      <SystemHealthSection />
    </div>
  );
}
