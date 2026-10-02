"use client";

import { evaluateClutchConditions } from "@/lib/clutch";
import { useGameStore } from "@/store/gameStore";
import type { ClutchModeState } from "@/types/game";

// Pure detection: reads the latched store flag and evaluates each condition
// live. No side effects — clutch effects (Higgsfield, audio) hook in later.
export function useClutchMode(): ClutchModeState {
  const isClutchMode = useGameStore((state) => state.isClutchMode);
  const quarter = useGameStore((state) => state.quarter);
  const timeRemaining = useGameStore((state) => state.timeRemaining);
  const scoreA = useGameStore((state) => state.teamA.score);
  const scoreB = useGameStore((state) => state.teamB.score);

  const conditions = evaluateClutchConditions({ quarter, timeRemaining, scoreA, scoreB });
  const conditionsMet = Object.values(conditions).filter(Boolean).length;

  return { isClutchMode, conditions, conditionsMet };
}
