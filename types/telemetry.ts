export type InspectionMode = "SCAN" | "FOCUS" | "IDLE" | "CALIBRATE";

export type ViewMode = "live" | "findings" | "context";

/** Center 3D panel: point cloud coloring by scan / telemetry field. */
export type MapViewportMode =
  | "model"
  | "temperature"
  | "pm25"
  | "mold"
  | "airflow"
  | "vibration"
  | "pressure";

export type RuntimeMode = "SIM" | "LIVE";

export type RiskBand = "LOW" | "MED" | "HIGH";

export type FindingSeverity = "info" | "watch" | "alert";

/** Robot pose in duct / map frame (matches PLY vertex space from backend). */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Orientation quaternion (x, y, z, w) in same frame as position. */
export interface OrientationQuat {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface TelemetrySnapshot {
  inspection_id: string;
  inspection_mode: InspectionMode;
  site_name: string;
  asset_id: string;
  duct_section: string;
  battery_pct: number;
  internal_temp_c: number;
  ambient_temp_c: number;
  humidity_pct: number;
  particulate_pm25: number;
  airflow_mps: number;
  static_pressure_pa: number;
  motor_current_a: number;
  vibration_mm_s: number;
  signal_strength: number;
  heading_deg: number;
  tilt_deg: number;
  robot_speed_mps: number;
  distance_travelled_m: number;
  position_m: number;
  position: Vec3;
  orientation: OrientationQuat;
  /** Predictive / model-derived air-quality index (backend physics simulation). */
  voc_index: number;
  /** 0–100 estimated mold likelihood from pipeline model. */
  mold_probability_pct: number;
  /** Composite AQI-style score (backend). */
  aqi_score: number;
  last_finding_type: string | null;
  risk_score: number;
  risk_band: RiskBand;
  recommended_action: string;
  timestamp_ms: number;
}

export interface Finding {
  id: string;
  type: string;
  severity: FindingSeverity;
  confidence_pct: number;
  duct_offset_m: number;
  /** 3D point in duct / PLY coordinate space. */
  location: Vec3;
  note: string;
  at_ms: number;
  /** When set, overrides snapshot duct section for this issue (e.g. from API). */
  duct_section?: string;
  /** Free-text maintenance guidance from backend, if provided. */
  maintenance_note?: string;
  /** Per-finding recommended action from backend, if provided. */
  recommended_action?: string;
}

export interface TelemetryHistoryPoint {
  t: number;
  battery_pct: number;
  temp_c: number;
  vibration: number;
  airflow: number;
  current: number;
}
