import { useState, type ChangeEvent } from "react";
import {
  ChevronRight, ChevronLeft, CheckCircle, Wifi, Shield, Share2,
  Layers, Play, X, Eye, EyeOff, Upload, Plus, Trash2, AlertCircle,
} from "lucide-react";
import {
  PROVIDER_OPTIONS, DATA_TYPE_OPTIONS, FHIR_RESOURCE_OPTIONS,
  type ProviderType, type DataType, type FhirResource, type AuthType,
  type DataMapping,
} from "@/lib/integration-data";
import { testConnection, createIntegration } from "@/lib/api/integration.functions";

// ── Step definitions ──────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Provider",    icon: Wifi,      title: "Provider Selection" },
  { id: 2, label: "Connection",  icon: Wifi,      title: "Connection Configuration" },
  { id: 3, label: "Security",    icon: Shield,    title: "Security Setup" },
  { id: 4, label: "Data",        icon: Share2,    title: "Data Sharing" },
  { id: 5, label: "Mapping",     icon: Layers,    title: "Field Mapping" },
  { id: 6, label: "Test",        icon: Play,      title: "Test & Validate" },
] as const;

// ── Form State ────────────────────────────────────────────────────────────────

interface WizardState {
  // Step 1
  provider: ProviderType | "";
  environment: "sandbox" | "production";
  integrationName: string;
  // Step 2
  baseUrl: string;
  apiVersion: string;
  webhookUrl: string;
  // Step 3
  authType: AuthType;
  oauthFlow: "client_credentials" | "authorization_code";
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
  authorizationUrl: string;
  scopes: string[];
  customScope: string;
  apiKey: string;
  apiKeyHeader: string;
  publicKeyPem: string;
  certificatePem: string;
  privateKeyPem: string;
  ipWhitelist: string;
  // Step 4
  dataTypes: DataType[];
  syncFrequency: "real-time" | "scheduled" | "event-based";
  cronExpression: string;
  triggers: string[];
  // Step 5
  mappings: Array<{ internalField: string; internalType: string; fhirResource: FhirResource; fhirPath: string; transform: string }>;
}

const INITIAL_STATE: WizardState = {
  provider: "",
  environment: "sandbox",
  integrationName: "",
  baseUrl: "",
  apiVersion: "R4",
  webhookUrl: "",
  authType: "oauth2",
  oauthFlow: "client_credentials",
  clientId: "",
  clientSecret: "",
  tokenUrl: "",
  authorizationUrl: "",
  scopes: [],
  customScope: "",
  apiKey: "",
  apiKeyHeader: "X-API-Key",
  publicKeyPem: "",
  certificatePem: "",
  privateKeyPem: "",
  ipWhitelist: "",
  dataTypes: [],
  syncFrequency: "real-time",
  cronExpression: "0 6 * * *",
  triggers: [],
  mappings: [{ internalField: "", internalType: "string", fhirResource: "Patient", fhirPath: "", transform: "" }],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, i) => {
        const done    = current > step.id;
        const active  = current === step.id;
        const last    = i === STEPS.length - 1;
        return (
          <div key={step.id} className="flex items-center">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all ${
              done   ? "border-teal bg-teal text-white" :
              active ? "border-teal bg-teal-soft text-teal" :
                       "border-border-strong bg-surface-2 text-muted"
            }`}>
              {done ? <CheckCircle className="h-4 w-4" /> : step.id}
            </div>
            <span className={`ml-1.5 text-[11px] font-medium hidden sm:block ${active ? "text-fg" : done ? "text-teal" : "text-muted"}`}>
              {step.label}
            </span>
            {!last && <div className="mx-3 h-px w-6 bg-border-strong hidden sm:block" />}
            {!last && <div className="mx-1 h-px w-3 bg-border-strong sm:hidden" />}
          </div>
        );
      })}
    </div>
  );
}

function FormField({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-fg flex items-center gap-1">
        {label}
        {required && <span className="text-rose">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = "text", className = "" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full rounded-lg border border-border-strong bg-surface-2 px-3 py-2 text-xs text-fg placeholder:text-muted focus:outline-none focus:border-teal/60 focus:ring-1 focus:ring-teal/30 ${className}`}
    />
  );
}

function SecretInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="new-password"
        className="w-full rounded-lg border border-border-strong bg-surface-2 px-3 py-2 pr-10 text-xs text-fg placeholder:text-muted focus:outline-none focus:border-teal/60 focus:ring-1 focus:ring-teal/30"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-fg transition-colors"
      >
        {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

function TextareaInput({ value, onChange, placeholder, rows = 4 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full rounded-lg border border-border-strong bg-surface-2 px-3 py-2 text-xs text-fg placeholder:text-muted focus:outline-none focus:border-teal/60 focus:ring-1 focus:ring-teal/30 resize-none qb-mono"
    />
  );
}

// ── Step Components ───────────────────────────────────────────────────────────

function Step1({ state, update }: { state: WizardState; update: (p: Partial<WizardState>) => void }) {
  return (
    <div className="space-y-5">
      <div className="text-sm text-muted">Choose the external system you want to connect and configure your environment.</div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PROVIDER_OPTIONS.map((p) => (
          <button
            key={p.value}
            onClick={() => update({
              provider: p.value,
              apiVersion: p.fhirVersion === "R4" ? "R4" : p.fhirVersion,
              integrationName: state.integrationName || p.label,
            })}
            className={`flex flex-col gap-1.5 rounded-xl border p-4 text-left transition-all ${
              state.provider === p.value
                ? "border-teal/50 bg-teal-soft ring-1 ring-teal/30"
                : "border-border-strong bg-surface-2 hover:border-border-strong hover:bg-surface-3"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-fg">{p.label}</span>
              {state.provider === p.value && <CheckCircle className="h-4 w-4 text-teal" />}
            </div>
            <span className="text-[11px] text-muted leading-relaxed">{p.description}</span>
            <span className="mt-1 qb-chip bg-surface-3 text-muted border-border-strong text-[10px]">FHIR {p.fhirVersion}</span>
          </button>
        ))}
      </div>

      {state.provider && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
          <FormField label="Integration Name" required>
            <TextInput value={state.integrationName} onChange={(v) => update({ integrationName: v })} placeholder="e.g. Epic – Main Hospital" />
          </FormField>

          <FormField label="Environment" required hint="Sandbox for testing; switch to Production when ready.">
            <div className="flex gap-3">
              {(["sandbox", "production"] as const).map((env) => (
                <button
                  key={env}
                  onClick={() => update({ environment: env })}
                  className={`flex-1 rounded-lg border py-2 text-xs font-medium capitalize transition-colors ${
                    state.environment === env
                      ? env === "production"
                        ? "border-rose/40 bg-rose-soft text-rose"
                        : "border-teal/40 bg-teal-soft text-teal"
                      : "border-border-strong bg-surface-2 text-muted hover:text-fg"
                  }`}
                >
                  {env}
                </button>
              ))}
            </div>
          </FormField>
        </div>
      )}
    </div>
  );
}

function Step2({ state, update }: { state: WizardState; update: (p: Partial<WizardState>) => void }) {
  return (
    <div className="space-y-4">
      <div className="text-sm text-muted">Configure the endpoint URLs and API version for <strong>{state.provider}</strong>.</div>

      <FormField label="Base URL / FHIR Endpoint" required hint="The root URL of the FHIR server (e.g. https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4)">
        <TextInput value={state.baseUrl} onChange={(v) => update({ baseUrl: v })} placeholder="https://fhir.example.com/api/FHIR/R4" />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="API Version" required>
          <select
            value={state.apiVersion}
            onChange={(e) => update({ apiVersion: e.target.value })}
            className="w-full rounded-lg border border-border-strong bg-surface-2 px-3 py-2 text-xs text-fg focus:outline-none focus:border-teal/60"
          >
            {["R4", "STU3", "DSTU2", "v2", "v1", "custom"].map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Webhook URL (for callbacks)" hint="Quest Beyond receives event notifications here.">
          <TextInput value={state.webhookUrl} onChange={(v) => update({ webhookUrl: v })} placeholder="https://app.questbeyond.com/webhooks/..." />
        </FormField>
      </div>

      <FormField label="IP Whitelist" hint="Comma-separated IPs that are allowed to call our webhook. Leave empty to allow all (not recommended for production).">
        <TextInput value={state.ipWhitelist} onChange={(v) => update({ ipWhitelist: v })} placeholder="52.14.22.1, 52.14.22.2" />
      </FormField>

      {state.environment === "production" && !state.webhookUrl && (
        <div className="flex items-center gap-2 rounded-lg border border-amber/20 bg-amber-soft px-3 py-2.5">
          <AlertCircle className="h-3.5 w-3.5 text-amber shrink-0" />
          <p className="text-[11px] text-amber">A Webhook URL is recommended for production to receive real-time event notifications.</p>
        </div>
      )}
    </div>
  );
}

function Step3({ state, update }: { state: WizardState; update: (p: Partial<WizardState>) => void }) {
  const COMMON_SCOPES = [
    "patient/Patient.read", "patient/Observation.read", "patient/MedicationRequest.read",
    "patient/DiagnosticReport.read", "patient/Encounter.read", "launch/patient",
    "openid", "fhirUser",
  ];

  function toggleScope(scope: string) {
    update({ scopes: state.scopes.includes(scope) ? state.scopes.filter((s) => s !== scope) : [...state.scopes, scope] });
  }

  function addCustomScope() {
    if (state.customScope.trim() && !state.scopes.includes(state.customScope.trim())) {
      update({ scopes: [...state.scopes, state.customScope.trim()], customScope: "" });
    }
  }

  return (
    <div className="space-y-5">
      <div className="text-sm text-muted">Configure how Quest Beyond authenticates with <strong>{state.provider}</strong>.</div>

      {/* Auth type selector */}
      <FormField label="Authentication Method" required>
        <div className="grid grid-cols-3 gap-3">
          {([
            { value: "oauth2" as AuthType,  label: "OAuth 2.0",  desc: "Industry standard for FHIR / SMART on FHIR" },
            { value: "api-key" as AuthType, label: "API Key",    desc: "Simple header-based authentication" },
            { value: "mtls" as AuthType,    label: "mTLS",       desc: "Mutual TLS certificate authentication" },
          ]).map((opt) => (
            <button
              key={opt.value}
              onClick={() => update({ authType: opt.value })}
              className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition-all ${
                state.authType === opt.value
                  ? "border-teal/50 bg-teal-soft ring-1 ring-teal/30"
                  : "border-border-strong bg-surface-2 hover:bg-surface-3"
              }`}
            >
              <span className={`text-xs font-semibold ${state.authType === opt.value ? "text-teal" : "text-fg"}`}>{opt.label}</span>
              <span className="text-[11px] text-muted leading-relaxed">{opt.desc}</span>
            </button>
          ))}
        </div>
      </FormField>

      {/* OAuth 2.0 fields */}
      {state.authType === "oauth2" && (
        <div className="space-y-4 rounded-xl border border-border-soft bg-surface-2 p-4">
          <FormField label="OAuth 2.0 Flow" required>
            <div className="flex gap-3">
              {([
                { value: "client_credentials", label: "Client Credentials", desc: "Server-to-server (M2M)" },
                { value: "authorization_code", label: "Authorization Code", desc: "User-delegated (SMART)" },
              ] as const).map((f) => (
                <button
                  key={f.value}
                  onClick={() => update({ oauthFlow: f.value })}
                  className={`flex-1 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                    state.oauthFlow === f.value
                      ? "border-teal/40 bg-teal/10 text-teal"
                      : "border-border-strong bg-surface text-muted hover:text-fg"
                  }`}
                >
                  <div className="text-xs font-medium">{f.label}</div>
                  <div className="text-[10px] mt-0.5 opacity-70">{f.desc}</div>
                </button>
              ))}
            </div>
          </FormField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Client ID" required>
              <TextInput value={state.clientId} onChange={(v) => update({ clientId: v })} placeholder="your-client-id" />
            </FormField>
            <FormField label="Client Secret" required hint="Encrypted with AES-256-GCM before storage. Never logged.">
              <SecretInput value={state.clientSecret} onChange={(v) => update({ clientSecret: v })} placeholder="client secret" />
            </FormField>
          </div>

          <FormField label="Token URL" required hint="OAuth2 token endpoint">
            <TextInput value={state.tokenUrl} onChange={(v) => update({ tokenUrl: v })} placeholder="https://auth.example.com/oauth2/token" />
          </FormField>

          {state.oauthFlow === "authorization_code" && (
            <FormField label="Authorization URL" required hint="SMART on FHIR authorization endpoint">
              <TextInput value={state.authorizationUrl} onChange={(v) => update({ authorizationUrl: v })} placeholder="https://auth.example.com/oauth2/authorize" />
            </FormField>
          )}

          <FormField label="Scopes" hint="Select the FHIR resource scopes to request.">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {COMMON_SCOPES.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleScope(s)}
                  className={`rounded border px-2 py-1 text-[10px] qb-mono transition-colors ${
                    state.scopes.includes(s)
                      ? "border-teal/40 bg-teal-soft text-teal"
                      : "border-border-strong bg-surface-2 text-muted hover:text-fg"
                  }`}
                >
                  {state.scopes.includes(s) ? "✓ " : ""}{s}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <TextInput value={state.customScope} onChange={(v) => update({ customScope: v })} placeholder="Custom scope…" />
              <button
                onClick={addCustomScope}
                className="flex items-center gap-1 rounded-lg border border-border-strong bg-surface-2 px-3 text-xs text-muted hover:text-fg transition-colors shrink-0"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </div>
          </FormField>
        </div>
      )}

      {/* API Key fields */}
      {state.authType === "api-key" && (
        <div className="space-y-4 rounded-xl border border-border-soft bg-surface-2 p-4">
          <FormField label="API Key" required hint="Stored as SHA-256 hash. Never stored in plaintext.">
            <SecretInput value={state.apiKey} onChange={(v) => update({ apiKey: v })} placeholder="your-api-key" />
          </FormField>
          <FormField label="Header Name" required hint="The HTTP header name for the key.">
            <TextInput value={state.apiKeyHeader} onChange={(v) => update({ apiKeyHeader: v })} placeholder="X-API-Key" />
          </FormField>
        </div>
      )}

      {/* mTLS fields */}
      {state.authType === "mtls" && (
        <div className="space-y-4 rounded-xl border border-border-soft bg-surface-2 p-4">
          <div className="flex items-start gap-2 rounded-lg border border-amber/20 bg-amber-soft px-3 py-2.5 mb-4">
            <Shield className="h-3.5 w-3.5 text-amber shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber">
              Private keys are stored exclusively in our Hardware Security Module (HSM) and never leave the server. Only the public certificate is transmitted.
            </p>
          </div>
          <FormField label="Public Key (PEM)" required>
            <TextareaInput value={state.publicKeyPem} onChange={(v) => update({ publicKeyPem: v })} placeholder="-----BEGIN PUBLIC KEY-----&#10;..." rows={3} />
          </FormField>
          <FormField label="Client Certificate (PEM)" required hint="x.509 certificate for mutual TLS authentication.">
            <TextareaInput value={state.certificatePem} onChange={(v) => update({ certificatePem: v })} placeholder="-----BEGIN CERTIFICATE-----&#10;..." rows={3} />
          </FormField>
          <FormField label="Private Key (PEM)" required hint="Encrypted and stored in HSM. Paste once — never shown again.">
            <SecretInput value={state.privateKeyPem} onChange={(v) => update({ privateKeyPem: v })} placeholder="-----BEGIN RSA PRIVATE KEY-----..." />
          </FormField>
        </div>
      )}
    </div>
  );
}

