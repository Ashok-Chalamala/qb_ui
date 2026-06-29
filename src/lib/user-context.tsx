// ─────────────────────────────────────────────────────────────────────────────
// Global User View Context
//
// Wraps FamilyContext and exposes a single unified API for all data filtering.
//
// Rules:
//   contextType = "SELF"   → Primary patient (Sarah Martinez, patient-00429)
//                            All integrations, all configs, all logs are visible.
//   contextType = "FAMILY" → A specific family member is selected.
//                            Data is strictly isolated to that subject_id only.
//
// All API calls should attach `contextHeaders` to enforce row-level filtering
// on the backend:
//   X-User-Context-Type: "SELF" | "FAMILY"
//   X-Subject-Id:        patient_id | family_member_id
//
// Example SQL (backend):
//   IF context = SELF:
//     WHERE patient_id = $userId OR family_member_id IN (linked members)
//   IF context = FAMILY:
//     WHERE family_member_id = $subjectId
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useFamilyContext } from "@/lib/family-context";
import { patient } from "@/lib/qb-data";
import { shareableFamilyMembers } from "@/lib/consent-data";

// ── Types ─────────────────────────────────────────────────────────────────────

export type UserContextType = "SELF" | "FAMILY";

export interface UserContextHeaders {
  "X-User-Context-Type": UserContextType;
  "X-Subject-Id": string;
}

export interface UserContextValue {
  /** "SELF" = primary patient   "FAMILY" = specific family member */
  contextType: UserContextType;

  /** "patient-00429" for self, "fm1"/"fm2"/"fm3" etc. for family members */
  contextSubjectId: string;

  /** Human-readable full name of the active subject */
  contextSubjectName: string;

  /** Relationship to primary patient, null when type is SELF */
  contextRelationship: string | null;

  /** True when a family member is active */
  isFamilyView: boolean;

  /** Full label for display in topbar/banners */
  viewingLabel: string;

  /** Whether the selected family member is a minor (requires guardian consent) */
  isMinorContext: boolean;

  /**
   * Ready-to-attach request headers for every API call.
   * Example:
   *   fetch(url, { headers: { ...contextHeaders, "Content-Type": "application/json" } })
   */
  contextHeaders: UserContextHeaders;

  /**
   * Tag label for visual chips on records:
   *   "Self" | "Child" | "Parent" | "Spouse" | "Sibling" | "Family"
   */
  subjectTag: string;

  /** Tailwind classes for the subject chip */
  subjectTagColor: string;

  /**
   * Whether the selected family member has an active consent record.
   * Always true for SELF. For FAMILY, false if no active consent exists.
   */
  hasActiveConsent: boolean;
}

// ── Context object ────────────────────────────────────────────────────────────

const UserCtx = createContext<UserContextValue | null>(null);

// ── Helpers ───────────────────────────────────────────────────────────────────

function deriveSubjectTag(relationship: string | null): { tag: string; color: string } {
  if (!relationship) return { tag: "Self", color: "bg-teal-soft text-teal border-teal/30" };
  const r = relationship.toLowerCase();
  if (r === "son" || r === "daughter" || r === "child")
    return { tag: "Child",   color: "bg-amber-soft text-amber border-amber/30" };
  if (r === "father" || r === "mother" || r === "parent")
    return { tag: "Parent",  color: "bg-violet-soft text-violet border-violet/30" };
  if (r === "spouse" || r === "partner" || r === "husband" || r === "wife")
    return { tag: "Spouse",  color: "bg-rose-soft text-rose border-rose/30" };
  if (r === "sibling" || r === "brother" || r === "sister")
    return { tag: "Sibling", color: "bg-sky-soft text-sky border-sky/30" };
  return { tag: "Family", color: "bg-lime-soft text-lime border-lime/30" };
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function UserContextProvider({ children }: { children: ReactNode }) {
  const { selectedMember } = useFamilyContext();

  const value = useMemo<UserContextValue>(() => {
    // ── PRIMARY PATIENT (SELF) ────────────────────────────────────────────────
    if (selectedMember === null) {
      return {
        contextType: "SELF",
        contextSubjectId: "patient-00429",
        contextSubjectName: patient.name,
        contextRelationship: null,
        isFamilyView: false,
        viewingLabel: `${patient.name} (Primary Patient)`,
        isMinorContext: false,
        contextHeaders: {
          "X-User-Context-Type": "SELF",
          "X-Subject-Id": "patient-00429",
        },
        subjectTag: "Self",
        subjectTagColor: "bg-teal-soft text-teal border-teal/30",
        hasActiveConsent: true,
      };
    }

    // ── FAMILY MEMBER ─────────────────────────────────────────────────────────
    const rel = selectedMember.relationship ?? null;
    const { tag, color } = deriveSubjectTag(rel);

    // Look up the richer ShareableFamilyMember record for consent status / minor check
    // FamilyMember id from qb-data matches ShareableFamilyMember id (fm1/fm2/fm3)
    const shareable = shareableFamilyMembers.find((s) => s.fullName === selectedMember.fullName);
    const hasActiveConsent = shareable ? shareable.consentStatus === "active" : true;
    const isMinorContext = shareable?.isMinor ?? false;

    return {
      contextType: "FAMILY",
      contextSubjectId: selectedMember.id,
      contextSubjectName: selectedMember.fullName,
      contextRelationship: rel,
      isFamilyView: true,
      viewingLabel: `${selectedMember.fullName} (${rel ?? "Family Member"})`,
      isMinorContext,
      contextHeaders: {
        "X-User-Context-Type": "FAMILY",
        "X-Subject-Id": selectedMember.id,
      },
      subjectTag: tag,
      subjectTagColor: color,
      hasActiveConsent,
    };
  }, [selectedMember]);

  return <UserCtx.Provider value={value}>{children}</UserCtx.Provider>;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useUserContext(): UserContextValue {
  const ctx = useContext(UserCtx);
  if (!ctx) throw new Error("useUserContext must be used inside <UserContextProvider>");
  return ctx;
}

// ── Selector helpers (pure functions for mock filtering) ──────────────────────

/**
 * Filter a list of records by the current user context.
 * Records must have `subjectId: string` (or `patientId: string` for legacy logs).
 */
export function filterByContext<T extends { subjectId?: string; patientId?: string }>(
  records: T[],
  ctx: UserContextValue,
  primaryPatientId = "patient-00429",
): T[] {
  if (ctx.contextType === "SELF") return records;
  // FAMILY: return only records belonging to this family member
  return records.filter(
    (r) => r.subjectId === ctx.contextSubjectId || r.patientId === ctx.contextSubjectId,
  );
}
