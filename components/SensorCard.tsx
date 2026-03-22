import type { ReactNode } from "react";

export function SensorCard({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-md border border-white/[0.06] bg-panel/80 px-3 py-2.5 shadow-insetline backdrop-blur-sm">
      <p className="micro-label mb-1.5 text-dim">{label}</p>
      <div className="text-ink">{children}</div>
    </div>
  );
}
