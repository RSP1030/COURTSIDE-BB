import { CLUTCH_SCORE_DIFF_THRESHOLD, CLUTCH_TIME_THRESHOLD_SECONDS, FINAL_PERIOD } from "@/lib/constants";
import type { ClutchConditions, ClutchInput } from "@/types/game";

/** Evaluates each clutch condition from CLAUDE.md §5 separately. Pure. */
export function evaluateClutchConditions({
  format,
  quarter,
  timeRemaining,
  scoreA,
  scoreB,
}: ClutchInput): ClutchConditions {
  return {
    // Q4 in a quarters game, H2 in a halves game — or any overtime.
    lateGame: quarter === FINAL_PERIOD[format] || quarter === "OT",
    underTwoMinutes: timeRemaining <= CLUTCH_TIME_THRESHOLD_SECONDS,
    closeGame: Math.abs(scoreA - scoreB) <= CLUTCH_SCORE_DIFF_THRESHOLD,
  };
}

/** True when all three clutch conditions from CLAUDE.md §5 hold. Pure. */
export function meetsClutchConditions(input: ClutchInput): boolean {
  const { lateGame, underTwoMinutes, closeGame } = evaluateClutchConditions(input);
  return lateGame && underTwoMinutes && closeGame;
}
