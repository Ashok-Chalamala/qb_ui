import { useState, useMemo } from "react";
import { Search, Filter, RefreshCw, AlertCircle, CheckCircle, Clock, ChevronDown, ChevronRight, Download } from "lucide-react";
import { mockApiLogs, mockIntegrations, formatTimestamp, type ApiLog } from "@/lib/integration-data";
import { useUserContext } from "@/lib/user-context";

const STATUS_OPTIONS = ["All", "2xx Success", "4xx Client Error", "5xx Server Error"] as const;
const METHOD_COLORS: Record<string, string> = {
  GET:    "bg-teal-soft text-teal border-teal/30",
  POST:   "bg-violet-soft text-violet border-violet/30",
  PUT:    "bg-amber-soft text-amber border-amber/30",
  DELETE: "bg-rose-soft text-rose border-rose/30",
  PATCH:  "bg-sky-soft text-sky border-sky/30",
};

function statusChipClass(code: number): string {
  if (code >= 200 && code < 300) return "bg-lime-soft text-lime border-lime/30";
  if (code >= 400 && code < 500) return "bg-amber-soft text-amber border-amber/30";
  if (code >= 500)               return "bg-rose-soft text-rose border-rose/30";
  return "bg-surface-3 text-muted border-border-strong";
}

function statusIcon(code: number) {
  if (code >= 200 && code < 300) return <CheckCircle className="h-3.5 w-3.5" />;
  if (code >= 400)               return <AlertCircle className="h-3.5 w-3.5" />;
  return <Clock className="h-3.5 w-3.5" />;
}

function matchesStatusFilter(code: number, filter: string): boolean {
  if (filter === "All")              return true;
  if (filter === "2xx Success")      return code >= 200 && code < 300;
  if (filter === "4xx Client Error") return code >= 400 && code < 500;
  if (filter === "5xx Server Error") return code >= 500;
  return true;
}

interface LogRowProps {
  log: ApiLog;
  expanded: boolean;
  onToggle: () => void;
}

