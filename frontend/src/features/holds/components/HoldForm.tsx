import { useState } from "react";
import { Button } from "../../../components/ui/Button";
import { ApiError } from "../../../lib/api/client";
import { isValidStudentId } from "../../../lib/utils/studentId";
import type { AdmissionClass, HoldCreated } from "../../../types/api";
import { toDisplayError } from "../../classes/utils/requestError";
import { admissionApi } from "../../../lib/api/admissionApi";
import { useReservation } from "../context/ReservationContext";

interface HoldFormProps {
  admissionClass: AdmissionClass;
  onHoldCreated: (hold: HoldCreated) => void;
  onRefreshAvailability: () => void;
}

export function HoldForm({ admissionClass, onHoldCreated, onRefreshAvailability }: HoldFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<unknown>(null);
  const { studentId, setStudentId } = useReservation();
  const validStudentId = isValidStudentId(studentId);
  const canSubmit = validStudentId && admissionClass.availableSeats > 0 && !isSubmitting;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);
    try {
      const hold = await admissionApi.createHold(admissionClass.id, studentId);
      onHoldCreated(hold);
    } catch (error) {
      setSubmissionError(error);
      if (error instanceof ApiError && error.status === 409) {
        onRefreshAvailability();
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const displayError = submissionError ? toDisplayError(submissionError, "hold") : null;

  return (
    <form className="space-y-4" noValidate onSubmit={(event) => void submit(event)}>
      <div>
        <label className="block text-sm font-bold text-[#17365d]" htmlFor="student-id">Birth Registration Number</label>
        <p className="mt-1 text-sm leading-6 text-slate-600" id="student-id-help">উপরের শিক্ষার্থী আইডির সঙ্গে এটি একই। শুরুর শূন্য অক্ষুণ্ণ থাকবে।</p>
        <input aria-describedby="student-id-help student-id-error" aria-invalid={!validStudentId && studentId.length > 0} autoComplete="off" className="mt-3 block min-h-11 w-full rounded-xl border border-[#cbd8e7] bg-[#fbfdff] px-3 text-slate-950 shadow-sm outline-none placeholder:text-slate-400 focus:border-[#12345b] focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100" id="student-id" inputMode="numeric" maxLength={17} name="studentId" onChange={(event) => setStudentId(event.target.value)} pattern="[0-9]{17}" placeholder="Enter your 17-digit birth registration number" type="text" value={studentId} />
        <p className="mt-2 min-h-5 text-sm text-red-700" id="student-id-error" role={!validStudentId && studentId.length > 0 ? "alert" : undefined}>{!validStudentId && studentId.length > 0 ? "ঠিক ১৭টি ইংরেজি সংখ্যা লিখুন।" : ""}</p>
      </div>
      {displayError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4" role="alert">
          <p className="font-semibold text-red-950">{displayError.title}</p>
          <p className="mt-1 text-sm leading-6 text-red-800">{displayError.description}</p>
          {(displayError.isConflict || displayError.isNetworkError) ? <button className="mt-3 text-sm font-semibold text-[#12345b] underline underline-offset-4" onClick={onRefreshAvailability} type="button">আসনের তথ্য হালনাগাদ করুন</button> : null}
        </div>
      ) : null}
      <Button className="w-full sm:w-auto" disabled={!canSubmit} type="submit">
        {isSubmitting ? "Reserving your seat..." : "Reserve Seat"}
      </Button>
    </form>
  );
}
