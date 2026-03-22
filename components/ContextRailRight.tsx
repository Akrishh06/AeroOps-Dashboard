"use client";

import { FindingsFeed } from "@/components/FindingsFeed";
import { RiskIndicator } from "@/components/RiskIndicator";
import { formatDistance } from "@/lib/format";
import type { Finding, RiskBand, ViewMode } from "@/types/telemetry";

export function ContextRailRight({
  viewMode,
  site_name,
  asset_id,
  duct_section,
  inspection_id,
  distance_travelled_m,
  position_m,
  last_finding_type,
  risk_score,
  risk_band,
  recommended_action,
  findings,
}: {
  viewMode: ViewMode;
  site_name: string;
  asset_id: string;
  duct_section: string;
  inspection_id: string;
  distance_travelled_m: number;
  position_m: number;
  last_finding_type: string | null;
  risk_score: number;
  risk_band: RiskBand;
  recommended_action: string;
  findings: Finding[];
}) {
  const dim = viewMode === "findings";
  return (
    <aside
      className={`flex w-[min(300px,28vw)] shrink-0 flex-col gap-2 overflow-hidden border-l border-white/[0.06] bg-void/60 px-3 py-3 backdrop-blur-sm transition-opacity ${
        dim ? "opacity-75" : ""
      }`}
    >
      <div className="rounded-md border border-white/[0.06] bg-panel/80 px-3 py-2.5 shadow-insetline backdrop-blur-sm">
        <p className="micro-label mb-2 text-dim">Site & asset</p>
        <p className="text-[12px] text-ink">{site_name}</p>
        <p className="mt-1 font-mono text-[11px] text-dim">{asset_id}</p>
        <p className="mt-2 text-[11px] text-ink/85">{duct_section}</p>
        <p className="mt-1 font-mono text-[10px] text-dim">{inspection_id}</p>
      </div>
      <div className="rounded-md border border-white/[0.06] bg-panel/80 px-3 py-2.5 shadow-insetline backdrop-blur-sm">
        <p className="micro-label mb-2 text-dim">Traverse</p>
        <p className="font-mono text-[12px] text-ink">
          {formatDistance(distance_travelled_m)} travelled
        </p>
        <p className="mt-1 font-mono text-[11px] text-dim">
          Position {formatDistance(position_m)}
        </p>
        {last_finding_type ? (
          <p className="mt-2 text-[10px] text-dim">
            Last: <span className="text-ink/80">{last_finding_type}</span>
          </p>
        ) : null}
      </div>
      <RiskIndicator band={risk_band} score={risk_score} />
      <div className="rounded-md border border-white/[0.06] bg-panel/80 px-3 py-2.5 shadow-insetline backdrop-blur-sm">
        <p className="micro-label mb-1.5 text-dim">Recommended</p>
        <p className="text-[10px] leading-relaxed text-ink/85">{recommended_action}</p>
      </div>
      <FindingsFeed
        findings={findings}
        siteContext={{
          site_name,
          duct_section,
          inspection_id,
          asset_id,
        }}
      />
    </aside>
  );
}
