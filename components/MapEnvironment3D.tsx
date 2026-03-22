"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
import * as THREE from "three";

import {
  type FieldTelemetry,
  telemetryToFieldScalars,
} from "@/lib/mapViewportField";
import type { Finding, FindingSeverity, MapViewportMode } from "@/types/telemetry";

const HOTSPOT_SLOTS = 8;

function severityHotspotWeight(sev: FindingSeverity): number {
  switch (sev) {
    case "alert":
      return 1;
    case "watch":
      return 0.78;
    default:
      return 0.52;
  }
}

function sortFindingsForHotspots(findings: Finding[]): Finding[] {
  const rank: Record<FindingSeverity, number> = { alert: 0, watch: 1, info: 2 };
  return [...findings].sort((a, b) => {
    const d = rank[a.severity] - rank[b.severity];
    if (d !== 0) return d;
    return b.at_ms - a.at_ms;
  });
}

const MAX_POINT_COUNT = 110_000;

let dotSpriteTexture: THREE.CanvasTexture | null = null;

function getDotSpriteTexture(): THREE.CanvasTexture {
  if (dotSpriteTexture) return dotSpriteTexture;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d");
  if (!ctx) {
    dotSpriteTexture = new THREE.CanvasTexture(c);
    return dotSpriteTexture;
  }
  const grd = ctx.createRadialGradient(32, 32, 0, 32, 32, 31);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.35, "rgba(255,255,255,0.92)");
  grd.addColorStop(0.72, "rgba(255,255,255,0.25)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  dotSpriteTexture = tex;
  return tex;
}

function downsamplePointGeometry(
  geometry: THREE.BufferGeometry,
  maxPoints: number,
): THREE.BufferGeometry {
  const pos = geometry.getAttribute("position");
  if (!pos || pos.count <= maxPoints) {
    geometry.computeBoundingSphere();
    return geometry;
  }

  const step = Math.ceil(pos.count / maxPoints);
  const newCount = Math.floor(pos.count / step);
  const positions = new Float32Array(newCount * 3);
  const colorAttr = geometry.getAttribute("color");
  let colors: Float32Array | undefined;
  if (colorAttr) colors = new Float32Array(newCount * 3);

  for (let i = 0, o = 0; i < newCount; i++, o += 3) {
    const vi = i * step;
    const src = vi * 3;
    positions[o] = pos.array[src] as number;
    positions[o + 1] = pos.array[src + 1] as number;
    positions[o + 2] = pos.array[src + 2] as number;
    if (colors && colorAttr) {
      const cs = vi * 3;
      colors[o] = colorAttr.array[cs] as number;
      colors[o + 1] = colorAttr.array[cs + 1] as number;
      colors[o + 2] = colorAttr.array[cs + 2] as number;
    }
  }

  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  if (colors) out.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  out.computeBoundingBox();
  out.computeBoundingSphere();
  geometry.dispose();
  return out;
}

/** One vertex per sample: vent reads as a point cloud, not a solid mesh. */
function meshToPointCloudGeometry(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const hasTriMesh =
    geometry.index !== null && geometry.index.count > 0;
  let g: THREE.BufferGeometry;
  if (hasTriMesh) {
    g = mergeVertices(geometry.clone(), 2e-4);
  } else {
    g = geometry.clone();
  }
  geometry.dispose();
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return downsamplePointGeometry(g, MAX_POINT_COUNT);
}

