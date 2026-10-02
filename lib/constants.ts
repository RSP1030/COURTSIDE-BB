import type {
  Quarter,
  StatConfig,
  StatType,
  TeamStats,
  VoiceConfig,
  VoiceStyle,
} from "@/types/game";

// ── Clock ────────────────────────────────────────────────────
/** 10-minute quarters (FIBA / school rules). Change to 720 for NBA. */
export const QUARTER_LENGTH_SECONDS = 600;
export const OVERTIME_LENGTH_SECONDS = 300;
export const QUARTERS: readonly Quarter[] = [1, 2, 3, 4, "OT"];

export function periodLength(quarter: Quarter): number {
  return quarter === "OT" ? OVERTIME_LENGTH_SECONDS : QUARTER_LENGTH_SECONDS;
}

// ── Clutch mode (CLAUDE.md §5) ───────────────────────────────
export const CLUTCH_TIME_THRESHOLD_SECONDS = 120;
export const CLUTCH_SCORE_DIFF_THRESHOLD = 5;

// ── Stats ────────────────────────────────────────────────────
export const STAT_TYPES: readonly StatType[] = ["reb", "ast", "foul", "to", "stl", "blk"];

export const STAT_CONFIG: Record<StatType, StatConfig> = {
  reb: { type: "reb", label: "REB" },
  ast: { type: "ast", label: "AST" },
  foul: { type: "foul", label: "FOUL" },
  to: { type: "to", label: "TO" },
  stl: { type: "stl", label: "STL" },
  blk: { type: "blk", label: "BLK" },
};

export function emptyStats(): TeamStats {
  return { reb: 0, ast: 0, foul: 0, to: 0, stl: 0, blk: 0 };
}

export const DEFAULT_TEAM_A_NAME = "HOME";
export const DEFAULT_TEAM_B_NAME = "AWAY";

// ── Commentary ───────────────────────────────────────────────
export const COMMENTARY_FEED_LIMIT = 20;
export const GROQ_MODEL = "qwen/qwen3-27b-it";

// ── Voices (ElevenLabs premade voice IDs) ────────────────────
export const ELEVENLABS_MODEL = "eleven_turbo_v2_5";
export const DEFAULT_VOICE: VoiceStyle = "adam";

export const VOICE_CONFIG: Record<VoiceStyle, VoiceConfig> = {
  adam: {
    id: "adam",
    label: "Adam",
    elevenLabsVoiceId: "pNInz6obpgDQGcFmaJgB",
    description: "Deep, classic play-by-play",
  },
  josh: {
    id: "josh",
    label: "Josh",
    elevenLabsVoiceId: "TxGEqnHWrfWFTfGW9XjX",
    description: "Young, high-energy",
  },
  rachel: {
    id: "rachel",
    label: "Rachel",
    elevenLabsVoiceId: "21m00Tcm4TlvDq8ikWBM",
    description: "Calm, clear broadcast",
  },
};

// ── Crowd audio (CLAUDE.md §6) ───────────────────────────────
export const CROWD_SOUNDS = {
  cheer: "/sounds/crowd-cheer.mp3",
  applause: "/sounds/applause.mp3",
  stompCheer: "/sounds/stomp-cheer.mp3",
} as const;
export const CROWD_VOLUME = 0.35;
export const CROWD_VOLUME_CLUTCH = 0.55;
export const CROWD_FADE_AFTER_MS = 3000;

// ── Higgsfield (CLAUDE.md §7) ────────────────────────────────
export const MAX_HIGGSFIELD_CLIPS = 3;
