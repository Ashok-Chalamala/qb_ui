import { motion } from "framer-motion";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

// Deterministic mock: glucose mg/dL per (day, hour)
function genCell(d: number, h: number) {
  const meal = h >= 7 && h <= 9 ? 30 : h >= 12 && h <= 14 ? 45 : h >= 18 && h <= 20 ? 50 : 0;
  const night = h >= 0 && h <= 5 ? -15 : 0;
  const drift = d * 6; // worsens through week
  const noise = Math.sin(d * 1.7 + h * 0.6) * 12;
  return Math.round(110 + meal + night + drift + noise);
}

// Clinical glucose colour scale (WCAG-compliant contrast)
function color(v: number) {
  if (v < 70)  return "#EF4444";  // Red    — hypoglycaemic
  if (v < 140) return "#10B981";  // Green  — in-range
  if (v < 180) return "#F59E0B";  // Amber  — elevated
  return "#EF4444";               // Red    — hyperglycaemic
}

function alpha(v: number) {
  if (v < 70)  return 0.65;
  if (v < 140) return 0.15 + ((v - 70) / 70) * 0.40;   // 0.15 → 0.55
  if (v < 180) return 0.50 + ((v - 140) / 40) * 0.25;  // 0.50 → 0.75
  return Math.min(0.90, 0.72 + (v - 180) / 100);
}

export function GlucoseHeatmap() {
  return (
    <div className="qb-scroll overflow-x-auto">
      <div className="min-w-[640px]">
        <div className="grid grid-cols-[40px_1fr] gap-2">
          <div />
          <div className="grid grid-cols-24 qb-mono text-[9px] uppercase tracking-widest text-muted" style={{ gridTemplateColumns: "repeat(24, 1fr)" }}>
            {HOURS.map((h) => (
              <div key={h} className="text-center">
                {h % 3 === 0 ? `${h}` : ""}
              </div>
            ))}
          </div>
        </div>

        {DAYS.map((day, di) => (
          <div key={day} className="mt-1 grid grid-cols-[40px_1fr] items-center gap-2">
            <div className="qb-mono text-[10px] uppercase tracking-widest text-muted">{day}</div>
            <div className="grid gap-[3px]" style={{ gridTemplateColumns: "repeat(24, 1fr)" }}>
              {HOURS.map((h) => {
                const v = genCell(di, h);
                return (
                  <motion.div
                    key={h}
                    className="group relative aspect-square rounded-[3px] border border-border-soft"
                    style={{
                      background: color(v),
                      opacity: alpha(v),
                    }}
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: alpha(v), scale: 1 }}
                    transition={{ delay: (di * 24 + h) * 0.004, duration: 0.25 }}
                    whileHover={{ scale: 1.4, zIndex: 5 }}
                  >
                    <div className="pointer-events-none absolute -top-9 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-border-strong bg-surface px-2.5 py-1.5 qb-mono text-[10px] text-fg shadow-md group-hover:block">
                      {day} {h}:00 · <span className="font-semibold">{v} mg/dL</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="mt-4 flex flex-wrap items-center gap-5 border-t border-border-soft pt-3 text-xs text-muted">
          <Legend color="#EF4444" label="&lt; 70 Hypoglycaemic" />
          <Legend color="#10B981" label="70–140 In Range" />
          <Legend color="#F59E0B" label="140–180 Elevated" />
          <Legend color="#EF4444" label="&gt; 180 Hyperglycaemic" opacity={0.90} />
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label, opacity = 0.85 }: { color: string; label: string; opacity?: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-block h-3 w-3 rounded-[3px]" style={{ background: color, opacity }} />
      <span>{label}</span>
    </div>
  );
}
