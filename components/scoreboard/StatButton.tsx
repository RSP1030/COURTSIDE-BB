"use client";

import { motion } from "framer-motion";

import { colors } from "@/lib/colors";
import type { StatButtonProps } from "@/types/game";

export default function StatButton({ label, value, onPress }: StatButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onPress}
      whileHover={{ backgroundColor: colors.surface2 }}
      whileTap={{ scale: 0.94 }}
      aria-label={`Add ${label}, currently ${value}`}
      className="flex flex-col items-center justify-center gap-0.5 rounded-lg border border-border bg-surface py-2"
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">+{label}</span>
      <span className="font-display text-2xl leading-none tabular">{value}</span>
    </motion.button>
  );
}
