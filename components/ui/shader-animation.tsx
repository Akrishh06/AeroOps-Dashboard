"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

import { cn } from "@/lib/utils";

export type ShaderAnimationProps = {
  className?: string;
};

export function ShaderAnimation({ className }: ShaderAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const vertexShader = `
      void main() {
        gl_Position = vec4( position, 1.0 );
      }
    `;

    // Three.js maps gl_FragColor on WebGL2. Epsilon avoids divide-by-zero on strict GPUs.
    const fragmentShader = `
      #define TWO_PI 6.2831853072
      #define PI 3.14159265359

      precision highp float;
      uniform vec2 resolution;
      uniform float time;

      void main(void) {
        vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
        float t = time * 0.05;
        float lineWidth = 0.002;

        vec3 color = vec3(0.0);
        for (int j = 0; j < 3; j++) {
          for (int i = 0; i < 5; i++) {
            float fi = float(i);
            float fj = float(j);
            float denom = abs(
              fract(t - 0.01 * fj + fi * 0.01) * 5.0 - length(uv) + mod(uv.x + uv.y, 0.2)
            );
            denom = max(denom, 1e-4);
            color[j] += lineWidth * (fi * fi) / denom;
          }
        }

        gl_FragColor = vec4(color[0], color[1], color[2], 1.0);
      }
    `;

    let renderer: THREE.WebGLRenderer | null = null;
    let geometry: THREE.BufferGeometry | null = null;
    let material: THREE.ShaderMaterial | null = null;

    try {
      const camera = new THREE.Camera();
      camera.position.z = 1;

      const scene = new THREE.Scene();
      geometry = new THREE.PlaneGeometry(2, 2);

      const uniforms = {
        time: { value: 1.0 },
        resolution: { value: new THREE.Vector2(1, 1) },
      };

      material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader,
        fragmentShader,
      });

      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
        failIfMajorPerformanceCaveat: false,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 1);

      container.appendChild(renderer.domElement);

      const onWindowResize = () => {
        const width = Math.max(1, Math.floor(container.clientWidth));
        const height = Math.max(1, Math.floor(container.clientHeight));
        renderer!.setSize(width, height, false);
        uniforms.resolution.value.x = renderer!.domElement.width;
        uniforms.resolution.value.y = renderer!.domElement.height;
      };

      onWindowResize();
      window.addEventListener("resize", onWindowResize, false);
      const ro = new ResizeObserver(() => onWindowResize());
      ro.observe(container);

      const animate = () => {
        if (!renderer || !material) return;
        rafRef.current = requestAnimationFrame(animate);
        uniforms.time.value += 0.05;
        renderer.render(scene, camera);
      };

      animate();

      return () => {
        ro.disconnect();
        cancelAnimationFrame(rafRef.current);
        window.removeEventListener("resize", onWindowResize);
        geometry?.dispose();
        material?.dispose();
        renderer?.dispose();
        if (renderer?.domElement.parentNode === container) {
          container.removeChild(renderer.domElement);
        }
      };
    } catch (e) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[ShaderAnimation] WebGL init failed:", e);
      }
      return undefined;
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn("h-full w-full min-h-0 min-w-0", className)}
      style={{
        background: "#000",
        overflow: "hidden",
      }}
    />
  );
}
