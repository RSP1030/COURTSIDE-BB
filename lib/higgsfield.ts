import type { HiggsfieldTrigger } from "@/types/game";

// Server-only: imported by app/api/higgsfield/route.ts.
// TODO(session: higgsfield): confirm REST endpoint + model id against Higgsfield docs,
// then implement generate() and getJobStatus().

/** Prompts per trigger — CLAUDE.md §7. */
export const HIGGSFIELD_PROMPTS: Record<HiggsfieldTrigger, string> = {
  "clutch-activation": "Intense NBA arena atmosphere, crowd roaring, slow motion",
  "clutch-three": "Basketball swishing through net in slow motion, cinematic",
  "game-winner": "Victory celebration, confetti falling, crowd erupting",
  "player-of-match": "Basketball player portrait, dramatic lighting, ESPN style",
};
