import type { GameFormat, Quarter } from "@/types/game";

/** 125 → "2:05" */
export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** 4 → "Q4", 2 in halves → "H2", "OT" → "OT" */
export function formatQuarter(quarter: Quarter, format: GameFormat = "quarters"): string {
  if (quarter === "OT") return "OT";
  return `${format === "halves" ? "H" : "Q"}${quarter}`;
}
