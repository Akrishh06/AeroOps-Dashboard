"use client";

import { motion } from "framer-motion";
import { Radio } from "lucide-react";

export function ConnectionStatus({ connected }: { connected: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded border border-white/[0.06] bg-black/25 px-2.5 py-1.5">
      <motion.span
        animate={{ opacity: connected ? [0.5, 1, 0.5] : 0.35 }}
        transition={{ duration: 2.2, repeat: connected ? Infinity : 0 }}
      >
        <Radio className="h-3.5 w-3.5 text-accent" strokeWidth={2} />
      </motion.span>
      <span className="font-mono text-[10px] uppercase tracking-wider text-dim">
        {connected ? "Linked" : "Offline"}
      </span>
    </div>
  );
}