const FIELD_POINTS_VERT = /* glsl */ `
uniform vec3 uBBoxMin;
uniform vec3 uBBoxMax;
uniform int uFieldKind;
uniform vec4 uHs0;
uniform vec4 uHs1;
uniform vec4 uHs2;
uniform vec4 uHs3;
uniform vec4 uHs4;
uniform vec4 uHs5;
uniform vec4 uHs6;
uniform vec4 uHs7;
varying vec3 vNorm;
varying vec3 vLocalPos;
varying float vHotspot;

float spotInfl(vec3 p, vec4 hp) {
  if (hp.w <= 0.0001) return 0.0;
  float dist = distance(p, hp.xyz);
  float r = 2.65;
  return hp.w * exp(-(dist * dist) / (r * r));
}

float allHotspots(vec3 p) {
  float s = spotInfl(p, uHs0) + spotInfl(p, uHs1) + spotInfl(p, uHs2) + spotInfl(p, uHs3);
  s += spotInfl(p, uHs4) + spotInfl(p, uHs5) + spotInfl(p, uHs6) + spotInfl(p, uHs7);
  return min(s, 1.0);
}

void main() {
  vLocalPos = position;
  vHotspot = allHotspots(position);
  vec3 span = max(uBBoxMax - uBBoxMin, vec3(1e-4));
  vNorm = (position - uBBoxMin) / span;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  float d = max(-mvPosition.z, 0.35);
  float jitter = 0.86 + 0.28 * fract(sin(dot(position, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
  float moldBoost = uFieldKind == 2 ? 1.0 : 0.0;
  float sizeBoost = 1.0 + vHotspot * (0.42 + moldBoost * 0.95);
  float maxSz = uFieldKind == 2 ? 28.0 : 23.0;
  gl_PointSize = clamp(480.0 / d * jitter * sizeBoost, 2.8, maxSz);
}
`;

