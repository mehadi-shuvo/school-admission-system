import { Activity, Database, RefreshCw, Server } from "lucide-react";
import { CorrelationReference } from "../../../components/feedback/CorrelationReference";
import { Button } from "../../../components/ui/Button";
import { useSystemHealth, type ApiServiceStatus, type DatabaseStatus } from "../hooks/useSystemHealth";

function apiStatusLabel(status: ApiServiceStatus | null): string {
  if (status === "online") return "Online";
  if (status === "offline") return "Offline";
  return "Checking";
}

function databaseStatusLabel(status: DatabaseStatus): string {
  if (status === "connected") return "Connected";
  if (status === "unavailable") return "Unavailable";
  return "Unknown";
}

function statusColor(status: "online" | "connected" | null): string {
  return status ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900";
}

export function SystemHealthSection() {
  const health = useSystemHealth();
  const lastChecked = health.lastCheckedAt?.toLocaleString() ?? "Not checked yet";
  const isApiOnline = health.apiStatus === "online";
  const isDatabaseConnected = health.databaseStatus === "connected";

  return (
    <section aria-labelledby="system-health-title" className="rounded-2xl border border-[#dce6f2] bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <Activity aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[#237a67]" />
          <div>
            <h2 className="text-xl font-bold text-[#102a4c]" id="system-health-title">System Health</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">ভর্তি সেবা ও ডাটাবেস সংযোগের সর্বশেষ অবস্থা।</p>
          </div>
        </div>
        <Button className="w-full sm:w-auto" disabled={health.isLoading} onClick={() => void health.refresh()}>
          <RefreshCw aria-hidden="true" className={`mr-2 size-4 ${health.isLoading ? "animate-spin motion-reduce:animate-none" : ""}`} />
          {health.isLoading ? "Checking..." : "Refresh Status"}
        </Button>
      </div>

      <dl aria-live="polite" className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-[#f6f9fd] p-4">
          <dt className="flex items-center gap-2 text-sm font-bold text-[#17365d]"><Server aria-hidden="true" className="size-4 text-[#237a67]" />API Service</dt>
          <dd className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-bold ${statusColor(isApiOnline ? "online" : null)}`}>{apiStatusLabel(health.apiStatus)}</dd>
        </div>
        <div className="rounded-xl bg-[#f6f9fd] p-4">
          <dt className="flex items-center gap-2 text-sm font-bold text-[#17365d]"><Database aria-hidden="true" className="size-4 text-[#237a67]" />PostgreSQL Database</dt>
          <dd className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-bold ${statusColor(isDatabaseConnected ? "connected" : null)}`}>{databaseStatusLabel(health.databaseStatus)}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-sm font-bold text-[#17365d]">Last Checked</dt>
          <dd className="mt-1 text-sm text-slate-700">{lastChecked}</dd>
        </div>
      </dl>

      {health.error ? <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950" role="status"><p>{health.apiStatus === "offline" ? "The admission service could not be reached for the latest check." : "The latest readiness check did not report a healthy database."}</p><CorrelationReference correlationId={health.error.correlationId} /></div> : null}
    </section>
  );
}
