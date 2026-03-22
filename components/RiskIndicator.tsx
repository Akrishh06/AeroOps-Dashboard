"use client";

import type { RiskBand } from "@/types/telemetry";

const copy: Record<RiskBand, string> = {
  LOW: "Within band",
  MED: "Elevated",
  HIGH: "Critical",
};

export function RiskIndicator({ band, score }: { band: RiskBand; score: number }) {
  const bar =
    band === "LOW"
      ? "bg-emerald-500/70"
      : band === "MED"
        ? "bg-amber-500/70"
        : "bg-rose-500/80";
  return (
    <div className="rounded-md border border-white/[0.06] bg-panel/80 px-3 py-2.5 shadow-insetline backdrop-blur-sm">
      <p className="micro-label mb-2 text-dim">Risk</p>
      <div className="mb-1 flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${bar}`} />
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink">
          {band}
        </span>
      </div>
      <p className="text-[10px] leading-snug text-dim">{copy[band]}</p>
      <p className="mt-2 font-mono text-[12px] text-ink/90 tabular-nums">
        Score {score}
      </p>
    </div>
  );
}
