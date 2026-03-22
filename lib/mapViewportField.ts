import type { MapViewportMode, TelemetrySnapshot } from "@/types/telemetry";

export type FieldTelemetry = Pick<
  TelemetrySnapshot,
  | "internal_temp_c"
  | "ambient_temp_c"
  | "humidity_pct"
  | "particulate_pm25"
  | "airflow_mps"
  | "vibration_mm_s"
  | "static_pressure_pa"
  | "mold_probability_pct"
  | "aqi_score"
>;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** Heuristic 0–1 “mold-favorable conditions” from RH + internal temp (visualization only). */
export function moldRisk01(humidityPct: number, internalTempC: number): number {
  const rhStress = clamp01((humidityPct - 38) / 44);
  const t = internalTempC;
  const tempStress =
    t >= 14 && t <= 32
      ? clamp01(1 - Math.abs(t - 23.5) / 12) * 0.95 + 0.05
      : 0.12;
  return clamp01(rhStress * 0.68 + tempStress * 0.38);
}

export function fieldKindForMode(mode: MapViewportMode): number {
  switch (mode) {
    case "temperature":
      return 0;
    case "pm25":
      return 1;
    case "mold":
      return 2;
    case "airflow":
      return 3;
    case "vibration":
      return 4;
    case "pressure":
      return 5;
    default:
      return 0;
  }
}

export function telemetryToFieldScalars(
  mode: MapViewportMode,
  t: FieldTelemetry,
): { kind: number; primary: number; secondary: number } {
  if (mode === "model") {
    return { kind: 0, primary: 0, secondary: 0 };
  }
  const kind = fieldKindForMode(mode);
  switch (mode) {
    case "temperature":
      return {
        kind,
        /** ~16–42 °C duct-relevant span → clearer cold→hot readout */
        primary: clamp01((t.internal_temp_c - 16) / 26),
        secondary: clamp01((t.ambient_temp_c - 12) / 22),
      };
    case "pm25": {
      const pm = clamp01(t.particulate_pm25 / 55);
      const aqi = clamp01(t.aqi_score / 120);
      return {
        kind,
        primary: clamp01(pm * 0.55 + aqi * 0.45),
        secondary: clamp01((t.particulate_pm25 - 12) / 50),
      };
    }
    case "mold": {
      const model = clamp01(t.mold_probability_pct / 100);
      const heur = moldRisk01(t.humidity_pct, t.internal_temp_c);
      return {
        kind,
        primary: clamp01(model * 0.68 + heur * 0.32),
        secondary: clamp01(t.humidity_pct / 100),
      };
    }
    case "airflow":
      return { kind, primary: clamp01(t.airflow_mps / 4.5), secondary: 0 };
    case "vibration":
      return { kind, primary: clamp01(t.vibration_mm_s / 12), secondary: 0 };
    case "pressure":
      return {
        kind,
        primary: clamp01((t.static_pressure_pa + 50) / 100),
        secondary: 0,
      };
    default:
      return { kind: 0, primary: 0, secondary: 0 };
  }
}
