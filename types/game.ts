import type { IParticlesProps } from "@tsparticles/react";

// ─────────────────────────────────────────────────────────────
// Courtside — all shared TypeScript types.
// Every component props interface lives here too (CLAUDE.md §Code Standards 8).
// ─────────────────────────────────────────────────────────────

// ── Primitives ───────────────────────────────────────────────

export type TeamId = "teamA" | "teamB";

/** A period: quarters 1–4, halves 1–2, or overtime. (Named Quarter for history.) */
export type Quarter = 1 | 2 | 3 | 4 | "OT";

/** 4 quarters (Q1–Q4) or 2 halves (H1–H2), each with OT. */
export type GameFormat = "quarters" | "halves";

export type PointValue = 1 | 2 | 3;

/** How a two was scored — picked by the scorer after tapping +2. */
export type TwoPointShot = "layup" | "dunk" | "jumper" | "floater";

/** Where a three was shot from — picked on the mini court after tapping +3. */
export type ThreePointSpot = "left-corner" | "left-wing" | "top" | "right-wing" | "right-corner" | "deep";

export type ShotDetail = TwoPointShot | ThreePointSpot;

/** Trackable non-scoring stats. */
export type StatType = "reb" | "ast" | "foul" | "to" | "stl" | "blk";

export type VoiceStyle = "adam" | "josh" | "rachel";

/** How hyped a call is — shapes both the words and the voice delivery. */
export type CommentaryEnergy = "medium" | "high" | "max";

/** Drives colour coding in the commentary feed. */
export type CommentaryVariant = "normal" | "clutch" | "highlight";

export type GamePhase = "live" | "potm" | "summary";

export type HiggsfieldStatus = "idle" | "generating" | "ready" | "error";

export type HiggsfieldTrigger =
  | "clutch-activation"
  | "clutch-three"
  | "buzzer-beater"
  | "game-winner"
  | "player-of-match";

/** Instant Lottie moments: the cinematic triggers plus small corner pops for big plays. */
export type LottieMomentKind = HiggsfieldTrigger | "big-play";

export interface LottieMomentConfig {
  /** Path under /public, loaded at runtime (missing files fall back to a text burst). */
  file: string;
  /** Both centred over a dark backdrop. full = big moments; pop = smaller, for dunk/block/steal. */
  size: "full" | "pop";
  label: string;
}

export interface LottieMoment {
  id: string;
  kind: LottieMomentKind;
  /** Overrides the config label (e.g. "Dunk!" / "Block!" for big plays). */
  label: string;
  startedAt: number;
}

/** Fallback shown while an animation file hasn't been added to public/animations/. */
export interface TextBurstProps {
  label: string;
  compact: boolean;
}

export interface LottieMomentOverlayProps {
  moment: LottieMoment | null;
  onDone: (id: string) => void;
}

/** Higgsfield request lifecycle (GET /requests/{id}/status). */
export type HiggsfieldJobStatus = "queued" | "in_progress" | "completed" | "failed" | "nsfw" | "canceled";

// ── Domain models ────────────────────────────────────────────

export type TeamStats = Record<StatType, number>;

export interface Player {
  id: string;
  name: string;
  jerseyNumber: number;
  points: number;
  stats: TeamStats;
}

export interface Team {
  id: TeamId;
  name: string;
  score: number;
  stats: TeamStats;
  players: Player[];
}

/** Snapshot of the scoreline at the moment a play happened. */
export interface ScoreSnapshot {
  teamA: number;
  teamB: number;
}

interface PlayEventBase {
  id: string;
  teamId: TeamId;
  playerId: string | null;
  quarter: Quarter;
  timeRemaining: number;
  /** Scoreline *after* the play was applied. */
  score: ScoreSnapshot;
  isClutch: boolean;
  createdAt: number;
}

export interface ScorePlayEvent extends PlayEventBase {
  kind: "score";
  points: PointValue;
  /** Shot type (2s) or spot (3s); null when the scorer skipped the detail. */
  shot: ShotDetail | null;
}

export interface StatPlayEvent extends PlayEventBase {
  kind: "stat";
  stat: StatType;
}

export type PlayEvent = ScorePlayEvent | StatPlayEvent;

export interface CommentaryEntry {
  id: string;
  /** The play that triggered this call, if any (POTM/summary have none). */
  playId: string | null;
  /** e.g. "score-3", "stat-reb" — recent calls are only compared within the same type. */
  playType: string | null;
  text: string;
  variant: CommentaryVariant;
  quarter: Quarter;
  timeRemaining: number;
  score: ScoreSnapshot;
  /** True while Groq tokens are still streaming in. */
  isStreaming: boolean;
  /** Set when generation failed; text then holds the error message. */
  isError: boolean;
  energy: CommentaryEnergy;
  createdAt: number;
}

