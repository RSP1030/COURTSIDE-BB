import { CLUTCH_SCORE_DIFF_THRESHOLD, CLUTCH_TIME_THRESHOLD_SECONDS } from "@/lib/constants";
import type { ClutchConditions, ClutchInput } from "@/types/game";

/** Evaluates each clutch condition from CLAUDE.md §5 separately. Pure. */
export function evaluateClutchConditions({
  quarter,
  timeRemaining,
  scoreA,
  scoreB,
}: ClutchInput): ClutchConditions {
  return {
    lateGame: quarter === 4 || quarter === "OT",
    underTwoMinutes: timeRemaining <= CLUTCH_TIME_THRESHOLD_SECONDS,
    closeGame: Math.abs(scoreA - scoreB) <= CLUTCH_SCORE_DIFF_THRESHOLD,
  };
}

/** True when all three clutch conditions from CLAUDE.md §5 hold. Pure. */
export function meetsClutchConditions(input: ClutchInput): boolean {
  const { lateGame, underTwoMinutes, closeGame } = evaluateClutchConditions(input);
  return lateGame && underTwoMinutes && closeGame;
}
