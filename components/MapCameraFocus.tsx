"use client";

import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { useTelemetryStore } from "@/store/telemetryStore";

type Anim = {
  fromT: THREE.Vector3;
  toT: THREE.Vector3;
  fromC: THREE.Vector3;
  toC: THREE.Vector3;
  t: number;
};

/**
 * Default OrbitControls + smooth camera/target lerp when `requestMapFocusAt` runs.
 */
export function MapCameraFocus() {
  const nonce = useTelemetryStore((s) => s.mapFocusNonce);
  const focusTarget = useTelemetryStore((s) => s.mapFocusTarget);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const animRef = useRef<Anim | null>(null);

  useEffect(() => {
    if (nonce === 0 || !focusTarget) return;
    let cancelled = false;
    let attempts = 0;
    const start = () => {
      if (cancelled) return;
      const ctrl = controlsRef.current;
      if (!ctrl) {
        if (attempts++ < 90) requestAnimationFrame(start);
        return;
      }
      const endT = new THREE.Vector3(focusTarget.x, focusTarget.y, focusTarget.z);
      const offset = new THREE.Vector3(1.15, 0.85, 1.35).normalize().multiplyScalar(5.8);
      const endC = endT.clone().add(offset);
      animRef.current = {
        fromT: ctrl.target.clone(),
        toT: endT,
        fromC: camera.position.clone(),
        toC: endC,
        t: 0,
      };
    };
    requestAnimationFrame(start);
    return () => {
      cancelled = true;
    };
  }, [nonce, focusTarget, camera]);

  useFrame((_, delta) => {
    const ctrl = controlsRef.current;
    const a = animRef.current;
    if (!a || !ctrl) return;
    a.t = Math.min(1, a.t + delta * 2.15);
    const k = 1 - (1 - a.t) ** 3;
    ctrl.target.lerpVectors(a.fromT, a.toT, k);
    camera.position.lerpVectors(a.fromC, a.toC, k);
    ctrl.update();
    if (a.t >= 1) animRef.current = null;
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      target={[0, 0.2, 0]}
      minDistance={1.2}
      maxDistance={48}
      maxPolarAngle={Math.PI * 0.52}
      enablePan
    />
  );
}
