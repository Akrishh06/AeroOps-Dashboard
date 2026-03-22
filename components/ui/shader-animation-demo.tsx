"use client";

import { ShaderAnimation } from "@/components/ui/shader-animation";

import { cn } from "@/lib/utils";

/**
 * Demo wrapper: bordered card with shader background + title overlay.
 * Use in marketing pages or Storybook; the main app uses {@link AppIntroOverlay} on load.
 */
export function ShaderAnimationDemo({
  className,
  title = "Shader Animation",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex h-[650px] w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-blue-900/90",
        className,
      )}
    >
      <ShaderAnimation className="absolute inset-0 h-full w-full" />
      <span className="pointer-events-none absolute z-10 whitespace-pre-wrap text-center text-5xl font-semibold leading-none tracking-tighter text-white sm:text-7xl">
        {title}
      </span>
    </div>
  );
}
