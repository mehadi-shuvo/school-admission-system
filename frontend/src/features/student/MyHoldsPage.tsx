import { ShieldCheck } from "lucide-react";
import { EmptyState } from "../../components/feedback/EmptyState";
import { Card } from "../../components/ui/Card";
import { PageHeading } from "../../components/ui/PageHeading";

export function MyHoldsPage() {
  return (
    <div className="space-y-8">
      <PageHeading title="My reservations" description="Use the assignment-defined student identifier to view and manage your own admission reservations." />
      <Card title="Reservation history">
        <EmptyState title="History access is coming next" description="This area will show your reservation history after the student history workflow is connected." />
      </Card>
      <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-950"><ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-blue-700" /><p>Your student identifier is used only for the assignment-defined reservation lookup. It is not a sign-in method.</p></div>
    </div>
  );
}
