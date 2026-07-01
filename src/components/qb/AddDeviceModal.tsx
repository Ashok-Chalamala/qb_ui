import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Cpu, Link2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { DeviceItem } from "@/components/qb/DevicesTab";

type AddDeviceModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddDevice: (device: DeviceItem) => void;
};

type DeviceFormState = {
  deviceType: string;
  deviceName: string;
  manufacturer: string;
  deviceIdentifier: string;
  connectionMethod: string;
  dataTypes: string[];
  syncFrequency: string;
  status: string;
  notes: string;
};

type FormErrors = Partial<Record<"deviceType" | "deviceName" | "connectionMethod", string>>;

const DEVICE_TYPES = [
  "Apple Watch",
  "Fitbit",
  "Garmin",
  "Dexcom G7 CGM",
  "FreeStyle Libre",
  "OneTouch Glucose Meter",
  "Omron Blood Pressure Monitor",
  "Withings Scale",
  "Oura Ring",
  "SDOH Survey",
  "Other",
] as const;

const CONNECTION_METHODS = [
  "Bluetooth",
  "Apple Health",
  "Google Fit",
  "FHIR",
  "Manual Entry",
  "API Integration",
] as const;

const DATA_TYPE_OPTIONS = [
  "Heart Rate",
  "Blood Glucose",
  "Blood Pressure",
  "Steps",
  "Sleep",
  "Weight",
  "SpO2",
  "Temperature",
  "Activity",
  "Nutrition",
  "Social Determinants",
] as const;

const SYNC_FREQUENCIES = ["Real-time", "Every 15 minutes", "Hourly", "Daily", "Manual"] as const;
const STATUS_OPTIONS = ["Connected", "Pending", "Inactive"] as const;

const DEVICE_META: Record<string, { manufacturer: string; icon: string; accent: string }> = {
  "Apple Watch": { manufacturer: "Apple", icon: "⌚", accent: "teal" },
  Fitbit: { manufacturer: "Fitbit", icon: "⌚", accent: "teal" },
  Garmin: { manufacturer: "Garmin", icon: "⌚", accent: "teal" },
  "Dexcom G7 CGM": { manufacturer: "Dexcom", icon: "🩸", accent: "rose" },
  "FreeStyle Libre": { manufacturer: "Abbott", icon: "🩸", accent: "rose" },
  "OneTouch Glucose Meter": { manufacturer: "OneTouch", icon: "🧪", accent: "amber" },
  "Omron Blood Pressure Monitor": { manufacturer: "Omron", icon: "💓", accent: "amber" },
  "Withings Scale": { manufacturer: "Withings", icon: "⚖️", accent: "sky" },
  "Oura Ring": { manufacturer: "Oura", icon: "💍", accent: "violet" },
  "SDOH Survey": { manufacturer: "Quest Beyond", icon: "🏠", accent: "sky" },
  Other: { manufacturer: "", icon: "📱", accent: "teal" },
};

const AUTH_READY_METHODS = new Set(["Apple Health", "Google Fit", "FHIR", "API Integration"]);
const EMPTY_FORM: DeviceFormState = {
  deviceType: "",
  deviceName: "",
  manufacturer: "",
  deviceIdentifier: "",
  connectionMethod: "",
  dataTypes: [],
  syncFrequency: "Real-time",
  status: "Connected",
  notes: "",
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-[11px] text-rose">{message}</p>;
}

function FieldLabel({ children, required }: { children: string; required?: boolean }) {
  return (
    <Label className="mb-1.5 block text-xs text-muted">
      {children}
      {required && <span className="ml-1 text-rose">*</span>}
    </Label>
  );
}

