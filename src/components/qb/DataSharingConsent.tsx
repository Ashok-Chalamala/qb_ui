import { useState, useRef, useMemo } from "react";
import {
  User, Users, ChevronRight, ChevronLeft, CheckCircle, AlertTriangle,
  Plus, Shield, FileText, Clock, XCircle, RotateCcw, Upload,
  Share2, Calendar, Eye, Trash2, X, BadgeCheck, AlertCircle,
} from "lucide-react";
import {
  shareableFamilyMembers, mockConsentRecords, mockSharingConfigs,
  SHARING_DATA_TYPES, consentStatusColor, sharingConfigStatusColor,
  type ShareableFamilyMember, type ConsentRecord, type SharingConfig,
  type SharingDataType, type NewFamilyMemberForm,
} from "@/lib/consent-data";
import { mockIntegrations } from "@/lib/integration-data";
import { useUserContext } from "@/lib/user-context";
import {
  createFamilyMember, createConsent, createSharingConfig, revokeConsent,
  type CreateFamilyMemberRequest,
} from "@/lib/api/consent.functions";

// ── Step definitions ──────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Person",     title: "Select Person" },
  { id: 2, label: "Provider",   title: "Select Provider" },
  { id: 3, label: "Data",       title: "Select Data" },
  { id: 4, label: "Rules",      title: "Sharing Rules" },
  { id: 5, label: "Consent",    title: "Consent" },
  { id: 6, label: "Review",     title: "Review & Activate" },
] as const;

// ── Wizard state ──────────────────────────────────────────────────────────────
interface WizardState {
  subjectType: "self" | "family-member";
  selectedMemberId: string | null;
  addingNewMember: boolean;
  newMember: NewFamilyMemberForm;
  providerId: string;
  dataTypes: SharingDataType[];
  mode: "real-time" | "scheduled";
  frequency: "immediate" | "daily" | "weekly" | "monthly";
  triggers: string[];
  expirationDate: string;
  consentAccepted: boolean;
  consentSignature: string;
  guardianConsentDocName: string;
}

const EMPTY_MEMBER_FORM: NewFamilyMemberForm = {
  fullName: "", dateOfBirth: "", gender: "Male", relationship: "",
  contactInfo: "", internalPatientId: "", externalId: "",
  guardianName: "", guardianRelationship: "", consentDocumentName: "",
};

