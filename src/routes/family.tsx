import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Layout } from "@/components/qb/Layout";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  UserPlus,
  Activity,
  Plus,
  Pencil,
  Trash2,
  X,
  FileText,
  Upload,
  Cpu,
  Camera,
  Share2,
  RefreshCw,
} from "lucide-react";
import { patient, initialReports, devicesData, accentClass } from "@/lib/qb-data";
import type { FamilyMember, MetricEntry, WellbeingStatus, Relationship, BloodGroup, Gender } from "@/lib/qb-data";
import { useFamilyContext } from "@/lib/family-context";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataSharingConsent } from "@/components/qb/DataSharingConsent";
import { ConnectProviderWizard } from "@/components/qb/ConnectProviderWizard";
import {
  listGeneralWellbeingLogs,
  listSymptomsLogs,
  type GeneralWellbeingLog,
  type SymptomsLog,
} from "@/lib/api/source-data-notes.functions";

// ── Constants ─────────────────────────────────────────────────────────────────

const RELATIONSHIPS: Relationship[] = [
  "Father", "Mother", "Spouse", "Son", "Daughter", "Sibling", "Guardian", "Other",
];
const BLOOD_GROUPS: BloodGroup[] = [
  "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-",
];
const GENDERS: Gender[] = ["Male", "Female", "Non-binary", "Prefer not to say"];

const RELATIONSHIP_ICON: Record<Relationship, string> = {
  Father: "👨",
  Mother: "👩",
  Spouse: "💑",
  Son: "👦",
  Daughter: "👧",
  Sibling: "🧑",
  Guardian: "🛡️",
  Other: "👤",
};

const REPORT_CATEGORY_EMOJI: Record<string, string> = {
  "Blood Test": "🩸",
  "Urine Test": "🧪",
  "Radiology": "🔬",
  "Cardiology": "❤️",
  "Neurology": "🧠",
  "Endocrinology": "⚕️",
  "Gastroenterology": "🫀",
  "Pulmonology": "🫁",
  "Orthopedics": "🦴",
  "Ophthalmology": "👁️",
  "Dermatology": "🩺",
  "Psychiatry / Mental Health": "🧘",
  "Pharmacy / Prescriptions": "💊",
  "Other": "📄",
};

const STATUS_CFG: Record<WellbeingStatus, { chip: string; dot: string; pulse: boolean }> = {
  Good:    { chip: "border-lime/40 text-lime",    dot: "bg-lime",   pulse: false },
  Monitor: { chip: "border-amber/40 text-amber",  dot: "bg-amber",  pulse: false },
  Alert:   { chip: "border-rose/40 text-rose",    dot: "bg-rose",   pulse: true  },
};

const BLANK_MEMBER: Omit<FamilyMember, "id"> = {
  fullName: "", relationship: "Father", age: 0, gender: "Male",
  bloodGroup: "O+", phone: "", email: "", emergencyContact: "",
  conditions: [], allergies: [], medications: [],
  healthNotes: "", wellbeingNotes: "", metrics: [],
  wellbeingStatus: "Good", lastUpdated: "just now", reportsCount: 0,
  photo: undefined,
};

const BLANK_METRIC: Omit<MetricEntry, "id"> = {
  date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
  bloodPressure: "", bloodSugar: undefined, weight: undefined,
  heartRate: undefined, oxygenSaturation: undefined, temperature: undefined, notes: "",
};

const makeId = () => `fm${Date.now()}`;
const makeMetricId = () => `m${Date.now()}`;
const num = (v: string) => (v === "" ? undefined : Number(v));
const SELF_MEMBER_ID = "self";

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

// ── Device Status Badge ────────────────────────────────────────────────────────

function statusAccent(status: string) {
  if (status === "Needs Reconnect") return "rose";
  if (status === "Pending") return "amber";
  if (status === "Inactive" || status === "Active") return "violet";
  return "teal";
}

function DeviceStatusBadge({ status }: { status: string }) {
  const accent = statusAccent(status);
  const a = accentClass[accent];

  return (
    <span className={`qb-chip border-${accent}/40 ${a.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full bg-current ${status === "Connected" ? "qb-pulse" : ""}`} />
      {status}
    </span>
  );
}

// ── Device Card Display ────────────────────────────────────────────────────────

