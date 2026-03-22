"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";

import { ContextAiRail } from "@/components/ContextAiRail";
import { TelemetryRailLeft } from "@/components/TelemetryRailLeft";
import { TopStatusBar } from "@/components/TopStatusBar";
import { useDisplaySmoothing } from "@/hooks/useDisplaySmoothing";
import { useTelemetryStream } from "@/hooks/useTelemetryStream";
import { useTelemetryStore } from "@/store/telemetryStore";
import type { MapViewportMode } from "@/types/telemetry";

function mapViewportHint(m: MapViewportMode): string {
  switch (m) {
    case "model":
      return "3D = live scan as point cloud · tabs = telemetry-tinted fields (synthetic blend on shape)";
    case "temperature":
      return "Temperature = cold→warm on scan, driven by live internal / ambient °C";
    case "pm25":
      return "PM2.5 = air-quality style ramp from live particulate (µg/m³)";
    case "mold":
      return "Mold = pipeline mold_probability_pct blended with RH/temp heuristic on scan shape";
    case "airflow":
      return "Flow = velocity ramp from live airflow (m/s)";
    case "vibration":
      return "Vibration = mechanical excitation ramp from live mm/s";
    case "pressure":
      return "ΔP = static pressure ramp from live Pa (duct balance cue)";
    default:
      return "";
  }
}

const RobotScene3D = dynamic(() => import("@/components/RobotScene3D"), {
  ssr: false,
  loading: () => (
    <div className="h-full min-h-[200px] w-full flex-1 bg-[#0d0f12]" aria-hidden />
  ),
});

/** Recharts touches `window` during render; must not SSR. */
const TelemetryStripBottom = dynamic(
  () =>
    import("@/components/TelemetryStripBottom").then((m) => ({
      default: m.TelemetryStripBottom,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-[100px] shrink-0 border-t border-white/[0.06] bg-void/85 backdrop-blur-md"
        aria-hidden
      />
    ),
  },
);

export function DashboardShell() {
  useTelemetryStream();
  useDisplaySmoothing();

  const snapshot = useTelemetryStore((s) => s.displaySnapshot);
  const history = useTelemetryStore((s) => s.history);
  const viewMode = useTelemetryStore((s) => s.viewMode);
  const runtimeMode = useTelemetryStore((s) => s.runtimeMode);
  const connected = useTelemetryStore((s) => s.connected);
  const setViewMode = useTelemetryStore((s) => s.setViewMode);
  const mapViewportMode = useTelemetryStore((s) => s.mapViewportMode);

  const centerMuted = viewMode === "findings";

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col bg-transparent">
      <TopStatusBar
        viewMode={viewMode}
        onViewMode={setViewMode}
        runtimeMode={runtimeMode}
        connected={connected}
        inspectionLabel={`${snapshot.inspection_mode} · ${snapshot.inspection_id}`}
        clockMs={snapshot.timestamp_ms}
      />

      <div className="flex min-h-0 min-w-0 flex-1 items-stretch">
        <TelemetryRailLeft
          viewMode={viewMode}
          battery_pct={snapshot.battery_pct}
          internal_temp_c={snapshot.internal_temp_c}
          ambient_temp_c={snapshot.ambient_temp_c}
          humidity_pct={snapshot.humidity_pct}
          particulate_pm25={snapshot.particulate_pm25}
          airflow_mps={snapshot.airflow_mps}
          static_pressure_pa={snapshot.static_pressure_pa}
          motor_current_a={snapshot.motor_current_a}
          vibration_mm_s={snapshot.vibration_mm_s}
          inspection_mode={snapshot.inspection_mode}
          signal_strength={snapshot.signal_strength}
          voc_index={snapshot.voc_index}
          mold_probability_pct={snapshot.mold_probability_pct}
          aqi_score={snapshot.aqi_score}
        />

        <motion.main
          className={`relative flex min-h-0 min-w-0 flex-1 flex-col ${
            centerMuted ? "brightness-[0.97]" : ""
          }`}
          animate={{ opacity: centerMuted ? 0.94 : 1 }}
          transition={{
            type: "spring",
            stiffness: 120,
            damping: 26,
            mass: 0.85,
          }}
        >
          <div className="relative min-h-0 w-full flex-1 basis-0">
            <RobotScene3D />
          </div>
          <p className="pointer-events-none absolute bottom-3 left-1/2 z-10 max-w-[92%] -translate-x-1/2 text-center text-[10px] leading-snug text-zinc-500">
            Drag to orbit · scroll to zoom · {mapViewportHint(mapViewportMode)}
          </p>
        </motion.main>

        <ContextAiRail viewMode={viewMode} />
      </div>

      <TelemetryStripBottom history={history} />
    </div>
  );
}
