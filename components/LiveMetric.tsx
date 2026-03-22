"use client";

import { motion } from "framer-motion";

export function LiveMetric({
  value,
  unit,
  decimals = 1,
}: {
  value: number;
  unit?: string;
  decimals?: number;
}) {
  const s = value.toFixed(decimals);
  return (
    <span className="inline-flex items-baseline gap-1">
      <motion.span
        key={s}
        initial={{ opacity: 0.55, y: 1 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
        className="instrument-value"
      >
        {s}
      </motion.span>
      {unit ? <span className="instrument-unit">{unit}</span> : null}
    </span>
  );
}
