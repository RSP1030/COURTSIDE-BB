// ─────────────────────────────────────────────────────────────
// Courtside — all shared TypeScript types.
// Every component props interface lives here too (CLAUDE.md §Code Standards 8).
// ─────────────────────────────────────────────────────────────

// ── Primitives ───────────────────────────────────────────────

export type TeamId = "teamA" | "teamB";

export type Quarter = 1 | 2 | 3 | 4 | "OT";

export type PointValue = 1 | 2 | 3;

/** Trackable non-scoring stats. */
export type StatType = "reb" | "ast" | "foul" | "to" | "stl" | "blk";

export type VoiceStyle = "adam" | "josh" | "rachel";

/** Drives colour coding in the commentary feed. */
export type CommentaryVariant = "normal" | "clutch" | "highlight";

export type GamePhase = "live" | "potm" | "summary";

export type HiggsfieldStatus = "idle" | "generating" | "ready" | "error";

export type HiggsfieldTrigger =
  | "clutch-activation"
  | "clutch-three"
  | "game-winner"
  | "player-of-match";

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
  text: string;
  variant: CommentaryVariant;
  quarter: Quarter;
  timeRemaining: number;
  score: ScoreSnapshot;
  /** True while Groq tokens are still streaming in. */
  isStreaming: boolean;
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

// ── Store ────────────────────────────────────────────────────

export interface GameState {
  teamA: Team;
  teamB: Team;
  quarter: Quarter;
  /** Seconds left in the current period. */
  timeRemaining: number;
  isClockRunning: boolean;
  isClutchMode: boolean;
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
  addPoints: (teamId: TeamId, points: PointValue, playerId?: string) => void;
  recordStat: (teamId: TeamId, stat: StatType, playerId?: string) => void;

  // Clock
  setQuarter: (quarter: Quarter) => void;
  setTimeRemaining: (seconds: number) => void;
  tick: () => void;
  startClock: () => void;
  stopClock: () => void;

  // Commentary
  addCommentary: (entry: CommentaryEntry) => void;
  appendCommentaryText: (id: string, chunk: string) => void;
  finishCommentary: (id: string) => void;
  setGeneratingCommentary: (value: boolean) => void;

  // Audio
  setTTSPlaying: (value: boolean) => void;
  setSelectedVoice: (voice: VoiceStyle) => void;

  // Higgsfield
  setHiggsfieldStatus: (status: HiggsfieldStatus) => void;
  addHiggsfieldClip: (clip: HiggsfieldClip) => void;
  openHiggsfieldModal: (videoUrl: string) => void;
  closeHiggsfieldModal: () => void;

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
}

export interface ScoreCelebrationProps {
  trigger: PlayEvent | null;
}

export interface HiggsfieldMomentModalProps {
  isOpen: boolean;
  videoUrl: string | null;
  onClose: () => void;
}

export interface PlayerStatsProps {
  teamId: TeamId;
}

export interface GameSummaryProps {
  isOpen: boolean;
  onClose: () => void;
}
