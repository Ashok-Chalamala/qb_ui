import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Layout } from "@/components/qb/Layout";
import { Bell, Mail, Smartphone, Shield, Lock, Download, Trash } from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings · Quest Beyond" },
      { name: "description", content: "Notifications, thresholds, privacy and integrations for Quest Beyond." },
    ],
  }),
  component: Settings,
});

function Settings() {
  const [s, setS] = useState({
    push: true,
    email: true,
    sms: false,
    glucoseHigh: 200,
    sleepLow: 5.5,
    hrHigh: 100,
    hipaaAudit: true,
    encryption: true,
    gdprExport: true,
    autoPurge: false,
  });

  const toggle = (k: keyof typeof s) => setS((p) => ({ ...p, [k]: !p[k] }));

  return (
    <Layout>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Notifications */}
        <Section title="Notifications" hint="How we reach you">
          <Toggle icon={<Bell className="h-4 w-4 text-teal" />} label="Push notifications" desc="Mobile app + desktop" value={s.push} onChange={() => toggle("push")} />
          <Toggle icon={<Mail className="h-4 w-4 text-sky" />} label="Email alerts" desc="Daily digest + critical events" value={s.email} onChange={() => toggle("email")} />
          <Toggle icon={<Smartphone className="h-4 w-4 text-violet" />} label="SMS" desc="Critical only" value={s.sms} onChange={() => toggle("sms")} />
        </Section>

        {/* Thresholds */}
        <Section title="Alert Thresholds" hint="When patterns become alerts">
          <Slider label="Glucose high" value={s.glucoseHigh} min={120} max={300} step={5} unit="mg/dL" accent="amber" onChange={(v) => setS({ ...s, glucoseHigh: v })} />
          <Slider label="Sleep low" value={s.sleepLow} min={3} max={9} step={0.5} unit="h" accent="violet" onChange={(v) => setS({ ...s, sleepLow: v })} />
          <Slider label="Heart rate high" value={s.hrHigh} min={70} max={160} step={5} unit="bpm" accent="rose" onChange={(v) => setS({ ...s, hrHigh: v })} />
        </Section>

        {/* Privacy */}
        <Section title="Privacy & Security" hint="HIPAA · GDPR · SOC2">
          <Toggle icon={<Shield className="h-4 w-4 text-teal" />} label="HIPAA audit logging" desc="Every read/write recorded" value={s.hipaaAudit} onChange={() => toggle("hipaaAudit")} />
          <Toggle icon={<Lock className="h-4 w-4 text-teal" />} label="At-rest encryption" desc="AES-256 · region-locked" value={s.encryption} onChange={() => toggle("encryption")} />
          <Toggle icon={<Download className="h-4 w-4 text-sky" />} label="GDPR data export" desc="Full bundle on request" value={s.gdprExport} onChange={() => toggle("gdprExport")} />
          <Toggle icon={<Trash className="h-4 w-4 text-rose" />} label="Auto-purge after 90 days" desc="Aggregated metrics only" value={s.autoPurge} onChange={() => toggle("autoPurge")} />
        </Section>

        {/* Integrations */}
        <Section title="Integrations" hint="Connected platforms">
          {[
            { name: "Epic EHR", desc: "FHIR R4 · OAuth2", status: "Connected", accent: "teal" },
            { name: "Apple Health", desc: "HealthKit · iOS 17+", status: "Authorized", accent: "sky" },
            { name: "Dexcom", desc: "Continuous glucose", status: "Connected", accent: "amber" },
            { name: "Google Fit", desc: "Activity + sleep", status: "Available", accent: "violet" },
          ].map((i) => (
            <div key={i.name} className="flex items-center justify-between rounded-xl border border-border-soft bg-surface-2 p-3">
              <div>
                <div className="text-sm font-medium">{i.name}</div>
                <div className="qb-mono text-[10px] uppercase tracking-widest text-muted">{i.desc}</div>
              </div>
              <span className={`qb-chip border-${i.accent}/40 text-${i.accent}`}>{i.status}</span>
            </div>
          ))}
        </Section>
      </div>
    </Layout>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="qb-card">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="qb-display text-sm font-semibold">{title}</h3>
        {hint && <span className="qb-mono text-[10px] uppercase tracking-widest text-muted">{hint}</span>}
      </div>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function Toggle({ icon, label, desc, value, onChange }: { icon: React.ReactNode; label: string; desc: string; value: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border-soft bg-surface-2 p-3">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-surface-3">{icon}</div>
      <div className="flex-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="qb-mono text-[10px] uppercase tracking-widest text-muted">{desc}</div>
      </div>
      <button
        onClick={onChange}
        className={`relative h-6 w-11 rounded-full transition-colors ${value ? "bg-teal" : "bg-surface-3"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-fg transition-transform ${
            value ? "translate-x-5" : "translate-x-0.5"
          }`}
          style={{ background: value ? "#03161a" : "#7B8CAA" }}
        />
      </button>
    </div>
  );
}

function Slider({ label, value, min, max, step, unit, accent, onChange }: { label: string; value: number; min: number; max: number; step: number; unit: string; accent: string; onChange: (v: number) => void }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="rounded-xl border border-border-soft bg-surface-2 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm">{label}</span>
        <span className={`qb-display text-base font-semibold text-${accent}`}>
          {value} <span className="qb-mono text-xs text-muted">{unit}</span>
        </span>
      </div>
      <div className="relative h-1.5 w-full rounded-full bg-surface-3">
        <div className="absolute h-full rounded-full" style={{ width: `${pct}%`, background: `var(--${accent})` }} />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
      <div className="mt-1 flex justify-between qb-mono text-[10px] text-muted">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}
