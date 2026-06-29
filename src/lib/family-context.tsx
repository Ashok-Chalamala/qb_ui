import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { initialFamilyMembers, getMemberPageData, type MemberPageData } from "@/lib/qb-data";
import type { FamilyMember } from "@/lib/qb-data";

// ── Context shape ─────────────────────────────────────────────────────────────

export interface FamilyContextValue {
  /** All registered family members */
  members: FamilyMember[];
  /**
   * The currently selected family member.
   * `null` means the primary patient (Sarah Martinez) is the active context.
   */
  selectedMember: FamilyMember | null;
  setSelectedMember: (m: FamilyMember | null) => void;
}

// ── Context creation ──────────────────────────────────────────────────────────

const FamilyContext = createContext<FamilyContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function FamilyProvider({ children }: { children: ReactNode }) {
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);

  const value = useMemo<FamilyContextValue>(
    () => ({ members: initialFamilyMembers, selectedMember, setSelectedMember }),
    [selectedMember],
  );

  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useFamilyContext(): FamilyContextValue {
  const ctx = useContext(FamilyContext);
  if (!ctx) throw new Error("useFamilyContext must be used inside <FamilyProvider>");
  return ctx;
}

// ── useMemberData ─────────────────────────────────────────────────────────────
// Returns the full page-data payload for the currently selected family member.
// Shows a 300ms loading state when the selection changes to allow smooth transitions.

export function useMemberData(): { data: MemberPageData; isLoading: boolean } {
  const { selectedMember } = useFamilyContext();
  // Initialise with the correct member's data on first render (no flash)
  const [data, setData] = useState<MemberPageData>(() => getMemberPageData(selectedMember));
  const [isLoading, setIsLoading] = useState(false);
  const prevMember = useRef(selectedMember);

  useEffect(() => {
    // Skip the effect if the member hasn't actually changed
    if (prevMember.current === selectedMember) return;
    prevMember.current = selectedMember;

    setIsLoading(true);
    const t = setTimeout(() => {
      setData(getMemberPageData(selectedMember));
      setIsLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [selectedMember]);

  return { data, isLoading };
}
