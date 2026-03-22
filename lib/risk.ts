import type { Finding, RiskBand, TelemetrySnapshot } from "@/types/telemetry";

export function computeRisk(snapshot: TelemetrySnapshot, findings: Finding[]): number {
  let score = 12;
  const pm = snapshot.particulate_pm25;
  if (pm > 35) score += 18;
  else if (pm > 18) score += 10;
  if (snapshot.vibration_mm_s > 6) score += 12;
  if (snapshot.motor_current_a > 4.2) score += 8;
  if (snapshot.internal_temp_c > 52) score += 14;
  if (snapshot.mold_probability_pct > 55) score += 14;
  else if (snapshot.mold_probability_pct > 30) score += 7;
  if (snapshot.voc_index > 6) score += 10;
  else if (snapshot.voc_index > 3.5) score += 5;
  if (snapshot.aqi_score > 120) score += 10;
  else if (snapshot.aqi_score > 75) score += 5;
  for (const f of findings) {
    if (f.severity === "alert") score += 15;
    else if (f.severity === "watch") score += 6;
  }
  return Math.min(100, Math.round(score));
}

export function bandFromScore(score: number): RiskBand {
  if (score < 35) return "LOW";
  if (score < 65) return "MED";
  return "HIGH";
}

export function recommendedActionFromRisk(band: RiskBand): string {
  if (band === "LOW") return "Continue scheduled run; log baseline.";
  if (band === "MED") return "Slow traverse; capture secondary samples.";
  return "Pause forward motion; operator review required.";
}
