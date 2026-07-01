import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { Layout } from "@/components/qb/Layout";
import { devicesData, initialReports, patient } from "@/lib/qb-data";
import type { MedicalReport } from "@/lib/qb-data";
import { DevicesTab } from "@/components/qb/DevicesTab";
import type { DeviceItem } from "@/components/qb/DevicesTab";
import { ReportsTab } from "@/components/qb/ReportsTab";
import { reportStorage } from "@/lib/report-storage";
import { useFamilyContext } from "@/lib/family-context";
import { Cpu, FileText, RefreshCw, Upload, Activity, Plus, Share2, Heart, Droplets, Wind, Zap, Weight } from "lucide-react";
import type { ElementType } from "react";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { DataSharingConsent } from "@/components/qb/DataSharingConsent";
import { ConnectProviderWizard } from "@/components/qb/ConnectProviderWizard";
import type { FamilyMember, MetricEntry } from "@/lib/qb-data";
import { useUserContext } from "@/lib/user-context";
import {
  createGeneralWellbeingLog,
  createSymptomsLog,
  listGeneralWellbeingLogs,
  listSymptomsLogs,
  type GeneralWellbeingLog,
  type SymptomsLog,
} from "@/lib/api/source-data-notes.functions";

const RELATIONSHIP_ICON: Record<string, string> = {
  Father: "👨", Mother: "👩", Spouse: "💑", Son: "👦",
  Daughter: "👧", Sibling: "🧑", Guardian: "🛡️", Other: "👤",
};

// ── Route ─────────────────────────────────────────────────────────────────────

const sourceDataSearchSchema = z.object({
  tab: z.enum(["devices", "reports"]).optional(),
});

export const Route = createFileRoute("/source-data")({
  validateSearch: (search) => sourceDataSearchSchema.catch({ tab: "devices" }).parse(search),
  head: () => ({
    meta: [
      { title: "Health Hub · Quest Beyond" },
      { name: "description", content: "Manage connected devices and medical reports powering Quest Beyond." },
    ],
  }),
  component: SourceData,
});

// ── Summary Card ──────────────────────────────────────────────────────────────

const ACCENT_STYLES: Record<string, { bg: string; text: string }> = {
  teal:   { bg: "bg-teal-soft",   text: "text-teal"   },
  violet: { bg: "bg-violet-soft", text: "text-violet" },
  sky:    { bg: "bg-sky-soft",    text: "text-sky"    },
  amber:  { bg: "bg-amber-soft",  text: "text-amber"  },
};

// ── Metric helpers ───────────────────────────────────────────────────────────

const BLANK_METRIC: Omit<MetricEntry, "id"> = {
  date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
  bloodPressure: "", bloodSugar: undefined, weight: undefined,
  heartRate: undefined, oxygenSaturation: undefined, temperature: undefined, notes: "",
};

const makeMetricId = () => `m${Date.now()}`;
const num = (v: string) => (v === "" ? undefined : Number(v));

// ── Summary Card ──────────────────────────────────────────────────────────────

function SummaryCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: ElementType;
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
}) {
  const s = ACCENT_STYLES[accent] ?? ACCENT_STYLES.teal;
  return (
    <div className="qb-card flex flex-1 min-w-[180px] items-center gap-4 py-4">
      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${s.bg}`}>
        <Icon className={`h-5 w-5 ${s.text}`} />
      </div>
      <div className="min-w-0">
        <div className="qb-mono text-[10px] uppercase tracking-widest text-muted mb-0.5">{label}</div>
        <div className={`qb-display text-xl font-bold ${s.text}`}>{value}</div>
        {sub && <div className="text-[11px] text-muted mt-0.5 truncate">{sub}</div>}
      </div>
    </div>
  );
}

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

const METRIC_COLS = [
  { key: "date",              label: "Date",        unit: ""      },
  { key: "bloodPressure",     label: "BP",          unit: "mmHg"  },
  { key: "bloodSugar",        label: "Blood Sugar", unit: "mg/dL" },
  { key: "weight",            label: "Weight",      unit: "lbs"   },
  { key: "heartRate",         label: "HR",          unit: "bpm"   },
  { key: "oxygenSaturation",  label: "SpO₂",        unit: "%"     },
  { key: "temperature",       label: "Temp",        unit: "°F"    },
] as const;

function MemberContextPanel({
  member,
  reports,
  allReports,
  devices,
  onAddReport,
  onDeleteReport,
  onDevicesChange,
  onAddMetric,
  actorName,
  actorId,
  defaultTab,
}: {
  member: FamilyMember;
  reports: MedicalReport[];
  allReports: MedicalReport[];
  devices: DeviceItem[];
  onAddReport: (r: MedicalReport) => void;
  onDeleteReport: (id: string) => void;
  onDevicesChange: (devices: DeviceItem[]) => void;
  onAddMetric: (metric: MetricEntry) => void;
  onDeleteReport: (id: string) => void;
  onDevicesChange: (devices: DeviceItem[]) => void;
  actorName?: string;
  actorId?: string;
  defaultTab?: "overview" | "devices" | "reports";
}) {
  const [symptomsInput, setSymptomsInput] = useState("");
  const [wellbeingInput, setWellbeingInput] = useState("");
  const [symptomsHistory, setSymptomsHistory] = useState<SymptomsLog[]>([]);
  const [wellbeingHistory, setWellbeingHistory] = useState<GeneralWellbeingLog[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [savingSymptoms, setSavingSymptoms] = useState(false);
  const [savingWellbeing, setSavingWellbeing] = useState(false);
  const [symptomsSaved, setSymptomsSaved] = useState(false);
  const [wellbeingSaved, setWellbeingSaved] = useState(false);
  const [metricsOpen, setMetricsOpen] = useState(false);

  const subjectId = member.id;
  const createdBy = actorName || actorId || "Unknown User";

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
      listSymptomsLogs(subjectId),
      listGeneralWellbeingLogs(subjectId),
    ]);
    setSymptomsHistory(symptoms);
    setWellbeingHistory(wellbeing);
    setIsLoadingHistory(false);
  };

  useEffect(() => {
    setSymptomsInput("");
    setWellbeingInput("");
    setSymptomsSaved(false);
    setWellbeingSaved(false);
    void loadHistory();
  }, [member.id]);

  const saveSymptoms = async () => {
    const note = symptomsInput.trim();
    if (!note || savingSymptoms) return;

    setSavingSymptoms(true);
    const created = await createSymptomsLog({
      patientId: subjectId,
      note,
      createdBy,
    });
    setSymptomsHistory((prev) => [created, ...prev]);
    setSymptomsInput("");
    setSymptomsSaved(true);
    setTimeout(() => setSymptomsSaved(false), 1800);
    setSavingSymptoms(false);
  };

  const saveWellbeing = async () => {
    const note = wellbeingInput.trim();
    if (!note || savingWellbeing) return;

    setSavingWellbeing(true);
    const created = await createGeneralWellbeingLog({
      patientId: subjectId,
      note,
      createdBy,
    });
    setWellbeingHistory((prev) => [created, ...prev]);
    setWellbeingInput("");
    setWellbeingSaved(true);
    setTimeout(() => setWellbeingSaved(false), 1800);
    setSavingWellbeing(false);
  };

  return (
    <div className="qb-card">
      <Tabs defaultValue={defaultTab ?? "overview"}>
        <div className="overflow-x-auto qb-scroll mb-5 border-b border-border-soft pb-3">
          <TabsList className="h-9 bg-surface-2">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="metrics" className="text-xs">Metrics</TabsTrigger>
            <TabsTrigger value="reports" className="text-xs">Reports</TabsTrigger>
            <TabsTrigger value="devices" className="text-xs">Devices</TabsTrigger>
            <TabsTrigger value="notes" className="text-xs">Notes</TabsTrigger>
            <TabsTrigger value="provider-sync" className="text-xs">Provider Sync</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview">
          <div>
            <p className="qb-mono text-[10px] uppercase tracking-widest text-muted mb-4">Health Summary</p>
            {member.metrics.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <Activity className="h-10 w-10 text-muted opacity-25" />
                <p className="text-sm text-muted">No health metrics recorded yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
                <SummaryCard
                  icon={Heart}
                  label="Blood Pressure"
                  value={member.metrics[0]?.bloodPressure || "—"}
                  sub="mmHg"
                  accent="rose"
                />
                <SummaryCard
                  icon={Zap}
                  label="Heart Rate"
                  value={member.metrics[0]?.heartRate ?? "—"}
                  sub="bpm"
                  accent="amber"
                />
                <SummaryCard
                  icon={Wind}
                  label="SpO₂"
                  value={member.metrics[0]?.oxygenSaturation ?? "—"}
                  sub="%"
                  accent="sky"
                />
                <SummaryCard
                  icon={Droplets}
                  label="Blood Sugar"
                  value={member.metrics[0]?.bloodSugar ?? "—"}
                  sub="mg/dL"
                  accent="violet"
                />
                <SummaryCard
                  icon={Weight}
                  label="Weight"
                  value={member.metrics[0]?.weight ?? "—"}
                  sub="lbs"
                  accent="teal"
                />
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="metrics">
          <div className="flex items-center justify-between mb-4">
            <p className="qb-mono text-[10px] uppercase tracking-widest text-muted">
              Health Metrics History · {member.metrics.length} {member.metrics.length === 1 ? "entry" : "entries"}
            </p>
            <button
              onClick={() => setMetricsOpen(true)}
              className="flex h-8 items-center gap-1.5 rounded-lg bg-teal px-3 text-xs font-medium text-bg hover:bg-teal/90"
            >
              <Plus className="h-3.5 w-3.5" /> Log Metrics
            </button>
          </div>

          {member.metrics.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <Activity className="h-10 w-10 text-muted opacity-25" />
              <p className="text-sm text-muted">No metrics logged yet.</p>
              <button
                onClick={() => setMetricsOpen(true)}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-teal/30 px-3 text-xs text-teal hover:bg-teal-soft"
              >
                <Plus className="h-3.5 w-3.5" /> Log First Entry
              </button>
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
                    <th className="px-3 py-2.5 text-left qb-mono text-[9px] uppercase tracking-widest text-muted">Observations</th>
                  </tr>
                </thead>
                <tbody>
                  {member.metrics.map((entry: MetricEntry, i) => (
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

          <MetricsDialog
            open={metricsOpen}
            onClose={() => setMetricsOpen(false)}
            onSave={(metric) => {
              onAddMetric(metric);
              setMetricsOpen(false);
            }}
          />
        </TabsContent>

        <TabsContent value="reports">
          <ReportsTab
            reports={allReports}
            onAddReport={onAddReport}
            onDeleteReport={onDeleteReport}
          />
        </TabsContent>

        <TabsContent value="devices">
          <DevicesTab devices={devices} onDevicesChange={onDevicesChange} />
        </TabsContent>

        <TabsContent value="notes">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <Label className="mb-2 block text-xs text-muted">Symptoms Logger</Label>
              <Textarea
                value={symptomsInput}
                onChange={(e) => setSymptomsInput(e.target.value)}
                rows={7}
                className="resize-none text-sm"
                placeholder="Medical observations, patterns, concerns, appointment notes…"
              />
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={saveSymptoms}
                  disabled={!symptomsInput.trim() || savingSymptoms}
                  className="h-9 rounded-lg bg-teal px-4 text-xs font-medium text-bg hover:bg-teal/90 disabled:opacity-40"
                >
                  {savingSymptoms ? "Saving..." : "Save Changes"}
                </button>
                <AnimatePresence>
                  {symptomsSaved && (
                    <motion.span
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-xs text-lime"
                    >
                      ✓ Saved
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              <div className="mt-4 rounded-lg border border-border-soft bg-surface-2 p-3">
                <p className="qb-mono text-[10px] uppercase tracking-widest text-muted">History</p>
                <div className="mt-2 space-y-3">
                  {isLoadingHistory ? (
                    <p className="text-xs text-muted">Loading history...</p>
                  ) : symptomsHistory.length === 0 ? (
                    <p className="text-xs text-muted">No history available.</p>
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
              <Label className="mb-2 block text-xs text-muted">General Wellbeing Logger</Label>
              <Textarea
                value={wellbeingInput}
                onChange={(e) => setWellbeingInput(e.target.value)}
                rows={7}
                className="resize-none text-sm"
                placeholder="Mood, energy levels, sleep quality, activity, quality of life…"
              />
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={saveWellbeing}
                  disabled={!wellbeingInput.trim() || savingWellbeing}
                  className="h-9 rounded-lg bg-teal px-4 text-xs font-medium text-bg hover:bg-teal/90 disabled:opacity-40"
                >
                  {savingWellbeing ? "Saving..." : "Save Changes"}
                </button>
                <AnimatePresence>
                  {wellbeingSaved && (
                    <motion.span
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-xs text-lime"
                    >
                      ✓ Saved
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              <div className="mt-4 rounded-lg border border-border-soft bg-surface-2 p-3">
                <p className="qb-mono text-[10px] uppercase tracking-widest text-muted">History</p>
                <div className="mt-2 space-y-3">
                  {isLoadingHistory ? (
                    <p className="text-xs text-muted">Loading history...</p>
                  ) : wellbeingHistory.length === 0 ? (
                    <p className="text-xs text-muted">No history available.</p>
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

        <TabsContent value="provider-sync">
          <Tabs defaultValue="sharing" className="w-full">
            <TabsList className="h-9 bg-surface-2 mb-4">
              <TabsTrigger value="sharing" className="text-xs gap-1.5">
                <Share2 className="h-3.5 w-3.5" />
                Sharing History
              </TabsTrigger>
              <TabsTrigger value="share-report" className="text-xs gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Share Report
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sharing">
              <DataSharingConsent />
            </TabsContent>

            <TabsContent value="share-report">
              <ConnectProviderWizard onComplete={() => {}} onCancel={() => {}} />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── SourceData Page ───────────────────────────────────────────────────────────

function SourceData() {
  const { tab } = Route.useSearch();
  const { selectedMember, setSelectedMember } = useFamilyContext();
  const userCtx = useUserContext();
  const [devices, setDevices] = useState<DeviceItem[]>(devicesData);
  const [reports, setReports] = useState<MedicalReport[]>(initialReports);
  const [patientMetrics, setPatientMetrics] = useState<MetricEntry[]>(patient.metrics);

  // ── Derived values scoped to the selected member ──────────────────────────

  const visibleReports = useMemo(
    () =>
      selectedMember === null
        ? reports.filter((r) => r.ownerType === "PATIENT")
        : reports.filter(
            (r) => r.ownerType === "FAMILY_MEMBER" && r.ownerId === selectedMember.id,
          ),
    [reports, selectedMember],
  );

  const activeProfile = useMemo<FamilyMember>(
    () =>
      selectedMember ?? {
        id: "self",
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
        metrics: patientMetrics,
        wellbeingStatus: "Alert",
        lastUpdated: "just now",
        reportsCount: reports.filter((r) => r.ownerType === "PATIENT").length,
      },
    [selectedMember, reports, patientMetrics],
  );

  const memberPanelTab = tab === "reports" || tab === "devices" ? tab : "overview";

  // Devices are only tracked for the primary patient
  const connectedCount =
    selectedMember === null ? devices.filter((d) => d.status === "Connected").length : 0;
  const recentSyncDevice =
    selectedMember === null
      ? (devices.find((d) => d.lastSync === "just now") ?? devices[0])
      : undefined;
  const recentSync = recentSyncDevice?.lastSync ?? "—";
  const lastUpload = visibleReports.length > 0 ? visibleReports[0].uploadedDate : "—";

  const addReport = (r: MedicalReport) => setReports((prev) => [r, ...prev]);
  const deleteReport = (id: string) => {
    const report = reports.find((r) => r.id === id);
    if (report?.fileUrl) reportStorage.deleteFile(report.fileUrl);
    setReports((prev) => prev.filter((r) => r.id !== id));
  };

  const addMetric = (metric: MetricEntry) => {
    if (selectedMember === null) {
      // Update primary patient metrics
      setPatientMetrics((prev) => [metric, ...prev]);
    } else {
      // For family members, we would need to integrate with FamilyContext
      // This is a placeholder for now
      // In a full implementation, you would update the family member through context
    }
  };

  return (
    <Layout>
      <div className="space-y-5">
        {/* ── Member context banner (shown when a family member is selected) ── */}
        {selectedMember && (
          <div className="flex items-center gap-3 rounded-xl border border-violet/30 bg-violet-soft/40 px-4 py-2.5">
            <span className="text-lg">
              {RELATIONSHIP_ICON[selectedMember.relationship] ?? "👤"}
            </span>
            <div className="min-w-0 flex-1">
              <span className="text-sm font-semibold text-violet">{selectedMember.fullName}</span>
              <span className="ml-2 text-xs text-muted">
                {selectedMember.relationship} · Age {selectedMember.age}
              </span>
            </div>
            <button
              onClick={() => setSelectedMember(null)}
              className="shrink-0 text-xs text-muted transition-colors hover:text-violet"
            >
              ← Primary Patient
            </button>
          </div>
        )}

        {/* ── Summary Cards ── */}
        <div className="flex flex-wrap gap-3">
          <SummaryCard
            icon={Cpu}
            label="Connected Devices"
            value={connectedCount}
            sub={
              selectedMember
                ? "Tracked for primary account"
                : `${devices.length} total source${devices.length !== 1 ? "s" : ""}`
            }
            accent="teal"
          />
          <SummaryCard
            icon={FileText}
            label="Uploaded Reports"
            value={visibleReports.length}
            sub={`Across ${new Set(visibleReports.map((r) => r.reportCategory)).size} categories`}
            accent="violet"
          />
          <SummaryCard
            icon={RefreshCw}
            label="Last Device Sync"
            value={recentSync}
            sub={selectedMember ? "Tracked for primary account" : recentSyncDevice?.name}
            accent="sky"
          />
          <SummaryCard
            icon={Upload}
            label="Last Report Upload"
            value={lastUpload}
            accent="amber"
          />
        </div>

        <MemberContextPanel
          key={`${activeProfile.id}-${memberPanelTab}`}
          member={activeProfile}
          reports={visibleReports}
          allReports={reports}
          devices={devices}
          onAddReport={addReport}
          onDeleteReport={deleteReport}
          onDevicesChange={setDevices}
          onAddMetric={addMetric}
          actorName={userCtx.contextType === "SELF" ? userCtx.contextSubjectName : patient.name}
          actorId={userCtx.contextType === "SELF" ? userCtx.contextSubjectId : "patient-00429"}
          defaultTab={memberPanelTab}
        />
      </div>
    </Layout>
  );
}
