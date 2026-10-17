"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { motion } from "framer-motion";

import { MAX_CLOCK_SECONDS, PERIODS, periodLength } from "@/lib/constants";
import { formatClock, formatQuarter } from "@/lib/format";
import { useGameStore } from "@/store/gameStore";
import type { ClockEditorProps, GameFormat } from "@/types/game";

const FORMAT_OPTIONS: { id: GameFormat; label: string; title: string }[] = [
  { id: "quarters", label: "4Q", title: "Four quarters" },
  { id: "halves", label: "2H", title: "Two halves" },
];

/**
 * Inline clock editor: separate minute and second boxes, because phone number
 * pads have no ":" key. Enter or ✓ saves, Esc or ✕ cancels.
 */
function ClockEditor({ seconds, onSave, onCancel }: ClockEditorProps) {
  const [minutes, setMinutes] = useState(String(Math.floor(seconds / 60)));
  const [secs, setSecs] = useState(String(seconds % 60).padStart(2, "0"));
  const minutesRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    minutesRef.current?.select();
  }, []);

  function save(event: FormEvent) {
    event.preventDefault();
    const m = Number.parseInt(minutes || "0", 10);
    const s = Number.parseInt(secs || "0", 10);
    if (Number.isNaN(m) || Number.isNaN(s) || s > 59) return;
    onSave(Math.min(MAX_CLOCK_SECONDS, m * 60 + s));
  }

  const field =
    "w-[2.4ch] rounded-md border border-orange bg-surface-2 text-center font-display text-5xl leading-none tabular text-white outline-none sm:text-6xl";

  return (
    <form
      onSubmit={save}
      onKeyDown={(event) => {
        if (event.key === "Escape") onCancel();
      }}
      className="flex items-center gap-1"
      aria-label="Edit game clock"
    >
      <input
        ref={minutesRef}
        value={minutes}
        onChange={(event) => setMinutes(event.target.value.replace(/\D/g, "").slice(0, 2))}
        inputMode="numeric"
        aria-label="Minutes"
        className={field}
      />
      <span className="font-display text-5xl leading-none text-muted sm:text-6xl">:</span>
      <input
        value={secs}
        onChange={(event) => setSecs(event.target.value.replace(/\D/g, "").slice(0, 2))}
        inputMode="numeric"
        aria-label="Seconds"
        className={field}
      />
      <div className="ml-1 flex flex-col gap-1">
        <motion.button
          type="submit"
          whileTap={{ scale: 0.9 }}
          aria-label="Save clock"
          className="grid size-7 place-items-center rounded-md bg-orange text-bg"
        >
          <svg viewBox="0 0 16 16" aria-hidden className="size-3.5 fill-none stroke-current" strokeWidth="2.5">
            <path d="M3 8.5l3.2 3L13 4.5" />
          </svg>
        </motion.button>
        <motion.button
          type="button"
          onClick={onCancel}
          whileTap={{ scale: 0.9 }}
          aria-label="Cancel clock edit"
          className="grid size-7 place-items-center rounded-md border border-border bg-surface-2 text-muted"
        >
          <svg viewBox="0 0 16 16" aria-hidden className="size-3 fill-none stroke-current" strokeWidth="2.5">
            <path d="M3 3l10 10M13 3L3 13" />
          </svg>
        </motion.button>
      </div>
    </form>
  );
}