function LogRow({ log, expanded, onToggle }: LogRowProps) {
  return (
    <>
      <tr
        onClick={onToggle}
        className="cursor-pointer hover:bg-surface-2 transition-colors border-b border-border-soft"
      >
        <td className="px-4 py-3 text-left">
          <span className={`qb-chip border qb-mono text-[10px] uppercase font-semibold ${METHOD_COLORS[log.method] ?? "bg-surface-3 text-muted"}`}>
            {log.method}
          </span>
        </td>
        <td className="px-4 py-3 text-left">
          <div className="flex items-center gap-2">
            <span className={`qb-chip border text-[11px] font-medium ${statusChipClass(log.statusCode)}`}>
              {statusIcon(log.statusCode)}
              {log.statusCode}
            </span>
          </div>
        </td>
        <td className="px-4 py-3 text-left max-w-[240px]">
          <span className="qb-mono text-xs text-fg truncate block">{log.endpoint}</span>
        </td>
        <td className="px-4 py-3 text-left">
          <span className="text-xs text-muted">{log.integrationName}</span>
        </td>
        <td className="px-4 py-3 text-left">
          <span className="qb-mono text-xs text-muted">{log.duration}ms</span>
          {log.duration > 2000 && (
            <span className="ml-1 qb-chip bg-amber-soft text-amber border-amber/30 text-[10px]">slow</span>
          )}
        </td>
        <td className="px-4 py-3 text-left">
          <span className="qb-mono text-[11px] text-muted">{formatTimestamp(log.timestamp)}</span>
        </td>
        <td className="px-4 py-3 text-left">
          {log.retryAttempt && log.retryAttempt > 0 ? (
            <span className="qb-chip bg-amber-soft text-amber border-amber/30 qb-mono text-[10px]">
              retry {log.retryAttempt}×
            </span>
          ) : (
            <span className="text-muted text-xs">—</span>
          )}
        </td>
        <td className="px-4 py-3 text-right">
          {expanded
            ? <ChevronDown className="h-3.5 w-3.5 text-muted ml-auto" />
            : <ChevronRight className="h-3.5 w-3.5 text-muted ml-auto" />
          }
        </td>
      </tr>

      {expanded && (
        <tr className="bg-surface-2 border-b border-border-soft">
          <td colSpan={8} className="px-4 py-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <div className="text-[11px] font-medium text-muted mb-2 uppercase tracking-wider">Request Details</div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex gap-2">
                    <span className="text-muted w-28 shrink-0">Correlation ID</span>
                    <span className="qb-mono text-fg">{log.correlationId}</span>
                  </div>
                  {log.patientId && (
                    <div className="flex gap-2">
                      <span className="text-muted w-28 shrink-0">Patient ID</span>
                      <span className="qb-mono text-fg">{log.patientId}</span>
                    </div>
                  )}
                  {log.subjectType && (
                    <div className="flex gap-2">
                      <span className="text-muted w-28 shrink-0">Context</span>
                      <span className={`qb-chip border text-[10px] font-semibold ${
                        log.subjectType === "SELF" ? "bg-teal-soft text-teal border-teal/30" : "bg-amber-soft text-amber border-amber/30"
                      }`}>
                        {log.subjectType === "SELF" ? "Self" : log.subjectRelationship ?? "Family"}
                      </span>
                      {log.subjectName && <span className="qb-mono text-fg">{log.subjectName}</span>}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <span className="text-muted w-28 shrink-0">Actor</span>
                    <span className="qb-mono text-fg">{log.userId ?? "system"}</span>
                  </div>
                  {log.requestSize != null && (
                    <div className="flex gap-2">
                      <span className="text-muted w-28 shrink-0">Request size</span>
                      <span className="qb-mono text-fg">{(log.requestSize / 1024).toFixed(1)} KB</span>
                    </div>
                  )}
                  {log.responseSize != null && (
                    <div className="flex gap-2">
                      <span className="text-muted w-28 shrink-0">Response size</span>
                      <span className="qb-mono text-fg">{(log.responseSize / 1024).toFixed(1)} KB</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <span className="text-muted w-28 shrink-0">Timestamp</span>
                    <span className="qb-mono text-fg">{new Date(log.timestamp).toISOString()}</span>
                  </div>
                </div>
              </div>

              {log.error && (
                <div>
                  <div className="text-[11px] font-medium text-rose mb-2 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Error Detail
                  </div>
                  <div className="rounded-lg border border-rose/20 bg-rose-soft p-3">
                    <p className="qb-mono text-xs text-rose leading-relaxed">{log.error}</p>
                  </div>
                  <div className="mt-3 space-y-1 text-xs">
                    <p className="text-muted font-medium">Suggested resolution:</p>
                    <ul className="list-disc list-inside text-muted space-y-0.5">
                      <li>Verify Client ID and Secret are still valid</li>
                      <li>Check if the OAuth2 token URL is reachable</li>
                      <li>Confirm IP whitelist includes this server's egress IP</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function IntegrationLogs() {
  const ctx = useUserContext();
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState<typeof STATUS_OPTIONS[number]>("All");
  const [providerFilter, setProviderFilter] = useState("All");
  const [expandedId, setExpandedId]   = useState<string | null>(null);
  const [refreshKey, setRefreshKey]   = useState(0);

  // Context-aware source logs: FAMILY = only logs for that family member
  const contextLogs = useMemo(() => {
    if (ctx.contextType === "SELF") return mockApiLogs;
    return mockApiLogs.filter((l) => l.subjectId === ctx.contextSubjectId);
  }, [ctx.contextType, ctx.contextSubjectId]);

  const providerOptions = useMemo(() => {
    const names = Array.from(new Set(contextLogs.map((l) => l.integrationName)));
    return ["All", ...names];
  }, [contextLogs]);

  const filtered = useMemo(() => {
    let logs = [...contextLogs];
    if (search.trim()) {
      const q = search.toLowerCase();
      logs = logs.filter(
        (l) => l.endpoint.toLowerCase().includes(q) ||
               l.correlationId.toLowerCase().includes(q) ||
               l.integrationName.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "All") {
      logs = logs.filter((l) => matchesStatusFilter(l.statusCode, statusFilter));
    }
    if (providerFilter !== "All") {
      logs = logs.filter((l) => l.integrationName === providerFilter);
    }
    return logs;
  }, [contextLogs, search, statusFilter, providerFilter, refreshKey]);

  const stats = useMemo(() => {
    const all = contextLogs;
    return {
      total:    all.length,
      success:  all.filter((l) => l.statusCode >= 200 && l.statusCode < 300).length,
      errors:   all.filter((l) => l.statusCode >= 400).length,
      avgLatency: all.length ? Math.round(all.reduce((s, l) => s + l.duration, 0) / all.length) : 0,
      retried:  all.filter((l) => (l.retryAttempt ?? 0) > 0).length,
    };
  }, [contextLogs, refreshKey]);

  return (
    <div className="space-y-5">
      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          { label: "Total Requests", value: stats.total,      accent: "text-fg" },
          { label: "Successful",     value: stats.success,    accent: "text-lime" },
          { label: "Errors",         value: stats.errors,     accent: "text-rose" },
          { label: "Avg Latency",    value: `${stats.avgLatency}ms`, accent: "text-sky" },
          { label: "Retried",        value: stats.retried,    accent: "text-amber" },
        ].map((s) => (
          <div key={s.label} className="qb-card py-3 px-4">
            <div className={`qb-display text-xl font-bold ${s.accent}`}>{s.value}</div>
            <div className="text-xs text-muted mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="qb-card">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by endpoint, correlation ID…"
              className="w-full rounded-lg border border-border-strong bg-surface-2 pl-9 pr-4 py-2 text-xs text-fg placeholder:text-muted focus:outline-none focus:border-teal/60 focus:ring-1 focus:ring-teal/30"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-3.5 w-3.5 text-muted shrink-0" />
            <div className="flex gap-1.5">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-colors ${
                    statusFilter === s
                      ? "border-teal/50 bg-teal-soft text-teal"
                      : "border-border-strong bg-surface-2 text-muted hover:text-fg"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="rounded-lg border border-border-strong bg-surface-2 px-3 py-2 text-xs text-fg focus:outline-none focus:border-teal/60"
          >
            {providerOptions.map((p) => <option key={p}>{p}</option>)}
          </select>

          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="flex items-center gap-1.5 rounded-lg border border-border-strong bg-surface-2 px-3 py-2 text-xs text-muted hover:text-fg transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>

          <button className="flex items-center gap-1.5 rounded-lg border border-border-strong bg-surface-2 px-3 py-2 text-xs text-muted hover:text-fg transition-colors">
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* Logs table */}
      <div className="qb-card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border-soft">
          <h3 className="qb-display text-sm font-semibold text-fg">API Audit Log</h3>
          <span className="qb-mono text-[11px] text-muted">{filtered.length} entries · HIPAA retained 7 years</span>
        </div>

        <div className="overflow-x-auto qb-scroll">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-border-soft bg-surface-2">
                {["Method", "Status", "Endpoint", "Integration", "Latency", "Time", "Retries", ""].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted">
                    No log entries match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <LogRow
                    key={log.id}
                    log={log}
                    expanded={expandedId === log.id}
                    onToggle={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-border-soft bg-surface-2">
          <span className="text-xs text-muted">
            Showing {filtered.length} of {mockApiLogs.length} entries
          </span>
          <div className="flex items-center gap-1">
            <button disabled className="rounded border border-border-strong bg-surface-3 px-3 py-1 text-xs text-muted opacity-50">Prev</button>
            <span className="rounded border border-teal/40 bg-teal-soft px-3 py-1 text-xs text-teal font-medium">1</span>
            <button className="rounded border border-border-strong bg-surface-2 px-3 py-1 text-xs text-muted hover:text-fg">Next</button>
          </div>
        </div>
      </div>

      {/* Error Insights */}
      {stats.errors > 0 && (
        <div className="qb-card border-rose/20">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-4 w-4 text-rose" />
            <h3 className="qb-display text-sm font-semibold text-rose">Error Insights</h3>
          </div>
          <div className="space-y-2">
            {mockApiLogs
              .filter((l) => l.statusCode >= 400)
              .slice(0, 3)
              .map((l) => (
                <div key={l.id} className="flex items-start gap-3 rounded-lg border border-rose/10 bg-rose-soft p-3">
                  <div className="h-5 w-5 shrink-0 grid place-items-center rounded-full bg-rose-soft border border-rose/20">
                    <span className="qb-mono text-[10px] font-bold text-rose">{l.statusCode}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-fg">{l.integrationName}</div>
                    <div className="qb-mono text-[11px] text-muted truncate">{l.endpoint}</div>
                    {l.error && <div className="text-[11px] text-rose mt-0.5">{l.error}</div>}
                  </div>
                  <div className="ml-auto text-[11px] text-muted shrink-0">{formatTimestamp(l.timestamp)}</div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
