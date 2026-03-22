import { NextRequest, NextResponse } from "next/server";

function getBackendBase(): string | null {
  const b =
    process.env.AIR_AUDIT_API_BASE?.trim() ||
    process.env.NEXT_PUBLIC_AIR_AUDIT_API_BASE?.trim();
  return b ? b.replace(/\/$/, "") : null;
}

export const dynamic = "force-dynamic";

/**
 * Proxies the browser to the Air-Audit API (avoids ngrok interstitial + CORS).
 * Client calls: /api/air-audit/api/v1/telemetry/snapshot → upstream /api/v1/telemetry/snapshot
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } },
) {
  const base = getBackendBase();
  if (!base) {
    return NextResponse.json(
      {
        error:
          "Air-Audit backend URL not set. Add NEXT_PUBLIC_AIR_AUDIT_API_BASE or AIR_AUDIT_API_BASE to .env.local and restart `npm run dev`.",
      },
      { status: 503 },
    );
  }

  const segments = params.path;
  if (!segments?.length) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }

  const targetPath = `/${segments.join("/")}`;
  const search = request.nextUrl.search;
  const targetUrl = `${base}${targetPath}${search}`;

  const headers: Record<string, string> = {
    Accept: request.headers.get("accept") || "*/*",
  };
  try {
    if (new URL(base).hostname.includes("ngrok")) {
      headers["ngrok-skip-browser-warning"] = "true";
    }
  } catch {
    /* ignore */
  }
  const token =
    process.env.AIR_AUDIT_API_TOKEN?.trim() ||
    process.env.NEXT_PUBLIC_AIR_AUDIT_API_TOKEN?.trim();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(targetUrl, { headers, cache: "no-store" });
  const body = await res.arrayBuffer();

  const out = new NextResponse(body, { status: res.status });
  const ct = res.headers.get("content-type");
  if (ct) {
    out.headers.set("content-type", ct);
  }
  return out;
}