function DeviceCardDisplay({
  device,
}: {
  device: { id: string; name: string; icon: string; status: string; lastSync: string; dataTypes: string; accent: string };
}) {
  const accent = statusAccent(device.status);
  const a = accentClass[accent];

  return (
    <div className="qb-card qb-card-hover">
      <div className="flex items-start gap-4">
        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl ${a.bg}`}>
          {device.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="qb-display text-sm font-semibold">{device.name}</h3>
            <DeviceStatusBadge status={device.status} />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="qb-mono text-[9px] uppercase tracking-widest text-muted">Last sync</div>
              <div className="qb-mono text-muted-foreground">{device.lastSync}</div>
            </div>
            <div>
              <div className="qb-mono text-[9px] uppercase tracking-widest text-muted">Data types</div>
              <div className="truncate text-xs">{device.dataTypes}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Route ──────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/family")({
  head: () => ({
    meta: [
      { title: "Family · Quest Beyond" },
      { name: "description", content: "Manage health information for your family members." },
    ],
  }),
  component: Family,
});

// ── TagInput ──────────────────────────────────────────────────────────────────

function TagInput({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
}) {
  const [input, setInput] = useState("");

  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !values.includes(trimmed)) onChange([...values, trimmed]);
    setInput("");
  };

  return (
    <div>
      <div className="mb-1 text-[10px] qb-mono uppercase tracking-widest text-muted">{label}</div>
      <div className="flex flex-wrap gap-1.5 min-h-[32px] rounded-lg border border-border-strong bg-surface-2 px-2 py-1.5 mb-1.5">
        {values.map((v) => (
          <span key={v} className="flex items-center gap-1 rounded-full bg-surface-3 px-2 py-0.5 text-xs">
            {v}
            <button type="button" onClick={() => onChange(values.filter((x) => x !== v))}>
              <X className="h-3 w-3 text-muted hover:text-rose" />
            </button>
          </span>
        ))}
        {values.length === 0 && <span className="text-xs text-muted self-center">None added</span>}
      </div>
      <div className="flex gap-1.5">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={`Add ${label.toLowerCase()}…`}
          className="h-8 text-xs"
        />
        <button
          type="button"
          onClick={add}
          className="h-8 rounded-lg border border-border-strong px-2.5 text-xs text-muted hover:text-fg"
        >
          Add
        </button>
      </div>
    </div>
  );
}

// ── MemberSheet (add / edit) ───────────────────────────────────────────────────

function MemberSheet({
  open,
  onClose,
  onSave,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (m: FamilyMember) => void;
  initial: FamilyMember | null;
}) {
  const [form, setForm] = useState<Omit<FamilyMember, "id">>(
    initial ? { ...initial } : { ...BLANK_MEMBER },
  );
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setForm(initial ? { ...initial } : { ...BLANK_MEMBER });
  }, [open, initial?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const sf = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handlePhotoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("Photo must be under 2 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => sf("photo", reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = () => {
    if (!form.fullName.trim()) return;
    onSave({ ...form, id: initial?.id ?? makeId(), lastUpdated: "just now" });
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-[580px] overflow-y-auto bg-surface border-border-soft">
        <SheetHeader className="mb-6">
          <SheetTitle className="qb-display text-base">
            {initial ? "Edit Family Member" : "Add Family Member"}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          {/* Photo */}
          <section>
            <p className="qb-mono text-[10px] uppercase tracking-widest text-muted mb-3">Profile Photo <span className="normal-case">(optional)</span></p>
            <div className="flex items-center gap-4">
              <div className="relative grid h-16 w-16 shrink-0 place-items-center rounded-2xl overflow-hidden border border-border-soft bg-surface-2">
                {form.photo ? (
                  <img src={form.photo} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <span className="qb-display text-lg font-bold text-muted">
                    {form.fullName ? initials(form.fullName) : "?"}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-border-strong px-3 text-xs text-muted hover:text-fg transition-colors"
                >
                  <Camera className="h-3.5 w-3.5" />
                  {form.photo ? "Change Photo" : "Upload Photo"}
                </button>
                {form.photo && (
                  <button
                    type="button"
                    onClick={() => sf("photo", undefined)}
                    className="flex h-8 items-center gap-1.5 rounded-lg border border-rose/30 px-3 text-xs text-rose hover:bg-rose-soft transition-colors"
                  >
                    <X className="h-3.5 w-3.5" /> Remove Photo
                  </button>
                )}
                <p className="text-[10px] text-muted">JPG, PNG or WebP · Max 2 MB</p>
              </div>
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={handlePhotoChange}
            />
          </section>

          {/* Personal */}
          <section>
            <p className="qb-mono text-[10px] uppercase tracking-widest text-muted mb-3">Personal Details</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label className="mb-1 block text-xs text-muted">Full Name *</Label>
                <Input value={form.fullName} onChange={(e) => sf("fullName", e.target.value)} placeholder="Full name" className="h-9 text-sm" />
              </div>
              <div>
                <Label className="mb-1 block text-xs text-muted">Relationship</Label>
                <Select value={form.relationship} onValueChange={(v) => sf("relationship", v as Relationship)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{RELATIONSHIPS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1 block text-xs text-muted">Age</Label>
                <Input type="number" min={0} max={120} value={form.age || ""} onChange={(e) => sf("age", Number(e.target.value))} placeholder="Age" className="h-9 text-sm" />
              </div>
              <div>
                <Label className="mb-1 block text-xs text-muted">Gender</Label>
                <Select value={form.gender} onValueChange={(v) => sf("gender", v as Gender)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1 block text-xs text-muted">Blood Group</Label>
                <Select value={form.bloodGroup} onValueChange={(v) => sf("bloodGroup", v as BloodGroup)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{BLOOD_GROUPS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1 block text-xs text-muted">Wellbeing Status</Label>
                <Select value={form.wellbeingStatus} onValueChange={(v) => sf("wellbeingStatus", v as WellbeingStatus)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["Good", "Monitor", "Alert"] as WellbeingStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Contact */}
          <section>
            <p className="qb-mono text-[10px] uppercase tracking-widest text-muted mb-3">Contact Information</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label className="mb-1 block text-xs text-muted">Phone</Label>
                <Input value={form.phone} onChange={(e) => sf("phone", e.target.value)} placeholder="+1 (555) …" className="h-9 text-sm" />
              </div>
              <div>
                <Label className="mb-1 block text-xs text-muted">Email</Label>
                <Input type="email" value={form.email} onChange={(e) => sf("email", e.target.value)} placeholder="email@example.com" className="h-9 text-sm" />
              </div>
              <div className="sm:col-span-2">
                <Label className="mb-1 block text-xs text-muted">Emergency Contact</Label>
                <Input value={form.emergencyContact} onChange={(e) => sf("emergencyContact", e.target.value)} placeholder="Name · Phone number" className="h-9 text-sm" />
              </div>
            </div>
          </section>

          {/* Health */}
          <section>
            <p className="qb-mono text-[10px] uppercase tracking-widest text-muted mb-3">Health Information</p>
            <div className="space-y-3">
              <TagInput label="Medical Conditions" values={form.conditions} onChange={(v) => sf("conditions", v)} />
              <TagInput label="Allergies" values={form.allergies} onChange={(v) => sf("allergies", v)} />
              <TagInput label="Current Medications" values={form.medications} onChange={(v) => sf("medications", v)} />
              <div>
                <Label className="mb-1 block text-xs text-muted">Health Notes</Label>
                <Textarea value={form.healthNotes} onChange={(e) => sf("healthNotes", e.target.value)} placeholder="Any health-related observations or concerns…" rows={3} className="text-sm resize-none" />
              </div>
              <div>
                <Label className="mb-1 block text-xs text-muted">Wellbeing Notes</Label>
                <Textarea value={form.wellbeingNotes} onChange={(e) => sf("wellbeingNotes", e.target.value)} placeholder="General wellbeing, mood, activity level…" rows={3} className="text-sm resize-none" />
              </div>
            </div>
          </section>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="h-9 rounded-lg border border-border-strong px-4 text-xs text-muted hover:text-fg">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!form.fullName.trim()}
            className="h-9 rounded-lg bg-teal px-4 text-xs font-medium text-bg hover:bg-teal/90 disabled:opacity-40"
          >
            {initial ? "Save Changes" : "Add Member"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── MetricsDialog ─────────────────────────────────────────────────────────────

function MetricsDialog({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (m: MetricEntry) => void;
}) {
  const [form, setForm] = useState<Omit<MetricEntry, "id">>({ ...BLANK_METRIC });

  useEffect(() => {
    if (open) setForm({ ...BLANK_METRIC });
  }, [open]);

  const sf = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleSave = () => {
    onSave({ ...form, id: makeMetricId() });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[480px] bg-surface border-border-soft">
        <DialogHeader>
          <DialogTitle className="qb-display text-base">Log Health Metrics</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className="col-span-2">
            <Label className="mb-1 block text-xs text-muted">Date</Label>
            <Input value={form.date} onChange={(e) => sf("date", e.target.value)} className="h-9 text-sm" />
          </div>
          <div>
            <Label className="mb-1 block text-xs text-muted">Blood Pressure</Label>
            <Input value={form.bloodPressure ?? ""} onChange={(e) => sf("bloodPressure", e.target.value)} placeholder="120/80 mmHg" className="h-9 text-sm" />
          </div>
          <div>
            <Label className="mb-1 block text-xs text-muted">Blood Sugar (mg/dL)</Label>
            <Input type="number" value={form.bloodSugar ?? ""} onChange={(e) => sf("bloodSugar", num(e.target.value))} placeholder="100" className="h-9 text-sm" />
          </div>
          <div>
            <Label className="mb-1 block text-xs text-muted">Weight (lbs)</Label>
            <Input type="number" value={form.weight ?? ""} onChange={(e) => sf("weight", num(e.target.value))} placeholder="150" className="h-9 text-sm" />
          </div>
          <div>
            <Label className="mb-1 block text-xs text-muted">Heart Rate (bpm)</Label>
            <Input type="number" value={form.heartRate ?? ""} onChange={(e) => sf("heartRate", num(e.target.value))} placeholder="72" className="h-9 text-sm" />
          </div>
          <div>
            <Label className="mb-1 block text-xs text-muted">Oxygen Sat. (%)</Label>
            <Input type="number" min={0} max={100} value={form.oxygenSaturation ?? ""} onChange={(e) => sf("oxygenSaturation", num(e.target.value))} placeholder="98" className="h-9 text-sm" />
          </div>
          <div>
            <Label className="mb-1 block text-xs text-muted">Temperature (°F)</Label>
            <Input type="number" step="0.1" value={form.temperature ?? ""} onChange={(e) => sf("temperature", num(e.target.value))} placeholder="98.6" className="h-9 text-sm" />
          </div>
          <div className="col-span-2">
            <Label className="mb-1 block text-xs text-muted">Observations / Context</Label>
            <Textarea value={form.notes ?? ""} onChange={(e) => sf("notes", e.target.value)} placeholder="Any notes or context for this reading…" rows={2} className="text-sm resize-none" />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="h-9 rounded-lg border border-border-strong px-4 text-xs text-muted hover:text-fg">
            Cancel
          </button>
          <button onClick={handleSave} className="h-9 rounded-lg bg-teal px-4 text-xs font-medium text-bg hover:bg-teal/90">
            Save Entry
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg bg-surface-2 px-3 py-2">
      <span className="qb-mono text-[10px] uppercase tracking-widest text-muted shrink-0">{label}</span>
      <span className="text-xs text-right break-all">{value || "—"}</span>
    </div>
  );
}

function TagsRow({ label, tags, accent }: { label: string; tags: string[]; accent: string }) {
  return (
    <div className="rounded-lg bg-surface-2 px-3 py-2">
      <div className="qb-mono text-[10px] uppercase tracking-widest text-muted mb-1.5">{label}</div>
      {tags.length === 0 ? (
        <span className="text-xs text-muted">None recorded</span>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span key={t} className={`qb-chip border-${accent}/40 text-${accent}`}>{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function MiniMetric({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="text-center">
      <div className="qb-mono text-[9px] uppercase tracking-widest text-muted">{label}</div>
      <div className="text-xs font-semibold text-teal">{value}</div>
      <div className="qb-mono text-[9px] text-muted">{unit}</div>
    </div>
  );
}

// ── MemberCard ────────────────────────────────────────────────────────────────

function MemberCard({
  member,
  isSelf,
  selected,
  onClick,
}: {
  member: FamilyMember;
  isSelf?: boolean;
  selected: boolean;
  onClick: () => void;
}) {
  const sc = STATUS_CFG[member.wellbeingStatus];

  // pick up to 3 most relevant metrics from latest entry
  const latest = member.metrics[0];
  const miniMetrics: { label: string; value: string; unit: string }[] = [];
  if (latest) {
    if (latest.bloodPressure) miniMetrics.push({ label: "BP", value: latest.bloodPressure, unit: "mmHg" });
    if (latest.heartRate) miniMetrics.push({ label: "HR", value: String(latest.heartRate), unit: "bpm" });
    if (latest.bloodSugar) miniMetrics.push({ label: "Sugar", value: String(latest.bloodSugar), unit: "mg/dL" });
    if (latest.oxygenSaturation && miniMetrics.length < 3) miniMetrics.push({ label: "SpO₂", value: String(latest.oxygenSaturation), unit: "%" });
    if (latest.weight && miniMetrics.length < 3) miniMetrics.push({ label: "Wt", value: String(latest.weight), unit: "lbs" });
  }
  const shownMetrics = miniMetrics.slice(0, 3);

  return (
    <button
      onClick={onClick}
      className={`qb-card qb-card-hover text-left w-full transition-all ${
        selected
          ? "ring-2 ring-teal/60 border-teal/40 bg-teal-soft/15 shadow-lg shadow-teal/10"
          : "hover:border-border-strong"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl overflow-hidden ${isSelf ? "bg-teal-soft" : "bg-violet-soft text-2xl"}`}>
          {member.photo ? (
            <img src={member.photo} alt={member.fullName} className="h-full w-full object-cover" />
          ) : isSelf ? (
            <span className="qb-display text-sm font-semibold text-teal">{initials(member.fullName)}</span>
          ) : (
            RELATIONSHIP_ICON[member.relationship]
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="qb-display text-sm font-semibold truncate">{member.fullName}</span>
            {isSelf && <span className="qb-chip border-teal/40 bg-teal-soft text-teal">You</span>}
            <span className={`qb-chip ${sc.chip}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${sc.dot} ${sc.pulse ? "qb-pulse" : ""}`} />
              {member.wellbeingStatus}
            </span>
          </div>
          <p className="text-[11px] text-muted mt-0.5">
            {isSelf ? `Self · ${member.age} yrs · ${member.gender}` : `${member.relationship} · ${member.age} yrs · ${member.gender}`}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-3 qb-mono text-[9px] text-muted">
            <span>🩸 {member.bloodGroup}</span>
            {member.conditions.length > 0 && (
              <span>
                ⚕ {member.conditions[0]}
                {member.conditions.length > 1 ? ` +${member.conditions.length - 1}` : ""}
              </span>
            )}
            <span><FileText className="inline h-2.5 w-2.5 mr-0.5" />{member.reportsCount} reports</span>
          </div>
          <p className="mt-1 qb-mono text-[9px] text-muted">Updated {member.lastUpdated}</p>
        </div>
      </div>

      <div className="mt-3 min-h-[78px] border-t border-border-soft pt-3">
        {shownMetrics.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {shownMetrics.map((m) => (
              <MiniMetric key={m.label} label={m.label} value={m.value} unit={m.unit} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <MiniMetric label="BP" value="—" unit="mmHg" />
            <MiniMetric label="HR" value="—" unit="bpm" />
            <MiniMetric label="SpO₂" value="—" unit="%" />
          </div>
        )}
      </div>
    </button>
  );
}

// ── MemberDetail ──────────────────────────────────────────────────────────────

const METRIC_COLS = [
  { key: "date",              label: "Date",       unit: ""      },
  { key: "bloodPressure",     label: "BP",         unit: "mmHg"  },
  { key: "bloodSugar",        label: "Blood Sugar",unit: "mg/dL" },
  { key: "weight",            label: "Weight",     unit: "lbs"   },
  { key: "heartRate",         label: "HR",         unit: "bpm"   },
  { key: "oxygenSaturation",  label: "SpO₂",       unit: "%"     },
  { key: "temperature",       label: "Temp",       unit: "°F"    },
] as const;

function MemberDetail({
  member,
  isSelf,
  onEdit,
  onDelete,
  onAddMetric,
}: {
  member: FamilyMember;
  isSelf?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onAddMetric: (m: MetricEntry) => void;
}) {
  const [symptomsHistory, setSymptomsHistory] = useState<SymptomsLog[]>([]);
  const [wellbeingHistory, setWellbeingHistory] = useState<GeneralWellbeingLog[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return `${d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })} ${d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  };

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    const [symptoms, wellbeing] = await Promise.all([
      listSymptomsLogs(member.id),
      listGeneralWellbeingLogs(member.id),
    ]);
    setSymptomsHistory(symptoms);
    setWellbeingHistory(wellbeing);
    setIsLoadingHistory(false);
  };

  useEffect(() => {
    void loadHistory();
  }, [member.id]);


  const sc = STATUS_CFG[member.wellbeingStatus];
  const { setSelectedMember } = useFamilyContext();
  const navigate = useNavigate();
  const memberReports = initialReports.filter((r) =>
    isSelf ? r.ownerType === "PATIENT" : (r.ownerType === "FAMILY_MEMBER" && r.ownerId === member.id),
  );

  return (
    <motion.div
      key={member.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="qb-card"
    >
      {/* Header */}
      <div className="flex flex-wrap items-start gap-4 mb-5">
        <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl overflow-hidden ${isSelf ? "bg-teal-soft" : "bg-violet-soft text-3xl"}`}>
          {member.photo ? (
            <img src={member.photo} alt={member.fullName} className="h-full w-full object-cover" />
          ) : isSelf ? (
            <span className="qb-display text-base font-semibold text-teal">{initials(member.fullName)}</span>
          ) : (
            RELATIONSHIP_ICON[member.relationship]
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="qb-display text-lg font-semibold">{member.fullName}</h2>
            {isSelf && <span className="qb-chip border-teal/40 bg-teal-soft text-teal">Self</span>}
            <span className={`qb-chip ${sc.chip}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${sc.dot} ${sc.pulse ? "qb-pulse" : ""}`} />
              {member.wellbeingStatus}
            </span>
          </div>
          <p className="text-sm text-muted mt-0.5">
            {isSelf
              ? `Self · ${member.age} yrs · ${member.gender} · Blood Group ${member.bloodGroup}`
              : `${member.relationship} · ${member.age} yrs · ${member.gender} · Blood Group ${member.bloodGroup}`}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={onEdit}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-border-strong px-3 text-xs text-muted hover:text-fg"
          >
            <Pencil className="h-3 w-3" /> Edit
          </button>
          {!isSelf && (
            <button
              onClick={onDelete}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-rose/30 px-3 text-xs text-rose hover:bg-rose-soft"
            >
              <Trash2 className="h-3 w-3" /> Remove
            </button>
          )}
        </div>
      </div>



      {/* Tabs */}
      <Tabs defaultValue="overview">
        <div className="overflow-x-auto qb-scroll mb-5">
          <TabsList className="h-9 bg-surface-2">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="metrics" className="text-xs">
              Metrics
              {member.metrics.length > 0 && (
                <span className="ml-1.5 rounded-full bg-teal-soft px-1.5 py-0.5 qb-mono text-[9px] text-teal">
                  {member.metrics.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="reports" className="text-xs">
              Reports
              {memberReports.length > 0 && (
                <span className="ml-1.5 rounded-full bg-violet-soft px-1.5 py-0.5 qb-mono text-[9px] text-violet">
                  {memberReports.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="devices" className="text-xs">Devices</TabsTrigger>
            <TabsTrigger value="notes" className="text-xs">Notes</TabsTrigger>
          </TabsList>
        </div>

        {/* ── OVERVIEW ── */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Personal */}
            <div className="space-y-2">
              <p className="qb-mono text-[10px] uppercase tracking-widest text-muted mb-1">Personal</p>
              <InfoRow label="Phone" value={member.phone} />
              <InfoRow label="Email" value={member.email} />
              <InfoRow label="Emergency Contact" value={member.emergencyContact} />
              <InfoRow label="Reports Uploaded" value={`${member.reportsCount}`} />
              <InfoRow label="Last Updated" value={member.lastUpdated} />
            </div>

            {/* Health summary */}
            <div className="space-y-2">
              <p className="qb-mono text-[10px] uppercase tracking-widest text-muted mb-1">Health Summary</p>
              <TagsRow label="Medical Conditions" tags={member.conditions} accent="rose" />
              <TagsRow label="Allergies" tags={member.allergies} accent="amber" />
              <TagsRow label="Current Medications" tags={member.medications} accent="sky" />
            </div>
          </div>
        </TabsContent>

        {/* ── METRICS ── */}
        <TabsContent value="metrics">
          <p className="qb-mono text-[10px] uppercase tracking-widest text-muted mb-4">
            Health Metrics History · {member.metrics.length} {member.metrics.length === 1 ? "entry" : "entries"}
          </p>

          {member.metrics.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <Activity className="h-10 w-10 text-muted opacity-25" />
              <p className="text-sm text-muted">No metrics logged yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto qb-scroll rounded-lg border border-border-soft">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border-soft bg-surface-2">
                    {METRIC_COLS.map((c) => (
                      <th
                        key={c.key}
                        className="px-3 py-2.5 text-left qb-mono text-[9px] uppercase tracking-widest text-muted whitespace-nowrap"
                      >
                        {c.label}{c.unit ? ` (${c.unit})` : ""}
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-left qb-mono text-[9px] uppercase tracking-widest text-muted">
                      Observations
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {member.metrics.map((entry, i) => (
                    <tr
                      key={entry.id}
                      className={`border-b border-border-soft/50 hover:bg-surface-2/60 ${i === 0 ? "bg-teal-soft/20" : ""}`}
                    >
                      <td className="px-3 py-2.5 qb-mono text-muted whitespace-nowrap">{entry.date}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">{entry.bloodPressure || "—"}</td>
                      <td className="px-3 py-2.5">{entry.bloodSugar ?? "—"}</td>
                      <td className="px-3 py-2.5">{entry.weight ?? "—"}</td>
                      <td className="px-3 py-2.5">{entry.heartRate ?? "—"}</td>
                      <td className="px-3 py-2.5">{entry.oxygenSaturation ?? "—"}</td>
                      <td className="px-3 py-2.5">{entry.temperature ?? "—"}</td>
                      <td className="px-3 py-2.5 text-muted max-w-[200px] truncate">{entry.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ── NOTES ── */}
        <TabsContent value="notes">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <h3 className="qb-display text-sm font-semibold mb-3">Symptoms Log</h3>
              <div className="rounded-lg border border-border-soft bg-surface-2 p-3">
                <p className="qb-mono text-[10px] uppercase tracking-widest text-muted mb-3">History</p>
                <div className="space-y-3">
                  {isLoadingHistory ? (
                    <p className="text-xs text-muted">Loading history...</p>
                  ) : symptomsHistory.length === 0 ? (
                    <p className="text-xs text-muted">No symptoms logged yet.</p>
                  ) : (
                    symptomsHistory.map((item) => (
                      <div key={item.id} className="border-b border-border-soft pb-3 last:border-b-0 last:pb-0">
                        <p className="text-xs font-medium">{formatDateTime(item.createdAt)}</p>
                        <p className="text-[11px] text-muted mt-0.5">{item.createdBy || "Unknown User"}</p>
                        <p className="text-xs mt-1 whitespace-pre-wrap">{item.note}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div>
              <h3 className="qb-display text-sm font-semibold mb-3">Wellbeing Log</h3>
              <div className="rounded-lg border border-border-soft bg-surface-2 p-3">
                <p className="qb-mono text-[10px] uppercase tracking-widest text-muted mb-3">History</p>
                <div className="space-y-3">
                  {isLoadingHistory ? (
                    <p className="text-xs text-muted">Loading history...</p>
                  ) : wellbeingHistory.length === 0 ? (
                    <p className="text-xs text-muted">No wellbeing notes logged yet.</p>
                  ) : (
                    wellbeingHistory.map((item) => (
                      <div key={item.id} className="border-b border-border-soft pb-3 last:border-b-0 last:pb-0">
                        <p className="text-xs font-medium">{formatDateTime(item.createdAt)}</p>
                        <p className="text-[11px] text-muted mt-0.5">{item.createdBy || "Unknown User"}</p>
                        <p className="text-xs mt-1 whitespace-pre-wrap">{item.note}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── REPORTS ── */}
        <TabsContent value="reports">
          {memberReports.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <FileText className="h-10 w-10 text-muted opacity-25" />
              <p className="text-sm text-muted">No reports uploaded for {member.fullName}.</p>

            </div>
          ) : (
            <div className="space-y-1.5">
              {memberReports.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 rounded-lg border border-border-soft bg-surface-2 px-3 py-2.5 hover:bg-surface-3 transition-colors"
                >
                  <span className="text-xl shrink-0">
                    {REPORT_CATEGORY_EMOJI[r.reportCategory] ?? "\ud83d\udcc4"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{r.reportName}</div>
                    <div className="qb-mono text-[10px] text-muted">
                      {r.reportCategory} · {r.reportDate}
                    </div>
                  </div>
                  <span className="qb-mono text-[10px] text-muted shrink-0 hidden sm:block">
                    {r.healthcareFacility || "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── DEVICES ── */}
        <TabsContent value="devices">
          {isSelf ? (
            <div className="space-y-4">
              <div>
                <h2 className="qb-display text-lg font-semibold">Connected Devices</h2>
                <p className="text-xs text-muted">
                  {devicesData.length} sources streaming into Quest Beyond.
                </p>
              </div>

              {devicesData.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <Cpu className="h-10 w-10 text-muted opacity-25" />
                  <p className="text-sm text-muted">No devices connected yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {devicesData.map((d) => (
                    <DeviceCardDisplay key={d.id} device={d} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <Cpu className="h-10 w-10 text-muted opacity-25" />
              <h3 className="font-semibold text-sm">No Devices Linked</h3>
              <p className="text-xs text-muted max-w-xs">
                Medical devices and sensors are linked to the primary patient account. Device sharing across family members is coming soon.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function Family() {
  const { members, setMembers, setSelectedMember } = useFamilyContext();
  const [selfProfile, setSelfProfile] = useState<FamilyMember>(() => ({
    id: SELF_MEMBER_ID,
    fullName: patient.name,
    relationship: "Other",
    age: patient.age,
    gender: "Female",
    bloodGroup: "O+",
    phone: "+1 (555) 912-3456",
    email: "sarah.martinez@email.com",
    emergencyContact: "Carlos Martinez · +1 (555) 234-5678",
    conditions: [patient.condition],
    allergies: [],
    medications: ["Metformin 500mg"],
    healthNotes: "Primary patient context. Continue routine monitoring and care plan follow-up.",
    wellbeingNotes: "Symptoms and device trends are monitored continuously via connected sources.",
    metrics: [],
    wellbeingStatus: "Alert",
    lastUpdated: "just now",
    reportsCount: initialReports.filter((r) => r.ownerType === "PATIENT").length,
  }));
  const [selectedId, setSelectedId] = useState<string | null>(SELF_MEMBER_ID);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);

  const visibleMembers = useMemo(() => [selfProfile, ...members], [selfProfile, members]);

  const selected = visibleMembers.find((m) => m.id === selectedId) ?? null;
  const isSelectedSelf = selected?.id === SELF_MEMBER_ID;

  // Sync local card selection with global FamilyContext so that Source Data,
  // Reports, and Genie automatically scope to the chosen family member.
  const selectMember = (id: string | null) => {
    setSelectedId(id);
    const m = id && id !== SELF_MEMBER_ID ? members.find((x) => x.id === id) ?? null : null;
    setSelectedMember(m);
  };

  const openAdd = () => { setEditingMember(null); setSheetOpen(true); };
  const openEdit = (m: FamilyMember) => { setEditingMember(m); setSheetOpen(true); };

  const saveMember = (m: FamilyMember) => {
    if (m.id === SELF_MEMBER_ID) {
      setSelfProfile(m);
      return;
    }
    setMembers((prev) => {
      const idx = prev.findIndex((x) => x.id === m.id);
      return idx >= 0 ? prev.map((x) => (x.id === m.id ? m : x)) : [...prev, m];
    });
    selectMember(m.id);
  };

  const deleteMember = (id: string) => {
    const remaining = members.filter((m) => m.id !== id);
    setMembers(remaining);
    if (selectedId === id) {
      selectMember(SELF_MEMBER_ID);
    }
  };

  const addMetric = (memberId: string, metric: MetricEntry) => {
    if (memberId === SELF_MEMBER_ID) {
      setSelfProfile((prev) => ({
        ...prev,
        metrics: [metric, ...prev.metrics],
        lastUpdated: "just now",
      }));
      return;
    }
    setMembers((prev) =>
      prev.map((m) =>
        m.id === memberId
          ? { ...m, metrics: [metric, ...m.metrics], lastUpdated: "just now" }
          : m,
      ),
    );
  };

  const goodCount = visibleMembers.filter((m) => m.wellbeingStatus === "Good").length;
  const monitorCount = visibleMembers.filter((m) => m.wellbeingStatus === "Monitor").length;
  const alertCount = visibleMembers.filter((m) => m.wellbeingStatus === "Alert").length;
  const totalMetrics = visibleMembers.reduce((acc, m) => acc + m.metrics.length, 0);

  return (
    <Layout>
      <div className="space-y-4">
        {/* Stats bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="qb-card flex-1 min-w-[140px] py-3 px-4">
            <div className="qb-mono text-[10px] uppercase tracking-widest text-muted mb-1">Members</div>
            <div className="flex items-end gap-2">
              <span className="qb-display text-2xl font-bold">{visibleMembers.length}</span>
              <span className="text-xs text-muted mb-0.5">tracked</span>
            </div>
          </div>
          <div className="qb-card flex-1 min-w-[100px] py-3 px-4">
            <div className="qb-mono text-[10px] uppercase tracking-widest text-lime mb-1">Good</div>
            <div className="qb-display text-2xl font-bold text-lime">{goodCount}</div>
          </div>
          <div className="qb-card flex-1 min-w-[100px] py-3 px-4">
            <div className="qb-mono text-[10px] uppercase tracking-widest text-amber mb-1">Monitor</div>
            <div className="qb-display text-2xl font-bold text-amber">{monitorCount}</div>
          </div>
          <div className="qb-card flex-1 min-w-[100px] py-3 px-4">
            <div className="qb-mono text-[10px] uppercase tracking-widest text-rose mb-1">Alert</div>
            <div className="qb-display text-2xl font-bold text-rose">{alertCount}</div>
          </div>
          <div className="qb-card flex-1 min-w-[120px] py-3 px-4">
            <div className="qb-mono text-[10px] uppercase tracking-widest text-sky mb-1">Metric Logs</div>
            <div className="qb-display text-2xl font-bold text-sky">{totalMetrics}</div>
          </div>
          <button
            onClick={openAdd}
            className="flex h-10 items-center gap-2 rounded-xl bg-teal px-4 text-xs font-medium text-bg hover:bg-teal/90 shrink-0"
          >
            <UserPlus className="h-4 w-4" /> Add Member
          </button>
        </div>

        {/* Member cards grid */}
        {visibleMembers.length === 0 ? (
          <div className="qb-card flex flex-col items-center gap-3 py-16 text-center">
            <Users className="h-12 w-12 text-muted opacity-25" />
            <h3 className="qb-display text-base font-semibold">No family members yet</h3>
            <p className="text-sm text-muted max-w-sm">
              Add family members to track their health information, log metrics, and keep notes in one place.
            </p>
            <button
              onClick={openAdd}
              className="mt-2 flex h-10 items-center gap-2 rounded-xl bg-teal px-5 text-xs font-medium text-bg hover:bg-teal/90"
            >
              <UserPlus className="h-4 w-4" /> Add First Family Member
            </button>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 sm:overflow-visible sm:pb-0 sm:grid sm:grid-cols-2 lg:grid-cols-3">
            {visibleMembers.map((m) => (
              <div key={m.id} className="w-[272px] shrink-0 sm:w-auto sm:shrink">
                <MemberCard
                  member={m}
                  isSelf={m.id === SELF_MEMBER_ID}
                  selected={m.id === selectedId}
                  onClick={() => selectMember(selectedId === m.id ? null : m.id)}
                />
              </div>
            ))}
          </div>
        )}

        {/* Detail panel */}
        {selected && (
          <div className="flex items-center gap-2 px-1">
            <span className="qb-mono text-[10px] uppercase tracking-widest text-muted">Viewing</span>
            <span className="text-sm font-semibold text-violet">{selected.fullName}</span>
            <span className="text-xs text-muted">· {isSelectedSelf ? "Self" : selected.relationship}</span>
          </div>
        )}
        <AnimatePresence mode="wait">
          {selected && (
            <MemberDetail
              key={selected.id}
              member={selected}
              isSelf={isSelectedSelf}
              onEdit={() => openEdit(selected)}
              onDelete={() => deleteMember(selected.id)}
              onAddMetric={(metric) => addMetric(selected.id, metric)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Add / Edit sheet */}
      <MemberSheet
        key={sheetOpen ? (editingMember?.id ?? "new") : "closed"}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSave={saveMember}
        initial={editingMember}
      />
    </Layout>
  );
}
