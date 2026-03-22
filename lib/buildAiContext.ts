import type {
  Finding,
  MapViewportMode,
  TelemetryHistoryPoint,
  TelemetrySnapshot,
} from "@/types/telemetry";

export function buildAiDashboardContext(args: {
  snapshot: TelemetrySnapshot;
  findings: Finding[];
  history: TelemetryHistoryPoint[];
  mapViewportMode: MapViewportMode;
  connected: boolean;
  runtimeMode: string;
}): string {
  const { snapshot, findings, history, mapViewportMode, connected, runtimeMode } =
    args;
  return JSON.stringify(
    {
      runtimeMode,
      streamConnected: connected,
      mapViewportMode,
      telemetry: {
        inspection_id: snapshot.inspection_id,
        inspection_mode: snapshot.inspection_mode,
        site_name: snapshot.site_name,
        asset_id: snapshot.asset_id,
        duct_section: snapshot.duct_section,
        battery_pct: snapshot.battery_pct,
        internal_temp_c: snapshot.internal_temp_c,
        ambient_temp_c: snapshot.ambient_temp_c,
        humidity_pct: snapshot.humidity_pct,
        particulate_pm25: snapshot.particulate_pm25,
        airflow_mps: snapshot.airflow_mps,
        static_pressure_pa: snapshot.static_pressure_pa,
        motor_current_a: snapshot.motor_current_a,
        vibration_mm_s: snapshot.vibration_mm_s,
        signal_strength: snapshot.signal_strength,
        distance_travelled_m: snapshot.distance_travelled_m,
        position_m: snapshot.position_m,
        position_xyz: snapshot.position,
        orientation_quat: snapshot.orientation,
        voc_index: snapshot.voc_index,
        mold_probability_pct: snapshot.mold_probability_pct,
        aqi_score: snapshot.aqi_score,
        last_finding_type: snapshot.last_finding_type,
        risk_score: snapshot.risk_score,
        risk_band: snapshot.risk_band,
        recommended_action: snapshot.recommended_action,
        timestamp_ms: snapshot.timestamp_ms,
      },
      findings: findings.map((f) => ({
        type: f.type,
        severity: f.severity,
        confidence_pct: f.confidence_pct,
        duct_offset_m: f.duct_offset_m,
        location_xyz: f.location,
        note: f.note,
        at_ms: f.at_ms,
      })),
      recentTrendSamples: history.slice(-24),
    },
    null,
    2,
  );
}
