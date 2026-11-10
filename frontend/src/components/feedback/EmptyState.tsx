import { Inbox } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <Inbox aria-hidden="true" className="mx-auto size-7 text-slate-400" />
      <h2 className="mt-3 text-base font-semibold text-slate-900">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}
