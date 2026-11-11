import { CheckCircle2, Copy } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import type { ReservationHandoff } from "../context/ReservationContext";

function formatExpiration(expiresAt: string): string {
  const parsed = new Date(expiresAt);
  return Number.isNaN(parsed.getTime())
    ? expiresAt
    : parsed.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function ReservationSuccessPanel({ reservation }: { reservation: ReservationHandoff }) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "unsupported">("idle");
  const { hold, className } = reservation;
  const status = reservation.reconciledStatus ?? hold.status;

  async function copyHoldId() {
    if (!navigator.clipboard?.writeText) {
      setCopyStatus("unsupported");
      return;
    }

    try {
      await navigator.clipboard.writeText(hold.holdId);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("unsupported");
    }
  }

  return (
    <section aria-labelledby="reservation-success-title" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5" role="status">
      <div className="flex gap-3">
        <CheckCircle2 aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-emerald-700" />
        <div className="min-w-0">
          <h2 className="font-bold text-emerald-950" id="reservation-success-title">{status === "CONFIRMED" ? "Admission Confirmed" : "Seat Reserved"}</h2>
          <p className="mt-1 text-sm leading-6 text-emerald-900">{status === "CONFIRMED" ? <><strong>{className}</strong> শ্রেণিতে আপনার ভর্তি নিশ্চিত হয়েছে।</> : <><strong>{className}</strong> শ্রেণির আসন {formatExpiration(hold.expiresAt)} পর্যন্ত সংরক্ষিত থাকবে। সময় শেষ হওয়ার আগে ভর্তি নিশ্চিত করুন।</>}</p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div><dt className="font-medium text-emerald-950">Reservation ID</dt><dd className="mt-1 break-all font-mono text-xs text-emerald-900">{hold.holdId}</dd></div>
            <div><dt className="font-medium text-emerald-950">Status</dt><dd className="mt-1 font-semibold text-emerald-900">{status === "CONFIRMED" ? "Confirmed" : "Reserved"}</dd></div>
          </dl>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 text-sm font-semibold text-emerald-900 hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700" onClick={() => void copyHoldId()} type="button">
              <Copy aria-hidden="true" className="size-4" /> Copy Reservation ID
            </button>
            <Link className="text-sm font-semibold text-[#12345b] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#12345b]" to="/my-holds">View Application Details</Link>
          </div>
          <p aria-live="polite" className="mt-3 text-xs text-emerald-900">{copyStatus === "copied" ? "সংরক্ষণ নম্বর কপি করা হয়েছে।" : copyStatus === "unsupported" ? "এই ব্রাউজারে কপি করা যাচ্ছে না। উপরের নম্বরটি নির্বাচন করতে পারেন।" : ""}</p>
        </div>
      </div>
    </section>
  );
}
