/**
 * Quest Beyond — API Client
 *
 * Typed fetch wrapper against the FastAPI backend.
 * Base URL is read from VITE_API_URL (default: http://localhost:8000).
 */

import type {
  MemberPageData,
  FamilyMember,
  MedicalReport,
} from "@/lib/qb-data";

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8000";

// ── Low-level fetch helper ─────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`[QB API] ${res.status} ${res.statusText} — ${path}\n${body}`);
  }
  return res.json() as Promise<T>;
}

// ── Auth ───────────────────────────────────────────────────────────────────────

export interface ApiAuthUser {
  id: string;
  email: string;
  fullName: string;
  mrn: string;
  condition: string;
  age: number;
  roles: string[];
}

export async function apiLogin(email: string, password: string): Promise<ApiAuthUser> {
  return apiFetch<ApiAuthUser>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

// ── Page data (all-in-one payload used by useMemberData) ──────────────────────

/**
 * Fetch the full page data for the active member context.
 * @param patientId  The primary patient's id (e.g. "patient-00429")
 * @param memberId   Optional family member id (fm1/fm2/fm3). Omit for primary patient.
 */
export async function fetchPageData(
  patientId: string,
  memberId?: string,
): Promise<MemberPageData> {
  const params = memberId ? `?member_id=${memberId}` : "";
  return apiFetch<MemberPageData>(`/patients/${patientId}/page-data${params}`);
}

// ── Family ────────────────────────────────────────────────────────────────────

export async function fetchFamilyMembers(patientId: string): Promise<FamilyMember[]> {
  return apiFetch<FamilyMember[]>(`/patients/${patientId}/family`);
}

// ── Reports ───────────────────────────────────────────────────────────────────

export async function fetchReports(patientId: string): Promise<MedicalReport[]> {
  return apiFetch<MedicalReport[]>(`/patients/${patientId}/reports`);
}

// ── Devices ───────────────────────────────────────────────────────────────────

export interface DeviceRecord {
  id: string;
  name: string;
  icon: string;
  status: string;
  lastSync: string;
  dataTypes: string;
  accent: string;
}

export async function fetchDevices(patientId: string): Promise<DeviceRecord[]> {
  return apiFetch<DeviceRecord[]>(`/patients/${patientId}/devices`);
}

// ── Genie ─────────────────────────────────────────────────────────────────────

export interface GenieSummary {
  date: string;
  audioSummary: string;
  highlights: Array<{ metric: string; value: string; trend: string }>;
  forecast: { glucoseRisk: number; recommendation: string };
  actionItems: string[];
}

export async function fetchGenieSummary(patientId: string): Promise<GenieSummary> {
  return apiFetch<GenieSummary>(`/patients/${patientId}/genie/summary`);
}

export interface GenieMessage {
  role: "assistant" | "user";
  content: string;
  actions?: string[];
}

export interface GenieChatResponse {
  response: string;
  conversationId: string;
  suggestedActions: string[];
  confidence: number;
}

export async function genieChat(
  patientId: string,
  message: string,
  conversationId?: string,
): Promise<GenieChatResponse> {
  return apiFetch<GenieChatResponse>(`/patients/${patientId}/genie/chat`, {
    method: "POST",
    body: JSON.stringify({ message, conversationId }),
  });
}
