"use client";

import { formatConfidence, formatFindingTime } from "@/lib/format";
import { maintenanceTextForFinding } from "@/lib/findingMaintenance";
import { cn } from "@/lib/utils";
import type { Finding, FindingSeverity } from "@/types/telemetry";

export type FindingSiteContext = {
  site_name: string;
  duct_section: string;
  inspection_id: string;
  asset_id: string;
};

const sevStyle: Record<FindingSeverity, string> = {
  info: "text-sky-300/90",
  watch: "text-amber-200/90",
  alert: "text-rose-300/90",
};

const sevLabel: Record<FindingSeverity, string> = {
  info: "Info",
  watch: "Watch",
  alert: "Alert",
};

function maintenanceMailto(): string {
  const e = process.env.NEXT_PUBLIC_MAINTENANCE_CONTACT_EMAIL?.trim();
  const subj = encodeURIComponent("AeroOps — maintenance / work order");
  if (e) return `mailto:${e}?subject=${subj}`;
  return `mailto:?subject=${subj}`;
}

export function FindingIssueCard({
  finding: f,
  siteContext,
  className,
}: {
  finding: Finding;
  siteContext: FindingSiteContext;
  className?: string;
}) {
  const placeLine = [siteContext.site_name, f.duct_section || siteContext.duct_section]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={cn("rounded border border-white/[0.06] bg-[#0f1218]/95 px-2.5 py-2.5 shadow-xl shadow-black/40 backdrop-blur-md", className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className={`text-[11px] font-semibold ${sevStyle[f.severity]}`}>{f.type}</span>
          <span className="ml-2 rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wide text-dim">
            {sevLabel[f.severity]}
          </span>
        </div>
        <span className="shrink-0 font-mono text-[9px] text-dim tabular-nums">
          {formatFindingTime(f.at_ms)}
        </span>
      </div>
      {f.note ? (
        <p className="mt-1.5 text-[10px] leading-relaxed text-ink/85">{f.note}</p>
      ) : null}

      <div className="mt-2.5 border-t border-white/[0.05] pt-2">
        <p className="micro-label mb-1 text-dim">Exact location</p>
        <p className="text-[10px] leading-snug text-ink/80">{placeLine}</p>
        <p className="mt-0.5 font-mono text-[9px] text-dim">
          Inspection <span className="text-ink/70">{siteContext.inspection_id}</span> · Asset{" "}
          <span className="text-ink/70">{siteContext.asset_id}</span>
        </p>
        <p className="mt-1.5 font-mono text-[9px] text-dim">
          Along duct: <span className="tabular-nums text-ink/75">{f.duct_offset_m.toFixed(2)} m</span>{" "}
          <span className="text-dim/80">·</span> model confidence{" "}
          <span className="tabular-nums text-ink/75">{formatConfidence(f.confidence_pct)}</span>
        </p>
        <p className="mt-1 font-mono text-[9px] leading-relaxed text-ink/90">
          <span className="text-dim">Map frame (m)</span>{" "}
          <span className="tabular-nums">
            x={f.location.x.toFixed(3)} · y={f.location.y.toFixed(3)} · z={f.location.z.toFixed(3)}
          </span>
        </p>
      </div>

      <div className="mt-2.5 border-t border-white/[0.05] pt-2">
        <p className="micro-label mb-1 text-dim">For maintenance</p>
        <p className="text-[10px] leading-relaxed text-ink/80">{maintenanceTextForFinding(f)}</p>
        <a
          href={maintenanceMailto()}
          onClick={(e) => e.stopPropagation()}
          className="mt-2.5 inline-flex w-full items-center justify-center rounded-md bg-emerald-600 px-3 py-2 text-center text-[11px] font-semibold text-white shadow-sm transition-colors hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
        >
          Contact
        </a>
      </div>
    </div>
  );
}