const FIELD_POINTS_FRAG = /* glsl */ `
uniform int uFieldKind;
uniform float uPrimary;
uniform float uSecondary;
uniform float uTime;
uniform vec4 uHs0;
uniform vec4 uHs1;
uniform vec4 uHs2;
uniform vec4 uHs3;
uniform vec4 uHs4;
uniform vec4 uHs5;
uniform vec4 uHs6;
uniform vec4 uHs7;
varying vec3 vNorm;
varying vec3 vLocalPos;
varying float vHotspot;

float spotInflF(vec3 p, vec4 hp) {
  if (hp.w <= 0.0001) return 0.0;
  float dist = distance(p, hp.xyz);
  float r = 2.65;
  return hp.w * exp(-(dist * dist) / (r * r));
}

float allHotspotsF(vec3 p) {
  float s = spotInflF(p, uHs0) + spotInflF(p, uHs1) + spotInflF(p, uHs2) + spotInflF(p, uHs3);
  s += spotInflF(p, uHs4) + spotInflF(p, uHs5) + spotInflF(p, uHs6) + spotInflF(p, uHs7);
  return min(s, 1.0);
}

vec3 tempGradient(float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 cold = vec3(0.05, 0.22, 0.72);
  vec3 cool = vec3(0.2, 0.55, 0.85);
  vec3 neutral = vec3(0.75, 0.78, 0.72);
  vec3 warm = vec3(0.98, 0.62, 0.18);
  vec3 hot = vec3(0.92, 0.12, 0.08);
  if (t < 0.28) return mix(cold, cool, t / 0.28);
  if (t < 0.52) return mix(cool, neutral, (t - 0.28) / 0.24);
  if (t < 0.78) return mix(neutral, warm, (t - 0.52) / 0.26);
  return mix(warm, hot, (t - 0.78) / 0.22);
}

vec3 pm25Gradient(float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 g = vec3(0.0, 0.78, 0.28);
  vec3 y = vec3(0.96, 0.9, 0.2);
  vec3 o = vec3(0.98, 0.45, 0.08);
  vec3 r = vec3(0.88, 0.06, 0.12);
  vec3 m = vec3(0.45, 0.08, 0.42);
  if (t < 0.22) return mix(g, y, t / 0.22);
  if (t < 0.45) return mix(y, o, (t - 0.22) / 0.23);
  if (t < 0.72) return mix(o, r, (t - 0.45) / 0.27);
  return mix(r, m, (t - 0.72) / 0.28);
}

vec3 moldGradient(float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 dry = vec3(0.55, 0.52, 0.48);
  vec3 ok = vec3(0.12, 0.48, 0.42);
  vec3 warn = vec3(0.75, 0.62, 0.12);
  vec3 risk = vec3(0.55, 0.18, 0.52);
  if (t < 0.3) return mix(dry, ok, t / 0.3);
  if (t < 0.58) return mix(ok, warn, (t - 0.3) / 0.28);
  return mix(warn, risk, (t - 0.58) / 0.42);
}

vec3 airflowGradient(float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 stall = vec3(0.12, 0.14, 0.28);
  vec3 low = vec3(0.15, 0.35, 0.72);
  vec3 mid = vec3(0.35, 0.75, 0.95);
  vec3 high = vec3(0.92, 0.96, 1.0);
  if (t < 0.2) return mix(stall, low, t / 0.2);
  if (t < 0.65) return mix(low, mid, (t - 0.2) / 0.45);
  return mix(mid, high, (t - 0.65) / 0.35);
}

vec3 vibrationGradient(float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 calm = vec3(0.2, 0.55, 0.35);
  vec3 low = vec3(0.25, 0.58, 0.82);
  vec3 mid = vec3(0.95, 0.75, 0.2);
  vec3 alert = vec3(0.95, 0.15, 0.2);
  if (t < 0.25) return mix(calm, low, t / 0.25);
  if (t < 0.55) return mix(low, mid, (t - 0.25) / 0.3);
  return mix(mid, alert, (t - 0.55) / 0.45);
}

vec3 pressureGradient(float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 vac = vec3(0.22, 0.2, 0.55);
  vec3 low = vec3(0.28, 0.52, 0.62);
  vec3 mid = vec3(0.55, 0.72, 0.38);
  vec3 high = vec3(0.92, 0.42, 0.12);
  if (t < 0.3) return mix(vac, low, t / 0.3);
  if (t < 0.65) return mix(low, mid, (t - 0.3) / 0.35);
  return mix(mid, high, (t - 0.65) / 0.35);
}

void main() {
  vec2 c = gl_PointCoord - vec2(0.5);
  if (dot(c, c) > 0.25) discard;

  float axial = vNorm.y * 0.52 + vNorm.x * 0.26 + vNorm.z * 0.22;
  float edge = 1.0 - smoothstep(0.35, 0.5, length(c) * 2.0);
  vec3 col;

  float hsFrag = max(vHotspot, allHotspotsF(vLocalPos));

  if (uFieldKind == 0) {
    float heat = clamp(mix(axial * 0.5 + 0.22, uPrimary, 0.58) + uSecondary * 0.1, 0.0, 1.0);
    col = tempGradient(heat);
    vec3 stress = vec3(0.95, 0.25, 0.12);
    col = mix(col, stress, hsFrag * 0.62);
  } else {
    float live = uPrimary;
    float v = clamp(mix(axial * 0.48 + 0.18, live, 0.56), 0.0, 1.0);
    if (uFieldKind == 2) {
      v = clamp(v + uSecondary * 0.1, 0.0, 1.0);
    }
    if (uFieldKind == 1) {
      col = pm25Gradient(v);
      vec3 hazard = vec3(0.75, 0.08, 0.38);
      col = mix(col, hazard, hsFrag * 0.58);
    } else if (uFieldKind == 2) {
      col = moldGradient(v);
      float n = fract(sin(dot(vLocalPos * 4.2 + uTime * 0.35, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
      float crawl = 0.5 + 0.5 * sin(uTime * 3.8 + length(vLocalPos) * 2.8 + n * 6.2831);
      float veins = 0.5 + 0.5 * sin(dot(vLocalPos, vec3(5.1, 2.7, 8.3)) * 2.0 + uTime * 2.2);
      vec3 slime = mix(vec3(0.05, 0.42, 0.08), vec3(0.38, 0.42, 0.02), n);
      vec3 fungal = mix(vec3(0.32, 0.04, 0.28), vec3(0.08, 0.22, 0.12), crawl);
      vec3 weird = mix(slime, fungal, 0.45 + 0.35 * veins);
      weird = mix(weird, vec3(0.55, 0.02, 0.48), 0.22 * crawl);
      float blob = smoothstep(0.08, 0.95, hsFrag);
      col = mix(col, weird, blob * 0.92);
      col += vec3(0.06, 0.12, 0.03) * hsFrag * crawl;
      col += vec3(0.08, 0.02, 0.06) * hsFrag * veins * 0.5;
    } else if (uFieldKind == 3) {
      col = airflowGradient(v);
      vec3 eddy = vec3(0.55, 0.82, 0.95);
      col = mix(col, eddy, hsFrag * 0.45);
      col = mix(col, vec3(0.15, 0.2, 0.35), hsFrag * 0.22);
    } else if (uFieldKind == 4) {
      col = vibrationGradient(v);
      vec3 shock = vec3(0.98, 0.2, 0.15);
      col = mix(col, shock, hsFrag * 0.65);
    } else {
      col = pressureGradient(v);
      vec3 stress = vec3(0.98, 0.55, 0.1);
      col = mix(col, stress, hsFrag * 0.55);
    }
  }

  gl_FragColor = vec4(col, edge);
}
`;

