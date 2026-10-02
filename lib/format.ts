import type { Quarter } from "@/types/game";

/** 125 → "2:05" */
export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** 4 → "Q4", "OT" → "OT" */
export function formatQuarter(quarter: Quarter): string {
  return quarter === "OT" ? "OT" : `Q${quarter}`;
}
