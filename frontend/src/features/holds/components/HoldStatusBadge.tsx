import type { HoldStatus } from "../../../types/api";

const styles: Record<HoldStatus, string> = {
  HELD: "bg-blue-50 text-blue-800",
  CONFIRMED: "bg-emerald-50 text-emerald-800",
  CANCELLED: "bg-slate-100 text-slate-700",
  EXPIRED: "bg-amber-50 text-amber-900"
};

export function HoldStatusBadge({ status }: { status: HoldStatus }) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles[status]}`}>{status}</span>;
}