export interface HiggsfieldClip {
  id: string;
  trigger: HiggsfieldTrigger;
  prompt: string;
  videoUrl: string;
  createdAt: number;
}

export interface PlayerOfMatchResult {
  teamId: TeamId;
  playerId: string | null;
  playerName: string;
  statLine: string;
  reasoning: string;
}

// ── Clutch ───────────────────────────────────────────────────

export interface ClutchInput {
  format: GameFormat;
  quarter: Quarter;
  timeRemaining: number;
  scoreA: number;
  scoreB: number;
}

/** Each clutch condition from CLAUDE.md §5, evaluated independently. */
export interface ClutchConditions {
  lateGame: boolean;
  underTwoMinutes: boolean;
  closeGame: boolean;
}

export interface ClutchModeState {
  /** Latched store flag — stays true once activated. */
  isClutchMode: boolean;
  /** Live evaluation of each condition right now. */
  conditions: ClutchConditions;
  /** How many of the three conditions currently hold (0–3). */
  conditionsMet: number;
}

// ── API contracts ────────────────────────────────────────────

/** Team context sent with each commentary request. */
export interface CommentaryTeamContext {
  name: string;
  stats: TeamStats;
}

/** Body of POST /api/commentary. */
export interface CommentaryRequest {
  play: PlayEvent;
  teamA: CommentaryTeamContext;
  teamB: CommentaryTeamContext;
  score: ScoreSnapshot;
  quarter: Quarter;
  isClutch: boolean;
  /** Last few finished calls, so the model varies its openers. */
  recentCalls: string[];
}

/** Query of GET /api/tts. */
export interface TTSRequest {
  text: string;
  voice: VoiceStyle;
  energy: CommentaryEnergy;
}

/** One finished call waiting to be spoken. */
export interface TTSQueueItem {
  id: string;
  text: string;
  voice: VoiceStyle;
  energy: CommentaryEnergy;
}

/** ElevenLabs v3 delivery for one energy level. */
export interface EnergyDelivery {
  /** v3 accepts only 0 (creative), 0.5 (natural) or 1 (robust). */
  stability: 0 | 0.5 | 1;
  /** Where the [shouting] audio tag goes in the speech script. */
  tagMode: "none" | "at-call" | "throughout";
}

// ── Store ────────────────────────────────────────────────────

export interface GameState {
  teamA: Team;
  teamB: Team;
  quarter: Quarter;
  /** Seconds left in the current period. */
  timeRemaining: number;
  isClockRunning: boolean;
  isClutchMode: boolean;
  /** True once the scorer uses the clutch toggle — automatic detection then stays out of it. */
  clutchManual: boolean;
  gameFormat: GameFormat;
  /** Full history (the feed renders the latest COMMENTARY_FEED_LIMIT). */
  commentary: CommentaryEntry[];
  lastPlay: PlayEvent | null;
  isGeneratingCommentary: boolean;
  isTTSPlaying: boolean;
  selectedVoice: VoiceStyle;
  higgsfieldVideoUrl: string | null;
  showHiggsfieldModal: boolean;
  higgsfieldStatus: HiggsfieldStatus;
  /** Last MAX_HIGGSFIELD_CLIPS generated clips this session. */
  higgsfieldClips: HiggsfieldClip[];
  /** The moment being generated / shown: what triggered it and the line overlaid on the video. */
  higgsfieldMoment: HiggsfieldMoment | null;
  higgsfieldError: string | null;
  /** The Lottie moment on screen, if any. */
  lottieMoment: LottieMoment | null;
  gamePhase: GamePhase;
  playerOfMatch: PlayerOfMatchResult | null;
  gameSummary: string | null;
}

export interface GameActions {
  // Teams & players
  setTeamName: (teamId: TeamId, name: string) => void;
  addPlayer: (teamId: TeamId, name: string, jerseyNumber: number) => void;
  removePlayer: (teamId: TeamId, playerId: string) => void;

  // Plays
  addPoints: (teamId: TeamId, points: PointValue, detail?: { playerId?: string; shot?: ShotDetail }) => void;
  recordStat: (teamId: TeamId, stat: StatType, playerId?: string) => void;

