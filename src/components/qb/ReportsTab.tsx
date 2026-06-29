import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Search,
  Eye,
  X,
  Filter,
  ArrowUpDown,
  User,
  Users,
  File as FileIcon,
} from "lucide-react";
import {
  REPORT_CATEGORIES,
  initialFamilyMembers,
  accentClass,
  patient,
} from "@/lib/qb-data";
import type { MedicalReport, ReportCategory, ReportOwnerType, FamilyMember } from "@/lib/qb-data";
import { useFamilyContext } from "@/lib/family-context";
import { reportStorage } from "@/lib/report-storage";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_CFG: Record<ReportCategory, { icon: string; accent: string }> = {
  "Blood Test":              { icon: "🩸", accent: "rose"   },
  "Diabetes":                { icon: "🍬", accent: "amber"  },
  "Blood Pressure":          { icon: "💓", accent: "rose"   },
  "Heart Health":            { icon: "❤️", accent: "rose"   },
  "ECG":                     { icon: "📈", accent: "teal"   },
  "X-Ray":                   { icon: "🦴", accent: "sky"    },
  "MRI":                     { icon: "🧠", accent: "violet" },
  "CT Scan":                 { icon: "🔬", accent: "violet" },
  "Prescription":            { icon: "💊", accent: "teal"   },
  "Vaccination":             { icon: "💉", accent: "lime"   },
  "Discharge Summary":       { icon: "📋", accent: "amber"  },
  "Allergy Report":          { icon: "🌿", accent: "lime"   },
  "Specialist Consultation": { icon: "🩺", accent: "sky"    },
  "Other":                   { icon: "📄", accent: "sky"    },
};

const SORT_OPTIONS = [
  { value: "date-desc", label: "Newest First" },
  { value: "date-asc",  label: "Oldest First" },
  { value: "name-asc",  label: "Name A–Z"     },
  { value: "name-desc", label: "Name Z–A"     },
];

const MEMBER_EMOJI: Record<string, string> = {
  Father: "👨", Mother: "👩", Spouse: "💑", Son: "👦",
  Daughter: "👧", Sibling: "🧑", Guardian: "🛡️", Other: "👤",
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
const ALLOWED_EXT = ".pdf,.jpg,.jpeg,.png";

// ── Utilities ─────────────────────────────────────────────────────────────────

const makeReportId = () => `r${Date.now()}`;

const formatFileSize = (bytes: number): string => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const isImage = (fileType: string) => fileType.startsWith("image/");

const todayStr = new Date().toLocaleDateString("en-US", {
  month: "short", day: "numeric", year: "numeric",
});

function applyFilters(
  reports: MedicalReport[],
  search: string,
  category: string,
  sort: string,
): MedicalReport[] {
  let f = reports;
  if (search.trim()) {
    const q = search.toLowerCase();
    f = f.filter(
      (r) =>
        r.reportName.toLowerCase().includes(q) ||
        r.healthcareFacility.toLowerCase().includes(q) ||
        r.reportCategory.toLowerCase().includes(q) ||
        r.notes.toLowerCase().includes(q),
    );
  }
  if (category !== "all") f = f.filter((r) => r.reportCategory === category);
  return [...f].sort((a, b) => {
    switch (sort) {
      case "name-asc":  return a.reportName.localeCompare(b.reportName);
      case "name-desc": return b.reportName.localeCompare(a.reportName);
      case "date-asc":  return a.reportDate.localeCompare(b.reportDate);
      default:          return b.uploadedDate.localeCompare(a.uploadedDate);
    }
  });
}

// ── StatCard ──────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent: string;
}) {
  const ac = accentClass[accent] ?? accentClass.sky;
  const isNum = typeof value === "number";
  return (
    <div className="qb-card flex-1 min-w-[120px] py-3 px-4">
      <div className={`qb-mono text-[10px] uppercase tracking-widest mb-1 ${ac.text}`}>{label}</div>
      <div className={`${isNum ? "qb-display text-2xl font-bold" : "text-sm font-medium"} ${ac.text}`}>
        {value}
      </div>
    </div>
  );
}

// ── Upload Dialog ─────────────────────────────────────────────────────────────

interface UploadFormState {
  ownerType: ReportOwnerType;
  ownerId: string;
  reportName: string;
  reportCategory: ReportCategory;
  reportDate: string;
  healthcareFacility: string;
  notes: string;
}

