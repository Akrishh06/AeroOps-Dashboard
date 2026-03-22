"use client";

import { motion } from "framer-motion";

import type { ViewMode } from "@/types/telemetry";

const labels: Record<ViewMode, string> = {
  live: "Live",
  findings: "Findings",
  context: "Context",
};

export function ModeSwitcher({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (m: ViewMode) => void;
}) {
  const modes: ViewMode[] = ["live", "findings", "context"];
  return (
    <div className="flex rounded border border-white/[0.08] bg-black/30 p-0.5">
      {modes.map((m) => {
        const active = m === value;
        return (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            className="relative px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider"
          >
            {active ? (
              <motion.span
                layoutId="mode-pill"
                className="absolute inset-0 rounded bg-white/[0.08]"
                transition={{ type: "spring", stiffness: 400, damping: 34 }}
              />
            ) : null}
            <span className={`relative z-10 ${active ? "text-ink" : "text-dim"}`}>
              {labels[m]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
