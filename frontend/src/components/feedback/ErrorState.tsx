import { TriangleAlert } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  description: string;
}

export function ErrorState({ title = "Unable to load this section", description }: ErrorStateProps) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-5" role="alert">
      <div className="flex gap-3">
        <TriangleAlert aria-hidden="true" className="size-5 shrink-0 text-red-700" />
        <div>
          <h2 className="font-semibold text-red-950">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-red-800">{description}</p>
        </div>
      </div>
    </div>
  );
}
