import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { X, ChevronRight } from "lucide-react";
import { demoSteps } from "@/lib/qb-data";

export function DemoMode({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  if (!open) return null;
  const current = demoSteps[step];

  const next = () => {
    const n = Math.min(step + 1, demoSteps.length - 1);
    setStep(n);
    const path = demoSteps[n].path;
    if (path) navigate({ to: path });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[340px] overflow-hidden rounded-2xl border border-border-strong bg-surface-2/95 shadow-2xl backdrop-blur-xl qb-glow-teal">
      <div className="flex items-center justify-between border-b border-border-soft px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="qb-mono text-[10px] uppercase tracking-widest text-teal">Demo Mode</span>
          <span className="qb-mono text-[10px] text-muted">
            {step + 1} / {demoSteps.length}
          </span>
        </div>
        <button onClick={onClose} className="text-muted hover:text-fg">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="px-4 py-4">
        <div className="mb-3 flex items-center gap-2 text-2xl">{current.icon}</div>
        <h3 className="qb-display text-base font-semibold">{current.title}</h3>
        <p className="mt-1 text-sm text-muted">{current.body}</p>
      </div>

      <div className="flex items-center justify-between border-t border-border-soft px-4 py-3">
        <div className="flex gap-1.5">
          {demoSteps.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-5 bg-teal" : "w-1.5 bg-surface-3"
              }`}
            />
          ))}
        </div>
        {step < demoSteps.length - 1 ? (
          <button
            onClick={next}
            className="flex items-center gap-1 rounded-lg bg-teal px-3 py-1.5 text-xs font-medium text-bg hover:bg-teal/90"
          >
            Next <ChevronRight className="h-3 w-3" />
          </button>
        ) : (
          <button
            onClick={onClose}
            className="rounded-lg bg-teal px-3 py-1.5 text-xs font-medium text-bg hover:bg-teal/90"
          >
            Finish
          </button>
        )}
      </div>
    </div>
  );
}
