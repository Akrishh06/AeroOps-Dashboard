import type { Finding, FindingSeverity } from "@/types/telemetry";

function severityLine(sev: FindingSeverity): string {
  switch (sev) {
    case "alert":
      return "Priority: schedule a maintenance visit soon; capture photos and verify readings after any repair.";
    case "watch":
      return "Monitor on the next inspection pass; plan corrective work if the condition worsens.";
    default:
      return "Log for the maintenance record; no urgent action unless bundled with other issues in the same run.";
  }
}

/**
 * Prefer API-supplied maintenance text; otherwise a short ops hint from severity + issue type.
 */
export function maintenanceTextForFinding(f: Finding): string {
  if (f.maintenance_note?.trim()) return f.maintenance_note.trim();
  if (f.recommended_action?.trim()) return f.recommended_action.trim();

  const t = f.type.toLowerCase();
  let specific = "";
  if (t.includes("mold") || t.includes("microbial") || t.includes("bio")) {
    specific = "Treat as IAQ-sensitive: confirm humidity control, consider surface sampling if policy requires, and document remediation.";
  } else if (t.includes("leak") || t.includes("moisture") || t.includes("condens")) {
    specific = "Trace the moisture source, repair insulation or drainage as needed, and re-check for corrosion.";
  } else if (t.includes("fastener") || t.includes("gap") || t.includes("seal")) {
    specific = "Re-torque or replace hardware per sheet-metal spec; re-seal joints to restore leakage class.";
  } else if (t.includes("wear") || t.includes("erosion") || t.includes("corrosion")) {
    specific = "Assess liner or metal thickness; schedule patch or section replacement before breach.";
  } else if (t.includes("debris") || t.includes("obstruction") || t.includes("block")) {
    specific = "Remove debris safely (lockout/tagout if fans are nearby), then verify airflow and balance.";
  }

  return [specific, severityLine(f.severity)].filter(Boolean).join(" ");
}
