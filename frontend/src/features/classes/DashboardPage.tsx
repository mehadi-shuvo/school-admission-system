import { ArrowRight, BookOpenCheck } from "lucide-react";
import { EmptyState } from "../../components/feedback/EmptyState";
import { Card } from "../../components/ui/Card";
import { PageHeading } from "../../components/ui/PageHeading";

export function DashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeading title="Find the right class" description="Browse available admission classes, place a time-limited reservation, and confirm it when you are ready." />
      <div className="grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
        <Card title="Available classes">
          <EmptyState title="Class discovery is ready" description="Live class availability will appear here once class discovery is connected in the next workflow step." />
        </Card>
        <Card title="How admission works">
          <ol className="space-y-4 text-sm leading-6 text-slate-600">
            <li className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-blue-50 text-xs font-bold text-blue-800">1</span><span>Review live class availability.</span></li>
            <li className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-blue-50 text-xs font-bold text-blue-800">2</span><span>Reserve a seat using the assigned student identifier.</span></li>
            <li className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-blue-50 text-xs font-bold text-blue-800">3</span><span>Confirm the reservation before it expires.</span></li>
          </ol>
          <div className="mt-6 flex items-center gap-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-600"><BookOpenCheck aria-hidden="true" className="size-5 text-blue-700" />Reservation actions will be introduced in later steps.</div>
        </Card>
      </div>
      <p className="inline-flex items-center gap-2 text-sm font-medium text-slate-500"><ArrowRight aria-hidden="true" className="size-4" />Availability and reservations are always based on the latest admission data.</p>
    </div>
  );
}
