"use client";

import { Environment, Grid, Html, useCursor } from "@react-three/drei";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useState } from "react";
import * as THREE from "three";

import { FindingIssueCard } from "@/components/FindingIssueCard";
import { MapCameraFocus } from "@/components/MapCameraFocus";
import { MapPlyFromUrl, RgbFeedPlane } from "@/components/MapEnvironment3D";
import { findingLocationToWorld } from "@/lib/mapFindingWorld";
import { moldRisk01 } from "@/lib/mapViewportField";
import { cn } from "@/lib/utils";
import { useTelemetryStore } from "@/store/telemetryStore";
import type { MapViewportMode, TelemetrySnapshot, Finding } from "@/types/telemetry";

function PlaceholderFloor() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[48, 48]} />
        <meshStandardMaterial
          color="#15181c"
          metalness={0.15}
          roughness={0.92}
        />
      </mesh>
      <Grid
        args={[48, 48]}
        sectionColor="#2a3340"
        cellColor="#1e252d"
        fadeDistance={42}
        fadeStrength={1}
        infiniteGrid
        position={[0, 0.002, 0]}
      />
    </group>
  );
}

function FindingMapBubble({ finding }: { finding: Finding }) {
  const setSelected = useTelemetryStore((s) => s.setSelectedFindingId);
  const snap = useTelemetryStore((s) => s.displaySnapshot);
  const siteContext = {
    site_name: snap.site_name,
    duct_section: snap.duct_section,
    inspection_id: snap.inspection_id,
    asset_id: snap.asset_id,
  };
  return (
    <div
      className="w-[min(92vw,280px)] select-text"
      style={{ pointerEvents: "auto" }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="mb-0.5 flex justify-end">
        <button
          type="button"
          className="rounded px-2 py-0.5 text-[14px] leading-none text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
          onClick={() => setSelected(null)}
          aria-label="Close finding"
        >
          ×
        </button>
      </div>
      <FindingIssueCard
        finding={finding}
        siteContext={siteContext}
        className="border border-white/[0.08] bg-[#0f1218]/98 shadow-2xl"
      />
    </div>
  );
}

function FindingAndRobotMarkers() {
  const findings = useTelemetryStore((s) => s.findings);
  const mapFrame = useTelemetryStore((s) => s.mapFrame);
  const robotPos = useTelemetryStore((s) => s.displaySnapshot.position);
  const selectedFindingId = useTelemetryStore((s) => s.selectedFindingId);
  const setSelectedFindingId = useTelemetryStore((s) => s.setSelectedFindingId);
  const requestMapFocusAt = useTelemetryStore((s) => s.requestMapFocusAt);
  const [hoverId, setHoverId] = useState<string | null>(null);
  useCursor(!!hoverId);

  if (!mapFrame) return null;
  const [cx, cy, cz] = mapFrame.plyWorldCenter;
  const s = mapFrame.uniformScale;
  const rot: [number, number, number] = [-Math.PI / 2, 0, 0];

  const onPickFinding = (f: Finding, e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    setSelectedFindingId(f.id);
    const w = findingLocationToWorld(f.location, mapFrame);
    requestMapFocusAt(w);
  };

  return (
    <group rotation={rot} scale={s}>
      {findings.map((f) => {
        const pos: [number, number, number] = [
          f.location.x - cx,
          f.location.y - cy,
          f.location.z - cz,
        ];
        const selected = f.id === selectedFindingId;
        return (
          <group key={f.id} position={pos}>
            <group
              onClick={(e) => onPickFinding(f, e)}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoverId(f.id);
              }}
              onPointerOut={(e) => {
                e.stopPropagation();
                setHoverId((id) => (id === f.id ? null : id));
              }}
            >
              <mesh scale={selected ? 1.35 : 1}>
                <sphereGeometry args={[0.22, 12, 12]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
              </mesh>
              <mesh scale={selected ? 1.2 : 1}>
                <sphereGeometry args={[0.09, 14, 14]} />
                <meshStandardMaterial
                  color={selected ? "#cc5533" : "#aa4422"}
                  emissive="#ff7744"
                  emissiveIntensity={selected ? 0.62 : 0.42}
                  metalness={0.15}
                  roughness={0.45}
                />
              </mesh>
            </group>
            {selected ? (
              <Html
                position={[0, 0.32, 0]}
                center
                distanceFactor={9}
                style={{ pointerEvents: "none" }}
                zIndexRange={[100, 0]}
              >
                <FindingMapBubble finding={f} />
              </Html>
            ) : null}
          </group>
        );
      })}
      <mesh
        position={[
          robotPos.x - cx,
          robotPos.y - cy,
          robotPos.z - cz,
        ]}
      >
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial
          color="#2a6aaa"
          emissive="#4a9ee8"
          emissiveIntensity={0.38}
          metalness={0.2}
          roughness={0.35}
        />
      </mesh>
    </group>
  );
}

