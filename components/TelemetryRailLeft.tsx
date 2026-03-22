"use client";

import { SensorCard } from "@/components/SensorCard";
import { LiveMetric } from "@/components/LiveMetric";
import type { InspectionMode, ViewMode } from "@/types/telemetry";

export function TelemetryRailLeft({
  viewMode,
  battery_pct,
  internal_temp_c,
  ambient_temp_c,
  humidity_pct,
  particulate_pm25,
  airflow_mps,
  static_pressure_pa,
  motor_current_a,
  vibration_mm_s,
  inspection_mode,
  signal_strength,
  voc_index,
  mold_probability_pct,
  aqi_score,
}: {
  viewMode: ViewMode;
  battery_pct: number;
  internal_temp_c: number;
  ambient_temp_c: number;
  humidity_pct: number;
  particulate_pm25: number;
  airflow_mps: number;
  static_pressure_pa: number;
  motor_current_a: number;
  vibration_mm_s: number;
  inspection_mode: InspectionMode;
  signal_strength: number;
  voc_index: number;
  mold_probability_pct: number;
  aqi_score: number;
}) {
  const dim = viewMode === "context";
  return (
    <aside
      className={`flex w-[min(280px,26vw)] shrink-0 flex-col gap-2 overflow-y-auto border-r border-white/[0.06] bg-void/60 px-3 py-3 backdrop-blur-sm transition-opacity ${
        dim ? "opacity-75" : ""
      }`}
    >
      <SensorCard label="Battery">
        <LiveMetric value={battery_pct} unit="%" decimals={0} />
      </SensorCard>
      <SensorCard label="Internal temp">
        <LiveMetric value={internal_temp_c} unit="°C" />
      </SensorCard>
      <SensorCard label="Ambient">
        <LiveMetric value={ambient_temp_c} unit="°C" />
      </SensorCard>
      <SensorCard label="Humidity">
        <LiveMetric value={humidity_pct} unit="%" decimals={0} />
      </SensorCard>
      <SensorCard label="PM2.5">
        <LiveMetric value={particulate_pm25} unit="µg/m³" decimals={0} />
      </SensorCard>
      <SensorCard label="AQI (model)">
        <LiveMetric value={aqi_score} unit="" decimals={0} />
      </SensorCard>
      <SensorCard label="Mold risk">
        <LiveMetric value={mold_probability_pct} unit="%" decimals={0} />
      </SensorCard>
      <SensorCard label="VOC index">
        <LiveMetric value={voc_index} unit="" decimals={1} />
      </SensorCard>
      <SensorCard label="Airflow">
        <LiveMetric value={airflow_mps} unit="m/s" />
      </SensorCard>
      <SensorCard label="Static pressure">
        <LiveMetric value={static_pressure_pa} unit="Pa" decimals={0} />
      </SensorCard>
      <SensorCard label="Motor current">
        <LiveMetric value={motor_current_a} unit="A" />
      </SensorCard>
      <SensorCard label="Vibration">
        <LiveMetric value={vibration_mm_s} unit="mm/s" />
      </SensorCard>
      <SensorCard label="Mode">
        <span className="instrument-value">{inspection_mode}</span>
      </SensorCard>
      <SensorCard label="Signal">
        <LiveMetric value={signal_strength * 100} unit="%" decimals={0} />
      </SensorCard>
    </aside>
  );
}