export default function GameClock() {
  const quarter = useGameStore((state) => state.quarter);
  const gameFormat = useGameStore((state) => state.gameFormat);
  const timeRemaining = useGameStore((state) => state.timeRemaining);
  const isClockRunning = useGameStore((state) => state.isClockRunning);
  const isClutchMode = useGameStore((state) => state.isClutchMode);
  const clutchManual = useGameStore((state) => state.clutchManual);
  const setQuarter = useGameStore((state) => state.setQuarter);
  const setGameFormat = useGameStore((state) => state.setGameFormat);
  const setClutchMode = useGameStore((state) => state.setClutchMode);
  const setTimeRemaining = useGameStore((state) => state.setTimeRemaining);
  const startClock = useGameStore((state) => state.startClock);
  const stopClock = useGameStore((state) => state.stopClock);
  const tick = useGameStore((state) => state.tick);
  const [isEditingClock, setIsEditingClock] = useState(false);

  useEffect(() => {
    if (!isClockRunning) return;
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [isClockRunning, tick]);

  function editClock() {
    stopClock();
    setIsEditingClock(true);
  }

  const periods = PERIODS[gameFormat];
  const clockColor = isClutchMode ? "text-clutch" : timeRemaining === 0 ? "text-muted" : "text-white";

  return (
    <section
      aria-label="Game clock"
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-3 sm:p-4"
    >
      {/* Format + period */}
      <div className="flex items-center gap-2">
        <div role="radiogroup" aria-label="Game format" className="flex shrink-0 gap-1 rounded-xl bg-bg p-1">
          {FORMAT_OPTIONS.map((option) => {
            const isActive = option.id === gameFormat;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={isActive}
                title={option.title}
                onClick={() => setGameFormat(option.id)}
                className={`rounded-lg px-2.5 py-1.5 font-display text-lg leading-none ${
                  isActive ? "bg-surface-2 text-white" : "text-muted hover:text-white"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div
          role="radiogroup"
          aria-label={gameFormat === "halves" ? "Half" : "Quarter"}
          className={`grid flex-1 gap-1 rounded-xl bg-bg p-1 ${periods.length === 5 ? "grid-cols-5" : "grid-cols-3"}`}
        >
          {periods.map((q) => {
            const isActive = q === quarter;
            return (
              <button
                key={q}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => setQuarter(q)}
                className="relative rounded-lg px-2 py-1.5 font-display text-xl leading-none sm:px-4"
              >
                {isActive && (
                  <motion.span
                    layoutId="active-quarter"
                    className="absolute inset-0 rounded-lg bg-orange"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <span className={`relative ${isActive ? "text-bg" : "text-muted hover:text-white"}`}>
                  {formatQuarter(q, gameFormat)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Clock + controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {isEditingClock ? (
          <ClockEditor
            seconds={timeRemaining}
            onSave={(seconds) => {
              setTimeRemaining(seconds);
              setIsEditingClock(false);
            }}
            onCancel={() => setIsEditingClock(false)}
          />
        ) : (
          <button
            type="button"
            onClick={editClock}
            title="Tap to edit the clock"
            aria-label={`Game clock ${formatClock(timeRemaining)} — tap to edit`}
            className={`rounded-lg font-display text-5xl leading-none tabular decoration-orange/60 decoration-2 underline-offset-8 hover:underline sm:text-6xl ${clockColor}`}
          >
            {formatClock(timeRemaining)}
          </button>
        )}

        <div className="flex gap-2">
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={isClockRunning ? stopClock : startClock}
            disabled={timeRemaining === 0 || isEditingClock}
            className={`min-w-20 rounded-lg px-4 py-2.5 font-display text-xl leading-none disabled:opacity-40 ${
              isClockRunning ? "border border-border bg-surface-2 text-white" : "bg-orange text-bg"
            }`}
          >
            {isClockRunning ? "Stop" : "Start"}
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => setTimeRemaining(periodLength(quarter, gameFormat))}
            aria-label="Reset period clock"
            className="rounded-lg border border-border bg-surface-2 px-3 py-2.5 font-display text-xl leading-none text-muted hover:text-white"
          >
            Reset
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => setClutchMode(!isClutchMode)}
            aria-pressed={isClutchMode}
            title={
              clutchManual
                ? "Clutch mode is under manual control for this game"
                : "Turns on by itself in the last 2 minutes of a close game — tap to control it manually"
            }
            className={`relative flex items-center gap-1.5 rounded-lg px-3 py-2.5 font-display text-xl leading-none ${
              isClutchMode
                ? "bg-clutch text-white shadow-[0_0_24px_var(--color-clutch-glow)]"
                : "border border-border bg-surface-2 text-muted hover:text-white"
            }`}
          >
            <svg viewBox="0 0 16 16" aria-hidden className="size-4 fill-current">
              <path d="M8 1c.6 2.6 3.9 4.3 3.9 8.1A4 4 0 0 1 8 13.2a4 4 0 0 1-3.9-4.1c0-1.6.8-2.8 1.6-3.6.1 1.3.8 2.2 1.6 2.4C7.1 5.7 7.3 3.1 8 1zM8 15a2.2 2.2 0 0 1-2.2-2.2c0-.9.5-1.6 1-2.1.1.6.5 1 .9 1.1-.1-.9.1-1.8.6-2.6.5 1.3 1.9 2 1.9 3.6A2.2 2.2 0 0 1 8 15z" />
            </svg>
            Clutch
            {!clutchManual && (
              <span className="absolute -right-1.5 -top-1.5 rounded bg-surface px-1 py-0.5 font-sans text-[8px] font-bold uppercase tracking-wider text-muted ring-1 ring-border">
                Auto
              </span>
            )}
          </motion.button>
        </div>
      </div>
    </section>
  );
}
