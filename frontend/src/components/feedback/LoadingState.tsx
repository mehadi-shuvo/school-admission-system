import { LoaderCircle } from "lucide-react";

interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = "লোড হচ্ছে…" }: LoadingStateProps) {
  return (
    <div aria-label={label} className="flex items-center gap-3 text-sm text-slate-600" role="status">
      <LoaderCircle aria-hidden="true" className="size-5 animate-spin text-[#12345b] motion-reduce:animate-none" />
      <span>{label}</span>
    </div>
  );
}
