"use client";

import { Activity } from "lucide-react";

import { ConnectionStatus } from "@/components/ConnectionStatus";
import { ModeSwitcher } from "@/components/ModeSwitcher";
import { formatClock } from "@/lib/format";
import type { RuntimeMode, ViewMode } from "@/types/telemetry";

export function TopStatusBar({
  viewMode,
  onViewMode,
  runtimeMode,
  connected,
  inspectionLabel,
  clockMs,
}: {
  viewMode: ViewMode;
  onViewMode: (m: ViewMode) => void;
  runtimeMode: RuntimeMode;
  connected: boolean;
  inspectionLabel: string;
  clockMs: number;
}) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/[0.06] bg-void/90 px-4 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <Activity className="h-4 w-4 text-accent" strokeWidth={2} />
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-dim">
            AeroOps
          </p>
          <p className="font-mono text-[11px] text-ink/90">{inspectionLabel}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="hidden font-mono text-[10px] text-dim sm:inline">
          {runtimeMode} stream
        </span>
        <ConnectionStatus connected={connected} />
        <ModeSwitcher value={viewMode} onChange={onViewMode} />
        <time className="font-mono text-[11px] tabular-nums text-ink/80">
          {formatClock(clockMs)}
        </time>
      </div>
    </header>
  );
}
