"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { THREE_POINT_SPOTS, TWO_POINT_SHOTS } from "@/lib/constants";
import type { ShotPickerProps, ThreePointSpot } from "@/types/game";

/** Where each spot's button sits on the mini court (percent of the court box). */
const SPOT_POSITIONS: Record<ThreePointSpot, string> = {
  "left-corner": "left-[11%] top-[86%]",
  "left-wing": "left-[13%] top-[40%]",
  top: "left-1/2 top-[19%]",
  "right-wing": "left-[87%] top-[40%]",
  "right-corner": "left-[89%] top-[86%]",
  deep: "left-1/2 top-[4%]",
};

/** Short on-court labels; the full name goes in aria-label. */
const SPOT_SHORT_LABELS: Record<ThreePointSpot, string> = {
  "left-corner": "Corner",
  "left-wing": "Wing",
  top: "Top",
  "right-wing": "Wing",
  "right-corner": "Corner",
  deep: "Logo",
};

/** Half court, basket at the bottom — shot-chart orientation. */
function CourtLines() {
  return (
    <svg viewBox="0 0 500 360" aria-hidden className="absolute inset-0 size-full text-border">
      <g fill="none" stroke="currentColor" strokeWidth="3">
        <rect x="2" y="2" width="496" height="356" rx="6" />
        {/* Three-point line: corners + arc (r = 228 around the rim) */}
        <path d="M30 358 L30 270 A228 228 0 0 1 470 270 L470 358" className="text-orange/60" stroke="currentColor" />
        {/* Paint + free-throw circle */}
        <rect x="190" y="170" width="120" height="188" />
        <circle cx="250" cy="170" r="60" />
        {/* Backboard + rim */}
        <line x1="220" y1="345" x2="280" y2="345" />
        <circle cx="250" cy="330" r="9" className="text-orange" stroke="currentColor" />
        {/* Half-court logo arc */}
        <path d="M190 2 A60 60 0 0 0 310 2" strokeDasharray="6 6" />
      </g>
    </svg>
  );
}

export default function ShotPicker({ points, teamName, onPick, onCancel }: ShotPickerProps) {
  const firstOption = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (points === null) return;
    firstOption.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [points, onCancel]);

  return (
    <AnimatePresence>
      {points !== null && (
        <motion.div
          key="shot-picker"
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <button type="button" aria-label="Cancel" onClick={onCancel} className="absolute inset-0 bg-black/70" />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={points === 2 ? "How was the two scored?" : "Where was the three from?"}
            className="relative w-full max-w-md rounded-t-3xl border border-border bg-surface px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:rounded-3xl sm:pb-4"
            initial={{ y: 48, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 48, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
          >
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="font-display text-3xl leading-none">
                <span className="text-orange">+{points}</span> {teamName}
              </h2>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
                {points === 2 ? "How did they score?" : "Where from?"}
              </span>
            </div>

            {points === 2 ? (
              <div className="grid grid-cols-2 gap-2">
                {TWO_POINT_SHOTS.map((option, index) => (
                  <motion.button
                    key={option.id}
                    ref={index === 0 ? firstOption : undefined}
                    type="button"
                    onClick={() => onPick(option.id)}
                    whileTap={{ scale: 0.94 }}
                    className={`rounded-xl py-5 font-display text-3xl leading-none ${
                      option.id === "dunk"
                        ? "bg-orange text-bg shadow-[0_0_24px_var(--color-orange-glow)]"
                        : "border border-border bg-surface-2 text-white"
                    }`}
                  >
                    {option.label}
                  </motion.button>
                ))}
              </div>
            ) : (
              <div className="relative mx-auto aspect-[500/360] w-full max-w-sm">
                <CourtLines />
                {THREE_POINT_SPOTS.map((option, index) => (
                  <div key={option.id} className={`absolute -translate-x-1/2 -translate-y-1/2 ${SPOT_POSITIONS[option.id]}`}>
                    <motion.button
                      ref={index === 0 ? firstOption : undefined}
                      type="button"
                      onClick={() => onPick(option.id)}
                      whileTap={{ scale: 0.9 }}
                      aria-label={option.label}
                      className={`whitespace-nowrap rounded-full px-3 py-2 font-display text-lg leading-none ${
                        option.id === "deep"
                          ? "bg-orange text-bg shadow-[0_0_20px_var(--color-orange-glow)]"
                          : "border border-orange/50 bg-surface-2 text-white"
                      }`}
                    >
                      {SPOT_SHORT_LABELS[option.id]}
                    </motion.button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 flex gap-2">
              <motion.button
                type="button"
                onClick={() => onPick(null)}
                whileTap={{ scale: 0.96 }}
                className="flex-1 rounded-xl border border-border bg-surface-2 py-3 font-display text-xl leading-none text-white"
              >
                Just +{points}
              </motion.button>
              <motion.button
                type="button"
                onClick={onCancel}
                whileTap={{ scale: 0.96 }}
                className="rounded-xl px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted hover:text-white"
              >
                Cancel
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
