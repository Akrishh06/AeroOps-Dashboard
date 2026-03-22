"use client";

import { useEffect, useRef } from "react";

import { useTelemetryStore } from "@/store/telemetryStore";

export function useDisplaySmoothing() {
  const tickDisplay = useTelemetryStore((s) => s.tickDisplay);
  const raf = useRef<number>(0);
  const last = useRef(
    typeof performance !== "undefined" ? performance.now() : 0,
  );

  useEffect(() => {
    last.current = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last.current) / 1000);
      last.current = now;
      tickDisplay(dt);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [tickDisplay]);
}
