import { useState } from "react";
import { Button } from "../../../components/ui/Button";
import { ApiError } from "../../../lib/api/client";
import { isValidStudentId } from "../../../lib/utils/studentId";
import type { AdmissionClass, HoldCreated } from "../../../types/api";
import { toDisplayError } from "../../classes/utils/requestError";
import { admissionApi } from "../../../lib/api/admissionApi";

interface HoldFormProps {
  admissionClass: AdmissionClass;
  onHoldCreated: (hold: HoldCreated) => void;
  onRefreshAvailability: () => void;
}

export function HoldForm({ admissionClass, onHoldCreated, onRefreshAvailability }: HoldFormProps) {
  const [studentId, setStudentId] = useState("");
  const [touched, setTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<unknown>(null);
  const validStudentId = isValidStudentId(studentId);
  const canSubmit = validStudentId && admissionClass.availableSeats > 0 && !isSubmitting;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);
    try {
      const hold = await admissionApi.createHold(admissionClass.id, studentId);
      setStudentId("");
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
        <label className="block text-sm font-semibold text-slate-900" htmlFor="student-id">Student ID</label>
        <p className="mt-1 text-sm leading-6 text-slate-600" id="student-id-help">Enter your assigned 17-digit Student ID. Leading zeros are preserved.</p>
        <input
          aria-describedby="student-id-help student-id-error"
          aria-invalid={touched && !validStudentId}
          autoComplete="off"
          className="mt-3 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-950 shadow-sm outline-none placeholder:text-slate-400 focus:border-blue-700 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
          id="student-id"
          inputMode="numeric"
          maxLength={17}
          name="studentId"
          onBlur={() => setTouched(true)}
          onChange={(event) => setStudentId(event.target.value)}
          pattern="[0-9]{17}"
          placeholder="17-digit Student ID"
          type="text"
          value={studentId}
        />
        <p className="mt-2 min-h-5 text-sm text-red-700" id="student-id-error" role={touched && !validStudentId ? "alert" : undefined}>
          {touched && !validStudentId ? "Enter exactly 17 ASCII digits." : ""}
        </p>
      </div>
      {displayError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4" role="alert">
          <p className="font-semibold text-red-950">{displayError.title}</p>
          <p className="mt-1 text-sm leading-6 text-red-800">{displayError.description}</p>
          {(displayError.isConflict || displayError.isNetworkError) ? <button className="mt-3 text-sm font-semibold text-blue-800 underline underline-offset-4" onClick={onRefreshAvailability} type="button">Refresh availability</button> : null}
        </div>
      ) : null}
      <Button className="w-full sm:w-auto" disabled={!canSubmit} type="submit">
        {isSubmitting ? "Reserving seat…" : "Reserve temporary seat"}
      </Button>
    </form>
  );
}
