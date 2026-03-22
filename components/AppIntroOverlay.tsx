"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

import { DashboardShell } from "@/components/DashboardShell";
import { ShaderAnimation } from "@/components/ui/shader-animation";

const INTRO_MS = 2800;

/**
 * Fullscreen shader intro on every visit / refresh, then fades into the dashboard.
 */
export function AppIntroOverlay() {
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    const done = window.setTimeout(() => setShowIntro(false), INTRO_MS);
    return () => {
      window.clearTimeout(done);
    };
  }, []);

  return (
    <>
      <div
        className="flex h-dvh min-h-0 w-full flex-col overflow-hidden"
        aria-hidden={showIntro}
      >
        <DashboardShell />
      </div>

      <AnimatePresence>
        {showIntro ? (
          <motion.div
            key="intro"
            className="fixed inset-0 z-[200] bg-black"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <ShaderAnimation className="absolute inset-0 h-full w-full" />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4">
              <span className="text-center text-5xl font-semibold tracking-tighter text-white sm:text-7xl">
                AeroOps
              </span>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
