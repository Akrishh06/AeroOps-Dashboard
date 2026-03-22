import type { Finding, FindingSeverity, Vec3 } from "@/types/telemetry";

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function num(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeVec3(v: unknown): Vec3 {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    const r = v as Record<string, unknown>;
    return {
      x: num(r.x ?? r.X),
      y: num(r.y ?? r.Y),
      z: num(r.z ?? r.Z),
    };
  }
  if (Array.isArray(v) && v.length >= 3) {
    return { x: num(v[0]), y: num(v[1]), z: num(v[2]) };
  }
  return { x: 0, y: 0, z: 0 };
}

function normalizeSeverity(v: unknown): FindingSeverity {
  const s = str(v).toLowerCase();
  if (s === "alert" || s === "critical" || s === "high") return "alert";
  if (s === "watch" || s === "warning" || s === "medium") return "watch";
  return "info";
}

/**
 * Maps Air-Audit / findings JSON to our Finding shape. Tolerates snake_case and missing location.
 */
export function normalizeFinding(raw: unknown): Finding {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  const id = str(o.id) || str(o.finding_id) || `finding-${Math.random().toString(36).slice(2, 11)}`;
  const type = str(o.type) || str(o.finding_type) || str(o.issue_type) || "Unknown issue";
  const note = str(o.note) || str(o.description) || str(o.details) || "";

  let maintNote = str(o.maintenance_note);
  const maintObj = o.maintenance;
  if (
    !maintNote &&
    maintObj &&
    typeof maintObj === "object" &&
    !Array.isArray(maintObj)
  ) {
    maintNote = str((maintObj as Record<string, unknown>).note);
  }

  const recAction =
    str(o.recommended_action) || str(o.recommendedAction) || str(o.action);
  const ductSec = str(o.duct_section) || str(o.ductSection);

  return {
    id,
    type,
    severity: normalizeSeverity(o.severity ?? o.level ?? o.priority),
    confidence_pct: num(o.confidence_pct ?? o.confidence ?? o.confidencePct, 0),
    duct_offset_m: num(o.duct_offset_m ?? o.duct_offset ?? o.offset_m ?? o.ductOffsetM, 0),
    location: normalizeVec3(o.location ?? o.position ?? o.xyz),
    note,
    at_ms: num(o.at_ms ?? o.atMs ?? o.timestamp_ms ?? o.timestampMs, Date.now()),
    maintenance_note: maintNote || undefined,
    recommended_action: recAction || undefined,
    duct_section: ductSec || undefined,
  };
}

export function normalizeFindingsList(raw: unknown): Finding[] {
  if (Array.isArray(raw)) return raw.map(normalizeFinding);
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const inner = o.findings ?? o.items ?? o.data ?? o.results;
    if (Array.isArray(inner)) return inner.map(normalizeFinding);
  }
  return [];
}
