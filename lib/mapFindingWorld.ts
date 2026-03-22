import * as THREE from "three";

import type { MapFrameMeta } from "@/store/telemetryStore";

/**
 * World-space position of a finding marker, matching the transform on
 * `FindingAndRobotMarkers` (uniform scale then -90° X).
 */
export function findingLocationToWorld(
  location: { x: number; y: number; z: number },
  mapFrame: MapFrameMeta,
): { x: number; y: number; z: number } {
  const [cx, cy, cz] = mapFrame.plyWorldCenter;
  const s = mapFrame.uniformScale;
  const v = new THREE.Vector3(location.x - cx, location.y - cy, location.z - cz);
  v.multiplyScalar(s);
  v.applyEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  return { x: v.x, y: v.y, z: v.z };
}
