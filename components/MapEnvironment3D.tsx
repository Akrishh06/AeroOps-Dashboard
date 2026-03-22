"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
import * as THREE from "three";

import {
  type FieldTelemetry,
  telemetryToFieldScalars,
} from "@/lib/mapViewportField";
import type { MapViewportMode } from "@/types/telemetry";

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
varying vec3 vNorm;

void main() {
  vec3 span = max(uBBoxMax - uBBoxMin, vec3(1e-4));
  vNorm = (position - uBBoxMin) / span;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  float d = max(-mvPosition.z, 0.35);
  float jitter = 0.86 + 0.28 * fract(sin(dot(position, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
  gl_PointSize = clamp(480.0 / d * jitter, 2.8, 20.0);
}
`;

const FIELD_POINTS_FRAG = /* glsl */ `
uniform int uFieldKind;
uniform float uPrimary;
uniform float uSecondary;
varying vec3 vNorm;

vec3 tempGradient(float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 cold = vec3(0.1, 0.38, 0.98);
  vec3 mid = vec3(0.98, 0.86, 0.18);
  vec3 hot = vec3(0.98, 0.16, 0.12);
  if (t < 0.5) return mix(cold, mid, t * 2.0);
  return mix(mid, hot, (t - 0.5) * 2.0);
}

vec3 pm25Gradient(float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 g = vec3(0.12, 0.72, 0.42);
  vec3 y = vec3(0.95, 0.82, 0.22);
  vec3 r = vec3(0.92, 0.2, 0.18);
  if (t < 0.5) return mix(g, y, t * 2.0);
  return mix(y, r, (t - 0.5) * 2.0);
}

vec3 moldGradient(float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 safe = vec3(0.06, 0.52, 0.55);
  vec3 warn = vec3(0.9, 0.78, 0.22);
  vec3 bad = vec3(0.52, 0.14, 0.68);
  if (t < 0.45) return mix(safe, warn, t / 0.45);
  return mix(warn, bad, (t - 0.45) / 0.55);
}

vec3 airflowGradient(float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 low = vec3(0.1, 0.18, 0.58);
  vec3 high = vec3(0.82, 0.94, 1.0);
  return mix(low, high, t);
}

vec3 vibrationGradient(float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 low = vec3(0.18, 0.42, 0.92);
  vec3 mid = vec3(0.72, 0.32, 0.9);
  vec3 high = vec3(0.94, 0.18, 0.24);
  if (t < 0.5) return mix(low, mid, t * 2.0);
  return mix(mid, high, (t - 0.5) * 2.0);
}

vec3 pressureGradient(float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 low = vec3(0.42, 0.22, 0.72);
  vec3 mid = vec3(0.22, 0.72, 0.78);
  vec3 high = vec3(0.92, 0.58, 0.2);
  if (t < 0.5) return mix(low, mid, t * 2.0);
  return mix(mid, high, (t - 0.5) * 2.0);
}

void main() {
  vec2 c = gl_PointCoord - vec2(0.5);
  if (dot(c, c) > 0.25) discard;

  float axial = vNorm.y * 0.52 + vNorm.x * 0.26 + vNorm.z * 0.22;
  float edge = 1.0 - smoothstep(0.35, 0.5, length(c) * 2.0);
  vec3 col;

  if (uFieldKind == 0) {
    float heat = clamp(mix(axial * 0.5 + 0.22, uPrimary, 0.58) + uSecondary * 0.1, 0.0, 1.0);
    col = tempGradient(heat);
  } else {
    float live = uPrimary;
    float v = clamp(mix(axial * 0.48 + 0.18, live, 0.56), 0.0, 1.0);
    if (uFieldKind == 2) {
      v = clamp(v + uSecondary * 0.1, 0.0, 1.0);
    }
    if (uFieldKind == 1) col = pm25Gradient(v);
    else if (uFieldKind == 2) col = moldGradient(v);
    else if (uFieldKind == 3) col = airflowGradient(v);
    else if (uFieldKind == 4) col = vibrationGradient(v);
    else col = pressureGradient(v);
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
  onResolved,
  onFailed,
  onMapFrame,
}: {
  url: string;
  mode?: MapViewportMode;
  fieldTelemetry: FieldTelemetry;
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

  // Stable uniform refs; values updated in useFrame (avoid remounting ShaderMaterial).
  const fieldUniforms = useMemo(
    () => ({
      uFieldKind: { value: 0 },
      uPrimary: { value: 0 },
      uSecondary: { value: 0 },
      uBBoxMin: { value: new THREE.Vector3() },
      uBBoxMax: { value: new THREE.Vector3() },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial values only
    [],
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
