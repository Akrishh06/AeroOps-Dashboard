import { create } from "zustand";

import { INITIAL_TELEMETRY, SEED_FINDINGS } from "@/data/mockTelemetry";
import { bandFromScore, computeRisk, recommendedActionFromRisk } from "@/lib/risk";
import { smoothTelemetryDisplay } from "@/lib/smoothTelemetry";
import type {
  Finding,
  MapViewportMode,
  RuntimeMode,
  TelemetryHistoryPoint,
  TelemetrySnapshot,
  ViewMode,
} from "@/types/telemetry";

export type MapAssets = {
  plyUrl: string;
  rgbUrl: string;
};

/** PLY file-space center + uniform scale (matches MapPlyFromUrl normalization). */
export type MapFrameMeta = {
  plyWorldCenter: [number, number, number];
  uniformScale: number;
};

const HISTORY_CAP = 120;

type State = {
  snapshot: TelemetrySnapshot;
  displaySnapshot: TelemetrySnapshot;
  findings: Finding[];
  history: TelemetryHistoryPoint[];
  viewMode: ViewMode;
  mapViewportMode: MapViewportMode;
  runtimeMode: RuntimeMode;
  connected: boolean;
  mapAssets: MapAssets | null;
  mapFrame: MapFrameMeta | null;
  /** Selected finding for map popup + list highlight. */
  selectedFindingId: string | null;
  /** World-space point for OrbitControls camera focus (PLY scene space). */
  mapFocusTarget: { x: number; y: number; z: number } | null;
  /** Incremented on each focus request so the camera animates even for the same point. */
  mapFocusNonce: number;
  setViewMode: (m: ViewMode) => void;
  setMapViewportMode: (m: MapViewportMode) => void;
  setRuntimeMode: (m: RuntimeMode) => void;
  setConnected: (connected: boolean) => void;
  setMapAssets: (m: MapAssets | null) => void;
  setMapFrame: (m: MapFrameMeta | null) => void;
  setSelectedFindingId: (id: string | null) => void;
  requestMapFocusAt: (world: { x: number; y: number; z: number }) => void;
  applyTelemetryStep: (snap: TelemetrySnapshot, findings: Finding[]) => void;
  ingestLiveTelemetry: (
    snap: TelemetrySnapshot,
    findings: Finding[],
    historyPoints: TelemetryHistoryPoint[],
  ) => void;
  tickDisplay: (dt: number) => void;
};

function pushHistory(
  history: TelemetryHistoryPoint[],
  snap: TelemetrySnapshot,
): TelemetryHistoryPoint[] {
  const next: TelemetryHistoryPoint = {
    t: snap.timestamp_ms,
    battery_pct: snap.battery_pct,
    temp_c: snap.internal_temp_c,
    vibration: snap.vibration_mm_s,
    airflow: snap.airflow_mps,
    current: snap.motor_current_a,
  };
  const h = [...history, next];
  return h.length > HISTORY_CAP ? h.slice(-HISTORY_CAP) : h;
}

export const useTelemetryStore = create<State>((set, get) => ({
  snapshot: INITIAL_TELEMETRY,
  displaySnapshot: INITIAL_TELEMETRY,
  findings: SEED_FINDINGS,
  history: [],
  viewMode: "live",
  mapViewportMode: "model",
  runtimeMode: "SIM",
  connected: true,
  mapAssets: null,
  mapFrame: null,
  selectedFindingId: null,
  mapFocusTarget: null,
  mapFocusNonce: 0,
  setViewMode: (viewMode) => set({ viewMode }),
  setMapViewportMode: (mapViewportMode) => set({ mapViewportMode }),
  setRuntimeMode: (runtimeMode) => set({ runtimeMode }),
  setConnected: (connected) => set({ connected }),
  setMapAssets: (mapAssets) => set({ mapAssets }),
  setMapFrame: (mapFrame) => set({ mapFrame }),
  setSelectedFindingId: (selectedFindingId) => set({ selectedFindingId }),
  requestMapFocusAt: (world) =>
    set((s) => ({
      mapFocusTarget: world,
      mapFocusNonce: s.mapFocusNonce + 1,
    })),
  ingestLiveTelemetry: (snap, findings, historyPoints) => {
    const history =
      historyPoints.length > HISTORY_CAP
        ? historyPoints.slice(-HISTORY_CAP)
        : historyPoints;
    set({
      snapshot: snap,
      findings,
      history,
      runtimeMode: "LIVE",
    });
  },
  applyTelemetryStep: (snap, findings) => {
    const risk_score = computeRisk(snap, findings);
    const risk_band = bandFromScore(risk_score);
    const nextSnap: TelemetrySnapshot = {
      ...snap,
      risk_score,
      risk_band,
      recommended_action: recommendedActionFromRisk(risk_band),
    };
    set((s) => ({
      snapshot: nextSnap,
      findings,
      history: pushHistory(s.history, nextSnap),
      runtimeMode: "SIM",
    }));
  },
  tickDisplay: (dt) => {
    const { snapshot, displaySnapshot } = get();
    const alpha = 1 - Math.exp(-12 * Math.min(dt, 0.1));
    set({
      displaySnapshot: smoothTelemetryDisplay(displaySnapshot, snapshot, alpha),
    });
  },
}));
