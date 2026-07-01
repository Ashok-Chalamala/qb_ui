import { Clock, ShieldAlert, ShieldCheck, ShieldEllipsis } from "lucide-react";
import { useFamilyContext } from "@/lib/family-context";
import { patient } from "@/lib/qb-data";
import type { WellbeingStatus } from "@/lib/qb-data";

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  WellbeingStatus,
  { label: string; cls: string; Icon: typeof ShieldCheck }
> = {
  Good:    { label: "Stable",    cls: "text-lime   bg-lime-soft   border-lime/30",  Icon: ShieldCheck },
  Monitor: { label: "Monitor",   cls: "text-amber  bg-amber-soft  border-amber/30", Icon: ShieldEllipsis },
  Alert:   { label: "High Risk", cls: "text-rose   bg-rose-soft   border-rose/30",  Icon: ShieldAlert },
};

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

// ── PatientContextHeader ──────────────────────────────────────────────────────

export function PatientContextHeader() {
  const { selectedMember } = useFamilyContext();

  const isPatient = selectedMember === null;

  const name      = isPatient ? patient.name      : selectedMember.fullName;
  const age       = isPatient ? patient.age        : selectedMember.age;
  const condition = isPatient
    ? patient.condition
    : selectedMember.conditions.slice(0, 2).join(" · ");
  const identifier  = isPatient ? `MRN ${patient.mrn}` : `FM-${selectedMember.id.toUpperCase()}`;
  const lastUpdated = isPatient ? "Live · 2 min ago"   : `Updated ${selectedMember.lastUpdated}`;

  // Map to WellbeingStatus — primary patient is flagged High/Alert
  const wellbeing: WellbeingStatus = isPatient
    ? "Alert"
    : selectedMember.wellbeingStatus;

  const status  = STATUS_CONFIG[wellbeing];
  const { Icon } = status;

  const avatarBg = isPatient ? "bg-teal-soft text-teal" : "bg-surface-3 text-muted";

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3 border-b border-border-soft bg-surface px-3 sm:px-6 py-2 sm:py-2.5">
      {/* Avatar + identity */}
      <div className="flex items-center gap-2.5">
        <div
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold ${avatarBg}`}
        >
          {initials(name)}
        </div>
        <div>
          <div className="text-sm font-semibold leading-tight text-fg">{name}</div>
          <div className="qb-mono text-[10px] text-muted">{identifier}</div>
        </div>
      </div>

      <div className="hidden h-4 w-px bg-border-strong sm:block" />

      {/* Demographics */}
      <div className="text-xs text-muted">
        <span className="font-medium text-fg">Age {age}</span>
      </div>

      {/* Condition(s) */}
      {condition && (
        <div className="hidden max-w-[260px] truncate text-xs text-muted sm:block">
          {condition}
        </div>
      )}

      <div className="hidden h-4 w-px bg-border-strong sm:block" />

      {/* Wellbeing status badge */}
      <div
        className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${status.cls}`}
      >
        <Icon className="h-3 w-3" />
        {status.label}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Last updated */}
      <div className="flex items-center gap-1.5 text-xs text-muted">
        <Clock className="h-3.5 w-3.5 shrink-0" />
        <span>{lastUpdated}</span>
      </div>
    </div>
  );
}
