import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Layout } from "@/components/qb/Layout";
import { devicesData, initialReports } from "@/lib/qb-data";
import type { MedicalReport } from "@/lib/qb-data";
import { DevicesTab } from "@/components/qb/DevicesTab";
import type { DeviceItem } from "@/components/qb/DevicesTab";
import { ReportsTab } from "@/components/qb/ReportsTab";
import { reportStorage } from "@/lib/report-storage";
import { useFamilyContext } from "@/lib/family-context";
import { Cpu, FileText, RefreshCw, Upload } from "lucide-react";
import type { ElementType } from "react";
import { z } from "zod";
import { cn } from "@/lib/utils";

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
      { title: "Source Data · Quest Beyond" },
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

// ── SourceData Page ───────────────────────────────────────────────────────────

function SourceData() {
  const { tab } = Route.useSearch();
  const { selectedMember, setSelectedMember } = useFamilyContext();
  const [devices, setDevices] = useState<DeviceItem[]>(devicesData);
  const [reports, setReports] = useState<MedicalReport[]>(initialReports);
  const activeTab = tab === "reports" ? "reports" : "devices";

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

        {/* ── Top navigation tabs ── */}
        <div
          role="tablist"
          aria-label="Source data sections"
          className="flex w-full gap-1 rounded-2xl border border-border-soft bg-surface-2 p-1 shadow-sm max-[340px]:flex-col"
        >
          <Link
            to="/devices"
            role="tab"
            aria-selected={activeTab === "devices"}
            className={cn(
              "flex h-10 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
              activeTab === "devices"
                ? "bg-teal text-white font-semibold shadow-sm"
                : "bg-surface text-teal font-medium hover:bg-teal-soft",
            )}
          >
            <Cpu className="h-4 w-4" />
            Devices
          </Link>
          <Link
            to="/reports"
            role="tab"
            aria-selected={activeTab === "reports"}
            className={cn(
              "flex h-10 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
              activeTab === "reports"
                ? "bg-teal text-white font-semibold shadow-sm"
                : "bg-surface text-teal font-medium hover:bg-teal-soft",
            )}
          >
            <FileText className="h-4 w-4" />
            Reports
          </Link>
        </div>

        <div className="mt-4">
          {activeTab === "devices" ? (
            <DevicesTab devices={devices} onDevicesChange={setDevices} />
          ) : (
            <ReportsTab
              reports={reports}
              onAddReport={addReport}
              onDeleteReport={deleteReport}
            />
          )}
        </div>
      </div>
    </Layout>
  );
}