export function AddDeviceModal({ open, onOpenChange, onAddDevice }: AddDeviceModalProps) {
  const [form, setForm] = useState<DeviceFormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});

  const authPanelVisible = useMemo(
    () => AUTH_READY_METHODS.has(form.connectionMethod),
    [form.connectionMethod],
  );

  const reset = () => {
    setForm(EMPTY_FORM);
    setErrors({});
  };

  const patch = <K extends keyof DeviceFormState>(key: K, value: DeviceFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === "deviceType" || key === "deviceName" || key === "connectionMethod") {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const setDeviceType = (value: string) => {
    const meta = DEVICE_META[value];
    setForm((prev) => ({
      ...prev,
      deviceType: value,
      manufacturer:
        !prev.manufacturer || prev.manufacturer === DEVICE_META[prev.deviceType]?.manufacturer
          ? meta?.manufacturer ?? ""
          : prev.manufacturer,
    }));
    setErrors((prev) => ({ ...prev, deviceType: undefined }));
  };

  const toggleDataType = (dataType: string, checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      dataTypes: checked
        ? [...prev.dataTypes, dataType]
        : prev.dataTypes.filter((item) => item !== dataType),
    }));
  };

  const validate = () => {
    const nextErrors: FormErrors = {};
    if (!form.deviceType) nextErrors.deviceType = "Device type is required.";
    if (!form.deviceName.trim()) nextErrors.deviceName = "Device name is required.";
    if (!form.connectionMethod) nextErrors.connectionMethod = "Connection method is required.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const meta = DEVICE_META[form.deviceType] ?? DEVICE_META.Other;
    onAddDevice({
      id: `d${Date.now()}`,
      name: form.deviceName.trim(),
      icon: meta.icon,
      status: form.status,
      lastSync: "Just now",
      dataTypes: form.dataTypes.length > 0 ? form.dataTypes.join(", ") : "Manual registration",
      accent: meta.accent,
    });
    toast.success("Device added successfully.");
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) reset();
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto rounded-2xl border-border-soft bg-surface p-0 shadow-[0_20px_60px_rgba(15,23,42,0.18)] sm:rounded-2xl">
        <div className="p-6 sm:p-7">
          <DialogHeader className="pr-10 text-left">
            <DialogTitle className="qb-display text-xl text-fg">Add Connected Device</DialogTitle>
            <DialogDescription className="text-sm text-muted">
              Connect a health device or manually register a supported device for this patient.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel required>Device Type</FieldLabel>
              <Select value={form.deviceType} onValueChange={setDeviceType}>
                <SelectTrigger className={cn("h-10 bg-surface-2", errors.deviceType && "border-rose/40 focus:ring-rose/20") }>
                  <SelectValue placeholder="Select device type" />
                </SelectTrigger>
                <SelectContent>
                  {DEVICE_TYPES.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.deviceType} />
            </div>

            <div>
              <FieldLabel required>Device Name</FieldLabel>
              <Input
                value={form.deviceName}
                onChange={(e) => patch("deviceName", e.target.value)}
                placeholder="Example: Apple Watch Series 10"
                className={cn("h-10 bg-surface-2", errors.deviceName && "border-rose/40 focus-visible:ring-rose/20")}
              />
              <FieldError message={errors.deviceName} />
            </div>

            <div>
              <FieldLabel>Manufacturer</FieldLabel>
              <Input
                value={form.manufacturer}
                onChange={(e) => patch("manufacturer", e.target.value)}
                placeholder="Manufacturer"
                className="h-10 bg-surface-2"
              />
            </div>

            <div>
              <FieldLabel>Device Identifier</FieldLabel>
              <Input
                value={form.deviceIdentifier}
                onChange={(e) => patch("deviceIdentifier", e.target.value)}
                placeholder="Serial Number or Device ID"
                className="h-10 bg-surface-2"
              />
            </div>

            <div>
              <FieldLabel required>Connection Method</FieldLabel>
              <Select value={form.connectionMethod} onValueChange={(value) => patch("connectionMethod", value)}>
                <SelectTrigger className={cn("h-10 bg-surface-2", errors.connectionMethod && "border-rose/40 focus:ring-rose/20") }>
                  <SelectValue placeholder="Select connection method" />
                </SelectTrigger>
                <SelectContent>
                  {CONNECTION_METHODS.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.connectionMethod} />
            </div>

            <div>
              <FieldLabel>Sync Frequency</FieldLabel>
              <Select value={form.syncFrequency} onValueChange={(value) => patch("syncFrequency", value)}>
                <SelectTrigger className="h-10 bg-surface-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SYNC_FREQUENCIES.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <FieldLabel>Status</FieldLabel>
              <Select value={form.status} onValueChange={(value) => patch("status", value)}>
                <SelectTrigger className="h-10 bg-surface-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2">
              <FieldLabel>Data Types</FieldLabel>
              <div className="grid grid-cols-1 gap-2 rounded-2xl border border-border-soft bg-surface-2 p-4 sm:grid-cols-2 lg:grid-cols-3">
                {DATA_TYPE_OPTIONS.map((option) => {
                  const checked = form.dataTypes.includes(option);
                  return (
                    <label key={option} className="flex cursor-pointer items-center gap-2 text-sm text-fg">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(state) => toggleDataType(option, state === true)}
                        aria-label={option}
                      />
                      <span>{option}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {authPanelVisible && (
              <div className="sm:col-span-2 rounded-2xl border border-dashed border-teal/30 bg-teal-soft/40 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-teal">
                  <Link2 className="h-4 w-4" /> Authorization Step Reserved
                </div>
                <p className="mt-1 text-xs text-muted">
                  This area is reserved for a future OAuth or provider authorization flow for {form.connectionMethod}.
                </p>
              </div>
            )}

            <div className="sm:col-span-2">
              <FieldLabel>Notes</FieldLabel>
              <Textarea
                value={form.notes}
                onChange={(e) => patch("notes", e.target.value)}
                placeholder="Additional information about this device."
                rows={4}
                className="resize-none bg-surface-2"
              />
            </div>
          </div>

          <DialogFooter className="mt-6 flex-row justify-end gap-2 space-x-0">
            <button
              type="button"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
              className="h-10 rounded-xl border border-teal/30 bg-white px-4 text-sm font-medium text-teal transition-colors hover:bg-teal-soft"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!form.deviceType || !form.deviceName.trim() || !form.connectionMethod}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-teal px-4 text-sm font-medium text-white transition-colors hover:bg-[#30B957] disabled:cursor-not-allowed disabled:bg-teal-soft disabled:text-teal/70"
            >
              <Cpu className="h-4 w-4" /> Add Device
            </button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
