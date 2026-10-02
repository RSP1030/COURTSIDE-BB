"use client";

import { AnimatePresence, motion } from "framer-motion";

import { useGameStore } from "@/store/gameStore";

/** Full-screen pulsing red frame while clutch mode is on. */
export default function ClutchOverlay() {
  const isClutchMode = useGameStore((state) => state.isClutchMode);

  return (
    <AnimatePresence>
      {isClutchMode && (
        <motion.div
          key="clutch-border"
          aria-hidden
          className="pointer-events-none fixed inset-0 z-40 border-2 border-clutch shadow-[inset_0_0_90px_var(--color-clutch-glow)] sm:border-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.35, 1, 0.35] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </AnimatePresence>
  );
}

/** In-flow banner: slides down from the top and pushes content, so it never covers UI. */
export function ClutchBanner() {
  const isClutchMode = useGameStore((state) => state.isClutchMode);

  return (
    <AnimatePresence initial={false}>
      {isClutchMode && (
        <motion.div
          key="clutch-banner"
          role="status"
          className="flex justify-center overflow-hidden"
          initial={{ height: 0, y: -40 }}
          animate={{ height: "auto", y: 0 }}
          exit={{ height: 0, y: -40 }}
          transition={{ type: "spring", stiffness: 240, damping: 24 }}
        >
          <span className="rounded-full bg-clutch px-5 py-1.5 font-display text-2xl leading-none tracking-[0.2em] text-white shadow-[0_0_40px_var(--color-clutch-glow)]">
            Clutch Mode
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
