"use client";

import { motion } from "framer-motion";

import { useCinematicMoment } from "@/hooks/useCinematicMoment";
import { HIGGSFIELD_ENABLED } from "@/lib/constants";
import { useGameStore } from "@/store/gameStore";

/** Manual trigger: the scorer taps this after the winning basket. */
export default function GameWinnerButton() {
  // Only a Higgsfield job takes long enough to need locking out; Lottie plays instantly.
  const isGenerating = useGameStore((state) => HIGGSFIELD_ENABLED && state.higgsfieldStatus === "generating");
  const playMoment = useCinematicMoment();

  return (
    <motion.button
      type="button"
      onClick={() => playMoment("game-winner")}
      disabled={isGenerating}
      whileTap={{ scale: 0.94 }}
      title="Play the game-winner moment"
      className="flex items-center gap-2 rounded-lg border border-orange/60 bg-surface/80 px-3 py-1.5 font-display text-lg leading-none tracking-wide text-orange hover:bg-orange hover:text-bg disabled:opacity-50"
    >
      <svg viewBox="0 0 16 16" aria-hidden className="size-4 fill-current">
        <path d="M4 1h8v2h3v2a4 4 0 0 1-3.6 4A4 4 0 0 1 9 11.9V14h3v2H4v-2h3v-2.1A4 4 0 0 1 4.6 9 4 4 0 0 1 1 5V3h3V1zm-1 4a2 2 0 0 0 1 1.7V5H3zm9 1.7A2 2 0 0 0 13 5h-1v1.7z" />
      </svg>
      {isGenerating ? "Generating…" : "Game Winner"}
    </motion.button>
  );
}
