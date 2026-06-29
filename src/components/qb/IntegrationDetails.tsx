import { useState } from "react";
import {
  ArrowLeft, CheckCircle, AlertCircle, WifiOff, Clock, Shield,
  Key, Globe, RefreshCw, Eye, EyeOff, ExternalLink, Activity,
  Database, Layers, AlertTriangle, Play, Trash2, Settings,
} from "lucide-react";
import {
  type Integration, statusColor, authLabel, dataTypeLabel, formatTimestamp,
  mockApiLogs, sampleFhirWearableObservation, sampleFhirGlucoseObservation,
  DATA_TYPE_OPTIONS,
} from "@/lib/integration-data";
import { testConnection } from "@/lib/api/integration.functions";

interface Props {
  integration: Integration;
  onBack: () => void;
  onEdit: () => void;
}

function StatusBadge({ status }: { status: Integration["status"] }) {
  const c = statusColor(status);
  const icons = { Connected: CheckCircle, Error: AlertCircle, Disconnected: WifiOff, Pending: Clock };
  const Icon = icons[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${c.bg} ${c.text} ${c.border}`}>
      <Icon className="h-3.5 w-3.5" />
      {status}
    </span>
  );
}

function MaskedSecret({ value, label }: { value: string; label: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border-strong bg-surface-2 px-3 py-2">
      <span className="text-[11px] text-muted w-28 shrink-0">{label}</span>
      <span className="qb-mono text-xs text-fg flex-1 truncate">
        {visible ? value : "•".repeat(Math.min(value.length, 24))}
      </span>
      <button
        onClick={() => setVisible((v) => !v)}
        className="text-muted hover:text-fg transition-colors"
        aria-label={visible ? "Hide" : "Show"}
      >
        {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

function SyncHistoryTimeline({ integration }: { integration: Integration }) {
  if (integration.syncHistory.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted">
        No sync history yet. Connect and run your first sync to see data here.
      </div>
    );
  }
  return (
    <div className="space-y-0">
      {integration.syncHistory.map((sh, i) => {
        const isLast = i === integration.syncHistory.length - 1;
        const statusMap = {
          success: { color: "text-lime", bg: "bg-lime-soft", dot: "bg-lime", Icon: CheckCircle },
          partial: { color: "text-amber", bg: "bg-amber-soft", dot: "bg-amber", Icon: AlertTriangle },
          failed:  { color: "text-rose",  bg: "bg-rose-soft",  dot: "bg-rose",  Icon: AlertCircle },
        };
        const s = statusMap[sh.status];
        return (
          <div key={sh.id} className="flex gap-3">
            {/* Timeline line */}
            <div className="flex flex-col items-center">
              <div className={`mt-3 h-2.5 w-2.5 rounded-full shrink-0 ${s.dot}`} />
              {!isLast && <div className="w-px flex-1 bg-border-soft mt-1 mb-0" />}
            </div>
            {/* Content */}
            <div className={`pb-4 ${isLast ? "" : ""}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`qb-chip border text-[11px] font-medium ${s.bg} ${s.color}`}>
                  <s.Icon className="h-3 w-3" />
                  {sh.status}
                </span>
                <span className="qb-mono text-[11px] text-muted">{formatTimestamp(sh.timestamp)}</span>
              </div>
              <div className="mt-1 flex gap-4 text-xs text-muted">
                <span>↑ {sh.recordsSent} sent</span>
                <span>↓ {sh.recordsReceived} received</span>
                <span className="qb-mono">{sh.duration}ms</span>
              </div>
              {sh.errorMessage && (
                <p className="mt-1 text-[11px] text-rose">{sh.errorMessage}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FhirPayloadViewer({ integration }: { integration: Integration }) {
  const [activeTab, setActiveTab] = useState<"patient" | "observation" | "wearable">("observation");

  const payloads = {
    patient: { label: "Patient", resource: { resourceType: "Patient", id: "patient-00429", name: [{ family: "Martinez", given: ["Sarah"] }], birthDate: "1981-03-15" } },
    observation: { label: "Observation (Glucose)", resource: sampleFhirGlucoseObservation },
    wearable: { label: "Observation (Wearable)", resource: sampleFhirWearableObservation },
  };

  return (
    <div>
      <div className="flex gap-1 mb-3">
        {(Object.keys(payloads) as Array<keyof typeof payloads>).map((k) => (
          <button
            key={k}
            onClick={() => setActiveTab(k)}
            className={`rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-colors ${
              activeTab === k
                ? "border-teal/50 bg-teal-soft text-teal"
                : "border-border-strong bg-surface-2 text-muted hover:text-fg"
            }`}
          >
            {payloads[k].label}
          </button>
        ))}
      </div>
      <pre className="rounded-xl border border-border-strong bg-surface-2 p-4 text-[11px] qb-mono text-fg overflow-x-auto leading-relaxed qb-scroll max-h-64">
        {JSON.stringify(payloads[activeTab].resource, null, 2)}
      </pre>
    </div>
  );
}

export function IntegrationDetails({ integration, onBack, onEdit }: Props) {
  const [testState, setTestState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [testResult, setTestResult] = useState<Awaited<ReturnType<typeof testConnection>> | null>(null);
  const [showFhir, setShowFhir] = useState(false);

  const recentLogs = mockApiLogs.filter((l) => l.integrationId === integration.id).slice(0, 5);

  async function handleTest() {
    setTestState("loading");
    try {
      const result = await testConnection({ integrationId: integration.id, sendSampleData: true });
      setTestResult(result);
      setTestState(result.success ? "success" : "error");
    } catch {
      setTestState("error");
    }
  }

  const sc = statusColor(integration.status);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={onBack}
          className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border-strong bg-surface-2 text-muted hover:text-fg transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h2 className="qb-display text-lg font-semibold text-fg">{integration.name}</h2>
            <StatusBadge status={integration.status} />
            {integration.environment === "sandbox" && (
              <span className="qb-chip bg-violet-soft text-violet border-violet/30 text-[10px] font-semibold uppercase tracking-wider">Sandbox</span>
            )}
          </div>
          <p className="text-xs text-muted">
            {integration.provider} · {integration.apiVersion} · Created {formatTimestamp(integration.createdAt)}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleTest}
            disabled={testState === "loading"}
            className="flex items-center gap-1.5 rounded-lg border border-teal/30 bg-teal-soft px-3 py-2 text-xs font-medium text-teal hover:bg-teal/20 disabled:opacity-50 transition-colors"
          >
            <Play className={`h-3.5 w-3.5 ${testState === "loading" ? "animate-spin" : ""}`} />
            {testState === "loading" ? "Testing…" : "Test Connection"}
          </button>
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 rounded-lg border border-border-strong bg-surface-2 px-3 py-2 text-xs font-medium text-muted hover:text-fg transition-colors"
          >
            <Settings className="h-3.5 w-3.5" />
            Edit Config
          </button>
        </div>
      </div>

      {/* Error banner */}
      {integration.status === "Error" && integration.errorMessage && (
        <div className="flex items-start gap-3 rounded-xl border border-rose/20 bg-rose-soft p-4">
          <AlertCircle className="h-4 w-4 text-rose mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-rose">Integration Error</p>
            <p className="text-xs text-rose/80 mt-0.5">{integration.errorMessage}</p>
          </div>
        </div>
      )}

      {/* Test result */}
      {testResult && testState !== "idle" && testState !== "loading" && (
        <div className={`rounded-xl border p-4 ${testState === "success" ? "border-lime/20 bg-lime-soft" : "border-rose/20 bg-rose-soft"}`}>
          <div className="flex items-center gap-2 mb-2">
            {testState === "success"
              ? <CheckCircle className="h-4 w-4 text-lime" />
              : <AlertCircle className="h-4 w-4 text-rose" />
            }
            <span className={`text-sm font-medium ${testState === "success" ? "text-lime" : "text-rose"}`}>
              {testResult.message}
            </span>
            <span className="qb-mono text-[11px] text-muted ml-auto">{testResult.latency}ms · HTTP {testResult.statusCode}</span>
          </div>
          {testResult.sampleRequest && (
            <div className="mt-3">
              <button
                onClick={() => setShowFhir((v) => !v)}
                className="text-xs text-muted hover:text-fg transition-colors flex items-center gap-1"
              >
                {showFhir ? "Hide" : "Show"} sample FHIR request/response
              </button>
              {showFhir && (
                <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <div className="text-[11px] text-muted mb-1 font-medium">Request</div>
                    <pre className="rounded-lg border border-border-strong bg-surface-2 p-3 text-[10px] qb-mono overflow-x-auto qb-scroll max-h-48">
                      {JSON.stringify(testResult.sampleRequest, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted mb-1 font-medium">Response</div>
                    <pre className="rounded-lg border border-border-strong bg-surface-2 p-3 text-[10px] qb-mono overflow-x-auto qb-scroll max-h-48">
                      {JSON.stringify(testResult.sampleResponse, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left column — main details */}
        <div className="lg:col-span-2 space-y-5">
          {/* Connection info */}
          <div className="qb-card">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="h-4 w-4 text-teal" />
              <h3 className="qb-display text-sm font-semibold text-fg">Connection</h3>
            </div>
            <div className="space-y-2">
              {[
                { label: "Base URL",    value: integration.baseUrl },
                { label: "API Version", value: integration.apiVersion },
                ...(integration.webhookUrl ? [{ label: "Webhook URL", value: integration.webhookUrl }] : []),
                { label: "Environment", value: integration.environment === "production" ? "Production" : "Sandbox" },
                ...(integration.ipWhitelist?.length ? [{ label: "IP Whitelist", value: integration.ipWhitelist.join(", ") }] : []),
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-2 rounded-lg border border-border-soft bg-surface-2 px-3 py-2">
                  <span className="text-[11px] text-muted w-28 shrink-0">{row.label}</span>
                  <span className="qb-mono text-xs text-fg truncate">{row.value}</span>
                  {row.label === "Base URL" && (
                    <a href={row.value} target="_blank" rel="noopener noreferrer" className="ml-auto text-muted hover:text-teal">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Authentication */}
          <div className="qb-card">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-4 w-4 text-teal" />
              <h3 className="qb-display text-sm font-semibold text-fg">Authentication</h3>
              <span className="ml-auto qb-chip bg-teal-soft text-teal border-teal/30 text-[10px]">
                {authLabel(integration.authType)}
              </span>
            </div>

            {integration.authType === "oauth2" && integration.oauth2Config && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-lg border border-border-soft bg-surface-2 px-3 py-2">
                  <span className="text-[11px] text-muted w-28 shrink-0">Flow</span>
                  <span className="text-xs text-fg capitalize">{integration.oauth2Config.flow.replace("_", " ")}</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-border-soft bg-surface-2 px-3 py-2">
                  <span className="text-[11px] text-muted w-28 shrink-0">Client ID</span>
                  <span className="qb-mono text-xs text-fg">{integration.oauth2Config.clientId}</span>
                </div>
                <MaskedSecret value={integration.oauth2Config.clientSecretHash} label="Client Secret" />
                <div className="flex items-center gap-2 rounded-lg border border-border-soft bg-surface-2 px-3 py-2">
                  <span className="text-[11px] text-muted w-28 shrink-0">Token URL</span>
                  <span className="qb-mono text-xs text-fg truncate flex-1">{integration.oauth2Config.tokenUrl}</span>
                </div>
                <div className="flex items-start gap-2 rounded-lg border border-border-soft bg-surface-2 px-3 py-2">
                  <span className="text-[11px] text-muted w-28 shrink-0 mt-0.5">Scopes</span>
                  <div className="flex flex-wrap gap-1.5">
                    {integration.oauth2Config.scopes.map((s) => (
                      <span key={s} className="qb-chip bg-surface-3 text-muted border-border-strong text-[10px]">{s}</span>
                    ))}
                  </div>
                </div>
                {integration.oauth2Config.tokenExpiresAt && (
                  <div className="flex items-center gap-2 rounded-lg border border-lime/20 bg-lime-soft px-3 py-2">
                    <CheckCircle className="h-3.5 w-3.5 text-lime shrink-0" />
                    <span className="text-[11px] text-lime">Token valid · Expires {formatTimestamp(integration.oauth2Config.tokenExpiresAt)}</span>
                  </div>
                )}
              </div>
            )}

            {integration.authType === "api-key" && integration.apiKeyConfig && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-lg border border-border-soft bg-surface-2 px-3 py-2">
                  <span className="text-[11px] text-muted w-28 shrink-0">Header Name</span>
                  <span className="qb-mono text-xs text-fg">{integration.apiKeyConfig.headerName}</span>
                </div>
                <MaskedSecret value={integration.apiKeyConfig.keyHash} label="API Key (hashed)" />
              </div>
            )}

            {integration.authType === "mtls" && integration.mtlsConfig && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-lg border border-border-soft bg-surface-2 px-3 py-2">
                  <span className="text-[11px] text-muted w-28 shrink-0">Certificate</span>
                  <span className="qb-mono text-xs text-fg">{integration.mtlsConfig.certSubject}</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-border-soft bg-surface-2 px-3 py-2">
                  <Key className="h-3.5 w-3.5 text-teal shrink-0" />
                  <span className="text-[11px] text-muted w-28 shrink-0">Cert Expires</span>
                  <span className="qb-mono text-xs text-fg">{formatTimestamp(integration.mtlsConfig.certExpiry)}</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-border-soft bg-surface-2 px-3 py-2">
                  <span className="text-[11px] text-muted w-28 shrink-0">Private Key</span>
                  <span className="text-xs text-muted">Stored in HSM — never exported</span>
                  <Shield className="h-3.5 w-3.5 text-teal ml-auto" />
                </div>
              </div>
            )}
          </div>

          {/* Data Mapping */}
          {integration.mappings.length > 0 && (
            <div className="qb-card">
              <div className="flex items-center gap-2 mb-4">
                <Layers className="h-4 w-4 text-teal" />
                <h3 className="qb-display text-sm font-semibold text-fg">Field Mappings</h3>
                <span className="ml-auto text-xs text-muted">{integration.mappings.length} mappings</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left border-b border-border-soft">
                      {["Internal Field", "Type", "FHIR Resource", "FHIR Path", "Transform"].map((h) => (
                        <th key={h} className="pb-2 pr-4 text-[11px] font-semibold text-muted uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-soft">
                    {integration.mappings.map((m) => (
                      <tr key={m.id}>
                        <td className="py-2 pr-4 qb-mono text-fg">{m.internalField}</td>
                        <td className="py-2 pr-4 qb-mono text-muted">{m.internalType}</td>
                        <td className="py-2 pr-4">
                          <span className="qb-chip bg-teal-soft text-teal border-teal/30 text-[10px]">{m.fhirResource}</span>
                        </td>
                        <td className="py-2 pr-4 qb-mono text-muted">{m.fhirPath}</td>
                        <td className="py-2">{m.transform ? <span className="text-amber text-[11px]">{m.transform}</span> : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* FHIR Sample Payloads */}
          <div className="qb-card">
            <div className="flex items-center gap-2 mb-4">
              <Database className="h-4 w-4 text-teal" />
              <h3 className="qb-display text-sm font-semibold text-fg">FHIR Sample Payloads</h3>
            </div>
            <FhirPayloadViewer integration={integration} />
          </div>
        </div>

        {/* Right column — stats + history */}
        <div className="space-y-5">
          {/* Stats */}
          <div className="qb-card">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4 text-teal" />
              <h3 className="qb-display text-sm font-semibold text-fg">Statistics</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Total syncs</span>
                <span className="qb-display text-sm font-semibold text-fg">{integration.totalSyncCount.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Last sync</span>
                <span className="text-xs text-fg">{formatTimestamp(integration.lastSync)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Frequency</span>
                <span className="text-xs text-fg capitalize">{integration.syncSchedule.frequency}</span>
              </div>
              {integration.syncSchedule.cronExpression && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">Schedule</span>
                  <span className="qb-mono text-[11px] text-fg">{integration.syncSchedule.cronExpression}</span>
                </div>
              )}
            </div>
          </div>

          {/* Data types */}
          <div className="qb-card">
            <h3 className="qb-display text-sm font-semibold text-fg mb-3">Data Shared</h3>
            <div className="space-y-2">
              {DATA_TYPE_OPTIONS.map((opt) => {
                const active = integration.dataTypes.includes(opt.value);
                return (
                  <div
                    key={opt.value}
                    className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 transition-colors ${
                      active ? "border-teal/30 bg-teal-soft" : "border-border-soft bg-surface-2 opacity-40"
                    }`}
                  >
                    <span>{opt.icon}</span>
                    <span className={`text-xs font-medium ${active ? "text-teal" : "text-muted"}`}>{opt.label}</span>
                    {active && <CheckCircle className="h-3.5 w-3.5 text-lime ml-auto" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sync history */}
          <div className="qb-card">
            <div className="flex items-center gap-2 mb-4">
              <RefreshCw className="h-4 w-4 text-teal" />
              <h3 className="qb-display text-sm font-semibold text-fg">Sync History</h3>
            </div>
            <SyncHistoryTimeline integration={integration} />
          </div>

          {/* Recent logs */}
          {recentLogs.length > 0 && (
            <div className="qb-card">
              <h3 className="qb-display text-sm font-semibold text-fg mb-3">Recent API Calls</h3>
              <div className="space-y-1.5">
                {recentLogs.map((l) => (
                  <div key={l.id} className="flex items-center gap-2 rounded-lg bg-surface-2 px-2.5 py-2">
                    <span className={`qb-mono text-[10px] font-semibold ${l.statusCode < 300 ? "text-lime" : "text-rose"}`}>
                      {l.statusCode}
                    </span>
                    <span className="qb-mono text-[11px] text-fg truncate flex-1">{l.endpoint}</span>
                    <span className="qb-mono text-[10px] text-muted shrink-0">{l.duration}ms</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
