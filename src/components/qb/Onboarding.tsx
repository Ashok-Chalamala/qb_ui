import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Activity, Cpu, Sparkles, Rocket, ArrowRight, X } from "lucide-react";

const STORAGE_KEY = "qb_onboarded_v1";

const steps = [
  {
    icon: Rocket,
    eyebrow: "Welcome",
    title: "What happens between visits?",
    body: "Quest Beyond captures the 99% of health data Epic never sees — wearables, home tests, symptoms, and social context — and turns it into clinical signal.",
    accent: "teal" as const,
  },
  {
    icon: Cpu,
    eyebrow: "Step 1 · Connect",
    title: "Five live data streams",
    body: "Apple Watch, Dexcom CGM, home test kits, symptom logger, and SDOH surveys — all flowing in real time into one timeline.",
    accent: "violet" as const,
  },
  {
    icon: Activity,
    eyebrow: "Step 2 · Detect",
    title: "Patterns, not single points",
    body: "Our model spots multi-day correlations across sleep, glucose, stress and activity — and ranks them by clinical urgency.",
    accent: "amber" as const,
  },
  {
    icon: Sparkles,
    eyebrow: "Step 3 · Explain",
    title: "Genie speaks human",
    body: "Patients and families get plain-language answers — what the data means, what to watch, and when to act.",
    accent: "rose" as const,
  },
];

const accentMap = {
  teal: { fg: "var(--teal)", soft: "var(--teal2)" },
  violet: { fg: "var(--violet)", soft: "var(--violet2)" },
  amber: { fg: "var(--amber)", soft: "var(--amber2)" },
  rose: { fg: "var(--rose)", soft: "var(--rose2)" },
};

export function Onboarding({ forceOpen, onClose }: { forceOpen?: boolean; onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    if (forceOpen) {
      setOpen(true);
      setI(0);
      return;
    }
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
  }, [forceOpen]);

  function close() {
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
    onClose?.();
  }

  function next() {
    if (i < steps.length - 1) setI(i + 1);
    else close();
  }

  const step = steps[i];
  const Icon = step.icon;
  const accent = accentMap[step.accent];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-bg/80 p-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border-strong bg-surface"
            initial={{ scale: 0.94, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* glow halo */}
            <motion.div
              key={`glow-${i}`}
              className="pointer-events-none absolute -top-32 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full blur-3xl"
              style={{ background: accent.fg, opacity: 0.18 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.18 }}
            />

            <button
              onClick={close}
              className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-lg border border-border-soft bg-surface-2 text-muted hover:text-fg"
              aria-label="Skip onboarding"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative px-8 pt-10 pb-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div
                    className="grid h-14 w-14 place-items-center rounded-2xl ring-1"
                    style={{ background: accent.soft, color: accent.fg, boxShadow: `0 0 40px -8px ${accent.fg}` }}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <div
                    className="qb-mono mt-5 text-[10px] uppercase tracking-[0.25em]"
                    style={{ color: accent.fg }}
                  >
                    {step.eyebrow}
                  </div>
                  <h2 className="qb-display mt-2 text-2xl font-semibold leading-tight text-fg">
                    {step.title}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{step.body}</p>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-border-soft bg-surface-2 px-6 py-4">
              <div className="flex items-center gap-1.5">
                {steps.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setI(idx)}
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width: idx === i ? 24 : 8,
                      background: idx === i ? accent.fg : "var(--surface3)",
                    }}
                    aria-label={`Go to step ${idx + 1}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={close}
                  className="qb-mono text-[10px] uppercase tracking-widest text-muted hover:text-fg"
                >
                  Skip
                </button>
                <button
                  onClick={next}
                  className="flex h-9 items-center gap-1.5 rounded-lg px-4 text-xs font-semibold transition-transform hover:scale-[1.03]"
                  style={{ background: accent.fg, color: "#03161a" }}
                >
                  {i === steps.length - 1 ? "Enter Quest Beyond" : "Continue"}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
