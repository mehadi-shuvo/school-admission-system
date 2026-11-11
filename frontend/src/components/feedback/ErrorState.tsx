import { TriangleAlert } from "lucide-react";
import { CorrelationReference } from "./CorrelationReference";

interface ErrorStateProps {
  title?: string;
  description: string;
  correlationId?: string;
}

export function ErrorState({ title = "এই অংশের তথ্য লোড করা যাচ্ছে না", description, correlationId }: ErrorStateProps) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-5" role="alert">
      <div className="flex gap-3">
        <TriangleAlert aria-hidden="true" className="size-5 shrink-0 text-red-700" />
        <div>
          <h2 className="font-semibold text-red-950">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-red-800">{description}</p>
          <CorrelationReference correlationId={correlationId} />
        </div>
      </div>
    </div>
  );
}
