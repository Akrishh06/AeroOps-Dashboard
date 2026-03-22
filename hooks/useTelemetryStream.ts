"use client";

import { useEffect, useRef } from "react";

import {
  getFindings,
  getHistory,
  getMapLatest,
  getTelemetrySnapshot,
  isAirAuditConfigured,
  resolveMapAssetUrl,
} from "@/lib/airAuditApi";
import { TelemetrySimulator } from "@/lib/telemetrySimulator";
import { useTelemetryStore } from "@/store/telemetryStore";
import { INITIAL_TELEMETRY, SEED_FINDINGS } from "@/data/mockTelemetry";

const TICK_MS = 720;
const MAP_POLL_MS = 4000;

export function useTelemetryStream() {
  const ingestLive = useTelemetryStore((s) => s.ingestLiveTelemetry);
  const setConnected = useTelemetryStore((s) => s.setConnected);
  const setMapAssets = useTelemetryStore((s) => s.setMapAssets);
  const setMapFrame = useTelemetryStore((s) => s.setMapFrame);
  const apply = useTelemetryStore((s) => s.applyTelemetryStep);
  const simRef = useRef<TelemetrySimulator | null>(null);
  const liveAbortRef = useRef(false);

  useEffect(() => {
    liveAbortRef.current = false;

    if (isAirAuditConfigured()) {
      const poll = () => {
        if (liveAbortRef.current) return;
        void Promise.all([
          getTelemetrySnapshot(),
          getFindings(),
          getHistory(),
        ])
          .then(([snapshot, findings, history]) => {
            if (liveAbortRef.current) return;
            ingestLive(snapshot, findings, history);
            setConnected(true);
          })
          .catch((err) => {
            if (liveAbortRef.current) return;
            setConnected(false);
            if (process.env.NODE_ENV === "development") {
              console.warn("[Air-Audit] telemetry poll failed:", err);
            }
          });
      };
      const pollMap = () => {
        if (liveAbortRef.current) return;
        void getMapLatest()
          .then((m) => {
            if (liveAbortRef.current) return;
            setMapAssets({
              plyUrl: resolveMapAssetUrl(m.point_cloud_url),
              rgbUrl: resolveMapAssetUrl(m.rgb_image_url),
            });
          })
          .catch((err) => {
            if (process.env.NODE_ENV === "development") {
              console.warn("[Air-Audit] map poll failed:", err);
            }
          });
      };
      poll();
      pollMap();
      const id = window.setInterval(poll, TICK_MS);
      const mapId = window.setInterval(pollMap, MAP_POLL_MS);
      return () => {
        liveAbortRef.current = true;
        window.clearInterval(id);
        window.clearInterval(mapId);
        setMapAssets(null);
        setMapFrame(null);
      };
    }

    setMapAssets(null);
    setMapFrame(null);
    simRef.current = new TelemetrySimulator(INITIAL_TELEMETRY, SEED_FINDINGS);
    setConnected(true);
    const id = window.setInterval(() => {
      const sim = simRef.current;
      if (!sim) return;
      sim.step();
      apply(sim.getSnapshot(), sim.getFindings());
    }, TICK_MS);
    return () => {
      window.clearInterval(id);
      setMapAssets(null);
      setMapFrame(null);
    };
  }, [apply, ingestLive, setConnected, setMapAssets, setMapFrame]);
}
