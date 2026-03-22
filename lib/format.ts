export function formatClock(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function formatDistance(m: number, digits = 1): string {
  return `${m.toFixed(digits)} m`;
}

export function formatConfidence(pct: number): string {
  return `${Math.round(pct)}%`;
}

export function formatFindingTime(atMs: number): string {
  return formatClock(atMs);
}
