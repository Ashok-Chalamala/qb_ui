import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { useFamilyContext } from "@/lib/family-context";
import { patient } from "@/lib/qb-data";
import type { FamilyMember } from "@/lib/qb-data";

// ── Helpers ───────────────────────────────────────────────────────────────────

const RELATIONSHIP_ICON: Record<string, string> = {
  Father: "👨", Mother: "👩", Spouse: "💑", Son: "👦",
  Daughter: "👧", Sibling: "🧑", Guardian: "🛡️", Other: "👤",
};

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

// ── FamilyMemberSelector ──────────────────────────────────────────────────────

export function FamilyMemberSelector() {
  const { members, selectedMember, setSelectedMember } = useFamilyContext();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  return (
    <div ref={ref} className="relative hidden md:block">
      {/* Trigger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-border-strong bg-surface-2 py-1.5 pl-1.5 pr-3 transition-colors hover:border-teal/30"
      >
        <div
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-full qb-display text-xs font-semibold ${avatarBg}`}
        >
          {initials(displayName)}
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
                        <span className="text-base leading-none">{emoji}</span>
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}
