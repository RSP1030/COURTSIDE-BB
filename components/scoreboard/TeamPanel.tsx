"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

import ShotPicker from "@/components/scoreboard/ShotPicker";
import StatButton from "@/components/scoreboard/StatButton";
import { STAT_CONFIG, STAT_TYPES } from "@/lib/constants";
import { useGameStore } from "@/store/gameStore";
import type { AnimatedScoreProps, PointValue, ShotDetail, TeamPanelProps } from "@/types/game";

const POINT_VALUES: readonly PointValue[] = [1, 2, 3];
const MAX_NAME_LENGTH = 16;

function AnimatedScore({ value }: AnimatedScoreProps) {
  const spring = useSpring(value, { stiffness: 140, damping: 18, mass: 0.6 });
  const display = useTransform(spring, (latest) => Math.round(latest).toString());

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return <motion.span className="tabular">{display}</motion.span>;
}

export default function TeamPanel({ teamId, align }: TeamPanelProps) {
  const team = useGameStore((state) => state[teamId]);
  const opponentScore = useGameStore((state) =>
    teamId === "teamA" ? state.teamB.score : state.teamA.score,
  );
  const isClutchMode = useGameStore((state) => state.isClutchMode);
  const setTeamName = useGameStore((state) => state.setTeamName);
  const addPoints = useGameStore((state) => state.addPoints);
  const recordStat = useGameStore((state) => state.recordStat);

  const [isEditing, setIsEditing] = useState(false);
  /** +2/+3 open the shot picker first; +1 scores straight away. */
  const [pendingPoints, setPendingPoints] = useState<2 | 3 | null>(null);
  const closePicker = useCallback(() => setPendingPoints(null), []);

  function pickShot(shot: ShotDetail | null) {
    if (pendingPoints === null) return;
    addPoints(teamId, pendingPoints, shot ? { shot } : undefined);
    setPendingPoints(null);
  }
  const [draftName, setDraftName] = useState(team.name);

  const isLeading = team.score > opponentScore;
  const isTied = team.score === opponentScore;
  const alignText = align === "left" ? "sm:text-left" : "sm:text-right";
  const alignItems = align === "left" ? "sm:items-start" : "sm:items-end";

  function startEditing() {
    setDraftName(team.name);
    setIsEditing(true);
  }

  function commitName(event?: FormEvent) {
    event?.preventDefault();
    const trimmed = draftName.trim().toUpperCase();
    if (trimmed) setTeamName(teamId, trimmed);
    setIsEditing(false);
  }

  return (
    <section
      aria-label={`${team.name} scoreboard`}
      className="relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface"
    >
      {/* Leader bar: lights up over whichever side is ahead */}
      <motion.div
        aria-hidden
        className={`absolute inset-x-0 top-0 h-1 ${isClutchMode ? "bg-clutch" : "bg-orange"} ${
          align === "left" ? "origin-left" : "origin-right"
        }`}
        initial={false}
        animate={{ scaleX: isLeading ? 1 : 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
      />

      <div className={`flex flex-col items-center gap-1 px-3 pt-5 text-center sm:px-5 ${alignItems} ${alignText}`}>
        {isEditing ? (
          <form onSubmit={commitName} className="w-full">
            <input
              autoFocus
              value={draftName}
              maxLength={MAX_NAME_LENGTH}
              onChange={(event) => setDraftName(event.target.value)}
              onBlur={() => commitName()}
              onKeyDown={(event) => {
                if (event.key === "Escape") setIsEditing(false);
              }}
              aria-label="Team name"
              className={`w-full rounded-md border border-orange bg-surface-2 px-2 py-0.5 font-display text-2xl uppercase tracking-wide outline-none sm:text-3xl ${alignText}`}
            />
          </form>
        ) : (
          <button
            type="button"
            onClick={startEditing}
            title="Click to rename"
            className="max-w-full truncate font-display text-2xl tracking-wide text-white hover:text-orange sm:text-3xl"
          >
            {team.name}
          </button>
        )}
        <span
          className={`text-[10px] font-semibold uppercase tracking-[0.25em] ${
            isLeading ? "text-orange" : "text-muted"
          }`}
        >
          {isLeading ? "Leading" : isTied ? "Tied" : "Trailing"}
        </span>
      </div>

      <div
        className={`px-3 text-center font-display text-[5.5rem] leading-[0.85] sm:px-5 sm:text-[7.5rem] lg:text-[9rem] ${alignText} ${
          isLeading || isTied ? "text-white" : "text-white/60"
        }`}
      >
        <AnimatedScore value={team.score} />
      </div>

      <div className="grid grid-cols-3 gap-2 px-3 pt-4 sm:px-5">
        {POINT_VALUES.map((points) => (
          <motion.button
            key={points}
            type="button"
            onClick={() => (points === 1 ? addPoints(teamId, 1) : setPendingPoints(points))}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.92 }}
            aria-label={`Add ${points} point${points > 1 ? "s" : ""} to ${team.name}`}
            className={`rounded-xl py-3 font-display text-3xl leading-none sm:text-4xl ${
              points === 3
                ? "bg-orange text-bg shadow-[0_0_24px_var(--color-orange-glow)]"
                : "border border-border bg-surface-2 text-white"
            }`}
          >
            +{points}
          </motion.button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 sm:p-5">
        {STAT_TYPES.map((stat) => (
          <StatButton
            key={stat}
            label={STAT_CONFIG[stat].label}
            value={team.stats[stat]}
            onPress={() => recordStat(teamId, stat)}
          />
        ))}
      </div>

      <ShotPicker points={pendingPoints} teamName={team.name} onPick={pickShot} onCancel={closePicker} />
    </section>
  );
}
