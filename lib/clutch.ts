import { CLUTCH_SCORE_DIFF_THRESHOLD, CLUTCH_TIME_THRESHOLD_SECONDS } from "@/lib/constants";
import type { Quarter } from "@/types/game";

interface ClutchInput {
  quarter: Quarter;
  timeRemaining: number;
  scoreA: number;
  scoreB: number;
}

/** True when all three clutch conditions from CLAUDE.md §5 hold. Pure. */
export function meetsClutchConditions({ quarter, timeRemaining, scoreA, scoreB }: ClutchInput): boolean {
  const lateGame = quarter === 4 || quarter === "OT";
  const underTwoMinutes = timeRemaining <= CLUTCH_TIME_THRESHOLD_SECONDS;
  const closeGame = Math.abs(scoreA - scoreB) <= CLUTCH_SCORE_DIFF_THRESHOLD;
  return lateGame && underTwoMinutes && closeGame;
}
