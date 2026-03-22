import type { MapLatestResponse } from "@/types/map";
import type { Finding, TelemetryHistoryPoint, TelemetrySnapshot } from "@/types/telemetry";

const PROXY_PREFIX = "/api/air-audit";

/** Public URL (optional if NEXT_PUBLIC_ENABLE_AIR_AUDIT=1 + server-only AIR_AUDIT_API_BASE). */
export function getAirAuditApiBase(): string | null {
  const raw = process.env.NEXT_PUBLIC_AIR_AUDIT_API_BASE?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

/**
 * Live polling runs when either the public base URL is set or the explicit enable flag is set
 * (backend URL may live only in AIR_AUDIT_API_BASE on the server).
 */
export function isAirAuditConfigured(): boolean {
  if (typeof window === "undefined") return false;
  return !!(
    getAirAuditApiBase() ||
    process.env.NEXT_PUBLIC_ENABLE_AIR_AUDIT === "1"
  );
}

function requestUrl(path: string): string {
  if (!isAirAuditConfigured()) {
    throw new Error(
      "Air-Audit not configured: set NEXT_PUBLIC_AIR_AUDIT_API_BASE (and restart dev), or AIR_AUDIT_API_BASE + NEXT_PUBLIC_ENABLE_AIR_AUDIT=1",
    );
  }
  const p = path.startsWith("/") ? path : `/${path}`;
  if (typeof window !== "undefined") {
    return `${PROXY_PREFIX}${p}`;
  }
  const base =
    process.env.AIR_AUDIT_API_BASE?.trim() ||
    process.env.NEXT_PUBLIC_AIR_AUDIT_API_BASE?.trim();
  if (!base) {
    throw new Error("Server fetch: set AIR_AUDIT_API_BASE or NEXT_PUBLIC_AIR_AUDIT_API_BASE");
  }
  return `${base.replace(/\/$/, "")}${p}`;
}

/**
 * Map PLY/static: localhost URLs → same-origin proxy. External RGB URLs unchanged.
 */
export function resolveMapAssetUrl(url: string): string {
  const trimmed = url.trim();
  if (
    typeof window !== "undefined" &&
    trimmed.startsWith("/") &&
    !trimmed.startsWith("//")
  ) {
    if (!isAirAuditConfigured()) return trimmed;
    return `${PROXY_PREFIX}${trimmed}`;
  }

  if (!isAirAuditConfigured()) return url;
  const configuredBase = getAirAuditApiBase();

  try {
    const u = new URL(url, configuredBase || "http://127.0.0.1");
    const isLocal =
      u.hostname === "127.0.0.1" || u.hostname === "localhost";
    const sameAsConfigured =
      !!configuredBase && new URL(configuredBase).origin === u.origin;

    if (!isLocal && !sameAsConfigured) {
      return u.href;
    }

    const pathWithQuery = `${u.pathname}${u.search}`;
    if (typeof window !== "undefined") {
      return `${PROXY_PREFIX}${pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`}`;
    }
    return configuredBase
      ? `${configuredBase.replace(/\/$/, "")}${pathWithQuery}`
      : pathWithQuery;
  } catch {
    if (url.startsWith("/") && typeof window !== "undefined") {
      return `${PROXY_PREFIX}${url}`;
    }
    return url;
  }
}

function defaultHeaders(): HeadersInit {
  return {
    Accept: "application/json",
  };
}

async function fetchJson<T>(path: string): Promise<T> {
  const url = requestUrl(path);
  const res = await fetch(url, {
    headers: defaultHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const ct = res.headers.get("content-type") || "";
    if (res.status === 503 && ct.includes("json")) {
      throw new Error(text || "Air-Audit proxy: backend not configured on server");
    }
    if (ct.includes("text/html") && text.includes("ngrok")) {
      throw new Error(
        `${res.status}: ngrok interstitial — check API base URL and server proxy.`,
      );
    }
    throw new Error(
      text
        ? `${res.status} ${res.statusText}: ${text.slice(0, 160)}`
        : `${res.status} ${res.statusText}`,
    );
  }
  return res.json() as Promise<T>;
}

export function getTelemetrySnapshot(): Promise<TelemetrySnapshot> {
  return fetchJson<TelemetrySnapshot>("/api/v1/telemetry/snapshot");
}

export function getFindings(): Promise<Finding[]> {
  return fetchJson<Finding[]>("/api/v1/findings");
}

export function getHistory(): Promise<TelemetryHistoryPoint[]> {
  return fetchJson<TelemetryHistoryPoint[]>("/api/v1/history");
}

export function getMapLatest(): Promise<MapLatestResponse> {
  return fetchJson<MapLatestResponse>("/api/v1/map/latest");
}
