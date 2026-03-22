"use client";

import { useEffect, useMemo, useRef } from "react";

import { FindingIssueCard, type FindingSiteContext } from "@/components/FindingIssueCard";
import { findingLocationToWorld } from "@/lib/mapFindingWorld";
import { cn } from "@/lib/utils";
import { useTelemetryStore } from "@/store/telemetryStore";
import type { Finding, FindingSeverity } from "@/types/telemetry";

export type { FindingSiteContext };

function sortFindings(list: Finding[]): Finding[] {
  const order: Record<FindingSeverity, number> = { alert: 0, watch: 1, info: 2 };
  return [...list].sort((a, b) => {
    const d = order[a.severity] - order[b.severity];
    if (d !== 0) return d;
    return b.at_ms - a.at_ms;
  });
}

export function FindingsFeed({
  findings,
  siteContext,
  className = "",
}: {
  findings: Finding[];
  siteContext: FindingSiteContext;
  className?: string;
}) {
  const sorted = useMemo(() => sortFindings(findings), [findings]);
  const listRef = useRef<HTMLUListElement>(null);
  const selectedFindingId = useTelemetryStore((s) => s.selectedFindingId);
  const setSelectedFindingId = useTelemetryStore((s) => s.setSelectedFindingId);
  const requestMapFocusAt = useTelemetryStore((s) => s.requestMapFocusAt);
  const mapFrame = useTelemetryStore((s) => s.mapFrame);
  const setViewMode = useTelemetryStore((s) => s.setViewMode);
  const setMapViewportMode = useTelemetryStore((s) => s.setMapViewportMode);

  useEffect(() => {
    if (!selectedFindingId || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-finding-id="${CSS.escape(selectedFindingId)}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedFindingId]);

  const activateFinding = (f: Finding) => {
    setSelectedFindingId(f.id);
    setViewMode("live");
    setMapViewportMode("model");
    if (mapFrame) {
      requestMapFocusAt(findingLocationToWorld(f.location, mapFrame));
    }
  };

  return (
    <div className={`flex min-h-0 flex-1 flex-col overflow-hidden ${className}`}>
      <div className="mb-2 flex shrink-0 items-baseline justify-between gap-2 pr-1">
        <p className="micro-label text-dim">Places needing work</p>
        <span className="font-mono text-[9px] text-dim tabular-nums">
          {sorted.length} issue{sorted.length === 1 ? "" : "s"}
        </span>
      </div>
      <ul ref={listRef} className="min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1">
        {sorted.length === 0 ? (
          <li className="rounded border border-white/[0.05] bg-black/20 px-2.5 py-4 text-center text-[10px] text-dim">
            No open findings from the API for this run. When the backend reports issues, they appear here with
            exact map coordinates and maintenance notes.
          </li>
        ) : null}
        {sorted.map((f) => {
          const selected = f.id === selectedFindingId;
          return (
            <li
              key={f.id}
              data-finding-id={f.id}
              role="button"
              tabIndex={0}
              className={cn(
                "cursor-pointer rounded border bg-black/25 px-2.5 py-2.5 text-left shadow-insetline outline-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500/40",
                selected
                  ? "border-emerald-500/35 ring-1 ring-emerald-500/25"
                  : "border-white/[0.06] hover:border-white/[0.12] hover:bg-black/35",
              )}
              onClick={() => activateFinding(f)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  activateFinding(f);
                }
              }}
            >
              <FindingIssueCard finding={f} siteContext={siteContext} className="border-0 bg-transparent p-0 shadow-none" />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
