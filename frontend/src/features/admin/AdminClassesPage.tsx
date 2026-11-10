import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { PageHeading } from "../../components/ui/PageHeading";
import { ApiError } from "../../lib/api/client";
import { admissionApi } from "../../lib/api/admissionApi";
import type { ClassCreated } from "../../types/api";

interface FormErrors {
  name?: string;
  totalSeats?: string;
}

function validate(name: string, totalSeats: string): FormErrors {
  const errors: FormErrors = {};
  if (!name.trim()) errors.name = "Class/shift name is required.";
  if (!/^\d+$/.test(totalSeats) || Number(totalSeats) < 1 || !Number.isSafeInteger(Number(totalSeats))) {
    errors.totalSeats = "Total seats must be a positive whole number.";
  } else if (Number(totalSeats) > 2_147_483_647) {
    errors.totalSeats = "Total seats exceeds the supported limit.";
  }
  return errors;
}

function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return "We could not confirm the request. The class may have been created; check the class list before submitting again.";
    if (error.status === 409) return error.problem?.detail ?? "A class with this name may already exist.";
    return error.problem?.detail ?? error.message;
  }
  return "The class could not be created. Please try again.";
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
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeading title="Manage classes" description="Create a class or shift for admission. No login is required for this assignment exercise." />
      {createdClass ? <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5" role="status"><h2 className="font-semibold text-emerald-950">Class created</h2><p className="mt-1 text-sm text-emerald-900"><strong>{createdClass.name}</strong> was created with {createdClass.totalSeats} total seats.</p><Link className="mt-3 inline-block text-sm font-semibold text-blue-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700" to="/">View classes</Link></section> : null}
      <section aria-labelledby="create-class-title" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="text-lg font-semibold text-slate-950" id="create-class-title">Create a class</h2><p className="mt-1 text-sm leading-6 text-slate-600">Add the class name and its total seat capacity.</p>
        <form className="mt-6 space-y-5" noValidate onSubmit={(event) => void submit(event)}>
          <div><label className="block text-sm font-semibold text-slate-900" htmlFor="class-name">Class/shift name</label><input aria-describedby="class-name-error" aria-invalid={touched.name && Boolean(errors.name)} className="mt-2 block min-h-11 w-full rounded-lg border border-slate-300 px-3 text-slate-950 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100" id="class-name" maxLength={150} onBlur={() => setTouched((current) => ({ ...current, name: true }))} onChange={(event) => setName(event.target.value)} value={name} /><p className="mt-2 min-h-5 text-sm text-red-700" id="class-name-error" role={touched.name && errors.name ? "alert" : undefined}>{touched.name ? errors.name : ""}</p></div>
          <div><label className="block text-sm font-semibold text-slate-900" htmlFor="total-seats">Total seats</label><input aria-describedby="total-seats-error" aria-invalid={touched.totalSeats && Boolean(errors.totalSeats)} className="mt-2 block min-h-11 w-full rounded-lg border border-slate-300 px-3 text-slate-950 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100" id="total-seats" inputMode="numeric" onBlur={() => setTouched((current) => ({ ...current, totalSeats: true }))} onChange={(event) => setTotalSeats(event.target.value)} placeholder="e.g. 120" type="text" value={totalSeats} /><p className="mt-2 min-h-5 text-sm text-red-700" id="total-seats-error" role={touched.totalSeats && errors.totalSeats ? "alert" : undefined}>{touched.totalSeats ? errors.totalSeats : ""}</p></div>
          {requestError ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-900" role="alert">{describeError(requestError)}</div> : null}
          <Button disabled={isSubmitting} type="submit">{isSubmitting ? "Creating class…" : "Create class"}</Button>
        </form>
      </section>
    </div>
  );
}
