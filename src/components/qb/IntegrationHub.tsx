import { useState, useMemo, useEffect } from "react";
import {
  LayoutGrid, Plus, Activity, AlertCircle, CheckCircle, WifiOff,
  Clock, Search, MoreHorizontal, Eye, Settings, Play, Ban,
  RefreshCw, Plug, ShieldCheck, Database, Zap, TrendingUp, Share2, Users,
} from "lucide-react";
import {
  mockIntegrations, statusColor, authLabel, dataTypeLabel, formatTimestamp,
  providerLogo, providerColor, type Integration,
} from "@/lib/integration-data";
import { mockSharingConfigs } from "@/lib/consent-data";
import { useUserContext } from "@/lib/user-context";
import { ConnectProviderWizard } from "@/components/qb/ConnectProviderWizard";
import { IntegrationDetails } from "@/components/qb/IntegrationDetails";
import { IntegrationLogs } from "@/components/qb/IntegrationLogs";
import { DataSharingConsent } from "@/components/qb/DataSharingConsent";

// ── Tab types ─────────────────────────────────────────────────────────────────
type View = "dashboard" | "new" | "details" | "logs" | "sharing";

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, Icon, accent,
}: { label: string; value: string | number; sub: string; Icon: React.ElementType; accent: string }) {
  return (
    <div className="qb-card flex items-start gap-4">
      <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${accent}`}>
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <div className="min-w-0">
        <div className="qb-display text-2xl font-bold text-fg">{value}</div>
        <div className="text-xs font-medium text-fg mt-0.5">{label}</div>
        <div className="text-[11px] text-muted mt-0.5">{sub}</div>
      </div>
    </div>
  );
}

// ── Integration Row ───────────────────────────────────────────────────────────
function IntegrationRow({
  integration, onView, onEdit,
  subjectTag, subjectTagColor,
}: {
  integration: Integration;
  onView: () => void;
  onEdit: () => void;
  subjectTag?: string;
  subjectTagColor?: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const sc = statusColor(integration.status);

  const statusIcons = {
    Connected:    <CheckCircle className="h-3.5 w-3.5" />,
    Error:        <AlertCircle className="h-3.5 w-3.5" />,
    Disconnected: <WifiOff className="h-3.5 w-3.5" />,
    Pending:      <Clock className="h-3.5 w-3.5" />,
  };

  return (
    <tr className="border-b border-border-soft hover:bg-surface-2 transition-colors group">
      {/* Provider */}
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-bold ${providerColor(integration.provider)}`}>
            {providerLogo(integration.provider)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-fg truncate">{integration.name}</span>
              {subjectTag && (
                <span className={`qb-chip border text-[9px] font-bold ${subjectTagColor}`}>{subjectTag}</span>
              )}
            </div>
            <div className="text-[11px] text-muted mt-0.5">
              {integration.provider} · {integration.apiVersion}
              {integration.environment === "sandbox" && (
                <span className="ml-2 qb-chip bg-violet-soft text-violet border-violet/30 text-[9px] font-semibold uppercase">sandbox</span>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-4">
        <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${sc.bg} ${sc.text} ${sc.border}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${sc.dot} ${integration.status === "Connected" ? "qb-pulse" : ""}`} />
          {statusIcons[integration.status]}
          {integration.status}
        </div>
      </td>

      {/* Last Sync */}
      <td className="px-4 py-4">
        <span className="text-xs text-muted">{formatTimestamp(integration.lastSync)}</span>
      </td>

      {/* Auth */}
      <td className="px-4 py-4">
        <span className="qb-chip bg-surface-3 text-muted border-border-strong text-[11px]">
          <ShieldCheck className="h-3 w-3" />
          {authLabel(integration.authType)}
        </span>
      </td>

      {/* Data Shared */}
      <td className="px-4 py-4">
        <div className="flex flex-wrap gap-1">
          {integration.dataTypes.slice(0, 2).map((dt) => (
            <span key={dt} className="qb-chip bg-teal-soft text-teal border-teal/30 text-[10px]">
              {dataTypeLabel(dt)}
            </span>
          ))}
          {integration.dataTypes.length > 2 && (
            <span className="qb-chip bg-surface-3 text-muted border-border-strong text-[10px]">
              +{integration.dataTypes.length - 2}
            </span>
          )}
        </div>
      </td>

      {/* Syncs */}
      <td className="px-4 py-4">
        <span className="qb-mono text-xs text-muted">{integration.totalSyncCount.toLocaleString()}</span>
      </td>

      {/* Actions */}
      <td className="px-4 py-4">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onView}
            title="View Details"
            className="grid h-7 w-7 place-items-center rounded-lg border border-border-strong bg-surface-2 text-muted hover:text-teal transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onEdit}
            title="Edit Config"
            className="grid h-7 w-7 place-items-center rounded-lg border border-border-strong bg-surface-2 text-muted hover:text-fg transition-colors"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="grid h-7 w-7 place-items-center rounded-lg border border-border-strong bg-surface-2 text-muted hover:text-fg transition-colors"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-8 z-20 w-40 rounded-xl border border-border-strong bg-surface shadow-lg py-1">
                  {[
                    { label: "Test Connection", icon: Play,       action: () => { setMenuOpen(false); } },
                    { label: "Sync Now",        icon: RefreshCw,  action: () => { setMenuOpen(false); } },
                    { label: "Disable",         icon: Ban,        action: () => { setMenuOpen(false); }, danger: true },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={item.action}
                      className={`flex w-full items-center gap-2.5 px-3 py-2 text-xs transition-colors hover:bg-surface-2 ${item.danger ? "text-rose" : "text-fg"}`}
                    >
                      <item.icon className="h-3.5 w-3.5" />
                      {item.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

// ── Dashboard view ────────────────────────────────────────────────────────────
function Dashboard({
  integrations, onNew, onView, onEdit, onLogs,
  isFamilyView, subjectName, subjectTag, subjectTagColor,
}: {
  integrations: Integration[];
  onNew: () => void;
  onView: (i: Integration) => void;
  onEdit: (i: Integration) => void;
  onLogs: () => void;
  isFamilyView: boolean;
  subjectName: string;
  subjectTag: string;
  subjectTagColor: string;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const stats = {
    total:      integrations.length,
    connected:  integrations.filter((i) => i.status === "Connected").length,
    errors:     integrations.filter((i) => i.status === "Error").length,
    totalSyncs: integrations.reduce((sum, i) => sum + i.totalSyncCount, 0),
  };

  const filtered = integrations.filter((i) => {
    const matchSearch = !search.trim() || i.name.toLowerCase().includes(search.toLowerCase()) || i.provider.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || i.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Integrations" value={stats.total}     sub="Active configurations"          Icon={Plug}       accent="bg-teal-soft text-teal" />
        <StatCard label="Connected"           value={stats.connected} sub="Healthy & syncing"              Icon={CheckCircle} accent="bg-lime-soft text-lime" />
        <StatCard label="Errors"              value={stats.errors}    sub="Require attention"              Icon={AlertCircle} accent="bg-rose-soft text-rose" />
        <StatCard label="Total Syncs"         value={stats.totalSyncs.toLocaleString()} sub="All-time record count" Icon={TrendingUp}  accent="bg-sky-soft text-sky" />
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search integrations…"
              className="rounded-lg border border-border-strong bg-surface pl-9 pr-4 py-2 text-xs text-fg placeholder:text-muted focus:outline-none focus:border-teal/60 focus:ring-1 focus:ring-teal/30 w-56"
            />
          </div>

          {/* Status filter */}
          <div className="flex gap-1.5">
            {["All", "Connected", "Error", "Disconnected", "Pending"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? "border-teal/40 bg-teal-soft text-teal"
                    : "border-border-strong bg-surface text-muted hover:text-fg"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onLogs}
            className="flex items-center gap-1.5 rounded-lg border border-border-strong bg-surface px-3 py-2 text-xs font-medium text-muted hover:text-fg transition-colors"
          >
            <Activity className="h-3.5 w-3.5" />
            View Logs
          </button>
          <button
            onClick={onNew}
            className="flex items-center gap-1.5 rounded-xl border border-teal/30 bg-teal-soft px-4 py-2 text-xs font-semibold text-teal hover:bg-teal/20 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New Integration
          </button>
        </div>
      </div>

      {/* Integrations table */}
      <div className="qb-card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-soft">
          <h3 className="qb-display text-sm font-semibold text-fg">Connected Systems</h3>
          <span className="text-xs text-muted">{filtered.length} integration{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Plug className="h-10 w-10 text-muted mx-auto mb-3 opacity-30" />
            {isFamilyView ? (
              <>
                <p className="text-sm font-medium text-muted">No integrations configured for <strong className="text-fg">{subjectName}</strong></p>
                <p className="text-xs text-muted mt-1">Switch to Primary Patient view or set up a new integration for this family member.</p>
                <button onClick={onNew} className="mt-4 flex items-center gap-1.5 mx-auto text-xs text-teal hover:underline">
                  <Plus className="h-3.5 w-3.5" /> Add integration for {subjectName} →
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted">No integrations found.</p>
                <button onClick={onNew} className="mt-4 text-xs text-teal hover:underline">Add your first integration →</button>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto qb-scroll">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-border-soft bg-surface-2">
                  {["Provider / System", "Status", "Last Sync", "Auth", "Data Shared", "Syncs", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted first:pl-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((integration) => (
                  <IntegrationRow
                    key={integration.id}
                    integration={integration}
                    onView={() => onView(integration)}
                    onEdit={() => onEdit(integration)}
                    subjectTag={subjectTag}
                    subjectTagColor={subjectTagColor}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Architecture overview */}
      <div className="qb-card">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-4 w-4 text-violet" />
          <h3 className="qb-display text-sm font-semibold text-fg">Integration Architecture</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { icon: ShieldCheck, label: "Security Layer",      desc: "OAuth 2.0 · mTLS · API Key · AES-256", color: "bg-teal-soft text-teal" },
            { icon: Database,    label: "Data Transform",      desc: "Internal model → FHIR R4 bundles",     color: "bg-violet-soft text-violet" },
            { icon: Zap,         label: "Event Engine",        desc: "Real-time triggers + scheduled batch", color: "bg-amber-soft text-amber" },
            { icon: Activity,    label: "Monitoring",          desc: "Logs · Retry logic · Alerting",        color: "bg-sky-soft text-sky" },
          ].map((item) => (
            <div key={item.label} className="flex items-start gap-3 rounded-xl border border-border-soft bg-surface-2 p-3.5">
              <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${item.color}`}>
                <item.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-fg">{item.label}</div>
                <div className="text-[11px] text-muted mt-0.5 leading-relaxed">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Integration Hub ──────────────────────────────────────────────────────
export function IntegrationHub() {
  const ctx = useUserContext();
  const [view, setView]          = useState<View>("dashboard");
  const [selected, setSelected]  = useState<Integration | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>(mockIntegrations);

  // ── Context-based filtering ────────────────────────────────────────────────
  // SELF  → show all integrations
  // FAMILY → show only integrations that have at least one SharingConfig
  //          for the selected family member (by providerId)
  const contextFilteredIntegrations = useMemo(() => {
    if (ctx.contextType === "SELF") return integrations;
    const memberProviderIds = new Set(
      mockSharingConfigs
        .filter((c) => c.subjectId === ctx.contextSubjectId && c.status !== "revoked")
        .map((c) => c.providerId),
    );
    return integrations.filter((i) => memberProviderIds.has(i.id));
  }, [integrations, ctx.contextType, ctx.contextSubjectId]);

  // Auto-reset to dashboard whenever the context switches to prevent stale "details" views
  useEffect(() => {
    setView("dashboard");
    setSelected(null);
  }, [ctx.contextSubjectId]);

  const TAB_ITEMS: { id: View; label: string; Icon: React.ElementType; count?: number }[] = [
    { id: "dashboard", label: "Overview",         Icon: LayoutGrid },
    { id: "sharing",   label: "Data Sharing",     Icon: Share2 },
    { id: "new",       label: "Connect Provider",  Icon: Plus },
    { id: "logs",      label: "Audit Logs",       Icon: Activity, count: contextFilteredIntegrations.filter((i) => i.status === "Error").length },
  ];

  function handleView(i: Integration) { setSelected(i); setView("details"); }
  function handleEdit(i: Integration) { setSelected(i); setView("new"); }
  function handleComplete(newIntegration: Integration) {
    setIntegrations((prev) => [newIntegration, ...prev]);
    setView("dashboard");
  }

  return (
    <div className="space-y-5">
      {/* Hub header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="qb-display text-[17px] font-semibold text-fg">Integration Hub</h1>
          <p className="text-xs text-muted mt-0.5">
            Manage secure data exchange with EPIC, Cerner, labs, and third-party APIs
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Context badge */}
          <div className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium ${
            ctx.isFamilyView
              ? "border-amber/30 bg-amber-soft text-amber"
              : "border-teal/30 bg-teal-soft text-teal"
          }`}>
            <Users className="h-3.5 w-3.5 shrink-0" />
            {ctx.isFamilyView ? ctx.contextSubjectName : "Primary Patient"}
            <span className={`qb-chip border text-[9px] font-bold ${ctx.subjectTagColor}`}>{ctx.subjectTag}</span>
          </div>
          <span className="qb-chip bg-lime-soft text-lime border-lime/30 text-[11px] font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-lime qb-pulse inline-block mr-1" />
            {contextFilteredIntegrations.filter((i) => i.status === "Connected").length} Active
          </span>
          {contextFilteredIntegrations.filter((i) => i.status === "Error").length > 0 && (
            <span className="qb-chip bg-rose-soft text-rose border-rose/30 text-[11px] font-medium">
              <AlertCircle className="h-3 w-3" />
              {contextFilteredIntegrations.filter((i) => i.status === "Error").length} Error
            </span>
          )}
          <a href="/admin-integrations"
            className="flex items-center gap-1 rounded-lg border border-border-strong bg-surface-2 px-2.5 py-1.5 text-[11px] font-medium text-muted hover:text-violet hover:border-violet/40 transition-colors">
            <ShieldCheck className="h-3.5 w-3.5" /> Admin Config
          </a>
        </div>
      </div>

      {/* Tab bar — only on dashboard/new/logs/sharing (not details) */}
      {view !== "details" && (
        <div className="flex items-center gap-1 border-b border-border-soft pb-0">
          {TAB_ITEMS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className={`relative flex items-center gap-1.5 rounded-t-lg px-4 py-2.5 text-xs font-medium transition-colors ${
                view === tab.id
                  ? "text-teal border-b-2 border-teal -mb-px bg-teal-soft/40"
                  : "text-muted hover:text-fg"
              }`}
            >
              <tab.Icon className="h-3.5 w-3.5" />
              {tab.label}
              {tab.count != null && tab.count > 0 && (
                <span className="rounded-full bg-rose-soft text-rose px-1.5 py-0.5 qb-mono text-[9px] font-semibold">{tab.count}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* View routing */}
      {view === "dashboard" && (
        <Dashboard
          integrations={contextFilteredIntegrations}
          onNew={() => setView("new")}
          onView={handleView}
          onEdit={handleEdit}
          onLogs={() => setView("logs")}
          isFamilyView={ctx.isFamilyView}
          subjectName={ctx.contextSubjectName}
          subjectTag={ctx.subjectTag}
          subjectTagColor={ctx.subjectTagColor}
        />
      )}

      {view === "new" && (
        <ConnectProviderWizard
          onComplete={() => setView("dashboard")}
          onCancel={() => setView("dashboard")}
        />
      )}

      {view === "details" && selected && (
        <IntegrationDetails
          integration={selected}
          onBack={() => setView("dashboard")}
          onEdit={() => setView("new")}
        />
      )}

      {view === "logs" && <IntegrationLogs />}

      {view === "sharing" && <DataSharingConsent />}
    </div>
  );
}
