"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";

import { QUARTERS, periodLength } from "@/lib/constants";
import { formatClock, formatQuarter } from "@/lib/format";
import { useGameStore } from "@/store/gameStore";

export default function GameClock() {
  const quarter = useGameStore((state) => state.quarter);
  const timeRemaining = useGameStore((state) => state.timeRemaining);
  const isClockRunning = useGameStore((state) => state.isClockRunning);
  const isClutchMode = useGameStore((state) => state.isClutchMode);
  const setQuarter = useGameStore((state) => state.setQuarter);
  const setTimeRemaining = useGameStore((state) => state.setTimeRemaining);
  const startClock = useGameStore((state) => state.startClock);
  const stopClock = useGameStore((state) => state.stopClock);
  const tick = useGameStore((state) => state.tick);

  useEffect(() => {
    if (!isClockRunning) return;
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [isClockRunning, tick]);

  const clockColor = isClutchMode ? "text-clutch" : timeRemaining === 0 ? "text-muted" : "text-white";

  return (
    <section
      aria-label="Game clock"
      className="flex flex-col items-stretch gap-3 rounded-2xl border border-border bg-surface p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4"
    >
      <div role="radiogroup" aria-label="Quarter" className="grid grid-cols-5 gap-1 rounded-xl bg-bg p-1">
        {QUARTERS.map((q) => {
          const isActive = q === quarter;
          return (
            <button
              key={q}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => setQuarter(q)}
              className="relative rounded-lg px-3 py-1.5 font-display text-xl leading-none sm:px-4"
            >
              {isActive && (
                <motion.span
                  layoutId="active-quarter"
                  className="absolute inset-0 rounded-lg bg-orange"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <span className={`relative ${isActive ? "text-bg" : "text-muted hover:text-white"}`}>
                {formatQuarter(q)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <span className={`font-display text-5xl leading-none tabular sm:text-6xl ${clockColor}`}>
          {formatClock(timeRemaining)}
        </span>

        <div className="flex gap-2">
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={isClockRunning ? stopClock : startClock}
            disabled={timeRemaining === 0}
            className={`min-w-20 rounded-lg px-4 py-2.5 font-display text-xl leading-none disabled:opacity-40 ${
              isClockRunning ? "border border-border bg-surface-2 text-white" : "bg-orange text-bg"
            }`}
          >
            {isClockRunning ? "Stop" : "Start"}
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => setTimeRemaining(periodLength(quarter))}
            aria-label="Reset period clock"
            className="rounded-lg border border-border bg-surface-2 px-3 py-2.5 font-display text-xl leading-none text-muted hover:text-white"
          >
            Reset
          </motion.button>
        </div>
      </div>
    </section>
  );
}