  // Clock
  setQuarter: (quarter: Quarter) => void;
  /** Switches quarters ↔ halves: back to period 1 with a full clock (scores kept). */
  setGameFormat: (format: GameFormat) => void;
  /** Manual clutch toggle — takes over from automatic detection for the rest of the game. */
  setClutchMode: (on: boolean) => void;
  setTimeRemaining: (seconds: number) => void;
  tick: () => void;
  startClock: () => void;
  stopClock: () => void;

  // Commentary
  addCommentary: (entry: CommentaryEntry) => void;
  appendCommentaryText: (id: string, chunk: string) => void;
  finishCommentary: (id: string) => void;
  failCommentary: (id: string, message: string) => void;
  setGeneratingCommentary: (value: boolean) => void;

  // Audio
  setTTSPlaying: (value: boolean) => void;
  setSelectedVoice: (voice: VoiceStyle) => void;

  // Higgsfield
  setHiggsfieldStatus: (status: HiggsfieldStatus) => void;
  /** Opens the modal in its loading state for a new moment. */
  startHiggsfieldMoment: (moment: HiggsfieldMoment) => void;
  failHiggsfieldMoment: (message: string) => void;
  /** Stores the clip, marks it ready and (re)opens the modal to play it. */
  addHiggsfieldClip: (clip: HiggsfieldClip) => void;
  openHiggsfieldModal: (videoUrl: string) => void;
  closeHiggsfieldModal: () => void;

  // Lottie moments
  /** Shows a moment unless it would cut off one that matters more (see store). */
  showLottieMoment: (kind: LottieMomentKind, label?: string) => void;
  clearLottieMoment: (id: string) => void;

  // End of game
  endGame: () => void;
  setPlayerOfMatch: (result: PlayerOfMatchResult) => void;
  setGameSummary: (summary: string) => void;
  resetGame: () => void;
}

export type GameStore = GameState & GameActions;

// ── Config shapes ────────────────────────────────────────────

export interface VoiceConfig {
  id: VoiceStyle;
  label: string;
  elevenLabsVoiceId: string;
  description: string;
}

export interface StatConfig {
  type: StatType;
  label: string;
}

// ── Component props ──────────────────────────────────────────

export interface TeamPanelProps {
  teamId: TeamId;
  align: "left" | "right";
}

export interface ClockEditorProps {
  seconds: number;
  onSave: (seconds: number) => void;
  onCancel: () => void;
}

export interface ShotOption<T extends ShotDetail> {
  id: T;
  label: string;
}

export interface ShotPickerProps {
  /** Which value was tapped; null = picker closed. */
  points: 2 | 3 | null;
  teamName: string;
  onPick: (shot: ShotDetail | null) => void;
  onCancel: () => void;
}

export interface AnimatedScoreProps {
  value: number;
}

export interface StatButtonProps {
  label: string;
  value: number;
  onPress: () => void;
}

export interface CommentaryBubbleProps {
  entry: CommentaryEntry;
  teamAName: string;
  teamBName: string;
  gameFormat: GameFormat;
}

/** tsParticles options/container, derived from @tsparticles/react so the engine isn't a direct dependency. */
export type ParticleOptions = NonNullable<IParticlesProps["options"]>;
export type ParticleContainer = Parameters<NonNullable<IParticlesProps["particlesLoaded"]>>[0];

export interface ParticleLayerProps {
  /** DOM id — must be unique per layer (tsParticles keys containers by it). */
  id: string;
  /** Must be a stable reference: new options rebuild the canvas. */
  options: ParticleOptions;
}

export interface ScoreCelebrationProps {
  trigger: PlayEvent | null;
}

export interface HiggsfieldMomentModalProps {
  isOpen: boolean;
  status: HiggsfieldStatus;
  videoUrl: string | null;
  moment: HiggsfieldMoment | null;
  error: string | null;
  onClose: () => void;
}

export interface HiggsfieldMoment {
  trigger: HiggsfieldTrigger;
  /** Commentary line overlaid on the video. */
  caption: string;
  startedAt: number;
}

/** Body of POST /api/higgsfield — the client names a trigger; the prompt is chosen server-side. */
export interface HiggsfieldStartRequest {
  trigger: HiggsfieldTrigger;
}

export interface HiggsfieldStartResponse {
  jobId: string;
  status: HiggsfieldJobStatus;
}

/** Response of GET /api/higgsfield?job_id= */
export interface HiggsfieldPollResponse {
  status: HiggsfieldJobStatus;
  videoUrl: string | null;
  error: string | null;
}

export interface PlayerStatsProps {
  teamId: TeamId;
}

export interface GameSummaryProps {
  isOpen: boolean;
  onClose: () => void;
}
