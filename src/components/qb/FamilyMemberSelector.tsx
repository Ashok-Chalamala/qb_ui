import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, UserPlus, Camera, X } from "lucide-react";
import { useFamilyContext } from "@/lib/family-context";
import { patient } from "@/lib/qb-data";
import type { BloodGroup, FamilyMember, Gender, Relationship, WellbeingStatus } from "@/lib/qb-data";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// ── Helpers ───────────────────────────────────────────────────────────────────

const RELATIONSHIP_ICON: Record<string, string> = {
  Father: "👨", Mother: "👩", Spouse: "💑", Son: "👦",
  Daughter: "👧", Sibling: "🧑", Guardian: "🛡️", Other: "👤",
};

const RELATIONSHIPS: Relationship[] = [
  "Father", "Mother", "Spouse", "Son", "Daughter", "Sibling", "Guardian", "Other",
];
const GENDERS: Gender[] = ["Male", "Female", "Non-binary", "Prefer not to say"];
const BLOOD_GROUPS: BloodGroup[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

// ── Sub-components ────────────────────────────────────────────────────────────

function OptionRow({
  avatar,
  avatarBg,
  label,
  sub,
  active,
  activeColor,
  onClick,
}: {
  avatar: React.ReactNode;
  avatarBg: string;
  label: string;
  sub: string;
  active: boolean;
  activeColor: "teal" | "violet";
  onClick: () => void;
}) {
  const activeCls =
    activeColor === "teal"
      ? "bg-teal-soft/70 text-teal"
      : "bg-violet-soft/70 text-violet";

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
        active ? activeCls : "text-fg hover:bg-surface-2"
      }`}
    >
      <div
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${avatarBg}`}
      >
        {avatar}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium leading-snug">{label}</div>
        <div className="qb-mono truncate text-[10px] text-muted">{sub}</div>
      </div>
      {active && (
        <Check
          className={`h-3.5 w-3.5 shrink-0 ${
            activeColor === "teal" ? "text-teal" : "text-violet"
          }`}
        />
      )}
    </button>
  );
}

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

// ── FamilyMemberSelector ──────────────────────────────────────────────────────

