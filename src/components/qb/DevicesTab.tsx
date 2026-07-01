import { useState } from "react";
import { accentClass } from "@/lib/qb-data";
import { useFamilyContext } from "@/lib/family-context";
import { Cpu, Plus, RefreshCw, Trash2 } from "lucide-react";
import { AddDeviceModal } from "@/components/qb/AddDeviceModal";

export type DeviceItem = {
  id: string;
  name: string;
  icon: string;
  status: string;
  lastSync: string;
  dataTypes: string;
  accent: string;
};

function statusAccent(status: string) {
  if (status === "Needs Reconnect") return "rose";
  if (status === "Pending") return "amber";
  if (status === "Inactive" || status === "Active") return "violet";
  return "teal";
}

function DeviceStatusBadge({ status }: { status: string }) {
  const accent = statusAccent(status);
  const a = accentClass[accent];

  return (
    <span className={`qb-chip border-${accent}/40 ${a.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full bg-current ${status === "Connected" ? "qb-pulse" : ""}`} />
      {status}
    </span>
  );
}

function DeviceCard({
  device,
  syncing,
  onSync,
  onRemove,
}: {
  device: DeviceItem;
  syncing: boolean;
  onSync: () => void;
  onRemove: () => void;
}) {
  const accent = statusAccent(device.status);
  const a = accentClass[accent];

  return (
    <div className="qb-card qb-card-hover">
      <div className="flex items-start gap-4">
        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl ${a.bg}`}>
          {device.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="qb-display text-sm font-semibold">{device.name}</h3>
            <DeviceStatusBadge status={device.status} />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="qb-mono text-[9px] uppercase tracking-widest text-muted">Last sync</div>
              <div className="qb-mono text-muted-foreground">{device.lastSync}</div>
            </div>
            <div>
              <div className="qb-mono text-[9px] uppercase tracking-widest text-muted">Data types</div>
              <div className="truncate text-xs">{device.dataTypes}</div>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={onSync}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-border-strong bg-surface-2 px-3 text-xs hover:border-teal/40 hover:text-teal"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing…" : "Sync"}
            </button>
            <button
              onClick={onRemove}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-border-strong bg-surface-2 px-3 text-xs text-muted hover:border-rose/40 hover:text-rose"
            >
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DevicesTab({
  devices,
  onDevicesChange,
}: {
  devices: DeviceItem[];
  onDevicesChange: (devices: DeviceItem[]) => void;
}) {
  const { selectedMember } = useFamilyContext();
  const [syncing, setSyncing] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const sync = (id: string) => {
    setSyncing(id);
    setTimeout(() => {
      setSyncing(null);
      onDevicesChange(
        devices.map((x) => (x.id === id ? { ...x, lastSync: "just now", status: "Connected" } : x)),
      );
    }, 900);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="qb-display text-lg font-semibold">Connected Devices</h2>
          <p className="text-xs text-muted">
            {selectedMember !== null
              ? `${devices.length} sources visible while managing ${selectedMember.fullName}.`
              : `${devices.length} sources streaming into Quest Beyond.`}
          </p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="flex h-10 items-center gap-2 rounded-xl bg-teal px-4 text-xs font-medium text-white hover:bg-[#30B957]"
        >
          <Plus className="h-4 w-4" /> Add Device
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {devices.map((d) => {
          return (
            <DeviceCard
              key={d.id}
              device={d}
              syncing={syncing === d.id}
              onSync={() => sync(d.id)}
              onRemove={() => onDevicesChange(devices.filter((x) => x.id !== d.id))}
            />
          );
        })}
      </div>

      <div className="qb-card border-dashed">
        <div className="mb-2 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-lime qb-pulse" />
          <span className="qb-mono text-[10px] uppercase tracking-widest text-muted">Ingestion API</span>
        </div>
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {[
            "GET /devices",
            "POST /devices",
            "DELETE /devices/{id}",
            "POST /sync/{id}",
            "POST /ingest",
            "POST /ingest/batch",
          ].map((e) => (
            <div key={e} className="qb-mono text-[11px] text-muted">{e}</div>
          ))}
        </div>
      </div>

      <AddDeviceModal
        open={addOpen}
        onOpenChange={setAddOpen}
        onAddDevice={(device) => onDevicesChange([device, ...devices])}
      />
    </div>
  );
}
