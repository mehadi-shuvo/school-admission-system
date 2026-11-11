import { useState } from "react";

interface CorrelationReferenceProps {
  correlationId?: string;
}

export function CorrelationReference({ correlationId }: CorrelationReferenceProps) {
  const [copied, setCopied] = useState(false);
  const referenceId = correlationId;

  if (!referenceId) return null;
  const copyableReferenceId = referenceId;

  async function copyReference() {
    if (!navigator.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(copyableReferenceId);
      setCopied(true);
    } catch {
      // Clipboard access can be denied by the browser; retain the visible reference ID.
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-red-200 pt-3 text-xs text-red-900">
      <span className="font-semibold">Reference ID</span>
      <code className="break-all font-mono text-red-950">{referenceId}</code>
      <button className="font-semibold text-[#12345b] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#12345b]" onClick={() => void copyReference()} type="button">
        {copied ? "Copied" : "Copy Reference ID"}
      </button>
    </div>
  );
}