function BuildingFromMapApi() {
  const plyUrl = useTelemetryStore((s) => s.mapAssets?.plyUrl ?? null);
  const rgbUrl = useTelemetryStore((s) => s.mapAssets?.rgbUrl ?? null);
  const mapViewportMode = useTelemetryStore((s) => s.mapViewportMode);
  const displaySnapshot = useTelemetryStore((s) => s.displaySnapshot);
  const findings = useTelemetryStore((s) => s.findings);
  const mapFrame = useTelemetryStore((s) => s.mapFrame);
  const setMapFrame = useTelemetryStore((s) => s.setMapFrame);
  const fieldTelemetry = useMemo(
    () => ({
      internal_temp_c: displaySnapshot.internal_temp_c,
      ambient_temp_c: displaySnapshot.ambient_temp_c,
      humidity_pct: displaySnapshot.humidity_pct,
      particulate_pm25: displaySnapshot.particulate_pm25,
      airflow_mps: displaySnapshot.airflow_mps,
      vibration_mm_s: displaySnapshot.vibration_mm_s,
      static_pressure_pa: displaySnapshot.static_pressure_pa,
      mold_probability_pct: displaySnapshot.mold_probability_pct,
      aqi_score: displaySnapshot.aqi_score,
    }),
    [
      displaySnapshot.internal_temp_c,
      displaySnapshot.ambient_temp_c,
      displaySnapshot.humidity_pct,
      displaySnapshot.particulate_pm25,
      displaySnapshot.airflow_mps,
      displaySnapshot.vibration_mm_s,
      displaySnapshot.static_pressure_pa,
      displaySnapshot.mold_probability_pct,
      displaySnapshot.aqi_score,
    ],
  );
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    setMapReady(false);
    setMapFrame(null);
  }, [plyUrl, setMapFrame]);

  const showPlaceholder = !plyUrl || !mapReady;

  return (
    <group>
      {showPlaceholder && <PlaceholderFloor />}

      {plyUrl ? (
        <MapPlyFromUrl
          url={plyUrl}
          mode={mapViewportMode}
          fieldTelemetry={fieldTelemetry}
          findings={findings}
          hotspotFrame={mapFrame}
          onResolved={() => setMapReady(true)}
          onFailed={() => {
            setMapReady(false);
            setMapFrame(null);
          }}
          onMapFrame={setMapFrame}
        />
      ) : null}

      {mapReady ? <FindingAndRobotMarkers /> : null}

      {rgbUrl && mapViewportMode === "model" ? (
        <RgbFeedPlane url={rgbUrl} />
      ) : null}

      {showPlaceholder && plyUrl && (
        <Html center position={[0, 1.2, 0]} style={{ pointerEvents: "none" }}>
          <div className="rounded-md border border-white/10 bg-black/70 px-3 py-2 text-center text-[11px] text-zinc-400 backdrop-blur-sm">
            Loading building scan…
          </div>
        </Html>
      )}

      {!plyUrl && (
        <Html center position={[0, 0.8, 0]} style={{ pointerEvents: "none" }}>
          <div className="max-w-[220px] rounded-md border border-white/10 bg-black/75 px-3 py-2 text-center text-[11px] leading-snug text-zinc-400 backdrop-blur-sm">
            No map yet. Enable live API — layout loads from{" "}
            <span className="font-mono text-zinc-300">/api/v1/map/latest</span>{" "}
            (PLY mesh).
          </div>
        </Html>
      )}
    </group>
  );
}