const INITIAL: WizardState = {
  subjectType: "self",
  selectedMemberId: null,
  addingNewMember: false,
  newMember: EMPTY_MEMBER_FORM,
  providerId: "",
  dataTypes: [],
  mode: "real-time",
  frequency: "immediate",
  triggers: [],
  expirationDate: "",
  consentAccepted: false,
  consentSignature: "",
  guardianConsentDocName: "",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
      {STEPS.slice(0, total).map((s, i) => {
        const done   = current > s.id;
        const active = current === s.id;
        return (
          <div key={s.id} className="flex items-center gap-1.5 shrink-0">
            <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition-all border ${
              done   ? "border-teal bg-teal text-white" :
              active ? "border-teal bg-teal-soft text-teal" :
                       "border-border-strong bg-surface-2 text-muted"
            }`}>
              {done ? <CheckCircle className="h-3.5 w-3.5" /> : s.id}
            </div>
            <span className={`text-[11px] font-medium hidden sm:block ${active ? "text-fg" : done ? "text-teal" : "text-muted"}`}>{s.label}</span>
            {i < total - 1 && <div className="h-px w-4 bg-border-strong hidden sm:block ml-1" />}
          </div>
        );
      })}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-2">{children}</div>;
}

function FormRow({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-fg flex items-center gap-1">
        {label}{required && <span className="text-rose">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

function TextIn({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className="w-full rounded-lg border border-border-strong bg-surface-2 px-3 py-2 text-xs text-fg placeholder:text-muted focus:outline-none focus:border-teal/60 focus:ring-1 focus:ring-teal/30" />
  );
}

function SelectIn({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-border-strong bg-surface-2 px-3 py-2 text-xs text-fg focus:outline-none focus:border-teal/60">
      {children}
    </select>
  );
}

function MinorWarning({ name }: { name: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-amber/30 bg-amber-soft px-4 py-3">
      <AlertTriangle className="h-4 w-4 text-amber shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-xs font-semibold text-amber">Guardian Consent Required</p>
        <p className="text-[11px] text-amber/90 mt-0.5">
          <strong>{name}</strong> is a minor. A parent or legal guardian must provide explicit written consent before any data can be shared. A signed consent document (PDF) is required.
        </p>
      </div>
    </div>
  );
}

// ── Add Family Member inline form ─────────────────────────────────────────────
function AddMemberForm({
  form,
  onChange,
  onCancel,
  onSave,
  saving,
}: {
  form: NewFamilyMemberForm;
  onChange: (patch: Partial<NewFamilyMemberForm>) => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const dob = form.dateOfBirth ? new Date(form.dateOfBirth) : null;
  const age = dob ? Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000)) : null;
  const isMinor = age !== null && age < 18;

  const RELATIONSHIPS = ["Father", "Mother", "Son", "Daughter", "Spouse", "Sibling", "Legal Guardian", "Other"];
  const canSave = form.fullName && form.dateOfBirth && form.relationship &&
    (!isMinor || (form.guardianName && form.guardianRelationship && form.consentDocumentName));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="qb-display text-sm font-semibold text-fg">Add Family Member</h3>
        <button onClick={onCancel} className="text-muted hover:text-fg"><X className="h-4 w-4" /></button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormRow label="Full Name" required>
          <TextIn value={form.fullName} onChange={(v) => onChange({ fullName: v })} placeholder="First Last" />
        </FormRow>
        <FormRow label="Date of Birth" required hint={age !== null ? `Age: ${age} years${isMinor ? " · MINOR" : ""}` : undefined}>
          <TextIn value={form.dateOfBirth} onChange={(v) => onChange({ dateOfBirth: v })} type="date" />
        </FormRow>
        <FormRow label="Gender" required>
          <SelectIn value={form.gender} onChange={(v) => onChange({ gender: v as NewFamilyMemberForm["gender"] })}>
            {["Male", "Female", "Other", "Prefer not to say"].map((g) => <option key={g}>{g}</option>)}
          </SelectIn>
        </FormRow>
        <FormRow label="Relationship" required>
          <SelectIn value={form.relationship} onChange={(v) => onChange({ relationship: v })}>
            <option value="">Select relationship…</option>
            {RELATIONSHIPS.map((r) => <option key={r}>{r}</option>)}
          </SelectIn>
        </FormRow>
        <FormRow label="Contact Info (optional)">
          <TextIn value={form.contactInfo} onChange={(v) => onChange({ contactInfo: v })} placeholder="+1 555-000-0000" />
        </FormRow>
        <FormRow label="Internal Patient ID (optional)">
          <TextIn value={form.internalPatientId} onChange={(v) => onChange({ internalPatientId: v })} placeholder="PAT-XXXXX" />
        </FormRow>
        <FormRow label="External ID (optional)" hint="e.g. Epic MRN, Cerner ID">
          <TextIn value={form.externalId} onChange={(v) => onChange({ externalId: v })} placeholder="EXT-XXXXX" />
        </FormRow>
      </div>

      {isMinor && (
        <>
          <MinorWarning name={form.fullName || "This person"} />
          <div className="rounded-xl border border-amber/20 bg-surface-2 p-4 space-y-4">
            <SectionTitle>Guardian / Parent Information</SectionTitle>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormRow label="Guardian / Parent Name" required>
                <TextIn value={form.guardianName} onChange={(v) => onChange({ guardianName: v })} placeholder="Full legal name" />
              </FormRow>
              <FormRow label="Guardian Relationship" required>
                <SelectIn value={form.guardianRelationship} onChange={(v) => onChange({ guardianRelationship: v as NewFamilyMemberForm["guardianRelationship"] })}>
                  <option value="">Select…</option>
                  {["Parent", "Legal Guardian", "Authorized Representative"].map((r) => <option key={r}>{r}</option>)}
                </SelectIn>
              </FormRow>
            </div>
            <FormRow label="Guardian Consent Document (PDF)" required hint="Upload a signed consent form authorizing data sharing for this minor.">
              <div
                onClick={() => fileRef.current?.click()}
                className={`flex items-center gap-3 rounded-lg border-2 border-dashed px-4 py-3 cursor-pointer transition-colors ${
                  form.consentDocumentName ? "border-teal/40 bg-teal-soft" : "border-border-strong hover:border-teal/40"
                }`}
              >
                <Upload className={`h-4 w-4 shrink-0 ${form.consentDocumentName ? "text-teal" : "text-muted"}`} />
                <div className="min-w-0">
                  <p className={`text-xs font-medium ${form.consentDocumentName ? "text-teal" : "text-muted"}`}>
                    {form.consentDocumentName || "Click to upload consent document (PDF)"}
                  </p>
                  {!form.consentDocumentName && <p className="text-[10px] text-muted mt-0.5">PDF · max 10 MB</p>}
                </div>
                {form.consentDocumentName && (
                  <button onClick={(e) => { e.stopPropagation(); onChange({ consentDocumentName: "" }); }} className="ml-auto text-muted hover:text-rose">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <input ref={fileRef} type="file" accept=".pdf,application/pdf" className="hidden"
                onChange={(e) => onChange({ consentDocumentName: e.target.files?.[0]?.name ?? "" })} />
            </FormRow>
          </div>
        </>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel} className="rounded-lg border border-border-strong bg-surface-2 px-4 py-2 text-xs font-medium text-muted hover:text-fg">
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={!canSave || saving}
          className="flex items-center gap-1.5 rounded-lg border border-teal/30 bg-teal-soft px-4 py-2 text-xs font-semibold text-teal hover:bg-teal/20 disabled:opacity-40"
        >
          <CheckCircle className={`h-3.5 w-3.5 ${saving ? "animate-spin" : ""}`} />
          {saving ? "Saving…" : "Save Member"}
        </button>
      </div>
    </div>
  );
}

// ── Step 1: Select Person ─────────────────────────────────────────────────────
function SelectPerson({
  state, update, members, onAddedMember,
}: {
  state: WizardState;
  update: (p: Partial<WizardState>) => void;
  members: ShareableFamilyMember[];
  onAddedMember: (m: ShareableFamilyMember) => void;
}) {
  const [saving, setSaving] = useState(false);

  async function handleSaveMember() {
    setSaving(true);
    try {
      const req: CreateFamilyMemberRequest = {
        fullName: state.newMember.fullName,
        dateOfBirth: state.newMember.dateOfBirth,
        gender: state.newMember.gender,
        relationship: state.newMember.relationship,
        contactInfo: state.newMember.contactInfo || undefined,
        internalPatientId: state.newMember.internalPatientId || undefined,
        externalId: state.newMember.externalId || undefined,
        guardianName: state.newMember.guardianName || undefined,
        guardianRelationship: state.newMember.guardianRelationship || undefined,
        consentDocumentBase64: state.newMember.consentDocumentName ? "placeholder" : undefined,
      };
      const newMember = await createFamilyMember(req, "user-sarah");
      onAddedMember(newMember);
      update({ addingNewMember: false, newMember: EMPTY_MEMBER_FORM, subjectType: "family-member", selectedMemberId: newMember.id });
    } finally {
      setSaving(false);
    }
  }

  if (state.addingNewMember) {
    return (
      <AddMemberForm
        form={state.newMember}
        onChange={(patch) => update({ newMember: { ...state.newMember, ...patch } })}
        onCancel={() => update({ addingNewMember: false, newMember: EMPTY_MEMBER_FORM })}
        onSave={handleSaveMember}
        saving={saving}
      />
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">Choose whose data you want to share with an external provider.</p>

      {/* Self vs Family Member */}
      <div className="grid grid-cols-2 gap-3">
        {([
          { value: "self", label: "Myself", sub: "Sarah Martinez · Primary account", icon: User },
          { value: "family-member", label: "Family Member", sub: "Share on behalf of a dependent or relative", icon: Users },
        ] as const).map((opt) => {
          const Icon = opt.icon;
          return (
            <button
              key={opt.value}
              onClick={() => update({ subjectType: opt.value, selectedMemberId: null })}
              className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                state.subjectType === opt.value
                  ? "border-teal/50 bg-teal-soft ring-1 ring-teal/30"
                  : "border-border-strong bg-surface-2 hover:bg-surface-3"
              }`}
            >
              <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${state.subjectType === opt.value ? "bg-teal/20 text-teal" : "bg-surface-3 text-muted"}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className={`text-sm font-semibold ${state.subjectType === opt.value ? "text-teal" : "text-fg"}`}>{opt.label}</div>
                <div className="text-[11px] text-muted mt-0.5 leading-relaxed">{opt.sub}</div>
              </div>
              {state.subjectType === opt.value && <CheckCircle className="h-4 w-4 text-teal ml-auto mt-0.5 shrink-0" />}
            </button>
          );
        })}
      </div>

      {/* Family member list */}
      {state.subjectType === "family-member" && (
        <div className="space-y-3">
          <SectionTitle>Select Family Member</SectionTitle>
          <div className="space-y-2">
            {members.map((m) => {
              const csc = consentStatusColor(m.consentStatus);
              const selected = state.selectedMemberId === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => update({ selectedMemberId: m.id })}
                  className={`w-full flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all ${
                    selected ? "border-teal/50 bg-teal-soft ring-1 ring-teal/30" : "border-border-strong bg-surface-2 hover:bg-surface-3"
                  }`}
                >
                  <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-bold ${
                    selected ? "bg-teal/20 text-teal" : "bg-surface-3 text-muted"
                  }`}>
                    {m.fullName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-semibold ${selected ? "text-teal" : "text-fg"}`}>{m.fullName}</span>
                      {m.isMinor && (
                        <span className="qb-chip bg-amber-soft text-amber border-amber/30 text-[10px] font-semibold">Minor · {m.age}y</span>
                      )}
                      <span className={`qb-chip border text-[10px] ml-auto ${csc.bg} ${csc.text} ${csc.border}`}>
                        {m.consentStatus}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted mt-0.5">
                      {m.relationship} · Age {m.age} · {m.activeShares} active share{m.activeShares !== 1 ? "s" : ""}
                      {m.guardianName && ` · Guardian: ${m.guardianName}`}
                    </div>
                  </div>
                  {selected && <CheckCircle className="h-4 w-4 text-teal shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Add new */}
          <button
            onClick={() => update({ addingNewMember: true })}
            className="flex items-center gap-2 rounded-xl border border-dashed border-teal/40 bg-teal-soft/30 px-4 py-3 text-xs font-medium text-teal hover:bg-teal-soft transition-colors w-full"
          >
            <Plus className="h-4 w-4" />
            Add New Family Member
          </button>

          {/* Minor warning for selected */}
          {state.selectedMemberId && members.find((m) => m.id === state.selectedMemberId)?.isMinor && (
            <MinorWarning name={members.find((m) => m.id === state.selectedMemberId)!.fullName} />
          )}
        </div>
      )}
    </div>
  );
}

