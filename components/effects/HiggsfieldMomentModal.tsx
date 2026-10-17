"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { HIGGSFIELD_TRIGGER_LABELS } from "@/lib/constants";
import type { HiggsfieldMomentModalProps } from "@/types/game";

/** A basketball drawn in SVG: orange ball + seams. */
function Basketball() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className="size-full">
      <circle cx="32" cy="32" r="30" className="fill-orange" />
      <g fill="none" className="stroke-bg" strokeWidth="2.5">
        <circle cx="32" cy="32" r="30" />
        <path d="M2 32h60M32 2v60" />
        <path d="M11 11c8 7 8 35 0 42M53 11c-8 7-8 35 0 42" />
      </g>
    </svg>
  );
}

/** Bouncing, spinning ball with a squashing shadow — the loading state. */
function BouncingBall() {
  return (
    <div className="relative flex h-28 w-16 flex-col items-center justify-end">
      <motion.div
        className="size-14"
        animate={{ y: [-56, 0, -56], rotate: [0, 180, 360] }}
        transition={{ duration: 1, repeat: Infinity, ease: "easeInOut", times: [0, 0.5, 1] }}
      >
        <Basketball />
      </motion.div>
      <motion.div
        className="mt-1 h-2 w-12 rounded-full bg-black/60"
        animate={{ scaleX: [0.5, 1, 0.5], opacity: [0.3, 0.8, 0.3] }}
        transition={{ duration: 1, repeat: Infinity, ease: "easeInOut", times: [0, 0.5, 1] }}
      />
    </div>
  );
}

function formatElapsed(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;
}

/** Ticks once a second while generating so the scorer sees progress. */
function useElapsed(startedAt: number | null, active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [active]);
  return startedAt === null ? 0 : now - startedAt;
}

export default function HiggsfieldMomentModal({ isOpen, status, videoUrl, moment, error, onClose }: HiggsfieldMomentModalProps) {
  const elapsed = useElapsed(moment?.startedAt ?? null, isOpen && status === "generating");

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const label = moment ? HIGGSFIELD_TRIGGER_LABELS[moment.trigger] : "Cinematic Moment";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="higgsfield-moment"
          role="dialog"
          aria-modal="true"
          aria-label={`${label} — cinematic moment`}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 px-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <motion.button
            type="button"
            onClick={onClose}
            whileTap={{ scale: 0.9 }}
            aria-label="Dismiss cinematic moment"
            className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-10 grid size-11 place-items-center rounded-full border border-border bg-surface/80 text-white hover:text-orange"
          >
            <svg viewBox="0 0 16 16" aria-hidden className="size-4 fill-none stroke-current" strokeWidth="2">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </motion.button>

          <motion.div
            className="relative aspect-video w-full max-w-5xl overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_0_80px_var(--color-orange-glow)]"
            initial={{ scale: 0.94, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
          >
            {/* Trigger label — top-left on every state */}
            <span className="absolute left-3 top-3 z-10 rounded-full bg-orange px-3 py-1 font-display text-lg leading-none tracking-[0.15em] text-bg sm:left-5 sm:top-5 sm:text-xl">
              {label}
            </span>

            {status === "ready" && videoUrl ? (
              <>
                <video
                  key={videoUrl}
                  src={videoUrl}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="absolute inset-0 size-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent px-4 pb-4 pt-16 sm:px-8 sm:pb-7">
                  <motion.p
                    className="max-w-3xl font-display text-2xl leading-[1.05] tracking-wide text-white sm:text-4xl"
                    // Slide only — the call must stay readable even if animation frames stall.
                    initial={{ y: 20 }}
                    animate={{ y: 0 }}
                    transition={{ delay: 0.4, type: "spring", stiffness: 200, damping: 24 }}
                  >
                    {moment?.caption}
                  </motion.p>
                </div>
              </>
            ) : status === "error" ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
                <p className="font-display text-3xl leading-none text-white">Moment unavailable</p>
                <p className="max-w-md text-sm text-muted">{error}</p>
                <motion.button
                  type="button"
                  onClick={onClose}
                  whileTap={{ scale: 0.95 }}
                  className="mt-2 rounded-xl border border-border bg-surface-2 px-5 py-2.5 font-display text-xl leading-none text-white"
                >
                  Back to the game
                </motion.button>
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 overflow-hidden">
                {/* Skeleton shimmer across the frame the video will fill */}
                <motion.div
                  aria-hidden
                  className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent"
                  animate={{ x: ["-100%", "250%"] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                />
                <BouncingBall />
                <div className="relative flex flex-col items-center gap-1 px-6 text-center">
                  <p className="font-display text-2xl leading-none tracking-wide text-white sm:text-3xl">
                    Generating your cinematic moment...
                  </p>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                    <span className="tabular">{formatElapsed(elapsed)}</span> · usually 20–60 seconds
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