function SceneContent() {
  return (
    <>
      <color attach="background" args={["#12151c"]} />
      <Suspense fallback={null}>
        <Environment preset="city" environmentIntensity={0.72} />
      </Suspense>
      <ambientLight intensity={0.42} color="#b4c0d0" />
      <directionalLight
        castShadow
        position={[12, 18, 10]}
        intensity={0.95}
        color="#f2f5f9"
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0002}
      />
      <directionalLight position={[-14, 10, -8]} intensity={0.45} color="#a8b8cc" />
      <directionalLight position={[0, 6, 14]} intensity={0.28} color="#cfd8e6" />
      <hemisphereLight
        intensity={0.52}
        color="#c8d4e2"
        groundColor="#2a3038"
      />

      <BuildingFromMapApi />
    </>
  );
}

const FIELD_LEGEND: Record<
  Exclude<MapViewportMode, "model">,
  {
    title: string;
    top: string;
    mid: string;
    bot: string;
    gradient: string;
  }
> = {
  temperature: {
    title: "Thermal field",
    top: "Hot",
    mid: "Warm",
    bot: "Cold",
    gradient:
      "linear-gradient(to top, rgb(37, 99, 235) 0%, rgb(250, 204, 21) 50%, rgb(220, 38, 38) 100%)",
  },
  pm25: {
    title: "PM2.5 (µg/m³)",
    top: "High",
    mid: "Moderate",
    bot: "Low",
    gradient:
      "linear-gradient(to top, rgb(34, 197, 94) 0%, rgb(234, 179, 8) 50%, rgb(220, 38, 38) 100%)",
  },
  mold: {
    title: "Mold (model + env)",
    top: "Elevated",
    mid: "Watch",
    bot: "Favorable",
    gradient:
      "linear-gradient(to top, rgb(13, 148, 136) 0%, rgb(234, 179, 8) 45%, rgb(126, 34, 206) 100%)",
  },
  airflow: {
    title: "Airflow",
    top: "High",
    mid: "Mid",
    bot: "Low",
    gradient:
      "linear-gradient(to top, rgb(30, 58, 138) 0%, rgb(56, 189, 248) 55%, rgb(224, 242, 254) 100%)",
  },
  vibration: {
    title: "Vibration",
    top: "Alert",
    mid: "Rising",
    bot: "Calm",
    gradient:
      "linear-gradient(to top, rgb(37, 99, 235) 0%, rgb(168, 85, 247) 50%, rgb(248, 113, 113) 100%)",
  },
  pressure: {
    title: "Static pressure",
    top: "High",
    mid: "Mid",
    bot: "Low",
    gradient:
      "linear-gradient(to top, rgb(91, 33, 182) 0%, rgb(34, 211, 238) 50%, rgb(245, 158, 11) 100%)",
  },
};

function formatMapViewportReadout(
  mode: MapViewportMode,
  s: TelemetrySnapshot,
): string | null {
  switch (mode) {
    case "model":
      return null;
    case "temperature":
      return `${s.internal_temp_c.toFixed(1)}°C int.`;
    case "pm25":
      return `${Math.round(s.particulate_pm25)} µg/m³ · AQI ${Math.round(s.aqi_score)}`;
    case "mold":
      return `${s.mold_probability_pct.toFixed(0)}% model · ${(moldRisk01(s.humidity_pct, s.internal_temp_c) * 100).toFixed(0)}% env est.`;
    case "airflow":
      return `${s.airflow_mps.toFixed(2)} m/s`;
    case "vibration":
      return `${s.vibration_mm_s.toFixed(2)} mm/s`;
    case "pressure":
      return `${Math.round(s.static_pressure_pa)} Pa`;
    default:
      return null;
  }
}