// ── Step 2: Select Provider ───────────────────────────────────────────────────
function SelectProvider({ state, update }: { state: WizardState; update: (p: Partial<WizardState>) => void }) {
  const connectedProviders = mockIntegrations.filter((i) => i.status === "Connected");
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Select the healthcare provider or system to share data with.</p>
      {mockIntegrations.map((i) => {
        const isConnected = i.status === "Connected";
        const selected = state.providerId === i.id;
        return (
          <button
            key={i.id}
            disabled={!isConnected}
            onClick={() => update({ providerId: i.id })}
            className={`w-full flex items-center gap-3 rounded-xl border p-4 text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              selected ? "border-teal/50 bg-teal-soft ring-1 ring-teal/30" : "border-border-strong bg-surface-2 hover:bg-surface-3"
            }`}
          >
            <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-bold ${
              selected ? "bg-teal/20 text-teal" : "bg-surface-3 text-muted"
            }`}>
              {i.provider.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-sm font-semibold ${selected ? "text-teal" : "text-fg"}`}>{i.name}</span>
                <span className={`qb-chip text-[10px] border ${isConnected ? "bg-lime-soft text-lime border-lime/30" : "bg-rose-soft text-rose border-rose/30"}`}>
                  {i.status}
                </span>
                {i.environment === "sandbox" && (
                  <span className="qb-chip bg-violet-soft text-violet border-violet/30 text-[9px] uppercase font-semibold">sandbox</span>
                )}
              </div>
              <div className="qb-mono text-[11px] text-muted mt-0.5 truncate">{i.baseUrl}</div>
              {!isConnected && <div className="text-[11px] text-rose mt-0.5">Not available — fix connection errors first</div>}
            </div>
            {selected && <CheckCircle className="h-4 w-4 text-teal shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}

// ── Step 3: Select Data ───────────────────────────────────────────────────────
function SelectData({ state, update }: { state: WizardState; update: (p: Partial<WizardState>) => void }) {
  function toggle(dt: SharingDataType) {
    update({ dataTypes: state.dataTypes.includes(dt) ? state.dataTypes.filter((d) => d !== dt) : [...state.dataTypes, dt] });
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Select which categories of data to share. Only checked types will be transmitted.</p>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {SHARING_DATA_TYPES.map((dt) => {
          const active = state.dataTypes.includes(dt.value);
          return (
            <button
              key={dt.value}
              onClick={() => toggle(dt.value)}
              className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all ${
                active ? "border-teal/50 bg-teal-soft" : "border-border-strong bg-surface-2 hover:bg-surface-3"
              }`}
            >
              <span className="text-xl mt-0.5 shrink-0">{dt.icon}</span>
              <div className="min-w-0 flex-1">
                <div className={`text-xs font-semibold ${active ? "text-teal" : "text-fg"}`}>{dt.label}</div>
                <div className="text-[11px] text-muted mt-0.5 leading-relaxed">{dt.description}</div>
                <div className="qb-mono text-[10px] text-muted mt-1">→ {dt.fhirResource}</div>
              </div>
              {active && <CheckCircle className="h-4 w-4 text-teal shrink-0 mt-0.5" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Step 4: Sharing Rules ─────────────────────────────────────────────────────
function SharingRules({ state, update }: { state: WizardState; update: (p: Partial<WizardState>) => void }) {
  const TRIGGERS = [
    { value: "new-report",       label: "New Report Created" },
    { value: "new-lab",          label: "New Lab Result" },
    { value: "new-prescription", label: "New Prescription" },
    { value: "daily-batch",      label: "Daily Batch" },
    { value: "on-demand",        label: "On-Demand" },
  ];
  function toggleTrigger(v: string) {
    update({ triggers: state.triggers.includes(v) ? state.triggers.filter((t) => t !== v) : [...state.triggers, v] });
  }
  const today = new Date().toISOString().split("T")[0];
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">Define when and how frequently data is shared.</p>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <SectionTitle>Sharing Mode</SectionTitle>
          {(["real-time", "scheduled"] as const).map((m) => (
            <button key={m} onClick={() => update({ mode: m })}
              className={`w-full flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium transition-colors capitalize ${
                state.mode === m ? "border-teal/40 bg-teal-soft text-teal" : "border-border-strong bg-surface-2 text-muted hover:text-fg"
              }`}>
              {state.mode === m && <CheckCircle className="h-3.5 w-3.5" />}
              {m.replace("-", "-")}
            </button>
          ))}
        </div>
        <div className="space-y-1.5">
          <SectionTitle>Frequency</SectionTitle>
          {(["immediate", "daily", "weekly", "monthly"] as const).map((f) => (
            <button key={f} onClick={() => update({ frequency: f })}
              className={`w-full flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium transition-colors capitalize ${
                state.frequency === f ? "border-teal/40 bg-teal-soft text-teal" : "border-border-strong bg-surface-2 text-muted hover:text-fg"
              }`}>
              {state.frequency === f && <CheckCircle className="h-3.5 w-3.5" />}
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <SectionTitle>Event Triggers</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {TRIGGERS.map((t) => (
            <button key={t.value} onClick={() => toggleTrigger(t.value)}
              className={`rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-colors ${
                state.triggers.includes(t.value) ? "border-violet/40 bg-violet-soft text-violet" : "border-border-strong bg-surface-2 text-muted hover:text-fg"
              }`}>
              {state.triggers.includes(t.value) ? "✓ " : ""}{t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <SectionTitle>Consent Expiration Date</SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormRow label="Expiration Date" required hint="Sharing will auto-pause when consent expires.">
            <TextIn value={state.expirationDate} onChange={(v) => update({ expirationDate: v })} type="date" />
          </FormRow>
        </div>
        {state.expirationDate && new Date(state.expirationDate) < new Date(today) && (
          <div className="flex items-center gap-2 rounded-lg border border-rose/20 bg-rose-soft px-3 py-2 text-[11px] text-rose">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" /> Expiration date must be in the future.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Step 5: Consent ───────────────────────────────────────────────────────────
function ConsentScreen({
  state, update, members,
}: { state: WizardState; update: (p: Partial<WizardState>) => void; members: ShareableFamilyMember[] }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const provider = mockIntegrations.find((i) => i.id === state.providerId);
  const member = members.find((m) => m.id === state.selectedMemberId);
  const subjectName = state.subjectType === "self" ? "Sarah Martinez (Myself)" : member?.fullName ?? "Unknown";
  const isMinor = state.subjectType === "family-member" && member?.isMinor;
  const selectedTypes = SHARING_DATA_TYPES.filter((d) => state.dataTypes.includes(d.value));

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2.5 rounded-xl border border-sky/30 bg-sky-soft px-4 py-3">
        <Shield className="h-4 w-4 text-sky shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-sky">HIPAA Authorization Notice</p>
          <p className="text-[11px] text-sky/90 mt-0.5">
            This consent is required under HIPAA §164.508. You have the right to revoke this consent at any time. Revoking will stop future sharing but will not recall previously transmitted data.
          </p>
        </div>
      </div>

      {/* Consent summary card */}
      <div className="qb-card space-y-4 border-border-strong">
        <div className="text-xs font-semibold text-fg uppercase tracking-wider flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 text-teal" />
          Consent Summary
        </div>

        {[
          { label: "Data Subject",  value: subjectName },
          { label: "Shared By",     value: "Sarah Martinez (Account Owner)" },
          { label: "Provider",      value: provider?.name ?? "—" },
          { label: "Endpoint",      value: provider?.baseUrl ?? "—", mono: true },
          { label: "Valid Until",   value: state.expirationDate || "No expiration set" },
          { label: "Sync Mode",     value: `${state.mode} · ${state.frequency}`, capitalize: true },
        ].map((row) => (
          <div key={row.label} className="flex items-start gap-2 border-b border-border-soft pb-2 last:border-0 last:pb-0">
            <span className="text-[11px] text-muted w-28 shrink-0 mt-0.5">{row.label}</span>
            <span className={`text-xs font-medium text-fg ${row.mono ? "qb-mono" : ""} ${row.capitalize ? "capitalize" : ""}`}>{row.value}</span>
          </div>
        ))}

        <div className="flex items-start gap-2">
          <span className="text-[11px] text-muted w-28 shrink-0 mt-0.5">Data Types</span>
          <div className="flex flex-wrap gap-1.5">
            {selectedTypes.map((dt) => (
              <span key={dt.value} className="qb-chip bg-teal-soft text-teal border-teal/30 text-[10px]">
                {dt.icon} {dt.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Minor: guardian consent document upload */}
      {isMinor && (
        <div className="rounded-xl border border-amber/20 bg-amber-soft p-4 space-y-3">
          <p className="text-xs font-semibold text-amber flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> Guardian Consent Document Required
          </p>
          <p className="text-[11px] text-amber/90">
            Because <strong>{member?.fullName}</strong> is a minor (age {member?.age}), you must upload a signed guardian consent form before activating data sharing.
          </p>
          <div
            onClick={() => fileRef.current?.click()}
            className={`flex items-center gap-3 rounded-lg border-2 border-dashed px-4 py-3 cursor-pointer transition-colors ${
              state.guardianConsentDocName ? "border-teal/40 bg-teal-soft" : "border-amber/40 hover:border-teal/40"
            }`}
          >
            <Upload className={`h-4 w-4 ${state.guardianConsentDocName ? "text-teal" : "text-amber"}`} />
            <span className={`text-xs font-medium ${state.guardianConsentDocName ? "text-teal" : "text-amber"}`}>
              {state.guardianConsentDocName || "Upload signed guardian consent form (PDF)"}
            </span>
          </div>
          <input ref={fileRef} type="file" accept=".pdf" className="hidden"
            onChange={(e) => update({ guardianConsentDocName: e.target.files?.[0]?.name ?? "" })} />
        </div>
      )}

      {/* Signature / acceptance */}
      <div className="space-y-3">
        <SectionTitle>Consent Signature</SectionTitle>
        <FormRow label="Full Name (signature equivalent)" required hint="Type your full legal name to electronically sign this consent.">
          <TextIn value={state.consentSignature} onChange={(v) => update({ consentSignature: v })} placeholder="Sarah Martinez" />
        </FormRow>

        <label className={`flex items-start gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-all ${
          state.consentAccepted ? "border-teal/50 bg-teal-soft" : "border-border-strong bg-surface-2 hover:bg-surface-3"
        }`}>
          <div className={`mt-0.5 h-4 w-4 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
            state.consentAccepted ? "border-teal bg-teal" : "border-border-strong"
          }`}>
            {state.consentAccepted && <CheckCircle className="h-3 w-3 text-white" />}
          </div>
          <input type="checkbox" checked={state.consentAccepted} onChange={(e) => update({ consentAccepted: e.target.checked })} className="sr-only" />
          <div className="min-w-0">
            <p className={`text-xs font-semibold ${state.consentAccepted ? "text-teal" : "text-fg"}`}>
              I authorize sharing of the above data
            </p>
            <p className="text-[11px] text-muted mt-0.5 leading-relaxed">
              I understand this consent is subject to HIPAA protections. I may revoke it at any time. My data will only be shared with the provider listed above for the purposes described.
              {isMinor && " I confirm I am the legal guardian of the minor named above."}
            </p>
          </div>
        </label>
      </div>
    </div>
  );
}

// ── Step 6: Review & Activate ─────────────────────────────────────────────────
function ReviewConfirm({
  state, members, onActivate, activating,
}: { state: WizardState; members: ShareableFamilyMember[]; onActivate: () => void; activating: boolean }) {
  const provider = mockIntegrations.find((i) => i.id === state.providerId);
  const member   = members.find((m) => m.id === state.selectedMemberId);
  const subject  = state.subjectType === "self" ? "Sarah Martinez (Myself)" : member?.fullName ?? "—";

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">Review your configuration before activating data sharing.</p>

      <div className="qb-card space-y-3">
        {[
          { label: "Data Subject",   value: subject },
          { label: "Provider",       value: provider?.name ?? "—" },
          { label: "Data Types",     value: SHARING_DATA_TYPES.filter((d) => state.dataTypes.includes(d.value)).map((d) => d.label).join(", ") || "None selected" },
          { label: "Mode",           value: `${state.mode} · ${state.frequency}`, capitalize: true },
          { label: "Triggers",       value: state.triggers.length ? state.triggers.join(", ") : "None" },
          { label: "Expires",        value: state.expirationDate || "No expiry set" },
          { label: "Consent",        value: state.consentAccepted ? "✓ Accepted" : "Not accepted", color: state.consentAccepted ? "text-lime" : "text-rose" },
        ].map((row) => (
          <div key={row.label} className="flex items-center gap-2 border-b border-border-soft pb-2.5 last:border-0 last:pb-0">
            <span className="text-[11px] text-muted w-28 shrink-0">{row.label}</span>
            <span className={`text-xs font-medium ${(row as any).color ?? "text-fg"} ${(row as any).capitalize ? "capitalize" : ""}`}>{row.value}</span>
          </div>
        ))}
      </div>

      {member?.isMinor && state.guardianConsentDocName && (
        <div className="flex items-center gap-2 rounded-lg border border-teal/20 bg-teal-soft px-3 py-2">
          <BadgeCheck className="h-3.5 w-3.5 text-teal" />
          <span className="text-xs text-teal font-medium">Guardian consent document: {state.guardianConsentDocName}</span>
        </div>
      )}

      <div className="flex items-start gap-2.5 rounded-xl border border-sky/30 bg-sky-soft px-4 py-3">
        <Shield className="h-4 w-4 text-sky shrink-0 mt-0.5" />
        <p className="text-[11px] text-sky/90">
          Upon activation, a signed consent record and immutable audit log entry will be created. All transmitted data will include a FHIR Consent reference. You can revoke at any time from the Active Shares panel.
        </p>
      </div>

      <button
        onClick={onActivate}
        disabled={activating || !state.consentAccepted}
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-teal/40 bg-teal-soft py-3 text-sm font-semibold text-teal hover:bg-teal/20 disabled:opacity-40 transition-colors"
      >
        <Share2 className={`h-4 w-4 ${activating ? "animate-pulse" : ""}`} />
        {activating ? "Activating…" : "Activate Data Sharing"}
      </button>
    </div>
  );
}

// ── Active Shares dashboard ───────────────────────────────────────────────────
function ActiveSharesPanel({
  configs, consents, onRevoke,
}: { configs: SharingConfig[]; consents: ConsentRecord[]; onRevoke: (consentId: string, configId: string) => void }) {
  const [revoking, setRevoking] = useState<string | null>(null);
  const [showFhir, setShowFhir] = useState<string | null>(null);

  async function handleRevoke(consentId: string, configId: string) {
    setRevoking(consentId);
    await revokeConsent({ consentId, revokedByUserId: "user-sarah", revokedByName: "Sarah Martinez" });
    onRevoke(consentId, configId);
    setRevoking(null);
  }

  if (configs.length === 0) {
    return (
      <div className="py-12 text-center">
        <Share2 className="h-10 w-10 text-muted opacity-30 mx-auto mb-3" />
        <p className="text-sm text-muted">No active sharing configurations yet.</p>
        <p className="text-xs text-muted mt-1">Use the wizard above to set up your first data share.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {configs.map((cfg) => {
        const consent = consents.find((c) => c.consentId === cfg.consentId);
        const sc = sharingConfigStatusColor(cfg.status);
        const isRevokingThis = revoking === cfg.consentId;
        return (
          <div key={cfg.configId} className="qb-card space-y-3">
            <div className="flex items-start gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-fg">{cfg.subjectName}</span>
                  <span className="text-muted text-xs">→</span>
                  <span className="text-sm font-medium text-fg">{cfg.providerName}</span>
                  <span className={`qb-chip border text-[10px] ${sc.bg} ${sc.text} ${sc.border}`}>{cfg.status}</span>
                  {cfg.subjectType === "family-member" && (
                    <span className="qb-chip bg-violet-soft text-violet border-violet/30 text-[10px]">Family</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {SHARING_DATA_TYPES.filter((d) => cfg.dataTypes.includes(d.value)).map((d) => (
                    <span key={d.value} className="qb-chip bg-teal-soft text-teal border-teal/30 text-[10px]">{d.icon} {d.label}</span>
                  ))}
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={() => setShowFhir(showFhir === cfg.configId ? null : cfg.configId)}
                  className="flex items-center gap-1 rounded-lg border border-border-strong bg-surface-2 px-2.5 py-1.5 text-[11px] text-muted hover:text-fg"
                >
                  <Eye className="h-3 w-3" /> FHIR
                </button>
                {cfg.status === "active" && (
                  <button
                    onClick={() => handleRevoke(cfg.consentId, cfg.configId)}
                    disabled={isRevokingThis}
                    className="flex items-center gap-1 rounded-lg border border-rose/30 bg-rose-soft px-2.5 py-1.5 text-[11px] text-rose hover:bg-rose/20 disabled:opacity-50"
                  >
                    <XCircle className={`h-3 w-3 ${isRevokingThis ? "animate-spin" : ""}`} />
                    {isRevokingThis ? "Revoking…" : "Revoke"}
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-muted border-t border-border-soft pt-2.5">
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{cfg.mode} · {cfg.frequency}</span>
              <span>{cfg.recordsSent.toLocaleString()} records sent</span>
              {cfg.lastSync && <span>Last sync: {new Date(cfg.lastSync).toLocaleDateString()}</span>}
              <span>Expires: {cfg.expirationDate}</span>
              {consent && <span className="flex items-center gap-1">
                <BadgeCheck className="h-3 w-3 text-lime" /> Consent v{consent.version}
              </span>}
            </div>

            {showFhir === cfg.configId && (
              <div className="rounded-lg border border-border-strong bg-surface-2 p-3">
                <div className="text-[11px] font-medium text-muted mb-1.5">FHIR Consent Reference (attached to all outbound data)</div>
                <pre className="text-[10px] qb-mono text-fg overflow-x-auto qb-scroll max-h-32">
                  {JSON.stringify({ consentId: cfg.consentId, status: consent?.status, subject: cfg.subjectName, provider: cfg.providerName, validTo: consent?.validTo ?? "perpetual" }, null, 2)}
                </pre>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function DataSharingConsent() {
  const ctx = useUserContext();
  const [step, setStep]     = useState(1);
  const [state, setState]   = useState<WizardState>(INITIAL);
  const [members, setMembers] = useState<ShareableFamilyMember[]>(shareableFamilyMembers);
  const [configs, setConfigs] = useState<SharingConfig[]>(mockSharingConfigs);
  const [consents, setConsents] = useState<ConsentRecord[]>(mockConsentRecords);
  const [activating, setActivating] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [view, setView] = useState<"wizard" | "active">("active");

  // ── Context-aware filtering ───────────────────────────────────────────────
  // SELF   → show all configs and consents
  // FAMILY → show only records belonging to the selected family member
  const visibleConfigs = useMemo(() => {
    if (ctx.contextType === "SELF") return configs;
    return configs.filter((c) => c.subjectId === ctx.contextSubjectId);
  }, [configs, ctx.contextType, ctx.contextSubjectId]);

  const visibleConsents = useMemo(() => {
    if (ctx.contextType === "SELF") return consents;
    return consents.filter((c) => c.subjectId === ctx.contextSubjectId);
  }, [consents, ctx.contextType, ctx.contextSubjectId]);

  function update(patch: Partial<WizardState>) { setState((p) => ({ ...p, ...patch })); }

  function canAdvance(): boolean {
    const member = members.find((m) => m.id === state.selectedMemberId);
    switch (step) {
      case 1:
        if (state.subjectType === "self")          return true;
        if (state.subjectType === "family-member") return !!state.selectedMemberId;
        return false;
      case 2: return !!state.providerId;
      case 3: return state.dataTypes.length > 0;
      case 4: return !!state.expirationDate && new Date(state.expirationDate) > new Date();
      case 5:
        const needsGuardianDoc = state.subjectType === "family-member" && member?.isMinor;
        return state.consentAccepted && !!state.consentSignature &&
          (!needsGuardianDoc || !!state.guardianConsentDocName);
      default: return true;
    }
  }

  async function handleActivate() {
    setActivating(true);
    try {
      const member = members.find((m) => m.id === state.selectedMemberId);
      const provider = mockIntegrations.find((i) => i.id === state.providerId)!;
      const subjectId = state.subjectType === "self" ? "patient-00429" : state.selectedMemberId!;
      const subjectName = state.subjectType === "self" ? "Sarah Martinez" : member?.fullName ?? "Unknown";

      const consent = await createConsent({
        subjectType: state.subjectType,
        subjectId,
        subjectName,
        providerId: state.providerId,
        providerName: provider.name,
        dataTypes: state.dataTypes,
        validFrom: new Date().toISOString(),
        validTo: new Date(state.expirationDate).toISOString(),
        isMinorConsent: state.subjectType === "family-member" && (member?.isMinor ?? false),
        guardianName: member?.isMinor ? state.consentSignature : undefined,
        guardianAccepted: state.consentAccepted,
      }, "user-sarah");

      const config = await createSharingConfig({
        subjectType: state.subjectType,
        subjectId,
        subjectName,
        providerId: state.providerId,
        providerName: provider.name,
        dataTypes: state.dataTypes,
        mode: state.mode,
        frequency: state.frequency,
        triggers: state.triggers,
        expirationDate: state.expirationDate,
        consentId: consent.consentId,
      }, "user-sarah");

      setConsents((prev) => [consent, ...prev]);
      setConfigs((prev) => [config, ...prev]);
      setCompleted(true);
      setView("active");
      setState(INITIAL);
      setStep(1);
    } finally {
      setActivating(false);
    }
  }

  function handleRevoke(consentId: string, configId: string) {
    setConsents((prev) => prev.map((c) => c.consentId === consentId ? { ...c, status: "revoked", revokedAt: new Date().toISOString(), revokedByName: "Sarah Martinez" } : c));
    setConfigs((prev) => prev.map((c) => c.configId === configId ? { ...c, status: "revoked" } : c));
  }

  const activeCount = visibleConfigs.filter((c) => c.status === "active").length;
  const canCreateNew = ctx.hasActiveConsent;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="qb-display text-base font-semibold text-fg">Data Sharing & Consent</h2>
          <p className="text-xs text-muted mt-0.5">HIPAA-compliant consent-based sharing for patient and dependent data</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="qb-chip bg-lime-soft text-lime border-lime/30 text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full bg-lime qb-pulse inline-block mr-1" />
            {activeCount} Active Share{activeCount !== 1 ? "s" : ""}
          </span>
          <button
            onClick={() => { if (!canCreateNew) return; setView(view === "wizard" ? "active" : "wizard"); setCompleted(false); }}
            disabled={!canCreateNew}
            title={!canCreateNew ? "No active consent for this family member" : undefined}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              view === "wizard"
                ? "border-teal/30 bg-teal-soft text-teal"
                : "border-border-strong bg-surface text-muted hover:text-fg"
            }`}
          >
            {view === "wizard" ? <><X className="h-3.5 w-3.5" /> Cancel</> : <><Plus className="h-3.5 w-3.5" /> New Share</>}
          </button>
        </div>
      </div>

      {/* No-consent warning for family member context */}
      {ctx.isFamilyView && !ctx.hasActiveConsent && (
        <div className="flex items-start gap-3 rounded-xl border border-rose/30 bg-rose-soft px-4 py-3">
          <AlertCircle className="h-4 w-4 text-rose shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-rose">Consent required to manage data sharing</p>
            <p className="text-[11px] text-rose/90 mt-0.5">
              No active consent exists for <strong>{ctx.contextSubjectName}</strong>. Data sharing actions are disabled until consent is granted by an authorized guardian or the patient themselves.
            </p>
          </div>
        </div>
      )}

      {/* Success banner */}
      {completed && (
        <div className="flex items-center gap-3 rounded-xl border border-lime/30 bg-lime-soft px-4 py-3">
          <CheckCircle className="h-4 w-4 text-lime shrink-0" />
          <div>
            <p className="text-xs font-semibold text-lime">Data sharing activated</p>
            <p className="text-[11px] text-lime/80">Consent record created. Data sharing is now live. You can revoke at any time below.</p>
          </div>
        </div>
      )}

      {/* Setup wizard */}
      {view === "wizard" && (
        <div className="qb-card space-y-5">
          <StepDots current={step} total={STEPS.length} />

          <div className="border-t border-border-soft pt-5">
            <h3 className="qb-display text-sm font-semibold text-fg mb-4">{STEPS[step - 1].title}</h3>

            {step === 1 && <SelectPerson state={state} update={update} members={members} onAddedMember={(m) => setMembers((p) => [...p, m])} />}
            {step === 2 && <SelectProvider state={state} update={update} />}
            {step === 3 && <SelectData state={state} update={update} />}
            {step === 4 && <SharingRules state={state} update={update} />}
            {step === 5 && <ConsentScreen state={state} update={update} members={members} />}
            {step === 6 && <ReviewConfirm state={state} members={members} onActivate={handleActivate} activating={activating} />}
          </div>

          {step < 6 && (
            <div className="flex items-center justify-between border-t border-border-soft pt-4">
              <button
                onClick={() => step > 1 ? setStep((s) => s - 1) : setView("active")}
                className="flex items-center gap-1.5 rounded-lg border border-border-strong bg-surface-2 px-4 py-2 text-xs font-medium text-muted hover:text-fg"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                {step === 1 ? "Cancel" : "Back"}
              </button>
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canAdvance()}
                className="flex items-center gap-1.5 rounded-lg border border-teal/30 bg-teal-soft px-4 py-2 text-xs font-medium text-teal hover:bg-teal/20 disabled:opacity-40"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Active sharing configs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="qb-display text-sm font-semibold text-fg">Active Sharing Configurations</h3>
          <span className="text-xs text-muted">{visibleConfigs.length} total · {activeCount} active</span>
        </div>
        <ActiveSharesPanel configs={visibleConfigs} consents={visibleConsents} onRevoke={handleRevoke} />
      </div>

      {/* Consent records */}
      <div className="space-y-3">
        <h3 className="qb-display text-sm font-semibold text-fg">Consent Records</h3>
        <div className="qb-card p-0 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border-soft bg-surface-2">
                {["Subject", "Provider", "Granted By", "Status", "Version", "Valid To", ""].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleConsents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted">
                    No consent records{ctx.isFamilyView ? ` for ${ctx.contextSubjectName}` : ""}.
                  </td>
                </tr>
              ) : (
                visibleConsents.map((c) => {
                  const csc = consentStatusColor(c.status);
                  return (
                    <tr key={c.consentId} className="border-b border-border-soft last:border-0 hover:bg-surface-2 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-fg">{c.subjectName}</span>
                          <span className={`qb-chip border text-[9px] font-bold ${
                            c.subjectType === "self" ? "bg-teal-soft text-teal border-teal/30" : "bg-amber-soft text-amber border-amber/30"
                          }`}>{c.subjectType === "self" ? "Self" : "Family"}</span>
                        </div>
                        {c.isMinorConsent && <div className="text-[10px] text-amber mt-0.5">Minor · Guardian: {c.guardianName}</div>}
                      </td>
                      <td className="px-4 py-3 text-muted">{c.providerName}</td>
                      <td className="px-4 py-3 text-muted">{c.grantedByName}</td>
                      <td className="px-4 py-3">
                        <span className={`qb-chip border text-[10px] ${csc.bg} ${csc.text} ${csc.border}`}>{c.status}</span>
                      </td>
                      <td className="px-4 py-3 qb-mono text-muted">v{c.version}</td>
                      <td className="px-4 py-3 text-muted">{c.validTo ? new Date(c.validTo).toLocaleDateString() : "—"}</td>
                      <td className="px-4 py-3">
                        {c.auditTrail.length > 0 && (
                          <span className="text-[10px] text-muted qb-mono">{c.auditTrail.length} events</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