export function FamilyMemberSelector() {
  const { members, setMembers, selectedMember, setSelectedMember } = useFamilyContext();
  const [open, setOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    relationship: "Other" as Relationship,
    age: 0,
    gender: "Prefer not to say" as Gender,
    bloodGroup: "O+" as BloodGroup,
    wellbeingStatus: "Good" as WellbeingStatus,
    phone: "",
    email: "",
    emergencyContact: "",
    conditions: [] as string[],
    allergies: [] as string[],
    medications: [] as string[],
    healthNotes: "",
    wellbeingNotes: "",
    photo: undefined as string | undefined,
  });
  const ref = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const isPatient = selectedMember === null;
  const displayName = isPatient ? patient.name : (selectedMember as FamilyMember).fullName;
  const displaySub = isPatient
    ? `${patient.age} · ${patient.condition}`
    : `${(selectedMember as FamilyMember).relationship} · Age ${(selectedMember as FamilyMember).age}`;
  const avatarBg = isPatient ? "bg-teal-soft text-teal" : "bg-lime-soft text-lime";

  const resetForm = () => {
    setForm({
      fullName: "",
      relationship: "Other",
      age: 0,
      gender: "Prefer not to say",
      bloodGroup: "O+",
      wellbeingStatus: "Good",
      phone: "",
      email: "",
      emergencyContact: "",
      conditions: [],
      allergies: [],
      medications: [],
      healthNotes: "",
      wellbeingNotes: "",
      photo: undefined,
    });
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      alert("Only JPG, PNG, or WebP images are allowed.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("Photo must be under 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm((p) => ({ ...p, photo: reader.result as string }));
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const sf = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const addMember = () => {
    if (!form.fullName.trim()) return;
    const next: FamilyMember = {
      id: `fm${Date.now()}`,
      fullName: form.fullName.trim(),
      relationship: form.relationship,
      age: form.age,
      gender: form.gender,
      bloodGroup: form.bloodGroup,
      phone: form.phone,
      email: form.email,
      emergencyContact: form.emergencyContact,
      conditions: form.conditions,
      allergies: form.allergies,
      medications: form.medications,
      healthNotes: form.healthNotes,
      wellbeingNotes: form.wellbeingNotes,
      metrics: [],
      wellbeingStatus: form.wellbeingStatus,
      lastUpdated: "just now",
      reportsCount: 0,
      photo: form.photo,
    };
    setMembers((prev) => [...prev, next]);
    setSelectedMember(next);
    setAddOpen(false);
    setOpen(false);
    resetForm();
  };

  return (
    <div ref={ref} className="relative hidden md:block">
      {/* Trigger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-border-strong bg-surface-2 py-1.5 pl-1.5 pr-3 transition-colors hover:border-teal/30"
      >
        <div
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-full overflow-hidden qb-display text-xs font-semibold ${avatarBg}`}
        >
          {!isPatient && (selectedMember as FamilyMember).photo ? (
            <img
              src={(selectedMember as FamilyMember).photo}
              alt={(selectedMember as FamilyMember).fullName}
              className="h-full w-full object-cover"
            />
          ) : (
            initials(displayName)
          )}
        </div>
        <div className="min-w-0 text-left">
          <div className="text-xs font-medium leading-tight">{displayName}</div>
          <div className="qb-mono text-[10px] leading-tight text-muted">{displaySub}</div>
        </div>
        <ChevronDown
          className={`ml-1 h-3.5 w-3.5 shrink-0 text-muted transition-transform duration-150 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[272px] overflow-hidden rounded-xl border border-border-soft bg-surface shadow-2xl">
          {/* Primary patient section */}
          <div className="px-3 pt-3 pb-2">
            <p className="qb-mono mb-1.5 text-[9px] uppercase tracking-widest text-muted">
              Primary Patient
            </p>
            <OptionRow
              avatar={
                <span className="qb-display text-xs font-semibold text-teal">
                  {initials(patient.name)}
                </span>
              }
              avatarBg="bg-teal-soft"
              label={patient.name}
              sub={`${patient.condition} · MRN ${patient.mrn}`}
              active={isPatient}
              activeColor="teal"
              onClick={() => {
                setSelectedMember(null);
                setOpen(false);
              }}
            />
          </div>

          {/* Family members section */}
          {members.length > 0 && (
            <div className="border-t border-border-soft px-3 pb-3 pt-2">
              <p className="qb-mono mb-1.5 text-[9px] uppercase tracking-widest text-muted">
                Family Members
              </p>
              <div className="space-y-0.5">
                {members.map((m) => {
                  const active = selectedMember?.id === m.id;
                  const emoji = RELATIONSHIP_ICON[m.relationship] ?? "👤";
                  return (
                    <OptionRow
                      key={m.id}
                      avatar={
                        m.photo ? (
                          <img src={m.photo} alt={m.fullName} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-base leading-none">{emoji}</span>
                        )
                      }
                      avatarBg={active ? "bg-violet-soft" : "bg-surface-3"}
                      label={m.fullName}
                      sub={`${m.relationship} · Age ${m.age}`}
                      active={active}
                      activeColor="violet"
                      onClick={() => {
                        setSelectedMember(m);
                        setOpen(false);
                      }}
                    />
                  );
                })}
              </div>

              <button
                onClick={() => setAddOpen(true)}
                className="mt-2 flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-teal/30 bg-teal-soft/40 text-xs font-medium text-teal transition-colors hover:bg-teal-soft"
              >
                <UserPlus className="h-3.5 w-3.5" /> Add Family Member
              </button>
            </div>
          )}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={(o) => { if (!o) resetForm(); setAddOpen(o); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px] bg-surface border-border-soft">
          <DialogHeader>
            <DialogTitle className="qb-display text-base">Add Family Member</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Photo */}
            <section>
              <p className="qb-mono text-[10px] uppercase tracking-widest text-muted mb-3">Profile Photo <span className="normal-case">(optional)</span></p>
              <div className="flex items-center gap-4">
                <div className="relative grid h-16 w-16 shrink-0 place-items-center rounded-2xl overflow-hidden border border-border-soft bg-surface-2">
                  {form.photo ? (
                    <img src={form.photo} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <span className="qb-display text-lg font-bold text-muted">
                      {form.fullName ? form.fullName.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase() : "?"}
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
                  <Textarea value={form.healthNotes} onChange={(e) => sf("healthNotes", e.target.value)} placeholder="Any health-related observations or concerns…" rows={2} className="text-sm resize-none" />
                </div>
                <div>
                  <Label className="mb-1 block text-xs text-muted">Wellbeing Notes</Label>
                  <Textarea value={form.wellbeingNotes} onChange={(e) => sf("wellbeingNotes", e.target.value)} placeholder="General wellbeing, mood, activity level…" rows={2} className="text-sm resize-none" />
                </div>
              </div>
            </section>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button
              onClick={() => { setAddOpen(false); resetForm(); }}
              className="h-9 rounded-lg border border-border-strong px-4 text-xs text-muted hover:text-fg"
            >
              Cancel
            </button>
            <button
              onClick={addMember}
              disabled={!form.fullName.trim()}
              className="h-9 rounded-lg bg-teal px-4 text-xs font-medium text-bg hover:bg-teal/90 disabled:opacity-40"
            >
              Add Member
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
