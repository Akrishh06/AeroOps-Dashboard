import type { OrientationQuat, TelemetrySnapshot, Vec3 } from "@/types/telemetry";

function lerpVec3(p: Vec3, q: Vec3, t: number): Vec3 {
  return {
    x: p.x + (q.x - p.x) * t,
    y: p.y + (q.y - p.y) * t,
    z: p.z + (q.z - p.z) * t,
  };
}

function nlerpQuat(p: OrientationQuat, q: OrientationQuat, t: number): OrientationQuat {
  const x = p.x + (q.x - p.x) * t;
  const y = p.y + (q.y - p.y) * t;
  const z = p.z + (q.z - p.z) * t;
  const w = p.w + (q.w - p.w) * t;
  const len = Math.hypot(x, y, z, w) || 1;
  return { x: x / len, y: y / len, z: z / len, w: w / len };
}

export function smoothTelemetryDisplay(
  prev: TelemetrySnapshot,
  next: TelemetrySnapshot,
  alpha: number,
): TelemetrySnapshot {
  const a = Math.min(1, Math.max(0, alpha));
  const lerp = (x: number, y: number) => x + (y - x) * a;
  return {
    ...next,
    battery_pct: lerp(prev.battery_pct, next.battery_pct),
    internal_temp_c: lerp(prev.internal_temp_c, next.internal_temp_c),
    ambient_temp_c: lerp(prev.ambient_temp_c, next.ambient_temp_c),
    humidity_pct: lerp(prev.humidity_pct, next.humidity_pct),
    particulate_pm25: lerp(prev.particulate_pm25, next.particulate_pm25),
    airflow_mps: lerp(prev.airflow_mps, next.airflow_mps),
    static_pressure_pa: lerp(prev.static_pressure_pa, next.static_pressure_pa),
    motor_current_a: lerp(prev.motor_current_a, next.motor_current_a),
    vibration_mm_s: lerp(prev.vibration_mm_s, next.vibration_mm_s),
    signal_strength: lerp(prev.signal_strength, next.signal_strength),
    heading_deg: lerp(prev.heading_deg, next.heading_deg),
    tilt_deg: lerp(prev.tilt_deg, next.tilt_deg),
    robot_speed_mps: lerp(prev.robot_speed_mps, next.robot_speed_mps),
    distance_travelled_m: lerp(prev.distance_travelled_m, next.distance_travelled_m),
    position_m: lerp(prev.position_m, next.position_m),
    position: lerpVec3(prev.position, next.position, a),
    orientation: nlerpQuat(prev.orientation, next.orientation, a),
    voc_index: lerp(prev.voc_index, next.voc_index),
    mold_probability_pct: lerp(prev.mold_probability_pct, next.mold_probability_pct),
    aqi_score: lerp(prev.aqi_score, next.aqi_score),
    risk_score: Math.round(lerp(prev.risk_score, next.risk_score)),
  };
}
