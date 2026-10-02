"use client";

import { AnimatePresence, motion } from "framer-motion";
import UnicornScene from "unicornstudio-react/next";

import { useGameStore } from "@/store/gameStore";

const AMBIENT_ID = process.env.NEXT_PUBLIC_UNICORN_AMBIENT_ID;
const CLUTCH_ID = process.env.NEXT_PUBLIC_UNICORN_CLUTCH_ID;

/** Hand-drawn full court; shown until the Unicorn Studio scene IDs are set. */
function CourtLines() {
  const half = (
    <>
      <rect x="0" y="170" width="190" height="160" />
      <circle cx="190" cy="250" r="60" />
      <path d="M0 30 H140 A237.5 237.5 0 0 1 140 470 H0" />
      <circle cx="52.5" cy="250" r="7.5" />
    </>
  );

  return (
    <svg
      aria-hidden
      viewBox="0 0 940 500"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full fill-none stroke-white/[0.05] [stroke-width:2]"
    >
      <rect x="1" y="1" width="938" height="498" />
      <line x1="470" y1="0" x2="470" y2="500" />
      <circle cx="470" cy="250" r="60" />
      <circle cx="470" cy="250" r="20" />
      {half}
      <g transform="translate(940 0) scale(-1 1)">{half}</g>
    </svg>
  );
}

export default function UnicornBackground() {
  const isClutchMode = useGameStore((state) => state.isClutchMode);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-bg">
      {AMBIENT_ID ? (
        <UnicornScene projectId={AMBIENT_ID} className="absolute inset-0" lazyLoad={false} />
      ) : (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_-10%,var(--color-orange-glow),transparent_70%)]" />
          <CourtLines />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-bg to-transparent" />
        </>
      )}

      <AnimatePresence>
        {isClutchMode && (
          <motion.div
            key="clutch-scene"
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          >
            {CLUTCH_ID ? (
              <UnicornScene projectId={CLUTCH_ID} className="absolute inset-0" lazyLoad={false} />
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_110%,var(--color-clutch-glow),transparent_70%)]" />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
