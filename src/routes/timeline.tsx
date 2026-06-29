import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Layout } from "@/components/qb/Layout";
import { accentClass, severityAccent } from "@/lib/qb-data";
import { useMemberData } from "@/lib/family-context";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts";

const filters = ["All", "Glucose", "Wearable", "Symptoms", "Tests", "SDOH"];
const coverage = [
  { label: "Glucose", value: 7, total: 7, accent: "amber" },
  { label: "Wearable", value: 7, total: 7, accent: "teal" },
  { label: "Symptoms", value: 4, total: 7, accent: "violet" },
  { label: "Tests", value: 2, total: 7, accent: "sky" },
];

export const Route = createFileRoute("/timeline")({
  head: () => ({
    meta: [
      { title: "Timeline · Quest Beyond" },
      { name: "description", content: "Chronological view of every patient-generated signal across every source." },
    ],
  }),
  component: Timeline,
});

function Timeline() {
  const [active, setActive] = useState("All");
  const { data, isLoading } = useMemberData();
  const { timelineData, weeklyTrend, weeklyTrendLabel, weeklyTrendRefLine } = data;

  return (
    <Layout>
      <div className={`grid grid-cols-1 gap-4 lg:grid-cols-3 transition-opacity duration-300 ${isLoading ? "opacity-40 pointer-events-none" : ""}`}>
        <div className="space-y-4 lg:col-span-2">
          <div className="qb-card">
            <div className="flex flex-wrap items-center gap-2">
              {filters.map((f) => (
                <button
                  key={f}
                  onClick={() => setActive(f)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    active === f
                      ? "border-teal/50 bg-teal-soft text-teal"
                      : "border-border-strong bg-surface-2 text-muted hover:text-fg"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            {timelineData.map((group) => {
              const events = group.events.filter((e) => active === "All" || e.category === active);
              if (!events.length) return null;
              return (
                <div key={group.date}>
                  <div className="mb-2 flex items-center gap-3">
                    <h3 className="qb-display text-sm font-semibold">{group.date}</h3>
                    <div className="h-px flex-1 bg-border-soft" />
                    <span className="qb-mono text-[10px] uppercase tracking-widest text-muted">
                      {events.length} events
                    </span>
                  </div>
                  <div className="relative space-y-2 pl-5">
                    <div className="absolute left-1.5 top-2 bottom-2 w-px bg-border-strong" />
                    {events.map((e, i) => {
                      const accent = e.severity === "Alert" ? "rose" : accentClass[e.category === "Glucose" ? "amber" : e.category === "Wearable" ? "teal" : e.category === "Symptoms" ? "violet" : e.category === "Tests" ? "sky" : "lime"] ? (e.category === "Glucose" ? "amber" : e.category === "Wearable" ? "teal" : e.category === "Symptoms" ? "violet" : e.category === "Tests" ? "sky" : "lime") : "teal";
                      const ac = accentClass[accent];
                      return (
                        <div key={i} className="qb-card-hover relative rounded-xl border border-border-soft bg-surface p-3.5">
                          <span className={`absolute -left-[14px] top-5 h-3 w-3 rounded-full border-2 border-bg ${ac.bg.replace("bg-", "bg-")} ring-2 ${ac.ring}`} style={{ background: `var(--${accent})` }} />
                          <div className="flex items-center justify-between">
                            <div className="qb-mono text-[10px] uppercase tracking-widest text-muted">
                              {e.time} · {e.source}
                            </div>
                            {e.severity && (
                              <span className={`qb-chip border-rose/50 text-rose`}>{e.severity}</span>
                            )}
                          </div>
                          <div className="mt-1 text-sm font-medium">{e.title}</div>
                          {e.detail && <div className="mt-0.5 text-xs text-muted">{e.detail}</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          <div className="qb-card">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="qb-display text-sm font-semibold">{weeklyTrendLabel}</h3>
              <span className="qb-mono text-[10px] uppercase tracking-widest text-amber">↑ Rising</span>
            </div>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyTrend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <XAxis dataKey="day" stroke="#E2E8F0" tick={{ fill: "#94A3B8", fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis stroke="#E2E8F0" tick={{ fill: "#94A3B8", fontSize: 10 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
                  <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 12, boxShadow: "0 4px 12px rgba(15,23,42,0.08)" }} labelStyle={{ color: "#64748B", fontWeight: 500 }} />
                  <ReferenceLine y={weeklyTrendRefLine} stroke="#EF4444" strokeDasharray="4 3" />
                  <Line type="monotone" dataKey="value" stroke="#0EA5E9" strokeWidth={2} dot={{ fill: "#0EA5E9", r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="qb-card">
            <h3 className="qb-display mb-3 text-sm font-semibold">Data Coverage · 7d</h3>
            <div className="space-y-3">
              {coverage.map((c) => {
                const a = accentClass[c.accent];
                const pct = (c.value / c.total) * 100;
                return (
                  <div key={c.label}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span>{c.label}</span>
                      <span className={`qb-mono ${a.text}`}>{c.value}/{c.total}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `var(--${c.accent})` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <ApiFooter endpoints={["GET /timeline/{memberId}", "GET /trends/vitals/{memberId}"]} />
        </div>
      </div>
    </Layout>
  );
}

function ApiFooter({ endpoints }: { endpoints: string[] }) {
  return (
    <div className="qb-card border-dashed">
      <div className="mb-2 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-lime qb-pulse" />
        <span className="qb-mono text-[10px] uppercase tracking-widest text-muted">API · Live</span>
      </div>
      <div className="space-y-1">
        {endpoints.map((e) => (
          <div key={e} className="qb-mono text-[11px] text-muted">{e}</div>
        ))}
      </div>
    </div>
  );
}
