import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useState } from "react";

type Props = {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  label?: string;
};

export function AnimatedGauge({
  value,
  max = 100,
  size = 96,
  stroke = 8,
  color = "var(--teal)",
  trackColor = "var(--surface3)",
  label,
}: Props) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const target = Math.max(0, Math.min(max, value)) / max;

  const progress = useMotionValue(0);
  const dash = useTransform(progress, (p) => `${p * c} ${c}`);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(progress, target, {
      duration: 1.4,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.round(v * max)),
    });
    return () => controls.stop();
  }, [target, max, progress]);

  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={trackColor}
          strokeWidth={stroke}
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          style={{ strokeDasharray: dash }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="qb-display text-2xl font-bold leading-none" style={{ color }}>
            {display}
          </div>
          {label && (
            <div className="qb-mono mt-1 text-[9px] uppercase tracking-widest text-muted">
              {label}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
