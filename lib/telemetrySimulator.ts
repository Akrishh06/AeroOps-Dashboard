import type { Finding, TelemetrySnapshot } from "@/types/telemetry";

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function jitter(x: number, mag: number): number {
  return x + (Math.random() - 0.5) * mag * 2;
}

export class TelemetrySimulator {
  private snap: TelemetrySnapshot;
  private findings: Finding[];
  private nextFindingMs = 0;

  constructor(initial: TelemetrySnapshot, seedFindings: Finding[]) {
    this.snap = { ...initial };
    this.findings = [...seedFindings];
    this.nextFindingMs = Date.now() + 45_000 + Math.random() * 90_000;
  }

  getSnapshot(): TelemetrySnapshot {
    return this.snap;
  }

  getFindings(): Finding[] {
    return this.findings;
  }

  step(): void {
    const s = this.snap;
    s.timestamp_ms = Date.now();
    s.battery_pct = clamp(jitter(s.battery_pct - 0.02, 0.08), 8, 100);
    s.internal_temp_c = clamp(jitter(s.internal_temp_c + 0.02, 0.12), 32, 58);
    s.ambient_temp_c = clamp(jitter(s.ambient_temp_c, 0.06), 18, 30);
    s.humidity_pct = clamp(jitter(s.humidity_pct, 0.4), 28, 62);
    s.particulate_pm25 = clamp(jitter(s.particulate_pm25 + (Math.random() - 0.45) * 0.4, 0.8), 4, 55);
    s.airflow_mps = clamp(jitter(s.airflow_mps, 0.05), 1.2, 4.8);
    s.static_pressure_pa = clamp(jitter(s.static_pressure_pa, 4), 120, 260);
    s.motor_current_a = clamp(jitter(s.motor_current_a, 0.08), 1.2, 5.2);
    s.vibration_mm_s = clamp(jitter(s.vibration_mm_s, 0.15), 0.8, 9);
    s.signal_strength = clamp(jitter(s.signal_strength, 0.02), 0.55, 1);
    s.heading_deg = clamp(jitter(s.heading_deg, 0.35), -12, 12);
    s.tilt_deg = clamp(jitter(s.tilt_deg, 0.12), -4, 4);
    s.robot_speed_mps = clamp(jitter(0.16 + Math.sin(s.timestamp_ms / 9000) * 0.06, 0.04), 0, 0.42);
    s.distance_travelled_m += s.robot_speed_mps * 0.72;
    s.position_m = s.distance_travelled_m;
    s.position.x = clamp(jitter(s.position.x, 0.04), -2.5, 2.5);
    s.position.y = clamp(jitter(s.position.y, 0.03), -1.2, 1.2);
    s.position.z = clamp(jitter(s.position.z + s.robot_speed_mps * 0.02, 0.05), 0, 8);
    s.orientation.x = clamp(jitter(s.orientation.x, 0.02), -0.35, 0.35);
    s.orientation.y = clamp(jitter(s.orientation.y, 0.02), -0.35, 0.35);
    s.orientation.z = clamp(jitter(s.orientation.z, 0.02), -0.35, 0.35);
    {
      const len = Math.hypot(
        s.orientation.x,
        s.orientation.y,
        s.orientation.z,
        s.orientation.w,
      );
      if (len > 1e-6) {
        s.orientation.x /= len;
        s.orientation.y /= len;
        s.orientation.z /= len;
        s.orientation.w /= len;
      }
    }
    s.voc_index = clamp(jitter(s.voc_index + (Math.random() - 0.48) * 0.08, 0.15), 0.2, 12);
    s.mold_probability_pct = clamp(
      jitter(s.mold_probability_pct + (Math.random() - 0.5) * 1.2, 0.8),
      0,
      100,
    );
    s.aqi_score = clamp(jitter(s.aqi_score + (Math.random() - 0.48) * 2, 3), 8, 220);

    if (Date.now() > this.nextFindingMs && this.findings.length < 12) {
      const types = ["lint mat", "corrosion fleck", "seam shadow", "fastener gap"];
      const sev: Finding["severity"][] = ["info", "watch", "watch"];
      const sevPick = sev[Math.floor(Math.random() * sev.length)];
      this.findings.unshift({
        id: `f-${Date.now()}`,
        type: types[Math.floor(Math.random() * types.length)],
        severity: sevPick,
        confidence_pct: 50 + Math.random() * 45,
        duct_offset_m: s.position_m + (Math.random() - 0.5) * 0.8,
        location: {
          x: s.position.x + (Math.random() - 0.5) * 0.35,
          y: s.position.y + (Math.random() - 0.5) * 0.25,
          z: s.position.z + (Math.random() - 0.5) * 0.4,
        },
        note: "Auto-detected during traverse.",
        at_ms: Date.now(),
      });
      this.findings = this.findings.slice(0, 14);
      s.last_finding_type = this.findings[0]?.type ?? null;
      this.nextFindingMs = Date.now() + 50_000 + Math.random() * 120_000;
    }
  }
}
