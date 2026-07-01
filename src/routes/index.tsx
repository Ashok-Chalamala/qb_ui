import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Layout } from "@/components/qb/Layout";
import { accentClass, severityAccent } from "@/lib/qb-data";
import { useMemberData } from "@/lib/family-context";
import { getAuthUser, Role } from "@/lib/auth";
import { AnimatedGauge } from "@/components/qb/AnimatedGauge";
import { Sparkline } from "@/components/qb/Sparkline";
import { GlucoseHeatmap } from "@/components/qb/GlucoseHeatmap";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { Heart, Activity, Droplet, AlertTriangle, Sparkles, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    const user = getAuthUser();
    if (user?.roles.includes(Role.ADMIN)) {
      throw redirect({ to: "/admin-integrations" });
    }
  },
  head: () => ({
    meta: [
      { title: "Dashboard · Quest Beyond" },
      { name: "description", content: "Single-pane view of patient health status, data sources, alerts and predictions." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data, isLoading } = useMemberData();
  const { dashboard: dashboardData, metricTrends, glucoseForecast } = data;
  const { healthScore, activeAlerts, stepsToday, stepsGoal, glucoseLatest, glucoseUnit, glucoseTrend, dataSources, alerts, forecast } = dashboardData;
  const stepsPct = Math.min(100, Math.round((stepsToday / stepsGoal) * 100));

  return (
    <Layout>
      <div className={`space-y-6 transition-opacity duration-300 ${isLoading ? "opacity-40 pointer-events-none" : ""}`}>
        {/* Stat row */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard accent="teal" label="Health Score" mono="Composite · 7d">
            <div className="flex items-center gap-4">
              <AnimatedGauge value={healthScore} size={84} stroke={7} color="var(--teal)" label="/ 100" />
              <div className="min-w-0 flex-1">
                <div className="qb-mono text-[10px] uppercase tracking-widest text-teal">↑ 4 vs last week</div>
                <div className="mt-2">
                  <Sparkline data={metricTrends.health} color="var(--teal)" width={140} height={32} />
                </div>
              </div>
            </div>
          </StatCard>

          <StatCard accent="rose" label="Active Alerts" mono="Last 24h" icon={<AlertTriangle className="h-4 w-4" />}>
            <div className="flex items-end justify-between gap-3">
              <div className="qb-display text-4xl font-bold text-rose">{activeAlerts}</div>
              <Sparkline data={metricTrends.alerts} color="var(--rose)" width={120} height={36} />
            </div>
            <div className="mt-3 flex items-center gap-1.5">
              {["Critical", "High", "Medium"].map((s) => (
                <span key={s} className={`qb-chip border-${severityAccent[s]}/40 text-${severityAccent[s]}`}>
                  {s}
                </span>
              ))}
            </div>
          </StatCard>

          <StatCard accent="lime" label="Steps Today" mono={`${stepsPct}% of goal`} icon={<Activity className="h-4 w-4" />}>
            <div className="flex items-end justify-between gap-3">
              <div className="qb-display text-3xl font-bold">{stepsToday.toLocaleString()}</div>
              <Sparkline data={metricTrends.steps} color="var(--lime)" width={120} height={36} />
            </div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
              <div className="h-full rounded-full bg-lime transition-all duration-1000" style={{ width: `${stepsPct}%` }} />
            </div>
            <div className="mt-1.5 flex justify-between qb-mono text-[10px] text-muted">
              <span>0</span>
              <span>{stepsGoal.toLocaleString()}</span>
            </div>
          </StatCard>

          <StatCard accent="amber" label="Glucose" mono="Latest · CGM" icon={<Droplet className="h-4 w-4" />}>
            <div className="flex items-end justify-between gap-3">
              <div className="flex items-baseline gap-2">
                <div className="qb-display text-3xl font-bold text-amber">{glucoseLatest}</div>
                <div className="qb-mono text-xs text-muted">{glucoseUnit}</div>
              </div>
              <Sparkline data={metricTrends.glucose} color="var(--amber)" width={120} height={36} />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="qb-chip border-amber/40 text-amber">{glucoseTrend} 7d</span>
              <span className="qb-mono text-[10px] text-muted">target &lt;180</span>
            </div>
          </StatCard>
        </div>

        {/* AI Health Summary */}
        <div className="qb-card relative overflow-hidden border-l-[3px] border-l-violet">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-soft">
                <Sparkles className="h-5 w-5 text-violet" />
              </div>
              <div className="min-w-0">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-fg">AI Health Summary</span>
                  <span className="qb-chip bg-violet-soft text-violet border-violet/20">Genie AI</span>
                  <span className="qb-chip bg-lime-soft text-lime border-lime/20">Updated just now</span>
                </div>
                <p className="text-sm leading-relaxed text-muted">
                  {data.memberName}’s fasting glucose has been elevated above target for 3 consecutive days, correlating
                  with reduced sleep averaging 4.5 h/night. Activity is 22% below baseline this week.
                </p>
                <ul className="mt-3 space-y-1.5">
                  <li className="flex items-start gap-2 text-xs text-muted">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-rose" />
                    <span><strong className="font-medium text-fg">Glucose pattern</strong> — Fasting &gt;200 mg/dL on 3 of 7 days · Confidence 94%</span>
                  </li>
                  <li className="flex items-start gap-2 text-xs text-muted">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber" />
                    <span><strong className="font-medium text-fg">Sleep correlation</strong> — Nights &lt;5 h precede next-day glucose spikes of +18% on average</span>
                  </li>
                  <li className="flex items-start gap-2 text-xs text-muted">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-lime" />
                    <span><strong className="font-medium text-fg">Top recommendation</strong> — 20-min post-dinner walk could reduce glucose variability by ~15%</span>
                  </li>
                </ul>
              </div>
            </div>
            <Link
              to="/genie"
              className="flex shrink-0 items-center gap-2 rounded-xl bg-teal px-4 py-2.5 text-sm font-medium text-[#fff] transition-colors hover:bg-sky"
            >
              <TrendingUp className="h-3.5 w-3.5" />
              Chat with Genie
            </Link>
          </div>
        </div>

        {/* Data sources + alerts */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="qb-card lg:col-span-2">
            <SectionHeader title="Patient-Generated Data Sources" hint="5 active streams" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {dataSources.map((ds) => {
                const a = accentClass[ds.accent];
                return (
                  <div key={ds.name} className="qb-card-hover flex items-center gap-3 rounded-xl border border-border-soft bg-surface-2 p-3">
                    <div className={`grid h-10 w-10 place-items-center rounded-lg text-lg ${a.bg}`}>
                      {ds.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{ds.name}</div>
                      <div className={`qb-mono text-[10px] uppercase tracking-widest ${a.text}`}>
                        <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current align-middle qb-pulse" />
                        {ds.status}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="qb-card">
            <SectionHeader title="Active Alerts" hint={`${activeAlerts} new`} />
            <div className="space-y-2.5">
              {alerts.map((a) => {
                const ac = accentClass[severityAccent[a.severity]];
                return (
                  <div key={a.title} className="flex items-start gap-3 rounded-xl border border-border-soft bg-surface-2 p-3">
                    <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm ${ac.bg}`}>{a.icon}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm leading-tight">{a.title}</div>
                      <div className={`qb-mono mt-1 text-[10px] uppercase tracking-widest ${ac.text}`}>{a.severity}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Heatmap */}
        <div className="qb-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <SectionHeader title="Glucose Heatmap" hint="7 days × 24h" noSpace />
              <p className="mt-1 text-xs text-muted">
                Time-in-range at a glance. Hover any cell for the exact reading.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="qb-chip border-teal/30 bg-teal-soft text-teal">62% in range</span>
              <span className="qb-chip border-amber/30 bg-amber-soft text-amber">28% elevated</span>
              <span className="qb-chip border-rose/30 bg-rose-soft text-rose">10% hyper</span>
            </div>
          </div>
          <div className="mt-4">
            <GlucoseHeatmap />
          </div>
        </div>

        {/* Forecast */}
        <div className="qb-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <SectionHeader title="24h Glucose Forecast" hint="Prophet model · v2.4" noSpace />
              <p className="mt-1 text-xs text-muted">
                Trained on 90 days of CGM, sleep, meals and stress signals.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-xl border border-amber/30 bg-amber-soft px-3 py-2 text-center">
                <div className="text-[10px] font-medium uppercase tracking-wide text-amber">Peak</div>
                <div className="qb-display text-lg font-bold text-amber">{forecast.peak} <span className="text-xs text-muted">mg/dL</span></div>
              </div>
              <div className="rounded-xl border border-rose/30 bg-rose-soft px-3 py-2 text-center">
                <div className="text-[10px] font-medium uppercase tracking-wide text-rose">Hyper Risk</div>
                <div className="qb-display text-lg font-bold text-rose">{forecast.risk}%</div>
              </div>
              <Link to="/genie" className="flex h-10 items-center gap-1.5 rounded-xl bg-teal px-3.5 text-xs font-medium text-[#fff] hover:bg-sky transition-colors">
                <Sparkles className="h-3.5 w-3.5" /> Ask Genie
              </Link>
            </div>
          </div>

          <div className="mt-4 h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={glucoseForecast} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="band" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="hour" stroke="#E2E8F0" tick={{ fill: "#94A3B8", fontSize: 10, fontFamily: "JetBrains Mono" }} tickLine={false} axisLine={false} interval={3} />
                <YAxis stroke="#E2E8F0" tick={{ fill: "#94A3B8", fontSize: 10, fontFamily: "JetBrains Mono" }} tickLine={false} axisLine={false} domain={[60, 240]} />
                <Tooltip
                  contentStyle={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 12, boxShadow: "0 4px 12px rgba(15,23,42,0.08)" }}
                  labelStyle={{ color: "#64748B", fontWeight: 500 }}
                />
                <ReferenceLine y={180} stroke="#EF4444" strokeDasharray="4 3" label={{ value: "Hyper 180", fill: "#EF4444", fontSize: 10, position: "right" }} />
                <ReferenceLine y={70}  stroke="#10B981" strokeDasharray="4 3" label={{ value: "Hypo 70",  fill: "#10B981", fontSize: 10, position: "right" }} />
                <Area type="monotone" dataKey="upper" stroke="none" fill="url(#band)" />
                <Area type="monotone" dataKey="lower" stroke="none" fill="#FFFFFF" />
                <Area type="monotone" dataKey="actual"   stroke="#0EA5E9" strokeWidth={2} fill="none" />
                <Area type="monotone" dataKey="forecast" stroke="#F59E0B" strokeWidth={2} strokeDasharray="6 3" fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted">
            <Legend color="#0EA5E9" label="Observed (Dexcom)" />
            <Legend color="#F59E0B" label="Forecast" dashed />
            <Legend color="#EF4444" label="Hyper threshold" dashed />
            <Legend color="#10B981" label="Hypo threshold" dashed />
          </div>
        </div>
      </div>
    </Layout>
  );
}

function StatCard({
  accent,
  label,
  mono,
  icon,
  children,
}: {
  accent: string;
  label: string;
  mono?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const a = accentClass[accent] ?? accentClass["teal"];
  return (
    <div className="qb-card qb-card-hover overflow-hidden">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`grid h-7 w-7 place-items-center rounded-lg ${a.bg} ${a.text}`}>
            {icon ?? <Heart className="h-4 w-4" />}
          </div>
          <div className="text-xs font-medium text-fg">{label}</div>
        </div>
        {mono && <div className="qb-mono text-[10px] uppercase tracking-widest text-muted">{mono}</div>}
      </div>
      {children}
    </div>
  );
}

function SectionHeader({ title, hint, noSpace }: { title: string; hint?: string; noSpace?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${noSpace ? "" : "mb-4"}`}>
      <h2 className="qb-display text-sm font-semibold tracking-tight">{title}</h2>
      {hint && <span className="qb-mono text-[10px] uppercase tracking-widest text-muted">{hint}</span>}
    </div>
  );
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="inline-block h-[2px] w-6"
        style={{
          background: dashed
            ? `repeating-linear-gradient(90deg, ${color} 0 4px, transparent 4px 8px)`
            : color,
        }}
      />
      <span>{label}</span>
    </div>
  );
}
