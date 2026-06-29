import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { Layout } from "@/components/qb/Layout";
import { accentClass, severityAccent } from "@/lib/qb-data";
import { useMemberData } from "@/lib/family-context";
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from "recharts";

const sevFilters = ["All", "Critical", "High", "Medium"] as const;

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts · Quest Beyond" },
      { name: "description", content: "Severity-ranked patterns detected across patient-generated data." },
    ],
  }),
  component: Alerts,
});

function Alerts() {
  const { data, isLoading } = useMemberData();
  const { alertsData, alertHistory } = data;
  const [filter, setFilter] = useState<(typeof sevFilters)[number]>("All");
  const [acked, setAcked] = useState<string[]>([]);

  // Reset acknowledged list when the active member changes
  useEffect(() => {
    setAcked([]);
    setFilter("All");
  }, [alertsData]);

  const filtered = useMemo(
    () => alertsData.filter((a) => filter === "All" || a.severity === filter),
    [filter, alertsData],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: alertsData.length };
    for (const a of alertsData) c[a.severity] = (c[a.severity] ?? 0) + 1;
    return c;
  }, [alertsData]);

  return (
    <Layout>
      <div className={`grid grid-cols-1 gap-4 lg:grid-cols-3 transition-opacity duration-300 ${isLoading ? "opacity-40 pointer-events-none" : ""}`}>
        <div className="lg:col-span-2 space-y-4">
          <div className="qb-card flex flex-wrap items-center gap-2">
            {sevFilters.map((s) => {
              const a = s === "All" ? null : accentClass[severityAccent[s]];
              return (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${
                    filter === s
                      ? a
                        ? `border-${severityAccent[s]}/50 ${a.bg} ${a.text}`
                        : "border-teal/50 bg-teal-soft text-teal"
                      : "border-border-strong bg-surface-2 text-muted hover:text-fg"
                  }`}
                >
                  <span>{s}</span>
                  <span className="qb-mono text-[10px] opacity-70">{counts[s] ?? 0}</span>
                </button>
              );
            })}
          </div>

          <div className="space-y-3">
            {filtered.map((a) => {
              const accent = severityAccent[a.severity];
              const ac = accentClass[accent];
              const isAcked = acked.includes(a.id);
              return (
                <div
                  key={a.id}
                  className={`qb-card relative overflow-hidden ${isAcked ? "opacity-60" : ""}`}
                >
                  <span
                    className="absolute left-0 top-0 h-full w-1"
                    style={{ background: `var(--${accent})` }}
                  />
                  <div className="flex items-start gap-4">
                    <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl ${ac.bg}`}>{a.icon}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="qb-display text-sm font-semibold">{a.title}</h3>
                        <span className={`qb-chip border-${accent}/40 ${ac.text}`}>{a.severity}</span>
                        {isAcked && <span className="qb-chip border-lime/40 text-lime">✓ Acknowledged</span>}
                      </div>
                      <p className="mt-1.5 text-xs text-muted">{a.description}</p>
                      <div className="mt-2 flex flex-wrap gap-3 qb-mono text-[10px] uppercase tracking-widest text-muted">
                        {a.meta.map((m) => (
                          <span key={m}>{m}</span>
                        ))}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {a.actions.map((act, i) => (
                          <button
                            key={act}
                            onClick={() => act === "Acknowledge" && setAcked((prev) => [...prev, a.id])}
                            className={
                              i === 0
                                ? "h-8 rounded-xl bg-teal px-3 text-xs font-medium text-[#fff] hover:bg-sky transition-colors"
                                : "h-8 rounded-xl border border-border-strong bg-surface-2 px-3 text-xs text-muted hover:text-fg"
                            }
                          >
                            {act}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="qb-card">
            <h3 className="qb-display mb-3 text-sm font-semibold">Alert Summary</h3>
            <div className="space-y-2">
              {["Critical", "High", "Medium"].map((s) => {
                const a = accentClass[severityAccent[s]];
                return (
                  <div key={s} className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2">
                    <div className={`flex items-center gap-2 text-xs ${a.text}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" /> {s}
                    </div>
                    <div className="qb-mono text-xs">{counts[s] ?? 0}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="qb-card">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="qb-display text-sm font-semibold">30-day History</h3>
              <span className="qb-mono text-[10px] uppercase tracking-widest text-muted">trend ↑</span>
            </div>
            <div className="h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={alertHistory} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <XAxis dataKey="day" hide />
                  <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 12, boxShadow: "0 4px 12px rgba(15,23,42,0.08)" }} labelStyle={{ color: "#64748B" }} cursor={{ fill: "rgba(15,23,42,0.03)" }} />
                  <Bar dataKey="count" fill="#EF4444" radius={[3, 3, 0, 0]} fillOpacity={0.70} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="qb-card border-dashed">
            <div className="qb-mono text-[10px] uppercase tracking-widest text-muted">Alert API</div>
            <div className="mt-2 space-y-1">
              <div className="qb-mono text-[11px] text-muted">GET /alerts</div>
              <div className="qb-mono text-[11px] text-muted">POST /alerts/{`{id}`}/acknowledge</div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