function Step4({ state, update }: { state: WizardState; update: (p: Partial<WizardState>) => void }) {
  const TRIGGER_OPTIONS = [
    { value: "new-report",       label: "New Report Created" },
    { value: "new-lab",          label: "New Lab Result" },
    { value: "new-prescription", label: "New Prescription" },
    { value: "daily-batch",      label: "Daily Batch" },
    { value: "on-demand",        label: "On-Demand (manual)" },
  ];

  function toggleData(dt: DataType) {
    update({ dataTypes: state.dataTypes.includes(dt) ? state.dataTypes.filter((d) => d !== dt) : [...state.dataTypes, dt] });
  }

  function toggleTrigger(t: string) {
    update({ triggers: state.triggers.includes(t) ? state.triggers.filter((x) => x !== t) : [...state.triggers, t] });
  }

  return (
    <div className="space-y-5">
      <div className="text-sm text-muted">Select which data to share and how often to sync it.</div>

      <FormField label="Data Types to Share" required hint="Select all data types to send to this integration.">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {DATA_TYPE_OPTIONS.map((opt) => {
            const active = state.dataTypes.includes(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => toggleData(opt.value)}
                className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-all ${
                  active ? "border-teal/50 bg-teal-soft" : "border-border-strong bg-surface-2 hover:bg-surface-3"
                }`}
              >
                <span className="text-xl mt-0.5">{opt.icon}</span>
                <div className="min-w-0">
                  <div className={`text-xs font-semibold ${active ? "text-teal" : "text-fg"}`}>{opt.label}</div>
                  <div className="text-[11px] text-muted mt-0.5 leading-relaxed">{opt.description}</div>
                </div>
                {active && <CheckCircle className="h-4 w-4 text-teal shrink-0 mt-0.5 ml-auto" />}
              </button>
            );
          })}
        </div>
      </FormField>

      <FormField label="Sync Frequency" required>
        <div className="grid grid-cols-3 gap-3">
          {([
            { value: "real-time",    label: "Real-time",    desc: "Instant on event" },
            { value: "scheduled",    label: "Scheduled",    desc: "Cron-based batch" },
            { value: "event-based",  label: "Event-based",  desc: "On specific triggers" },
          ] as const).map((f) => (
            <button
              key={f.value}
              onClick={() => update({ syncFrequency: f.value })}
              className={`flex flex-col gap-0.5 rounded-xl border p-3 text-left transition-all ${
                state.syncFrequency === f.value
                  ? "border-teal/50 bg-teal-soft"
                  : "border-border-strong bg-surface-2 hover:bg-surface-3"
              }`}
            >
              <span className={`text-xs font-semibold ${state.syncFrequency === f.value ? "text-teal" : "text-fg"}`}>{f.label}</span>
              <span className="text-[11px] text-muted">{f.desc}</span>
            </button>
          ))}
        </div>
      </FormField>

      {state.syncFrequency === "scheduled" && (
        <FormField label="Cron Expression" hint="Standard cron syntax — e.g. '0 6 * * *' runs every day at 6am UTC.">
          <TextInput value={state.cronExpression} onChange={(v) => update({ cronExpression: v })} placeholder="0 6 * * *" className="qb-mono" />
        </FormField>
      )}

      {(state.syncFrequency === "event-based" || state.syncFrequency === "real-time") && (
        <FormField label="Event Triggers" hint="Select the events that will initiate a data push.">
          <div className="flex flex-wrap gap-2">
            {TRIGGER_OPTIONS.map((t) => (
              <button
                key={t.value}
                onClick={() => toggleTrigger(t.value)}
                className={`rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-colors ${
                  state.triggers.includes(t.value)
                    ? "border-violet/40 bg-violet-soft text-violet"
                    : "border-border-strong bg-surface-2 text-muted hover:text-fg"
                }`}
              >
                {state.triggers.includes(t.value) ? "✓ " : ""}{t.label}
              </button>
            ))}
          </div>
        </FormField>
      )}
    </div>
  );
}

function Step5({ state, update }: { state: WizardState; update: (p: Partial<WizardState>) => void }) {
  type Mapping = WizardState["mappings"][number];

  function updateMapping(i: number, patch: Partial<Mapping>) {
    const updated = [...state.mappings];
    updated[i] = { ...updated[i], ...patch };
    update({ mappings: updated });
  }

  function addMapping() {
    update({ mappings: [...state.mappings, { internalField: "", internalType: "string", fhirResource: "Observation", fhirPath: "", transform: "" }] });
  }

  function removeMapping(i: number) {
    update({ mappings: state.mappings.filter((_, idx) => idx !== i) });
  }

  const TYPE_OPTIONS = ["string", "number", "boolean", "date", "object", "array"];

  return (
    <div className="space-y-5">
      <div className="text-sm text-muted">
        Map internal Quest Beyond fields to FHIR resource paths.
        Each row transforms one internal field to a FHIR element.
      </div>

      <div className="rounded-xl border border-border-soft overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-surface-2 border-b border-border-soft text-[11px] font-semibold text-muted uppercase tracking-wider">
          <div className="col-span-3">Internal Field</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-2">FHIR Resource</div>
          <div className="col-span-3">FHIR Path</div>
          <div className="col-span-1">Transform</div>
          <div className="col-span-1"></div>
        </div>

        {state.mappings.map((m, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 px-3 py-2 border-b border-border-soft last:border-0 items-center">
            <div className="col-span-3">
              <input
                value={m.internalField}
                onChange={(e) => updateMapping(i, { internalField: e.target.value })}
                placeholder="patientId"
                className="w-full rounded border border-border-strong bg-surface-2 px-2 py-1.5 text-xs qb-mono text-fg placeholder:text-muted focus:outline-none focus:border-teal/60"
              />
            </div>
            <div className="col-span-2">
              <select
                value={m.internalType}
                onChange={(e) => updateMapping(i, { internalType: e.target.value })}
                className="w-full rounded border border-border-strong bg-surface-2 px-2 py-1.5 text-xs text-fg focus:outline-none focus:border-teal/60"
              >
                {TYPE_OPTIONS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <select
                value={m.fhirResource}
                onChange={(e) => updateMapping(i, { fhirResource: e.target.value as FhirResource })}
                className="w-full rounded border border-border-strong bg-surface-2 px-2 py-1.5 text-xs text-fg focus:outline-none focus:border-teal/60"
              >
                {FHIR_RESOURCE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.value}</option>)}
              </select>
            </div>
            <div className="col-span-3">
              <input
                value={m.fhirPath}
                onChange={(e) => updateMapping(i, { fhirPath: e.target.value })}
                placeholder="Patient.id"
                className="w-full rounded border border-border-strong bg-surface-2 px-2 py-1.5 text-xs qb-mono text-fg placeholder:text-muted focus:outline-none focus:border-teal/60"
              />
            </div>
            <div className="col-span-1">
              <input
                value={m.transform}
                onChange={(e) => updateMapping(i, { transform: e.target.value })}
                placeholder="none"
                className="w-full rounded border border-border-strong bg-surface-2 px-2 py-1.5 text-xs text-muted focus:outline-none focus:border-teal/60"
              />
            </div>
            <div className="col-span-1 flex justify-end">
              <button
                onClick={() => removeMapping(i)}
                disabled={state.mappings.length <= 1}
                className="text-muted hover:text-rose disabled:opacity-30 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addMapping}
        className="flex items-center gap-1.5 text-xs text-teal hover:text-teal/80 transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        Add mapping row
      </button>

      {/* FHIR resource reference */}
      <div className="rounded-xl border border-border-soft bg-surface-2 p-4">
        <h4 className="text-xs font-semibold text-fg mb-2">FHIR Resource Quick Reference</h4>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {FHIR_RESOURCE_OPTIONS.map((r) => (
            <div key={r.value} className="flex items-start gap-2">
              <span className="qb-chip bg-teal-soft text-teal border-teal/30 text-[10px] shrink-0 mt-0.5">{r.value}</span>
              <span className="text-[11px] text-muted">{r.description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Step6({ state }: { state: WizardState }) {
  const [testState, setTestState] = useState<"idle" | "loading" | "done">("idle");
  const [result, setResult] = useState<Awaited<ReturnType<typeof testConnection>> | null>(null);

  async function runTest() {
    setTestState("loading");
    const r = await testConnection({ integrationId: "preview", sendSampleData: true });
    setResult(r);
    setTestState("done");
  }

  const isValid = state.provider && state.baseUrl && state.integrationName;

  return (
    <div className="space-y-5">
      <div className="text-sm text-muted">
        Validate your configuration by sending a test request to <strong>{state.provider || "the provider"}</strong>.
      </div>

      {/* Config summary */}
      <div className="rounded-xl border border-border-soft bg-surface-2 p-4 space-y-3">
        <h4 className="text-xs font-semibold text-fg uppercase tracking-wider">Configuration Summary</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            { label: "Integration", value: state.integrationName || "—" },
            { label: "Provider",    value: state.provider || "—" },
            { label: "Environment", value: state.environment },
            { label: "Auth Type",   value: state.authType === "oauth2" ? `OAuth 2.0 (${state.oauthFlow})` : state.authType },
            { label: "Endpoint",    value: state.baseUrl || "—" },
            { label: "API Version", value: state.apiVersion },
            { label: "Data Types",  value: state.dataTypes.length ? state.dataTypes.join(", ") : "—" },
            { label: "Frequency",   value: state.syncFrequency },
          ].map((row) => (
            <div key={row.label} className="flex gap-2">
              <span className="text-muted w-24 shrink-0">{row.label}</span>
              <span className="text-fg font-medium capitalize">{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {!isValid && (
        <div className="flex items-center gap-2 rounded-lg border border-amber/20 bg-amber-soft px-3 py-2.5">
          <AlertCircle className="h-3.5 w-3.5 text-amber shrink-0" />
          <p className="text-[11px] text-amber">Complete required fields in previous steps before testing.</p>
        </div>
      )}

      <button
        onClick={runTest}
        disabled={testState === "loading" || !isValid}
        className="flex items-center gap-2 rounded-xl border border-teal/30 bg-teal-soft px-5 py-2.5 text-sm font-medium text-teal hover:bg-teal/20 disabled:opacity-50 transition-colors"
      >
        <Play className={`h-4 w-4 ${testState === "loading" ? "animate-pulse" : ""}`} />
        {testState === "loading" ? "Testing connection…" : "Test Connection & Send Sample Data"}
      </button>

      {testState === "done" && result && (
        <div className={`rounded-xl border p-4 ${result.success ? "border-lime/20 bg-lime-soft" : "border-rose/20 bg-rose-soft"}`}>
          <div className="flex items-center gap-2 mb-3">
            {result.success
              ? <CheckCircle className="h-4 w-4 text-lime" />
              : <AlertCircle className="h-4 w-4 text-rose" />
            }
            <span className={`text-sm font-semibold ${result.success ? "text-lime" : "text-rose"}`}>
              {result.message}
            </span>
            <span className="qb-mono text-[11px] text-muted ml-auto">
              HTTP {result.statusCode} · {result.latency}ms
            </span>
          </div>

          {result.errorDetail && (
            <p className="text-[11px] text-rose mb-3">{result.errorDetail}</p>
          )}

          {result.sampleRequest && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 mt-3">
              <div>
                <div className="text-[11px] font-medium text-muted mb-1.5">Sample FHIR Request</div>
                <pre className="rounded-lg border border-border-strong bg-surface-2 p-3 text-[10px] qb-mono overflow-x-auto max-h-48 qb-scroll">
                  {JSON.stringify(result.sampleRequest, null, 2)}
                </pre>
              </div>
              {result.sampleResponse && (
                <div>
                  <div className="text-[11px] font-medium text-muted mb-1.5">Sample Response</div>
                  <pre className="rounded-lg border border-border-strong bg-surface-2 p-3 text-[10px] qb-mono overflow-x-auto max-h-48 qb-scroll">
                    {JSON.stringify(result.sampleResponse, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Wizard ───────────────────────────────────────────────────────────────

interface Props {
  onComplete: (integration: any) => void;
  onCancel: () => void;
}

export function IntegrationWizard({ onComplete, onCancel }: Props) {
  const [step, setStep]   = useState(1);
  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  const [saving, setSaving] = useState(false);

  function update(patch: Partial<WizardState>) {
    setState((prev) => ({ ...prev, ...patch }));
  }

  function canAdvance(): boolean {
    switch (step) {
      case 1: return !!state.provider && !!state.integrationName;
      case 2: return !!state.baseUrl;
      case 3:
        if (state.authType === "oauth2")  return !!state.clientId && !!state.tokenUrl;
        if (state.authType === "api-key") return !!state.apiKey;
        if (state.authType === "mtls")    return !!state.certificatePem;
        return true;
      case 4: return state.dataTypes.length > 0;
      case 5: return state.mappings.every((m) => m.internalField && m.fhirPath);
      case 6: return true;
      default: return true;
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const integration = await createIntegration(
        {
          name: state.integrationName,
          provider: state.provider || "Custom API",
          environment: state.environment,
          baseUrl: state.baseUrl,
          apiVersion: state.apiVersion,
          webhookUrl: state.webhookUrl || undefined,
          authType: state.authType,
          oauth2: state.authType === "oauth2" ? {
            flow: state.oauthFlow,
            clientId: state.clientId,
            clientSecret: state.clientSecret,
            tokenUrl: state.tokenUrl,
            authorizationUrl: state.authorizationUrl || undefined,
            scopes: state.scopes,
          } : undefined,
          apiKey: state.authType === "api-key" ? { key: state.apiKey, headerName: state.apiKeyHeader } : undefined,
          dataTypes: state.dataTypes,
          syncFrequency: state.syncFrequency,
          cronExpression: state.cronExpression || undefined,
          triggers: state.triggers,
          mappings: state.mappings
            .filter((m) => m.internalField && m.fhirPath)
            .map((m) => ({
              internalField: m.internalField,
              internalType: m.internalType,
              fhirResource: m.fhirResource,
              fhirPath: m.fhirPath,
              transform: m.transform || undefined,
              required: true,
            })),
          ipWhitelist: state.ipWhitelist ? state.ipWhitelist.split(",").map((s) => s.trim()) : undefined,
        },
        "current-user@questbeyond.com",
      );
      onComplete(integration);
    } finally {
      setSaving(false);
    }
  }

  const currentStep = STEPS[step - 1];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="qb-display text-lg font-semibold text-fg">New Integration</h2>
          <p className="text-xs text-muted mt-0.5">Step {step} of {STEPS.length} — {currentStep.title}</p>
        </div>
        <button onClick={onCancel} className="grid h-8 w-8 place-items-center rounded-lg border border-border-strong bg-surface-2 text-muted hover:text-fg transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Step indicator */}
      <div className="overflow-x-auto pb-1">
        <StepIndicator current={step} />
      </div>

      {/* Step content */}
      <div className="qb-card min-h-[360px]">
        {step === 1 && <Step1 state={state} update={update} />}
        {step === 2 && <Step2 state={state} update={update} />}
        {step === 3 && <Step3 state={state} update={update} />}
        {step === 4 && <Step4 state={state} update={update} />}
        {step === 5 && <Step5 state={state} update={update} />}
        {step === 6 && <Step6 state={state} />}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => step > 1 ? setStep((s) => s - 1) : onCancel()}
          className="flex items-center gap-1.5 rounded-lg border border-border-strong bg-surface-2 px-4 py-2 text-xs font-medium text-muted hover:text-fg transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          {step === 1 ? "Cancel" : "Back"}
        </button>

        <div className="flex items-center gap-2">
          {step < STEPS.length ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canAdvance()}
              className="flex items-center gap-1.5 rounded-lg border border-teal/30 bg-teal-soft px-4 py-2 text-xs font-medium text-teal hover:bg-teal/20 disabled:opacity-40 transition-colors"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-xl border border-teal/30 bg-teal-soft px-5 py-2 text-sm font-semibold text-teal hover:bg-teal/20 disabled:opacity-50 transition-colors"
            >
              <CheckCircle className={`h-4 w-4 ${saving ? "animate-spin" : ""}`} />
              {saving ? "Saving…" : "Save Integration"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
