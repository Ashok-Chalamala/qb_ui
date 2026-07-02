import { createContext, useContext, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { initialFamilyMembers, getMemberPageData, type MemberPageData } from "@/lib/qb-data";
import type { FamilyMember } from "@/lib/qb-data";
import { fetchPageData } from "@/lib/api/client";
import { getAuthUser } from "@/lib/auth";

// ── Context shape ─────────────────────────────────────────────────────────────

export interface FamilyContextValue {
  /** All registered family members */
  members: FamilyMember[];
  setMembers: Dispatch<SetStateAction<FamilyMember[]>>;
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
  const [members, setMembers] = useState<FamilyMember[]>(initialFamilyMembers);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);

  const value = useMemo<FamilyContextValue>(
    () => ({ members, setMembers, selectedMember, setSelectedMember }),
    [members, selectedMember],
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
// Fetches the full page-data payload from the FastAPI backend.
// Falls back to local mock data as initialData so first render is instant.
// Uses keepPreviousData so switching members doesn't flash an empty state.

export function useMemberData(): { data: MemberPageData; isLoading: boolean } {
  const { selectedMember } = useFamilyContext();
  const authUser = getAuthUser();
  const patientId = authUser?.id ?? "patient-00429";
  const memberId = selectedMember?.id;

  const { data, isPlaceholderData, isFetching } = useQuery({
    queryKey: ["page-data", patientId, memberId ?? "primary"] as const,
    queryFn: () => fetchPageData(patientId, memberId),
    // Use the local mock as the initial value — API result replaces it silently
    initialData: () => getMemberPageData(selectedMember),
    // While switching members keep showing the previous member's data
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  return {
    data,
    // Show loading indicator only when transitioning between members
    isLoading: isPlaceholderData && isFetching,
  };
}