const BLANK_UPLOAD: UploadFormState = {
  ownerType: "PATIENT",
  ownerId: "",
  reportName: "",
  reportCategory: "Blood Test",
  reportDate: todayStr,
  healthcareFacility: "",
  notes: "",
};

function UploadDialog({
  open,
  onClose,
  onSave,
  defaultOwnerType = "PATIENT",
  defaultOwnerId = "",
}: {
  open: boolean;
  onClose: () => void;
  onSave: (r: MedicalReport) => void;
  defaultOwnerType?: ReportOwnerType;
  defaultOwnerId?: string;
}) {
  const [form, setForm] = useState<UploadFormState>({ ...BLANK_UPLOAD });
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setForm({ ...BLANK_UPLOAD, ownerType: defaultOwnerType, ownerId: defaultOwnerId });
      setFile(null);
      setError("");
    }
  }, [open, defaultOwnerType, defaultOwnerId]);

  const sf = <K extends keyof UploadFormState>(k: K, v: UploadFormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const validateFile = (f: File): string => {
    if (!ALLOWED_TYPES.includes(f.type)) return "Only PDF, JPG, JPEG, PNG files are allowed.";
    if (f.size > MAX_FILE_SIZE) return "File size must be under 10 MB.";
    return "";
  };

  const handleFileSelect = (f: File) => {
    const err = validateFile(f);
    if (err) { setError(err); return; }
    setError("");
    setFile(f);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelect(f);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!form.reportName.trim()) { setError("Report name is required."); return; }
    if (form.ownerType === "FAMILY_MEMBER" && !form.ownerId) {
      setError("Please select a family member.");
      return;
    }
    try {
      let fileUrl = "";
      let fileName = form.reportName.trim().toLowerCase().replace(/\s+/g, "_") + ".pdf";
      let fileType = "application/pdf";
      let fileSize = 0;

      if (file) {
        const result = await reportStorage.upload(file);
        fileUrl = result.fileUrl;
        fileName = result.fileName;
        fileType = result.fileType;
        fileSize = result.fileSize;
      }

      const report: MedicalReport = {
        id: makeReportId(),
        ownerType: form.ownerType,
        ownerId: form.ownerType === "FAMILY_MEMBER" ? form.ownerId : undefined,
        reportName: form.reportName.trim(),
        reportCategory: form.reportCategory,
        reportDate: form.reportDate,
        healthcareFacility: form.healthcareFacility.trim(),
        notes: form.notes.trim(),
        fileName, fileType, fileSize, fileUrl,
        uploadedDate: todayStr,
        createdBy: patient.name,
      };

      onSave(report);
      onClose();
    } catch {
      setError("Upload failed. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[560px] max-h-[92vh] overflow-y-auto bg-surface border-border-soft">
        <DialogHeader>
          <DialogTitle className="qb-display text-base">Upload Medical Report</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Owner toggle */}
          <div>
            <Label className="mb-2 block text-xs text-muted">Report Owner</Label>
            <div className="flex gap-2">
              {(["PATIENT", "FAMILY_MEMBER"] as ReportOwnerType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { sf("ownerType", t); if (t === "PATIENT") sf("ownerId", ""); }}
                  className={`flex flex-1 items-center justify-center gap-2 h-10 rounded-lg border text-xs font-medium transition-colors ${
                    form.ownerType === t
                      ? "border-teal/50 bg-teal-soft text-teal"
                      : "border-border-strong bg-surface-2 text-muted hover:text-fg"
                  }`}
                >
                  {t === "PATIENT"
                    ? <><User className="h-3.5 w-3.5" />{patient.name}</>
                    : <><Users className="h-3.5 w-3.5" />Family Member</>}
                </button>
              ))}
            </div>
          </div>

          {/* Family member selector */}
          {form.ownerType === "FAMILY_MEMBER" && (
            <div>
              <Label className="mb-1 block text-xs text-muted">Select Family Member</Label>
              <Select value={form.ownerId} onValueChange={(v) => sf("ownerId", v)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Choose family member…" />
                </SelectTrigger>
                <SelectContent>
                  {initialFamilyMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {MEMBER_EMOJI[m.relationship] ?? "👤"} {m.fullName} ({m.relationship})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Report details */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label className="mb-1 block text-xs text-muted">Report Name *</Label>
              <Input
                value={form.reportName}
                onChange={(e) => sf("reportName", e.target.value)}
                placeholder="e.g. Complete Blood Count"
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs text-muted">Category</Label>
              <Select value={form.reportCategory} onValueChange={(v) => sf("reportCategory", v as ReportCategory)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REPORT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{CATEGORY_CFG[c].icon} {c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block text-xs text-muted">Report Date</Label>
              <Input
                value={form.reportDate}
                onChange={(e) => sf("reportDate", e.target.value)}
                placeholder="Jun 23, 2026"
                className="h-9 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="mb-1 block text-xs text-muted">Healthcare Facility</Label>
              <Input
                value={form.healthcareFacility}
                onChange={(e) => sf("healthcareFacility", e.target.value)}
                placeholder="Hospital, lab, or clinic name"
                className="h-9 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="mb-1 block text-xs text-muted">Notes / Description</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => sf("notes", e.target.value)}
                placeholder="Findings, context, or follow-up notes…"
                rows={3}
                className="text-sm resize-none"
              />
            </div>
          </div>

          {/* Drag & drop file upload */}
          <div>
            <Label className="mb-1 block text-xs text-muted">
              Attach File <span className="text-muted opacity-60">(PDF · JPG · PNG · max 10 MB)</span>
            </Label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                dragOver
                  ? "border-teal/60 bg-teal-soft/30"
                  : file
                    ? "border-lime/40 bg-lime-soft/20"
                    : "border-border-strong hover:border-teal/30 hover:bg-teal-soft/10"
              }`}
            >
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileIcon className="h-5 w-5 text-lime shrink-0" />
                  <div className="text-left min-w-0">
                    <p className="text-sm font-medium text-lime truncate">{file.name}</p>
                    <p className="qb-mono text-[10px] text-muted">{formatFileSize(file.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="ml-auto shrink-0 text-muted hover:text-rose"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted">
                  <Upload className="h-7 w-7 opacity-40" />
                  <p className="text-sm">Drag & drop or click to select file</p>
                  <p className="qb-mono text-[10px]">PDF · JPG · JPEG · PNG · max 10 MB</p>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept={ALLOWED_EXT}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileSelect(f);
                e.target.value = "";
              }}
            />
          </div>

          {error && <p className="text-xs text-rose">{error}</p>}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="h-9 rounded-lg border border-border-strong px-4 text-xs text-muted hover:text-fg">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!form.reportName.trim()}
            className="h-9 rounded-lg bg-teal px-4 text-xs font-medium text-bg hover:bg-teal/90 disabled:opacity-40"
          >
            Upload Report
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Report Row (list view) ────────────────────────────────────────────────────

function ReportRow({
  report,
  ownerLabel,
  onView,
  onDownload,
  onDelete,
}: {
  report: MedicalReport;
  ownerLabel: string;
  onView: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const cfg = CATEGORY_CFG[report.reportCategory];
  const ac = accentClass[cfg.accent] ?? accentClass.sky;

  const actions = (
    <div className="flex items-center gap-1">
      <button
        onClick={onView}
        title="View"
        className="flex h-7 w-7 items-center justify-center rounded-md border border-border-strong bg-surface-2 text-muted transition-colors hover:border-teal/30 hover:text-teal"
      >
        <Eye className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={onDownload}
        disabled={!report.fileUrl}
        title="Download"
        className="flex h-7 w-7 items-center justify-center rounded-md border border-border-strong bg-surface-2 text-muted transition-colors hover:border-sky/30 hover:text-sky disabled:opacity-25"
      >
        <Download className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={onDelete}
        title="Delete"
        className="flex h-7 w-7 items-center justify-center rounded-md border border-border-strong bg-surface-2 text-muted transition-colors hover:border-rose/30 hover:text-rose"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  return (
    <div className="group transition-colors hover:bg-surface-2/60">
      {/* ── Desktop row ── */}
      <div className="hidden sm:grid sm:grid-cols-[minmax(0,2fr)_150px_minmax(0,1fr)_90px_88px] items-center gap-4 px-4 py-3">
        {/* Name + icon + facility */}
        <div className="flex items-center gap-3 min-w-0">
          <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-base ${ac.bg}`}>
            {cfg.icon}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium leading-snug">{report.reportName}</div>
            {report.healthcareFacility && (
              <div className="truncate text-[11px] text-muted">{report.healthcareFacility}</div>
            )}
          </div>
        </div>
        {/* Category chip */}
        <div>
          <span className={`qb-chip border-${cfg.accent}/40 ${ac.text}`}>
            {cfg.icon} {report.reportCategory}
          </span>
        </div>
        {/* Notes */}
        <div className="truncate text-[11px] leading-relaxed text-muted">
          {report.notes ? report.notes : <span className="opacity-40">—</span>}
        </div>
        {/* Date */}
        <div className="qb-mono text-right text-[11px] text-muted">{report.reportDate}</div>
        {/* Actions */}
        <div className="flex justify-end">{actions}</div>
      </div>

      {/* ── Mobile row ── */}
      <div className="sm:hidden flex items-start gap-3 px-4 py-3">
        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-lg ${ac.bg}`}>
          {cfg.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="mb-1.5 flex items-start justify-between gap-2">
            <span className="flex-1 min-w-0 truncate text-sm font-medium leading-snug">
              {report.reportName}
            </span>
            <span className="qb-mono shrink-0 text-[11px] text-muted">{report.reportDate}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`qb-chip border-${cfg.accent}/40 ${ac.text}`}>
              {report.reportCategory}
            </span>
            {report.healthcareFacility && (
              <span className="truncate text-[11px] text-muted">{report.healthcareFacility}</span>
            )}
            <div className="ml-auto">{actions}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Report Detail Sheet ───────────────────────────────────────────────────────

function ReportDetailSheet({
  report,
  ownerLabel,
  open,
  onClose,
  onDownload,
  onDelete,
}: {
  report: MedicalReport | null;
  ownerLabel: string;
  open: boolean;
  onClose: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  if (!report) return null;

  const cfg = CATEGORY_CFG[report.reportCategory];
  const ac = accentClass[cfg.accent] ?? accentClass.sky;
  const hasFile = !!report.fileUrl;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-[580px] overflow-y-auto bg-surface border-border-soft">
        <SheetHeader className="mb-5">
          <div className="flex items-start gap-3">
            <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-2xl ${ac.bg}`}>
              {cfg.icon}
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="qb-display text-base leading-snug">{report.reportName}</SheetTitle>
              <span className={`qb-chip mt-1.5 border-${cfg.accent}/40 ${ac.text}`}>
                {report.reportCategory}
              </span>
            </div>
          </div>
        </SheetHeader>

        {/* Report info */}
        <div className="space-y-1.5 mb-5">
          <p className="qb-mono text-[10px] uppercase tracking-widest text-muted mb-2">Report Information</p>
          {[
            { label: "Report Date",  value: report.reportDate      },
            { label: "Uploaded",     value: report.uploadedDate    },
            { label: "Uploaded By",  value: report.createdBy       },
            { label: "Facility",     value: report.healthcareFacility || "—" },
            { label: "Owner",        value: ownerLabel             },
            { label: "File",         value: `${report.fileName} · ${formatFileSize(report.fileSize)}` },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-start justify-between gap-4 rounded-lg bg-surface-2 px-3 py-2">
              <span className="qb-mono text-[10px] uppercase tracking-widest text-muted shrink-0">{label}</span>
              <span className="text-xs text-right break-all">{value}</span>
            </div>
          ))}
        </div>

        {/* Notes */}
        {report.notes && (
          <div className="mb-5">
            <p className="qb-mono text-[10px] uppercase tracking-widest text-muted mb-2">Notes</p>
            <div className="rounded-xl bg-surface-2 px-4 py-3 text-sm text-muted leading-relaxed">
              {report.notes}
            </div>
          </div>
        )}

        {/* File preview */}
        <div className="mb-5">
          <p className="qb-mono text-[10px] uppercase tracking-widest text-muted mb-2">File Preview</p>
          {hasFile ? (
            isImage(report.fileType) ? (
              <img
                src={report.fileUrl}
                alt={report.reportName}
                className="w-full rounded-xl border border-border-soft object-contain max-h-72"
              />
            ) : (
              <iframe
                src={report.fileUrl}
                title={report.reportName}
                className="w-full h-64 rounded-xl border border-border-soft bg-surface-2"
              />
            )
          ) : (
            <div className="flex flex-col items-center gap-2 py-10 rounded-xl border border-border-soft bg-surface-2 text-center">
              <FileText className="h-8 w-8 text-muted opacity-25" />
              <p className="text-xs text-muted">Preview not available for sample data.</p>
              <p className="qb-mono text-[10px] text-muted">Upload a real file to enable preview & download.</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onDownload}
            disabled={!hasFile}
            className="flex flex-1 items-center justify-center gap-2 h-9 rounded-lg bg-teal px-4 text-xs font-medium text-bg hover:bg-teal/90 disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" /> Download
          </button>
          <button
            onClick={() => { onDelete(); onClose(); }}
            className="flex h-9 items-center gap-2 rounded-lg border border-rose/30 px-3 text-xs text-rose hover:bg-rose-soft"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Search + Filter Bar ───────────────────────────────────────────────────────

function SearchFilterBar({
  search, onSearch,
  category, onCategory,
  sort, onSort,
  count,
}: {
  search: string;   onSearch: (v: string) => void;
  category: string; onCategory: (v: string) => void;
  sort: string;     onSort: (v: string) => void;
  count: number;
}) {
  return (
    <div className="qb-card flex flex-wrap items-center gap-3 py-3">
      <div className="relative flex-1 min-w-[180px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search reports…"
          className="w-full h-9 rounded-lg border border-border-strong bg-surface-2 pl-9 pr-3 text-sm focus:outline-none focus:border-teal/50 placeholder:text-muted"
        />
        {search && (
          <button
            onClick={() => onSearch("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-fg"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <Select value={category} onValueChange={onCategory}>
        <SelectTrigger className="h-9 text-xs w-[170px] shrink-0">
          <Filter className="h-3.5 w-3.5 mr-1.5 text-muted shrink-0" />
          <SelectValue placeholder="All Categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {REPORT_CATEGORIES.map((c) => (
            <SelectItem key={c} value={c}>{CATEGORY_CFG[c].icon} {c}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={sort} onValueChange={onSort}>
        <SelectTrigger className="h-9 text-xs w-[145px] shrink-0">
          <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-muted shrink-0" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="qb-mono text-[10px] text-muted ml-auto">
        {count} {count === 1 ? "report" : "reports"}
      </span>
    </div>
  );
}

// ── Reports Grid (with empty state) ──────────────────────────────────────────

function ReportsGrid({
  reports,
  familyMembersMap,
  onView,
  onDownload,
  onDelete,
  onUpload,
}: {
  reports: MedicalReport[];
  familyMembersMap: Record<string, string>;
  onView: (r: MedicalReport) => void;
  onDownload: (r: MedicalReport) => void;
  onDelete: (id: string) => void;
  onUpload: () => void;
}) {
  if (reports.length === 0) {
    return (
      <div className="qb-card flex flex-col items-center gap-3 py-14 text-center">
        <FileText className="h-10 w-10 text-muted opacity-25" />
        <h3 className="qb-display text-sm font-semibold">No reports found</h3>
        <p className="text-xs text-muted max-w-xs">
          Try adjusting your search or filters, or upload a new report.
        </p>
        <button
          onClick={onUpload}
          className="mt-1 flex h-9 items-center gap-2 rounded-xl border border-teal/30 px-4 text-xs text-teal hover:bg-teal-soft"
        >
          <Upload className="h-3.5 w-3.5" /> Upload Report
        </button>
      </div>
    );
  }

  return (
    <div className="qb-card overflow-hidden p-0">
      {/* Column headers — desktop only */}
      <div className="hidden sm:grid sm:grid-cols-[minmax(0,2fr)_150px_minmax(0,1fr)_90px_88px] gap-4 border-b border-border-soft px-4 py-2.5">
        <span className="qb-mono text-[10px] uppercase tracking-widest text-muted">Report</span>
        <span className="qb-mono text-[10px] uppercase tracking-widest text-muted">Category</span>
        <span className="qb-mono text-[10px] uppercase tracking-widest text-muted">Notes</span>
        <span className="qb-mono text-right text-[10px] uppercase tracking-widest text-muted">Date</span>
        <span className="qb-mono text-right text-[10px] uppercase tracking-widest text-muted">Actions</span>
      </div>
      {/* Rows */}
      <div className="divide-y divide-border-soft">
        {reports.map((r) => {
          const ownerLabel =
            r.ownerType === "PATIENT"
              ? patient.name
              : familyMembersMap[r.ownerId ?? ""] ?? "Family Member";
          return (
            <ReportRow
              key={r.id}
              report={r}
              ownerLabel={ownerLabel}
              onView={() => onView(r)}
              onDownload={() => onDownload(r)}
              onDelete={() => onDelete(r.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Family Member Selector ────────────────────────────────────────────────────

function FamilyMemberSelector({
  reports,
  selectedId,
  onSelect,
}: {
  reports: MedicalReport[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const familyReports = reports.filter((r) => r.ownerType === "FAMILY_MEMBER");

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelect(null)}
        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs transition-colors ${
          selectedId === null
            ? "border-teal/50 bg-teal-soft text-teal"
            : "border-border-strong bg-surface-2 text-muted hover:text-fg"
        }`}
      >
        <Users className="h-3.5 w-3.5" />
        All Members
        <span className="qb-mono text-[9px] opacity-70">{familyReports.length}</span>
      </button>

      {initialFamilyMembers.map((m) => {
        const count = familyReports.filter((r) => r.ownerId === m.id).length;
        const selected = selectedId === m.id;
        return (
          <button
            key={m.id}
            onClick={() => onSelect(selected ? null : m.id)}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs transition-colors ${
              selected
                ? "border-violet/50 bg-violet-soft text-violet"
                : "border-border-strong bg-surface-2 text-muted hover:text-fg"
            }`}
          >
            <span>{MEMBER_EMOJI[m.relationship] ?? "👤"}</span>
            <span>{m.fullName.split(" ")[0]}</span>
            <span className="qb-chip text-[9px] px-1.5 border-border-strong">{count}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── My Reports Section ────────────────────────────────────────────────────────

function MyReportsSection({
  reports,
  familyMembersMap,
  onUpload,
  onDelete,
}: {
  reports: MedicalReport[];
  familyMembersMap: Record<string, string>;
  onUpload: () => void;
  onDelete: (id: string) => void;
}) {
  const [search, setSearch]     = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort]         = useState("date-desc");
  const [viewing, setViewing]   = useState<MedicalReport | null>(null);

  const myReports = reports.filter((r) => r.ownerType === "PATIENT");

  const filtered = useMemo(
    () => applyFilters(myReports, search, category, sort),
    [myReports, search, category, sort],
  );

  const catBreakdown = REPORT_CATEGORIES.reduce<{ cat: ReportCategory; n: number }[]>((acc, c) => {
    const n = myReports.filter((r) => r.reportCategory === c).length;
    if (n > 0) acc.push({ cat: c, n });
    return acc;
  }, []);

  const thisMonthAbbr = new Date().toLocaleString("en-US", { month: "short" });
  const thisMonthCount = myReports.filter((r) => r.uploadedDate.startsWith(thisMonthAbbr)).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <StatCard label="Total Reports"  value={myReports.length} accent="teal"   />
        <StatCard label="This Month"     value={thisMonthCount}   accent="violet"  />
        <StatCard label="Categories"     value={catBreakdown.length} accent="sky"  />
        <StatCard
          label="Latest Upload"
          value={myReports.length > 0 ? myReports[0].uploadedDate : "—"}
          accent="amber"
        />
        <button
          onClick={onUpload}
          className="flex h-10 items-center gap-2 rounded-xl bg-teal px-4 text-xs font-medium text-bg hover:bg-teal/90 shrink-0 ml-auto"
        >
          <Upload className="h-4 w-4" /> Upload Report
        </button>
      </div>

      {catBreakdown.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {catBreakdown.map(({ cat, n }) => {
            const cfg = CATEGORY_CFG[cat];
            const ac = accentClass[cfg.accent] ?? accentClass.sky;
            const active = category === cat;
            return (
              <button
                key={cat}
                onClick={() => setCategory(active ? "all" : cat)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  active
                    ? `border-${cfg.accent}/50 ${ac.bg} ${ac.text}`
                    : "border-border-strong bg-surface-2 text-muted hover:text-fg"
                }`}
              >
                <span>{cfg.icon}</span>
                <span>{cat}</span>
                <span className="qb-mono text-[10px] opacity-70">{n}</span>
              </button>
            );
          })}
        </div>
      )}

      <SearchFilterBar
        search={search}   onSearch={setSearch}
        category={category} onCategory={setCategory}
        sort={sort}       onSort={setSort}
        count={filtered.length}
      />

      <ReportsGrid
        reports={filtered}
        familyMembersMap={familyMembersMap}
        onView={setViewing}
        onDownload={(r) => reportStorage.download(r)}
        onDelete={onDelete}
        onUpload={onUpload}
      />

      <ReportDetailSheet
        report={viewing}
        ownerLabel={patient.name}
        open={!!viewing}
        onClose={() => setViewing(null)}
        onDownload={() => viewing && reportStorage.download(viewing)}
        onDelete={() => { if (viewing) { onDelete(viewing.id); setViewing(null); } }}
      />
    </div>
  );
}

// ── Family Reports Section ────────────────────────────────────────────────────

function FamilyReportsSection({
  reports,
  familyMembersMap,
  onUploadForMember,
  onDelete,
}: {
  reports: MedicalReport[];
  familyMembersMap: Record<string, string>;
  onUploadForMember: (memberId: string) => void;
  onDelete: (id: string) => void;
}) {
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [search, setSearch]     = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort]         = useState("date-desc");
  const [viewing, setViewing]   = useState<MedicalReport | null>(null);

  const familyReports = reports.filter((r) => r.ownerType === "FAMILY_MEMBER");
  const memberReports = selectedMemberId
    ? familyReports.filter((r) => r.ownerId === selectedMemberId)
    : familyReports;

  const filtered = useMemo(
    () => applyFilters(memberReports, search, category, sort),
    [memberReports, search, category, sort],
  );

  const selectedMember = initialFamilyMembers.find((m) => m.id === selectedMemberId);

  const thisMonthAbbr = new Date().toLocaleString("en-US", { month: "short" });
  const thisMonthCount = memberReports.filter((r) => r.uploadedDate.startsWith(thisMonthAbbr)).length;

  return (
    <div className="space-y-4">
      <div className="qb-card">
        <p className="qb-mono text-[10px] uppercase tracking-widest text-muted mb-3">Select Family Member</p>
        <FamilyMemberSelector
          reports={reports}
          selectedId={selectedMemberId}
          onSelect={(id) => { setSelectedMemberId(id); setSearch(""); setCategory("all"); }}
        />
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <StatCard
          label={selectedMember ? `${selectedMember.fullName.split(" ")[0]}'s Reports` : "Family Reports"}
          value={memberReports.length}
          accent="violet"
        />
        <StatCard label="This Month" value={thisMonthCount} accent="sky" />
        {selectedMember && (
          <StatCard label="Relationship" value={selectedMember.relationship} accent="teal" />
        )}
        <button
          onClick={() => onUploadForMember(selectedMemberId ?? "")}
          className="flex h-10 items-center gap-2 rounded-xl bg-teal px-4 text-xs font-medium text-bg hover:bg-teal/90 shrink-0 ml-auto"
        >
          <Upload className="h-4 w-4" />
          {selectedMember
            ? `Upload for ${selectedMember.fullName.split(" ")[0]}`
            : "Upload Family Report"}
        </button>
      </div>

      <SearchFilterBar
        search={search}   onSearch={setSearch}
        category={category} onCategory={setCategory}
        sort={sort}       onSort={setSort}
        count={filtered.length}
      />

      <ReportsGrid
        reports={filtered}
        familyMembersMap={familyMembersMap}
        onView={setViewing}
        onDownload={(r) => reportStorage.download(r)}
        onDelete={onDelete}
        onUpload={() => onUploadForMember(selectedMemberId ?? "")}
      />

      <ReportDetailSheet
        report={viewing}
        ownerLabel={
          viewing
            ? (viewing.ownerType === "PATIENT" ? patient.name : familyMembersMap[viewing.ownerId ?? ""] ?? "Family Member")
            : ""
        }
        open={!!viewing}
        onClose={() => setViewing(null)}
        onDownload={() => viewing && reportStorage.download(viewing)}
        onDelete={() => { if (viewing) { onDelete(viewing.id); setViewing(null); } }}
      />
    </div>
  );
}

// ── Family Member View (single-member global context) ────────────────────────
// Rendered when a family member is selected via FamilyMemberSelector.
// Shows only that member's reports without the My/Family tab split.

function FamilyMemberView({
  member,
  reports,
  familyMembersMap,
  onUpload,
  onDelete,
}: {
  member: FamilyMember;
  reports: MedicalReport[];
  familyMembersMap: Record<string, string>;
  onUpload: () => void;
  onDelete: (id: string) => void;
}) {
  const [search, setSearch]     = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort]         = useState("date-desc");
  const [viewing, setViewing]   = useState<MedicalReport | null>(null);

  const memberReports = reports.filter(
    (r) => r.ownerType === "FAMILY_MEMBER" && r.ownerId === member.id,
  );

  const filtered = useMemo(
    () => applyFilters(memberReports, search, category, sort),
    [memberReports, search, category, sort],
  );

  const thisMonthAbbr = new Date().toLocaleString("en-US", { month: "short" });
  const thisMonthCount = memberReports.filter((r) =>
    r.uploadedDate.startsWith(thisMonthAbbr),
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <StatCard
          label={`${member.fullName.split(" ")[0]}'s Reports`}
          value={memberReports.length}
          accent="violet"
        />
        <StatCard label="This Month" value={thisMonthCount} accent="sky" />
        <button
          onClick={onUpload}
          className="ml-auto flex h-10 shrink-0 items-center gap-2 rounded-xl bg-teal px-4 text-xs font-medium text-bg hover:bg-teal/90"
        >
          <Upload className="h-4 w-4" /> Upload Report
        </button>
      </div>

      <SearchFilterBar
        search={search}     onSearch={setSearch}
        category={category} onCategory={setCategory}
        sort={sort}         onSort={setSort}
        count={filtered.length}
      />

      <ReportsGrid
        reports={filtered}
        familyMembersMap={familyMembersMap}
        onView={setViewing}
        onDownload={(r) => reportStorage.download(r)}
        onDelete={onDelete}
        onUpload={onUpload}
      />

      <ReportDetailSheet
        report={viewing}
        ownerLabel={`${member.fullName} (${member.relationship})`}
        open={!!viewing}
        onClose={() => setViewing(null)}
        onDownload={() => viewing && reportStorage.download(viewing)}
        onDelete={() => { if (viewing) { onDelete(viewing.id); setViewing(null); } }}
      />
    </div>
  );
}

// ── ReportsTab (main export) ──────────────────────────────────────────────────

export function ReportsTab({
  reports,
  onAddReport,
  onDeleteReport,
}: {
  reports: MedicalReport[];
  onAddReport: (r: MedicalReport) => void;
  onDeleteReport: (id: string) => void;
}) {
  const { selectedMember } = useFamilyContext();
  const [uploadOpen, setUploadOpen]           = useState(false);
  const [uploadOwnerType, setUploadOwnerType] = useState<ReportOwnerType>("PATIENT");
  const [uploadOwnerId, setUploadOwnerId]     = useState("");

  const familyMembersMap = useMemo(
    () => Object.fromEntries(
      initialFamilyMembers.map((m) => [m.id, `${m.fullName} (${m.relationship})`]),
    ),
    [],
  );

  const openUpload = (ownerType: ReportOwnerType = "PATIENT", ownerId = "") => {
    setUploadOwnerType(ownerType);
    setUploadOwnerId(ownerId);
    setUploadOpen(true);
  };

  // ── Family member selected globally → single-member view ─────────────────
  if (selectedMember !== null) {
    return (
      <>
        <FamilyMemberView
          member={selectedMember}
          reports={reports}
          familyMembersMap={familyMembersMap}
          onUpload={() => openUpload("FAMILY_MEMBER", selectedMember.id)}
          onDelete={onDeleteReport}
        />
        <UploadDialog
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          onSave={onAddReport}
          defaultOwnerType={uploadOwnerType}
          defaultOwnerId={uploadOwnerId}
        />
      </>
    );
  }

  // ── Default: primary patient → My Reports / Family Reports tabs ───────────
  const patientCount = reports.filter((r) => r.ownerType === "PATIENT").length;
  const familyCount  = reports.filter((r) => r.ownerType === "FAMILY_MEMBER").length;

  return (
    <>
      <Tabs defaultValue="my-reports">
        <TabsList className="mb-5 h-10 bg-surface-2">
          <TabsTrigger value="my-reports" className="text-xs gap-1.5">
            <User className="h-3.5 w-3.5" />
            My Reports
            <span className="ml-1 rounded-full bg-surface-3 px-1.5 py-0.5 qb-mono text-[9px]">
              {patientCount}
            </span>
          </TabsTrigger>
          <TabsTrigger value="family-reports" className="text-xs gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Family Reports
            <span className="ml-1 rounded-full bg-surface-3 px-1.5 py-0.5 qb-mono text-[9px]">
              {familyCount}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-reports">
          <MyReportsSection
            reports={reports}
            familyMembersMap={familyMembersMap}
            onUpload={() => openUpload("PATIENT")}
            onDelete={onDeleteReport}
          />
        </TabsContent>

        <TabsContent value="family-reports">
          <FamilyReportsSection
            reports={reports}
            familyMembersMap={familyMembersMap}
            onUploadForMember={(memberId) => openUpload("FAMILY_MEMBER", memberId)}
            onDelete={onDeleteReport}
          />
        </TabsContent>
      </Tabs>

      <UploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSave={onAddReport}
        defaultOwnerType={uploadOwnerType}
        defaultOwnerId={uploadOwnerId}
      />
    </>
  );
}