export type MapPlyFrameMeta = {
  plyWorldCenter: [number, number, number];
  uniformScale: number;
};

function normalizeGeometry(geometry: THREE.BufferGeometry): {
  geometry: THREE.BufferGeometry;
  scale: number;
  plyWorldCenter: THREE.Vector3;
} {
  const g = geometry.clone();
  g.computeVertexNormals();
  g.computeBoundingBox();
  const box = g.boundingBox;
  if (!box) {
    return {
      geometry: g,
      scale: 1,
      plyWorldCenter: new THREE.Vector3(),
    };
  }
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);
  const plyWorldCenter = center.clone();
  g.translate(-center.x, -center.y, -center.z);
  const maxDim = Math.max(size.x, size.y, size.z, 1e-6);
  const targetSize = 9;
  return {
    geometry: g,
    scale: targetSize / maxDim,
    plyWorldCenter,
  };
}

/**
 * Loads duct / space geometry from Air-Audit `map.latest.point_cloud_url` (PLY).
 * Many scans are Z-up; rotate to Y-up for the rest of the scene.
 */
export function MapPlyFromUrl({
  url,
  mode = "model",
  fieldTelemetry,
  findings = [],
  hotspotFrame = null,
  onResolved,
  onFailed,
  onMapFrame,
}: {
  url: string;
  mode?: MapViewportMode;
  fieldTelemetry: FieldTelemetry;
  /** Finding locations (PLY space) tint the field layers — strongest “weird” mold near hotspots. */
  findings?: Finding[];
  hotspotFrame?: MapPlyFrameMeta | null;
  onResolved?: () => void;
  onFailed?: () => void;
  /** PLY bounds in file space + scale — align finding `location` with the point cloud. */
  onMapFrame?: (meta: MapPlyFrameMeta) => void;
}) {
  const onResolvedRef = useRef(onResolved);
  const onFailedRef = useRef(onFailed);
  const onMapFrameRef = useRef(onMapFrame);
  onResolvedRef.current = onResolved;
  onFailedRef.current = onFailed;
  onMapFrameRef.current = onMapFrame;

  const [normalized, setNormalized] = useState<{
    geometry: THREE.BufferGeometry;
    scale: number;
  } | null>(null);

  useEffect(() => {
    setNormalized(null);
    const loader = new PLYLoader();
    let cancelled = false;
    loader.load(
      url,
      (geo) => {
        if (cancelled) {
          geo.dispose();
          return;
        }
        try {
          const n = normalizeGeometry(geo);
          geo.dispose();
          const pointGeo = meshToPointCloudGeometry(n.geometry);
          if (!pointGeo.getAttribute("position")?.count) {
            pointGeo.dispose();
            onFailedRef.current?.();
            return;
          }
          setNormalized({ geometry: pointGeo, scale: n.scale });
          onMapFrameRef.current?.({
            plyWorldCenter: [
              n.plyWorldCenter.x,
              n.plyWorldCenter.y,
              n.plyWorldCenter.z,
            ],
            uniformScale: n.scale,
          });
          onResolvedRef.current?.();
        } catch {
          geo.dispose();
          onFailedRef.current?.();
        }
      },
      undefined,
      () => {
        if (!cancelled) onFailedRef.current?.();
      },
    );
    return () => {
      cancelled = true;
    };
  }, [url]);

  const materialProps = useMemo(() => {
    if (!normalized) return null;
    const hasColors = !!normalized.geometry.getAttribute("color");
    return { vertexColors: hasColors } as const;
  }, [normalized]);

  const { clock } = useThree();

  // Stable uniform refs; values updated in useFrame (avoid remounting ShaderMaterial).
  const fieldUniforms = useMemo(
    () => ({
      uFieldKind: { value: 0 },
      uPrimary: { value: 0 },
      uSecondary: { value: 0 },
      uTime: { value: 0 },
      uBBoxMin: { value: new THREE.Vector3() },
      uBBoxMax: { value: new THREE.Vector3() },
      uHs0: { value: new THREE.Vector4(0, 0, 0, 0) },
      uHs1: { value: new THREE.Vector4(0, 0, 0, 0) },
      uHs2: { value: new THREE.Vector4(0, 0, 0, 0) },
      uHs3: { value: new THREE.Vector4(0, 0, 0, 0) },
      uHs4: { value: new THREE.Vector4(0, 0, 0, 0) },
      uHs5: { value: new THREE.Vector4(0, 0, 0, 0) },
      uHs6: { value: new THREE.Vector4(0, 0, 0, 0) },
      uHs7: { value: new THREE.Vector4(0, 0, 0, 0) },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial values only
    [],
  );

  const hotspotUniformList = useMemo(
    () =>
      [
        fieldUniforms.uHs0,
        fieldUniforms.uHs1,
        fieldUniforms.uHs2,
        fieldUniforms.uHs3,
        fieldUniforms.uHs4,
        fieldUniforms.uHs5,
        fieldUniforms.uHs6,
        fieldUniforms.uHs7,
      ] as const,
    [fieldUniforms],
  );

  useLayoutEffect(() => {
    const box = normalized?.geometry.boundingBox;
    if (!box) return;
    fieldUniforms.uBBoxMin.value.copy(box.min);
    fieldUniforms.uBBoxMax.value.copy(box.max);
  }, [normalized, fieldUniforms]);

  useFrame(() => {
    if (mode === "model") return;
    const { kind, primary, secondary } = telemetryToFieldScalars(
      mode,
      fieldTelemetry,
    );
    fieldUniforms.uFieldKind.value = kind;
    fieldUniforms.uPrimary.value = primary;
    fieldUniforms.uSecondary.value = secondary;
    fieldUniforms.uTime.value = clock.elapsedTime;

    const sorted = sortFindingsForHotspots(findings);
    const frame = hotspotFrame;
    for (let i = 0; i < HOTSPOT_SLOTS; i++) {
      const slot = hotspotUniformList[i];
      if (frame && i < sorted.length) {
        const f = sorted[i];
        const [cx, cy, cz] = frame.plyWorldCenter;
        slot.value.set(
          f.location.x - cx,
          f.location.y - cy,
          f.location.z - cz,
          severityHotspotWeight(f.severity),
        );
      } else {
        slot.value.set(0, 0, 0, 0);
      }
    }
  });

  useEffect(() => {
    return () => {
      normalized?.geometry.dispose();
    };
  }, [normalized]);

  if (!normalized || !materialProps) return null;

  const g = normalized.geometry;
  const s = normalized.scale;
  const rot: [number, number, number] = [-Math.PI / 2, 0, 0];

  if (mode !== "model") {
    return (
      <points geometry={g} rotation={rot} scale={s}>
        <shaderMaterial
          uniforms={fieldUniforms}
          vertexShader={FIELD_POINTS_VERT}
          fragmentShader={FIELD_POINTS_FRAG}
          transparent
          depthWrite
        />
      </points>
    );
  }

  return (
    <points geometry={g} rotation={rot} scale={s}>
      <pointsMaterial
        map={getDotSpriteTexture()}
        transparent
        alphaTest={0.12}
        color={materialProps.vertexColors ? "#e8eef6" : "#c5d4e2"}
        vertexColors={materialProps.vertexColors}
        size={0.028}
        sizeAttenuation
        depthWrite
        opacity={0.96}
        toneMapped
      />
    </points>
  );
}

/** RGB “live feed” from `map.latest.rgb_image_url` when CORS allows loading. */
export function RgbFeedPlane({ url }: { url: string }) {
  const [map, setMap] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    let alive = true;
    let tex: THREE.Texture | null = null;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(
      url,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        if (!alive) {
          t.dispose();
          return;
        }
        tex = t;
        setMap(t);
      },
      undefined,
      () => {
        if (alive) setMap(null);
      },
    );
    return () => {
      alive = false;
      tex?.dispose();
      setMap(null);
    };
  }, [url]);

  if (!map) return null;
  const img = map.image as HTMLImageElement | undefined;
  const aspect =
    img?.width && img?.height ? img.width / img.height : 16 / 9;
  const w = 2.15;
  const h = w / aspect;

  return (
    <mesh position={[-3.15, 1.38, 2.35]} rotation={[0, 0.42, 0]}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={map} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  );
}