function FieldViewportLegend() {
  const mode = useTelemetryStore((s) => s.mapViewportMode);
  if (mode === "model") return null;
  const cfg = FIELD_LEGEND[mode];
  return (
    <div className="pointer-events-none absolute bottom-11 right-3 z-20 flex max-w-[140px] flex-col items-center gap-1 rounded-md border border-white/[0.08] bg-[#0c0e14]/85 px-2 py-2 backdrop-blur-sm">
      <span className="text-center text-[9px] font-medium uppercase leading-tight tracking-wider text-zinc-500">
        {cfg.title}
      </span>
      <div className="flex items-stretch gap-2">
        <div className="flex flex-col justify-between py-0.5 text-[8px] leading-tight text-zinc-500">
          <span>{cfg.top}</span>
          <span>{cfg.mid}</span>
          <span>{cfg.bot}</span>
        </div>
        <div
          className="h-20 w-2.5 shrink-0 rounded-sm border border-white/10 shadow-inner"
          style={{ background: cfg.gradient }}
          aria-hidden
        />
      </div>
      <p className="text-center text-[7px] leading-snug text-zinc-600">
        Blended with scan shape — not per-point sensor data.
      </p>
    </div>
  );
}

function MapViewportTabs() {
  const mode = useTelemetryStore((s) => s.mapViewportMode);
  const setMode = useTelemetryStore((s) => s.setMapViewportMode);
  const snap = useTelemetryStore((s) => s.displaySnapshot);

  const tabs: { id: MapViewportMode; label: string }[] = [
    { id: "model", label: "Model" },
    { id: "temperature", label: "Temp" },
    { id: "pm25", label: "PM2.5" },
    { id: "mold", label: "Mold" },
    { id: "airflow", label: "Flow" },
    { id: "vibration", label: "Vib" },
    { id: "pressure", label: "ΔP" },
  ];

  const readout = formatMapViewportReadout(mode, snap);

  return (
    <div
      className="pointer-events-auto absolute left-1/2 top-3 z-20 flex max-w-[min(96vw,640px)] -translate-x-1/2 flex-col items-stretch gap-1 rounded-lg border border-white/[0.08] bg-[#0c0e14]/92 px-1 py-1 shadow-lg backdrop-blur-md sm:flex-row sm:items-center"
      role="tablist"
      aria-label="Map viewport layers"
    >
      <div className="flex flex-wrap justify-center gap-0.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={mode === t.id}
            className={cn(
              "rounded-md px-2 py-1 font-sans text-[10px] font-medium tracking-wide transition-colors sm:px-2.5 sm:text-[11px]",
              mode === t.id
                ? "bg-white/[0.12] text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300",
            )}
            onClick={() => setMode(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {readout && (
        <span className="border-white/[0.06] text-center text-[10px] text-zinc-500 sm:border-l sm:pl-2 sm:text-left">
          <span className="font-mono text-zinc-300">{readout}</span>
        </span>
      )}
    </div>
  );
}

/** Center 3D view: building scan from map API only (no robot / procedural duct). */
export default function RobotScene3D() {
  return (
    <div className="relative h-full min-h-0 w-full flex-1">
      <MapViewportTabs />
      <FieldViewportLegend />
      <Canvas
        className="block h-full w-full"
        shadows
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.28,
        }}
        camera={{
          position: [7, 5.5, 9],
          fov: 45,
          near: 0.08,
          far: 200,
        }}
        onPointerMissed={() => {
          useTelemetryStore.getState().setSelectedFindingId(null);
        }}
      >
        <fog attach="fog" args={["#12151c", 18, 120]} />
        <MapCameraFocus />
        <SceneContent />
      </Canvas>
    </div>
  );
}
