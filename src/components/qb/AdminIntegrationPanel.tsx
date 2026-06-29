import { useState, useMemo, useRef } from "react";
import {
  Server, Plus, Settings, Trash2, CheckCircle, AlertCircle, Clock,
  WifiOff, Shield, Key, Globe, FileText, Zap, TestTube, Edit2,
  ChevronDown, ChevronUp, X, Upload, Search, Eye, EyeOff,
  ToggleLeft, ToggleRight, Copy, ExternalLink,
} from "lucide-react";
import {
  mockAdminProviders, integrationTemplates, mockCertificates, mockAdminMappings,
  adminProviderStatusColor, DATA_TYPE_LABELS,
  type AdminProvider, type AdminProviderStatus, type AddProviderForm, EMPTY_ADD_FORM,
} from "@/lib/admin-data";
import {
  createAdminProvider, updateAdminProvider, deleteAdminProvider,
  setProviderStatus, testAdminProviderConnection, uploadCertificate, applyTemplate,
  type TestProviderConnectionResponse,
} from "@/lib/api/admin.functions";

// ── Shared helpers ────────────────────────────────────────────────────────────

type AdminTab = "registry" | "add" | "security" | "templates" | "mappings";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-2">{children}</div>;
}

function FormField({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-fg flex items-center gap-1">
        {label}{required && <span className="text-rose">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = "text", mono }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string; mono?: boolean }) {
  return (
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className={`w-full rounded-lg border border-border-strong bg-surface-2 px-3 py-2 text-xs text-fg placeholder:text-muted focus:outline-none focus:border-teal/60 focus:ring-1 focus:ring-teal/30 ${mono ? "qb-mono" : ""}`} />
  );
}

function SecretInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-lg border border-border-strong bg-surface-2 px-3 py-2 pr-9 text-xs text-fg placeholder:text-muted focus:outline-none focus:border-teal/60 qb-mono" />
      <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-fg">
        {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

function SelectInput({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-border-strong bg-surface-2 px-3 py-2 text-xs text-fg focus:outline-none focus:border-teal/60">
      {children}
    </select>
  );
}

function AdminBadge() {
  return (
    <span className="flex items-center gap-1 rounded-full border border-rose/30 bg-rose-soft px-2 py-0.5 text-[10px] font-bold text-rose uppercase tracking-wider">
      <Shield className="h-3 w-3" /> Admin Only
    </span>
  );
}

// ── Provider status badge ─────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AdminProviderStatus }) {
  const c = adminProviderStatusColor(status);
  const icons = { active: CheckCircle, inactive: WifiOff, pending: Clock, error: AlertCircle };
  const Icon = icons[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${c.bg} ${c.text} ${c.border}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot} ${status === "active" ? "qb-pulse" : ""}`} />
      <Icon className="h-3 w-3" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ── Tab 1: Provider Registry ──────────────────────────────────────────────────

function RegistryTab({
  providers, onAdd, onEdit, onTest, onToggleStatus,
}: {
  providers: AdminProvider[];
  onAdd: () => void;
  onEdit: (p: AdminProvider) => void;
  onTest: (p: AdminProvider) => void;
  onToggleStatus: (p: AdminProvider) => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | AdminProviderStatus>("all");
  const [testResult, setTestResult] = useState<Record<string, TestProviderConnectionResponse>>({});
  const [testing, setTesting] = useState<string | null>(null);

  const visible = useMemo(() => {
    return providers.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch = !q || p.displayName.toLowerCase().includes(q) || p.providerType.toLowerCase().includes(q);
      const matchFilter = filter === "all" || p.status === filter;
      return matchSearch && matchFilter;
    });
  }, [providers, search, filter]);

  async function handleTest(p: AdminProvider) {
    setTesting(p.id);
    const result = await testAdminProviderConnection(p.id);
    setTestResult((prev) => ({ ...prev, [p.id]: result }));
    setTesting(null);
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search providers…"
              className="rounded-lg border border-border-strong bg-surface pl-9 pr-4 py-2 text-xs text-fg placeholder:text-muted focus:outline-none focus:border-teal/60 w-48" />
          </div>
          {(["all", "active", "pending", "inactive", "error"] as const).map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={`rounded-lg border px-3 py-2 text-xs font-medium capitalize transition-colors ${
                filter === s ? "border-teal/40 bg-teal-soft text-teal" : "border-border-strong text-muted hover:text-fg"
              }`}>
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>
        <button onClick={onAdd}
          className="flex items-center gap-1.5 rounded-xl border border-teal/30 bg-teal-soft px-4 py-2 text-xs font-semibold text-teal hover:bg-teal/20">
          <Plus className="h-3.5 w-3.5" /> Add Provider
        </button>
      </div>

      {/* Provider cards */}
      {visible.length === 0 ? (
        <div className="py-16 text-center">
          <Server className="h-10 w-10 text-muted mx-auto mb-3 opacity-30" />
          <p className="text-sm text-muted">No providers found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((p) => {
            const res = testResult[p.id];
            return (
              <div key={p.id} className="qb-card">
                <div className="flex items-start gap-4 flex-wrap">
                  {/* Logo */}
                  <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-sm font-bold ${p.logoColor}`}>
                    {p.logoInitials}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-fg">{p.displayName}</span>
                      <StatusBadge status={p.status} />
                      <span className={`qb-chip border text-[9px] uppercase font-semibold ${
                        p.environment === "production" ? "bg-teal-soft text-teal border-teal/30" : "bg-violet-soft text-violet border-violet/30"
                      }`}>{p.environment}</span>
                    </div>
                    <div className="qb-mono text-[11px] text-muted mt-1 truncate">{p.fhirEndpoint}</div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="qb-chip bg-surface-3 text-muted border-border-strong text-[10px]">
                        <Shield className="h-2.5 w-2.5" /> {p.authType.toUpperCase()}
                      </span>
                      <span className="qb-chip bg-surface-3 text-muted border-border-strong text-[10px]">
                        FHIR {p.apiVersion}
                      </span>
                      <span className="qb-chip bg-surface-3 text-muted border-border-strong text-[10px]">
                        {p.connectedPatients.toLocaleString()} patients
                      </span>
                      {p.supportedDataTypes.slice(0, 3).map((dt) => (
                        <span key={dt} className="qb-chip bg-teal-soft text-teal border-teal/30 text-[10px]">{DATA_TYPE_LABELS[dt] ?? dt}</span>
                      ))}
                      {p.supportedDataTypes.length > 3 && (
                        <span className="qb-chip bg-surface-3 text-muted border-border-strong text-[10px]">+{p.supportedDataTypes.length - 3}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button onClick={() => handleTest(p)} disabled={testing === p.id}
                      className="flex items-center gap-1 rounded-lg border border-border-strong bg-surface-2 px-2.5 py-1.5 text-[11px] text-muted hover:text-teal transition-colors disabled:opacity-50">
                      <TestTube className={`h-3 w-3 ${testing === p.id ? "animate-pulse" : ""}`} />
                      {testing === p.id ? "Testing…" : "Test"}
                    </button>
                    <button onClick={() => onEdit(p)}
                      className="flex items-center gap-1 rounded-lg border border-border-strong bg-surface-2 px-2.5 py-1.5 text-[11px] text-muted hover:text-fg transition-colors">
                      <Edit2 className="h-3 w-3" /> Edit
                    </button>
                    <button onClick={() => onToggleStatus(p)}
                      className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] transition-colors ${
                        p.status === "active"
                          ? "border-rose/30 bg-rose-soft text-rose hover:bg-rose/20"
                          : "border-lime/30 bg-lime-soft text-lime hover:bg-lime/20"
                      }`}>
                      {p.status === "active"
                        ? <><ToggleRight className="h-3 w-3" /> Disable</>
                        : <><ToggleLeft className="h-3 w-3" /> Enable</>
                      }
                    </button>
                  </div>
                </div>

                {/* Test result */}
                {res && (
                  <div className={`mt-3 rounded-lg border px-3 py-2 text-[11px] flex items-center gap-2 ${
                    res.success ? "border-lime/20 bg-lime-soft text-lime" : "border-rose/20 bg-rose-soft text-rose"
                  }`}>
                    {res.success ? <CheckCircle className="h-3.5 w-3.5 shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 shrink-0" />}
                    <span>{res.message}</span>
                    {res.success && <span className="ml-2 text-muted">· {res.latencyMs}ms</span>}
                    <button onClick={() => setTestResult((p) => { const n = {...p}; delete n[res.success ? "" : ""]; return n; })} className="ml-auto">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}

                {p.notes && (
                  <div className="mt-2 text-[11px] text-amber bg-amber-soft border border-amber/20 rounded-lg px-3 py-1.5">
                    ⚠ {p.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Tab 2: Add / Edit Provider form ──────────────────────────────────────────

function AddProviderTab({
  initial, onSave, onCancel,
}: { initial?: Partial<AddProviderForm>; onSave: (form: AddProviderForm) => Promise<void>; onCancel?: () => void }) {
  const [form, setForm] = useState<AddProviderForm>({ ...EMPTY_ADD_FORM, ...initial });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState<"basic" | "auth" | "security" | "settings">("basic");
  const fileRef = useRef<HTMLInputElement>(null);

  function patch(p: Partial<AddProviderForm>) { setForm((f) => ({ ...f, ...p })); }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  const DATA_TYPES = ["reports", "clinical-notes", "lab-results", "prescriptions", "wearables", "demographics"];

  const SECTIONS = [
    { id: "basic",    label: "Basic Info",   icon: Server },
    { id: "auth",     label: "Authentication", icon: Shield },
    { id: "security", label: "Security",      icon: Key },
    { id: "settings", label: "Patient Settings", icon: Settings },
  ] as const;

  return (
    <div className="space-y-5">
      {/* Section tabs */}
      <div className="flex gap-1 border-b border-border-soft">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <button key={s.id} onClick={() => setActiveSection(s.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors rounded-t-lg ${
                activeSection === s.id ? "text-teal border-b-2 border-teal -mb-px bg-teal-soft/40" : "text-muted hover:text-fg"
              }`}>
              <Icon className="h-3.5 w-3.5" /> {s.label}
            </button>
          );
        })}
      </div>

      {/* Basic Info */}
      {activeSection === "basic" && (
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 rounded-xl border border-sky/30 bg-sky-soft px-4 py-3">
            <Shield className="h-4 w-4 text-sky shrink-0 mt-0.5" />
            <p className="text-[11px] text-sky/90">
              All technical details configured here are <strong>admin-only</strong>. Patients will only see the display name and description.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Display Name (shown to patients)" required>
              <TextInput value={form.displayName} onChange={(v) => patch({ displayName: v })} placeholder="Epic EHR — Main Hospital" />
            </FormField>
            <FormField label="Provider Type" required>
              <SelectInput value={form.providerType} onChange={(v) => patch({ providerType: v as any })}>
                {["EPIC", "Cerner", "Labcorp", "Quest Diagnostics", "Custom"].map((t) => <option key={t}>{t}</option>)}
              </SelectInput>
            </FormField>
            <div className="sm:col-span-2">
              <FormField label="Patient-facing Description" hint="Displayed to patients in the provider selector">
                <textarea value={form.description} onChange={(e) => patch({ description: e.target.value })} rows={2} placeholder="Connect to Main Hospital's records for reports, labs, and clinical notes."
                  className="w-full rounded-lg border border-border-strong bg-surface-2 px-3 py-2 text-xs text-fg placeholder:text-muted focus:outline-none focus:border-teal/60 resize-none" />
              </FormField>
            </div>
            <FormField label="FHIR Base URL" required hint="ADMIN ONLY — never shown to patients">
              <TextInput value={form.fhirEndpoint} onChange={(v) => patch({ fhirEndpoint: v })} placeholder="https://fhir.epic.com/..." mono />
            </FormField>
            <FormField label="API Version" required>
              <SelectInput value={form.apiVersion} onChange={(v) => patch({ apiVersion: v })}>
                {["R4", "STU3", "DSTU2", "v2", "v3"].map((v) => <option key={v}>{v}</option>)}
              </SelectInput>
            </FormField>
            <FormField label="Webhook URL" hint="Receives real-time events from this provider">
              <TextInput value={form.webhookUrl} onChange={(v) => patch({ webhookUrl: v })} placeholder="https://app.questbeyond.com/webhooks/…" mono />
            </FormField>
            <FormField label="Environment" required>
              <SelectInput value={form.environment} onChange={(v) => patch({ environment: v as any })}>
                <option value="sandbox">Sandbox / Testing</option>
                <option value="production">Production</option>
              </SelectInput>
            </FormField>
          </div>
          <FormField label="Supported Data Types" required>
            <div className="flex flex-wrap gap-2">
              {DATA_TYPES.map((dt) => {
                const on = form.supportedDataTypes.includes(dt);
                return (
                  <button key={dt} onClick={() => patch({ supportedDataTypes: on ? form.supportedDataTypes.filter((x) => x !== dt) : [...form.supportedDataTypes, dt] })}
                    className={`rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-colors ${
                      on ? "border-teal/40 bg-teal-soft text-teal" : "border-border-strong bg-surface-2 text-muted hover:text-fg"
                    }`}>
                    {DATA_TYPE_LABELS[dt] ?? dt}
                  </button>
                );
              })}
            </div>
          </FormField>
          <FormField label="Use Template" hint="Pre-fills auth and FHIR settings from an official provider template">
            <SelectInput value={form.templateId} onChange={async (v) => {
              if (!v) { patch({ templateId: "" }); return; }
              const prefill = await applyTemplate(v);
              patch({ templateId: v, ...prefill });
            }}>
              <option value="">— Select template (optional) —</option>
              {integrationTemplates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </SelectInput>
          </FormField>
        </div>
      )}

      {/* Authentication */}
      {activeSection === "auth" && (
        <div className="space-y-4">
          <FormField label="Authentication Type" required>
            <div className="grid grid-cols-3 gap-3">
              {(["oauth2", "api-key", "mtls"] as const).map((t) => (
                <button key={t} onClick={() => patch({ authType: t })}
                  className={`flex items-center gap-2 rounded-xl border p-3 transition-all ${
                    form.authType === t ? "border-teal/50 bg-teal-soft" : "border-border-strong bg-surface-2 hover:bg-surface-3"
                  }`}>
                  <Shield className={`h-4 w-4 ${form.authType === t ? "text-teal" : "text-muted"}`} />
                  <span className={`text-xs font-semibold ${form.authType === t ? "text-teal" : "text-fg"}`}>
                    {t === "oauth2" ? "OAuth 2.0" : t === "api-key" ? "API Key" : "mTLS"}
                  </span>
                  {form.authType === t && <CheckCircle className="h-3.5 w-3.5 text-teal ml-auto" />}
                </button>
              ))}
            </div>
          </FormField>

          {form.authType === "oauth2" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Client ID" required hint="From your provider app registration">
                <TextInput value={form.clientId} onChange={(v) => patch({ clientId: v })} placeholder="qb-epic-prod-client" mono />
              </FormField>
              <FormField label="Client Secret" required hint="Encrypted before storage — never logged">
                <SecretInput value={form.clientSecret} onChange={(v) => patch({ clientSecret: v })} placeholder="••••••••••••••••" />
              </FormField>
              <FormField label="Token URL" required>
                <TextInput value={form.tokenUrl} onChange={(v) => patch({ tokenUrl: v })} placeholder="https://fhir.epic.com/.../token" mono />
              </FormField>
              <FormField label="Authorization URL" hint="Required for authorization_code flow">
                <TextInput value={form.authorizationUrl} onChange={(v) => patch({ authorizationUrl: v })} placeholder="https://fhir.epic.com/.../authorize" mono />
              </FormField>
              <div className="sm:col-span-2">
                <FormField label="OAuth Scopes" hint="Comma-separated SMART scopes">
                  <TextInput value={form.scopes} onChange={(v) => patch({ scopes: v })} placeholder="patient/Patient.read, patient/Observation.read, launch/patient" mono />
                </FormField>
              </div>
            </div>
          )}

          {form.authType === "api-key" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="API Key" required hint="Hashed (SHA-256) before storage">
                <SecretInput value={form.apiKey} onChange={(v) => patch({ apiKey: v })} placeholder="••••••••••••••••" />
              </FormField>
              <FormField label="Header Name" required>
                <TextInput value={form.apiKeyHeader} onChange={(v) => patch({ apiKeyHeader: v })} placeholder="X-API-Key" mono />
              </FormField>
            </div>
          )}

          {form.authType === "mtls" && (
            <div className="space-y-4">
              <div className="flex items-start gap-2.5 rounded-xl border border-amber/30 bg-amber-soft px-4 py-3">
                <Key className="h-4 w-4 text-amber shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber/90">
                  Upload certificates in the <strong>Security</strong> tab. Private keys are stored in the HSM vault — never in the database.
                </p>
              </div>
              <FormField label="Private Key (PEM)" hint="Stored securely in HSM — never in DB">
                <div onClick={() => fileRef.current?.click()} className="flex items-center gap-3 rounded-lg border-2 border-dashed border-border-strong hover:border-teal/40 px-4 py-3 cursor-pointer">
                  <Upload className="h-4 w-4 text-muted" />
                  <span className="text-xs text-muted">{form.privateKeyFile || "Click to upload private key (.pem)"}</span>
                </div>
                <input ref={fileRef} type="file" accept=".pem,.key,.crt" className="hidden"
                  onChange={(e) => patch({ privateKeyFile: e.target.files?.[0]?.name ?? "" })} />
              </FormField>
            </div>
          )}
        </div>
      )}

      {/* Security */}
      {activeSection === "security" && (
        <div className="space-y-4">
          <FormField label="IP Whitelist" hint="One IP address or CIDR range per line. Leave empty to allow all (not recommended for production).">
            <textarea value={form.ipWhitelist} onChange={(e) => patch({ ipWhitelist: e.target.value })} rows={5} placeholder={"52.14.22.1\n52.14.22.2\n10.0.0.0/24"}
              className="w-full rounded-lg border border-border-strong bg-surface-2 px-3 py-2 text-xs text-fg qb-mono placeholder:text-muted focus:outline-none focus:border-teal/60 resize-none" />
          </FormField>
          <div className="flex items-start gap-2.5 rounded-xl border border-sky/20 bg-sky-soft px-4 py-3">
            <Shield className="h-4 w-4 text-sky shrink-0 mt-0.5" />
            <p className="text-[11px] text-sky/90">
              mTLS certificates and private keys are managed in the <strong>Security</strong> tab. All keys are stored in an HSM-backed vault.
              IP whitelist changes take effect within 60 seconds.
            </p>
          </div>
        </div>
      )}

      {/* Patient Settings */}
      {activeSection === "settings" && (
        <div className="space-y-5">
          <div className="flex items-start gap-2.5 rounded-xl border border-sky/20 bg-sky-soft px-4 py-3">
            <Globe className="h-4 w-4 text-sky shrink-0 mt-0.5" />
            <p className="text-[11px] text-sky/90">
              Control how patients authenticate when connecting to this provider. All technical setup is hidden from patients.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className={`flex items-start gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-all ${
              form.supportsOtp ? "border-teal/50 bg-teal-soft" : "border-border-strong bg-surface-2 hover:bg-surface-3"
            }`}>
              <div className={`mt-0.5 h-4 w-4 shrink-0 rounded border-2 flex items-center justify-center ${form.supportsOtp ? "border-teal bg-teal" : "border-border-strong"}`}>
                {form.supportsOtp && <CheckCircle className="h-3 w-3 text-white" />}
              </div>
              <input type="checkbox" checked={form.supportsOtp} onChange={(e) => patch({ supportsOtp: e.target.checked })} className="sr-only" />
              <div>
                <div className={`text-xs font-semibold ${form.supportsOtp ? "text-teal" : "text-fg"}`}>OTP Verification</div>
                <div className="text-[11px] text-muted mt-0.5">Patients verify via 6-digit OTP sent to email or SMS</div>
              </div>
            </label>
            <label className={`flex items-start gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-all ${
              form.supportsOAuth ? "border-violet/50 bg-violet-soft" : "border-border-strong bg-surface-2 hover:bg-surface-3"
            }`}>
              <div className={`mt-0.5 h-4 w-4 shrink-0 rounded border-2 flex items-center justify-center ${form.supportsOAuth ? "border-violet bg-violet" : "border-border-strong"}`}>
                {form.supportsOAuth && <CheckCircle className="h-3 w-3 text-white" />}
              </div>
              <input type="checkbox" checked={form.supportsOAuth} onChange={(e) => patch({ supportsOAuth: e.target.checked })} className="sr-only" />
              <div>
                <div className={`text-xs font-semibold ${form.supportsOAuth ? "text-violet" : "text-fg"}`}>Provider OAuth Login</div>
                <div className="text-[11px] text-muted mt-0.5">Redirect patient to provider login (e.g. MyChart)</div>
              </div>
            </label>
          </div>
          {form.supportsOtp && (
            <FormField label="OTP Contact Methods">
              <div className="flex gap-3">
                {(["email", "sms"] as const).map((ch) => {
                  const on = form.otpContactMethods.includes(ch);
                  return (
                    <button key={ch} onClick={() => patch({ otpContactMethods: on ? form.otpContactMethods.filter((c) => c !== ch) : [...form.otpContactMethods, ch] })}
                      className={`rounded-lg border px-3 py-1.5 text-[11px] font-medium capitalize transition-colors ${
                        on ? "border-teal/40 bg-teal-soft text-teal" : "border-border-strong text-muted hover:text-fg"
                      }`}>
                      {ch.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </FormField>
          )}
        </div>
      )}

      {/* Save row */}
      <div className="flex items-center justify-between border-t border-border-soft pt-4">
        {onCancel && (
          <button onClick={onCancel} className="rounded-lg border border-border-strong bg-surface-2 px-4 py-2 text-xs font-medium text-muted hover:text-fg">
            Cancel
          </button>
        )}
        <button onClick={handleSave} disabled={saving || !form.displayName || !form.fhirEndpoint}
          className="ml-auto flex items-center gap-1.5 rounded-xl border border-teal/30 bg-teal-soft px-5 py-2 text-xs font-semibold text-teal hover:bg-teal/20 disabled:opacity-40">
          {saving ? <><Settings className="h-3.5 w-3.5 animate-spin" /> Saving…</> : saved ? <><CheckCircle className="h-3.5 w-3.5" /> Saved!</> : <><Plus className="h-3.5 w-3.5" /> Save Provider</>}
        </button>
      </div>
    </div>
  );
}

// ── Tab 3: Security (keys + IP whitelist) ─────────────────────────────────────

function SecurityTab({ providers }: { providers: AdminProvider[] }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [certs, setCerts] = useState(mockCertificates);
  const [selectedProvider, setSelectedProvider] = useState(providers[0]?.id ?? "");
  const [keyType, setKeyType] = useState<"tls-cert" | "public-key" | "api-key">("tls-cert");
  const [uploadFile, setUploadFile] = useState("");
  const [uploadDone, setUploadDone] = useState(false);

  async function handleUpload() {
    if (!uploadFile || !selectedProvider) return;
    setUploading(true);
    const cert = await uploadCertificate({
      providerId: selectedProvider,
      keyType,
      fileBase64: "demo-base64",
      fileMimeType: "application/x-pem-file",
      actorUserId: "admin@questbeyond.com",
    });
    setCerts((p) => [cert, ...p]);
    setUploadFile("");
    setUploadDone(true);
    setUploading(false);
    setTimeout(() => setUploadDone(false), 3000);
  }

  return (
    <div className="space-y-6">
      {/* Upload card */}
      <div className="qb-card space-y-4">
        <div className="flex items-center gap-2">
          <Key className="h-4 w-4 text-violet" />
          <h3 className="qb-display text-sm font-semibold text-fg">Upload Certificate or Key</h3>
          <AdminBadge />
        </div>

        <div className="flex items-start gap-2.5 rounded-xl border border-amber/30 bg-amber-soft px-4 py-3">
          <Shield className="h-4 w-4 text-amber shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber/90">
            <strong>Private keys</strong> are stored in an HSM-backed vault and <strong>never written to the database</strong>. Only fingerprints and metadata are stored.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField label="Provider" required>
            <SelectInput value={selectedProvider} onChange={setSelectedProvider}>
              {providers.map((p) => <option key={p.id} value={p.id}>{p.displayName}</option>)}
            </SelectInput>
          </FormField>
          <FormField label="Key Type" required>
            <SelectInput value={keyType} onChange={(v) => setKeyType(v as any)}>
              <option value="tls-cert">TLS Certificate</option>
              <option value="public-key">Public Key (mTLS)</option>
              <option value="api-key">API Key Hash</option>
            </SelectInput>
          </FormField>
          <FormField label="Certificate / Key File" required>
            <div onClick={() => fileRef.current?.click()} className={`flex items-center gap-2 rounded-lg border-2 border-dashed px-3 py-2 cursor-pointer transition-colors ${
              uploadFile ? "border-teal/40 bg-teal-soft" : "border-border-strong hover:border-teal/40"
            }`}>
              <Upload className={`h-3.5 w-3.5 ${uploadFile ? "text-teal" : "text-muted"}`} />
              <span className={`text-[11px] truncate ${uploadFile ? "text-teal font-medium" : "text-muted"}`}>{uploadFile || "Click to upload (.pem .crt .key)"}</span>
            </div>
            <input ref={fileRef} type="file" accept=".pem,.crt,.key,.cer" className="hidden"
              onChange={(e) => setUploadFile(e.target.files?.[0]?.name ?? "")} />
          </FormField>
        </div>

        <div className="flex justify-end">
          <button onClick={handleUpload} disabled={!uploadFile || !selectedProvider || uploading}
            className="flex items-center gap-1.5 rounded-lg border border-violet/30 bg-violet-soft px-4 py-2 text-xs font-semibold text-violet hover:bg-violet/20 disabled:opacity-40">
            {uploading ? <><Settings className="h-3.5 w-3.5 animate-spin" /> Uploading…</> : uploadDone ? <><CheckCircle className="h-3.5 w-3.5" /> Uploaded!</> : <><Upload className="h-3.5 w-3.5" /> Upload to Vault</>}
          </button>
        </div>
      </div>

      {/* Certificate list */}
      <div className="qb-card p-0 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border-soft">
          <h3 className="qb-display text-sm font-semibold text-fg">Active Certificates & Keys</h3>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border-soft bg-surface-2">
              {["Provider", "Type", "Key ID", "Fingerprint", "Expires", "Status"].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {certs.map((c) => (
              <tr key={c.id} className="border-b border-border-soft last:border-0 hover:bg-surface-2">
                <td className="px-4 py-3 font-medium text-fg">{c.providerName}</td>
                <td className="px-4 py-3">
                  <span className="qb-chip bg-surface-3 text-muted border-border-strong text-[10px] capitalize">{c.keyType.replace("-", " ")}</span>
                </td>
                <td className="px-4 py-3 qb-mono text-muted">{c.keyId}</td>
                <td className="px-4 py-3 qb-mono text-muted text-[10px]">{c.fingerprint}</td>
                <td className="px-4 py-3 text-muted">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : "No expiry"}</td>
                <td className="px-4 py-3">
                  <span className={`qb-chip border text-[10px] ${c.status === "active" ? "bg-lime-soft text-lime border-lime/30" : "bg-rose-soft text-rose border-rose/30"}`}>
                    {c.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tab 4: Integration Templates ──────────────────────────────────────────────

function TemplatesTab({ onUseTemplate }: { onUseTemplate: (tplId: string) => void }) {
  const statusColors = {
    official:  "bg-lime-soft text-lime border-lime/30",
    community: "bg-violet-soft text-violet border-violet/30",
    custom:    "bg-amber-soft text-amber border-amber/30",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 rounded-xl border border-sky/20 bg-sky-soft px-4 py-3">
        <Zap className="h-4 w-4 text-sky shrink-0 mt-0.5" />
        <p className="text-[11px] text-sky/90">
          Official templates from Epic, Cerner, and Labcorp pre-fill all technical settings. You still need to supply your organisation's <strong>Client ID</strong> and <strong>credentials</strong>.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {integrationTemplates.map((t) => (
          <div key={t.id} className="qb-card space-y-4">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-3 text-muted text-sm font-bold">
                {t.providerType.slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-fg">{t.name}</span>
                  <span className={`qb-chip border text-[9px] font-semibold uppercase ${statusColors[t.status]}`}>{t.status}</span>
                  <span className="qb-chip bg-surface-3 text-muted border-border-strong text-[9px]">v{t.version}</span>
                </div>
                <p className="text-[11px] text-muted mt-1 leading-relaxed">{t.description}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">Setup Steps</div>
              <ol className="space-y-1">
                {t.setupSteps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-[11px] text-fg">
                    <span className="shrink-0 h-4 w-4 rounded-full bg-teal-soft text-teal text-[9px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            <div className="flex items-center gap-2 border-t border-border-soft pt-3">
              <div className="flex flex-wrap gap-1 flex-1">
                {t.defaultDataTypes.map((dt) => (
                  <span key={dt} className="qb-chip bg-teal-soft text-teal border-teal/30 text-[10px]">{DATA_TYPE_LABELS[dt] ?? dt}</span>
                ))}
              </div>
              <div className="flex gap-2 shrink-0">
                {t.docsUrl && (
                  <a href={t.docsUrl} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 rounded-lg border border-border-strong bg-surface-2 px-2.5 py-1.5 text-[11px] text-muted hover:text-fg">
                    <ExternalLink className="h-3 w-3" /> Docs
                  </a>
                )}
                <button onClick={() => onUseTemplate(t.id)}
                  className="flex items-center gap-1 rounded-lg border border-teal/30 bg-teal-soft px-3 py-1.5 text-[11px] font-semibold text-teal hover:bg-teal/20">
                  <Plus className="h-3 w-3" /> Use Template
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tab 5: Data Mappings ──────────────────────────────────────────────────────

function MappingsTab({ providers }: { providers: AdminProvider[] }) {
  const [filter, setFilter] = useState("all");
  const visible = filter === "all" ? mockAdminMappings : mockAdminMappings.filter((m) => m.providerId === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-muted">Filter by provider:</span>
        <button onClick={() => setFilter("all")} className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${filter === "all" ? "border-teal/40 bg-teal-soft text-teal" : "border-border-strong text-muted hover:text-fg"}`}>All</button>
        {providers.map((p) => (
          <button key={p.id} onClick={() => setFilter(p.id)}
            className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${filter === p.id ? "border-teal/40 bg-teal-soft text-teal" : "border-border-strong text-muted hover:text-fg"}`}>
            {p.displayName}
          </button>
        ))}
      </div>

      <div className="qb-card p-0 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border-soft bg-surface-2">
              {["Provider", "Internal Field", "Type", "FHIR Resource", "FHIR Path", "Transform", "Required"].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((m) => (
              <tr key={m.id} className="border-b border-border-soft last:border-0 hover:bg-surface-2">
                <td className="px-4 py-3 text-muted">{m.providerName}</td>
                <td className="px-4 py-3 font-medium text-fg qb-mono">{m.internalField}</td>
                <td className="px-4 py-3 text-muted">{m.internalType}</td>
                <td className="px-4 py-3"><span className="qb-chip bg-violet-soft text-violet border-violet/30 text-[10px]">{m.fhirResource}</span></td>
                <td className="px-4 py-3 qb-mono text-[11px] text-muted">{m.fhirPath}</td>
                <td className="px-4 py-3 text-muted">{m.transform ?? "—"}</td>
                <td className="px-4 py-3">
                  {m.required
                    ? <span className="qb-chip bg-rose-soft text-rose border-rose/30 text-[10px]">Required</span>
                    : <span className="text-muted text-[11px]">Optional</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main AdminIntegrationPanel ────────────────────────────────────────────────

export function AdminIntegrationPanel() {
  const [tab, setTab] = useState<AdminTab>("registry");
  const [providers, setProviders] = useState<AdminProvider[]>(mockAdminProviders);
  const [editingProvider, setEditingProvider] = useState<AdminProvider | null>(null);

  const TABS: { id: AdminTab; label: string; Icon: React.ElementType }[] = [
    { id: "registry",  label: "Provider Registry", Icon: Server },
    { id: "add",       label: editingProvider ? "Edit Provider" : "Add Provider", Icon: Plus },
    { id: "security",  label: "Security",          Icon: Key },
    { id: "templates", label: "Templates",         Icon: Zap },
    { id: "mappings",  label: "Data Mappings",     Icon: FileText },
  ];

  async function handleSave(form: AddProviderForm) {
    if (editingProvider) {
      const updated = await updateAdminProvider({ id: editingProvider.id, patch: form, actorUserId: "admin@questbeyond.com" });
      setProviders((p) => p.map((x) => x.id === updated.id ? updated : x));
    } else {
      const created = await createAdminProvider({ form, actorUserId: "admin@questbeyond.com" });
      setProviders((p) => [created, ...p]);
    }
    setEditingProvider(null);
    setTab("registry");
  }

  function handleEdit(p: AdminProvider) {
    setEditingProvider(p);
    setTab("add");
  }

  function handleToggleStatus(p: AdminProvider) {
    const next: AdminProviderStatus = p.status === "active" ? "inactive" : "active";
    setProviderStatus(p.id, next, "admin@questbeyond.com");
    setProviders((prev) => prev.map((x) => x.id === p.id ? { ...x, status: next } : x));
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="qb-display text-[17px] font-semibold text-fg">Admin Integration Management</h1>
            <AdminBadge />
          </div>
          <p className="text-xs text-muted">Configure healthcare providers, authentication, certificates, and FHIR mappings. Patients never see technical details.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="qb-chip bg-lime-soft text-lime border-lime/30 text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full bg-lime qb-pulse inline-block mr-1" />
            {providers.filter((p) => p.status === "active").length} Active
          </span>
          <span className="qb-chip bg-sky-soft text-sky border-sky/30 text-[11px]">
            {providers.reduce((s, p) => s + p.connectedPatients, 0).toLocaleString()} Patients
          </span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-0.5 border-b border-border-soft overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.Icon;
          return (
            <button key={t.id} onClick={() => { setTab(t.id); if (t.id !== "add") setEditingProvider(null); }}
              className={`flex items-center gap-1.5 rounded-t-lg px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors ${
                tab === t.id ? "text-teal border-b-2 border-teal -mb-px bg-teal-soft/40" : "text-muted hover:text-fg"
              }`}>
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === "registry" && (
        <RegistryTab
          providers={providers}
          onAdd={() => { setEditingProvider(null); setTab("add"); }}
          onEdit={handleEdit}
          onTest={(p) => {}}
          onToggleStatus={handleToggleStatus}
        />
      )}
      {tab === "add" && (
        <AddProviderTab
          initial={editingProvider ? {
            displayName: editingProvider.displayName,
            description: editingProvider.description,
            providerType: editingProvider.providerType,
            fhirEndpoint: editingProvider.fhirEndpoint,
            apiVersion: editingProvider.apiVersion,
            webhookUrl: editingProvider.webhookUrl ?? "",
            environment: editingProvider.environment,
            authType: editingProvider.authType,
            ipWhitelist: editingProvider.ipWhitelist.join("\n"),
            supportedDataTypes: editingProvider.supportedDataTypes,
            templateId: editingProvider.templateId ?? "",
            supportsOtp: editingProvider.supportsOtp,
            supportsOAuth: editingProvider.supportsOAuth,
            otpContactMethods: editingProvider.otpContactMethods,
          } : undefined}
          onSave={handleSave}
          onCancel={() => { setEditingProvider(null); setTab("registry"); }}
        />
      )}
      {tab === "security" && <SecurityTab providers={providers} />}
      {tab === "templates" && (
        <TemplatesTab onUseTemplate={(tplId) => {
          setEditingProvider(null);
          applyTemplate(tplId).then((prefill) => {
            setTab("add");
          });
        }} />
      )}
      {tab === "mappings" && <MappingsTab providers={providers} />}
    </div>
  );
}
