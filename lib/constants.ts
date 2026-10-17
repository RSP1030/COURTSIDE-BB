import type {
  GameFormat,
  HiggsfieldTrigger,
  LottieMomentConfig,
  LottieMomentKind,
  Quarter,
  ShotOption,
  StatConfig,
  StatType,
  TeamStats,
  ThreePointSpot,
  TwoPointShot,
  VoiceConfig,
  VoiceStyle,
} from "@/types/game";

// ── Clock ────────────────────────────────────────────────────
/** 10-minute quarters (FIBA / school rules). Change to 720 for NBA. */
export const QUARTER_LENGTH_SECONDS = 600;
/** 20-minute halves (college / FIBA-length games played in two halves). */
export const HALF_LENGTH_SECONDS = 1200;
export const OVERTIME_LENGTH_SECONDS = 300;
/** Longest time the scorer can type into the clock (99:59). */
export const MAX_CLOCK_SECONDS = 99 * 60 + 59;
export const DEFAULT_GAME_FORMAT: GameFormat = "quarters";

export const PERIODS: Record<GameFormat, readonly Quarter[]> = {
  quarters: [1, 2, 3, 4, "OT"],
  halves: [1, 2, "OT"],
};

/** The last regulation period — where clutch time can start. */
export const FINAL_PERIOD: Record<GameFormat, Quarter> = { quarters: 4, halves: 2 };

export function periodLength(quarter: Quarter, format: GameFormat): number {
  if (quarter === "OT") return OVERTIME_LENGTH_SECONDS;
  return format === "halves" ? HALF_LENGTH_SECONDS : QUARTER_LENGTH_SECONDS;
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

// ── Shot details (picked after tapping +2 / +3) ─────────────
export const TWO_POINT_SHOTS: readonly ShotOption<TwoPointShot>[] = [
  { id: "layup", label: "Layup" },
  { id: "dunk", label: "Dunk" },
  { id: "jumper", label: "Jumper" },
  { id: "floater", label: "Floater" },
];

export const THREE_POINT_SPOTS: readonly ShotOption<ThreePointSpot>[] = [
  { id: "left-corner", label: "Left corner" },
  { id: "left-wing", label: "Left wing" },
  { id: "top", label: "Top of the key" },
  { id: "right-wing", label: "Right wing" },
  { id: "right-corner", label: "Right corner" },
  { id: "deep", label: "Logo / deep" },
];

export const DEFAULT_TEAM_A_NAME = "HOME";
export const DEFAULT_TEAM_B_NAME = "AWAY";

// ── Commentary ───────────────────────────────────────────────
export const COMMENTARY_FEED_LIMIT = 20;
export const GROQ_MODEL = "openai/gpt-oss-120b";

// ── Voices (ElevenLabs premade voice IDs) ────────────────────
/** v3: the only ElevenLabs model with real shouting/emphasis (audio tags + CAPS). Streamed, so ~1s to first audio. */
export const ELEVENLABS_MODEL = "eleven_v3";
export const DEFAULT_VOICE: VoiceStyle = "adam";
/** Pending calls beyond this are dropped (oldest first) so the voice never lags far behind the game. */
export const TTS_QUEUE_LIMIT = 3;
export const VOICE_PREVIEW_TEXT = "Pulls up from way downtown... BANG! Oh my goodness, welcome to Courtside!";

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
/**
 * The crowd is a broadcast "bed": it roars at full volume until the commentator
 * starts, ducks under the voice, then fades once the call ends. If no voice comes
 * (TTS off, credits out), it fades on its own after CROWD_MAX_HOLD_MS.
 */
export const CROWD_MAX_HOLD_MS = 7000;
/** Volume under the voice, as a fraction of the crowd's peak. */
export const CROWD_DUCK_RATIO = 0.4;
/** A play logged mid-sentence still gets a full-volume reaction for this long before ducking. */
export const CROWD_REACTION_MS = 1500;
export const CROWD_DUCK_DURATION_S = 0.4;
export const CROWD_FADE_DURATION_S = 1.2;
/** Chance stomp-cheer is picked in clutch mode (otherwise uniform across all three). */
export const CROWD_STOMP_CHANCE_CLUTCH = 0.6;

// ── Cinematic moments: Lottie now, Higgsfield when funded ───
/**
 * false → cinematic triggers play instant Lottie animations (free, offline).
 * true  → clutch activation / clutch three / game winner / POTM generate a
 *         Higgsfield video instead (~$1.50 each — needs API credit).
 * Big-play corner pops (dunk/block/steal) are always Lottie.
 */
export const HIGGSFIELD_ENABLED = false;

/**
 * Trigger → animation. Files live in public/animations/. Each plays once at its own
 * natural length (never sped up or slowed down), then the overlay closes.
 */
export const LOTTIE_MOMENTS: Record<LottieMomentKind, LottieMomentConfig> = {
  "clutch-activation": { file: "/animations/fire-explosion.json", size: "full", label: "Clutch Time" },
  "clutch-three": { file: "/animations/basketball-score.json", size: "full", label: "Bang!" },
  "buzzer-beater": { file: "/animations/basketball-score.json", size: "full", label: "At the Horn!" },
  "game-winner": { file: "/animations/confetti-celebration.json", size: "full", label: "Game Winner" },
  "player-of-match": { file: "/animations/crowd-cheer.json", size: "full", label: "Player of the Match" },
  "big-play": { file: "/animations/basketball-score.json", size: "pop", label: "Big Play!" },
};
/** How long the text-burst fallback stays up when an animation file is missing. */
export const LOTTIE_FALLBACK_MS = 2000;

// ── Higgsfield (CLAUDE.md §7) ────────────────────────────────
export const MAX_HIGGSFIELD_CLIPS = 3;
/** Client polls the job this often (spec: every 3s). */
export const HIGGSFIELD_POLL_INTERVAL_MS = 3000;
/** Give up on a job after this long — Seedance usually finishes in 15–60s. */
export const HIGGSFIELD_TIMEOUT_MS = 5 * 60 * 1000;

/** Label shown on the video for each moment. */
export const HIGGSFIELD_TRIGGER_LABELS: Record<HiggsfieldTrigger, string> = {
  "clutch-activation": "Clutch Time",
  "clutch-three": "Clutch Three",
  "buzzer-beater": "Buzzer Beater",
  "game-winner": "Game Winner",
  "player-of-match": "Player of the Match",
};

/** Overlay line when no commentary call is available yet. */
export const HIGGSFIELD_FALLBACK_CAPTIONS: Record<HiggsfieldTrigger, string> = {
  "clutch-activation": "Final two minutes. One-possession game. This is CLUTCH TIME!",
  "clutch-three": "From WAY downtown... BANG!",
  "buzzer-beater": "At the horn... IT'S GOOD!",
  "game-winner": "That's the ballgame! What a finish!",
  "player-of-match": "Your Player of the Match!",
};
