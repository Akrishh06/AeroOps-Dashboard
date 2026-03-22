"use client";

import { formatConfidence, formatFindingTime } from "@/lib/format";
import type { Finding, FindingSeverity } from "@/types/telemetry";

const sevStyle: Record<FindingSeverity, string> = {
  info: "text-sky-300/90",
  watch: "text-amber-200/90",
  alert: "text-rose-300/90",
};

export function FindingsFeed({ findings }: { findings: Finding[] }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <p className="micro-label mb-2 shrink-0 text-dim">Findings</p>
      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {findings.map((f) => (
          <li
            key={f.id}
            className="rounded border border-white/[0.05] bg-black/20 px-2.5 py-2"
          >
            <div className="flex items-start justify-between gap-2">
              <span className={`text-[11px] font-medium ${sevStyle[f.severity]}`}>
                {f.type}
              </span>
              <span className="shrink-0 font-mono text-[9px] text-dim tabular-nums">
                {formatFindingTime(f.at_ms)}
              </span>
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-dim">{f.note}</p>
            <p className="mt-1 font-mono text-[9px] text-dim">
              {formatConfidence(f.confidence_pct)} conf · {f.duct_offset_m.toFixed(1)} m
            </p>
            <p className="mt-0.5 font-mono text-[8px] leading-tight text-dim/90">
              xyz{" "}
              <span className="text-ink/55">
                {f.location.x.toFixed(2)}, {f.location.y.toFixed(2)},{" "}
                {f.location.z.toFixed(2)}
              </span>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
