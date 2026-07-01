// Source Data Notes API (demo persistence)
//
// Data model targets:
//   SymptomsLog
//   - id
//   - patientId
//   - note
//   - createdBy
//   - createdAt
//
//   GeneralWellbeingLog
//   - id
//   - patientId
//   - note
//   - createdBy
//   - createdAt
//
// In production, these functions should call backend endpoints and persist
// into database tables. For this workspace demo, records are stored in
// localStorage with an in-memory fallback.

export interface SymptomsLog {
  id: string;
  patientId: string;
  note: string;
  createdBy: string;
  createdAt: string;
}

export interface GeneralWellbeingLog {
  id: string;
  patientId: string;
  note: string;
  createdBy: string;
  createdAt: string;
}

type LogsStore = {
  symptoms: SymptomsLog[];
  wellbeing: GeneralWellbeingLog[];
};

const STORAGE_KEY = "qb.sourceData.notes.logs.v1";
const memoryStore: LogsStore = {
  symptoms: [],
  wellbeing: [],
};

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readStore(): LogsStore {
  if (!canUseLocalStorage()) return memoryStore;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return { symptoms: [], wellbeing: [] };

  try {
    const parsed = JSON.parse(raw) as Partial<LogsStore>;
    return {
      symptoms: Array.isArray(parsed.symptoms) ? parsed.symptoms : [],
      wellbeing: Array.isArray(parsed.wellbeing) ? parsed.wellbeing : [],
    };
  } catch {
    return { symptoms: [], wellbeing: [] };
  }
}

function writeStore(next: LogsStore) {
  if (!canUseLocalStorage()) {
    memoryStore.symptoms = next.symptoms;
    memoryStore.wellbeing = next.wellbeing;
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function newestFirst<T extends { createdAt: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listSymptomsLogs(patientId: string): Promise<SymptomsLog[]> {
  const store = readStore();
  return newestFirst(store.symptoms.filter((x) => x.patientId === patientId));
}

export async function createSymptomsLog(input: {
  patientId: string;
  note: string;
  createdBy?: string;
}): Promise<SymptomsLog> {
  const store = readStore();
  const created: SymptomsLog = {
    id: makeId("sym"),
    patientId: input.patientId,
    note: input.note.trim(),
    createdBy: input.createdBy?.trim() || "Unknown User",
    createdAt: new Date().toISOString(),
  };
  writeStore({ ...store, symptoms: [created, ...store.symptoms] });
  return created;
}

export async function listGeneralWellbeingLogs(patientId: string): Promise<GeneralWellbeingLog[]> {
  const store = readStore();
  return newestFirst(store.wellbeing.filter((x) => x.patientId === patientId));
}

export async function createGeneralWellbeingLog(input: {
  patientId: string;
  note: string;
  createdBy?: string;
}): Promise<GeneralWellbeingLog> {
  const store = readStore();
  const created: GeneralWellbeingLog = {
    id: makeId("well"),
    patientId: input.patientId,
    note: input.note.trim(),
    createdBy: input.createdBy?.trim() || "Unknown User",
    createdAt: new Date().toISOString(),
  };
  writeStore({ ...store, wellbeing: [created, ...store.wellbeing] });
  return created;
}
