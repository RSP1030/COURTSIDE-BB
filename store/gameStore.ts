import { create } from "zustand";

import { meetsClutchConditions } from "@/lib/clutch";
import {
  DEFAULT_TEAM_A_NAME,
  DEFAULT_TEAM_B_NAME,
  DEFAULT_VOICE,
  DEFAULT_GAME_FORMAT,
  LOTTIE_MOMENTS,
  MAX_CLOCK_SECONDS,
  MAX_HIGGSFIELD_CLIPS,
  emptyStats,
  periodLength,
} from "@/lib/constants";
import type {
  ClutchInput,
  GameState,
  GameStore,
  Player,
  PlayEvent,
  Team,
  TeamId,
} from "@/types/game";

// Actions only transform state. Side effects (API calls, audio, intervals)
// live in hooks/ and react to state changes (CLAUDE.md §Code Standards 7).

function createTeam(id: TeamId, name: string): Team {
  return { id, name, score: 0, stats: emptyStats(), players: [] };
}

function createInitialState(): GameState {
  return {
    teamA: createTeam("teamA", DEFAULT_TEAM_A_NAME),
    teamB: createTeam("teamB", DEFAULT_TEAM_B_NAME),
    quarter: 1,
    timeRemaining: periodLength(1, DEFAULT_GAME_FORMAT),
    isClockRunning: false,
    isClutchMode: false,
    clutchManual: false,
    gameFormat: DEFAULT_GAME_FORMAT,
    commentary: [],
    lastPlay: null,
    isGeneratingCommentary: false,
    isTTSPlaying: false,
    selectedVoice: DEFAULT_VOICE,
    higgsfieldVideoUrl: null,
    showHiggsfieldModal: false,
    higgsfieldStatus: "idle",
    higgsfieldClips: [],
    higgsfieldMoment: null,
    higgsfieldError: null,
    lottieMoment: null,
    gamePhase: "live",
    playerOfMatch: null,
    gameSummary: null,
  };
}

/**
 * Automatic clutch detection. Latches: once on, it stays on for the rest of the game.
 * Once the scorer uses the manual toggle, their choice wins and detection steps aside.
 */
function nextClutch(state: GameState, next: Partial<Omit<ClutchInput, "format">> = {}): boolean {
  if (state.clutchManual) return state.isClutchMode;
  return (
    state.isClutchMode ||
    meetsClutchConditions({
      format: state.gameFormat,
      quarter: next.quarter ?? state.quarter,
      timeRemaining: next.timeRemaining ?? state.timeRemaining,
      scoreA: next.scoreA ?? state.teamA.score,
      scoreB: next.scoreB ?? state.teamB.score,
    })
  );
}

function updatePlayer(
  players: Player[],
  playerId: string | undefined,
  update: (player: Player) => Player,
): Player[] {
  if (!playerId) return players;
  return players.map((player) => (player.id === playerId ? update(player) : player));
}

export const useGameStore = create<GameStore>()((set) => ({
  ...createInitialState(),

  // ── Teams & players ──────────────────────────────────────
  setTeamName: (teamId, name) =>
    set((state) => ({ [teamId]: { ...state[teamId], name } })),

  addPlayer: (teamId, name, jerseyNumber) =>
    set((state) => {
      const player: Player = {
        id: crypto.randomUUID(),
        name,
        jerseyNumber,
        points: 0,
        stats: emptyStats(),
      };
      return { [teamId]: { ...state[teamId], players: [...state[teamId].players, player] } };
    }),

  removePlayer: (teamId, playerId) =>
    set((state) => ({
      [teamId]: {
        ...state[teamId],
        players: state[teamId].players.filter((player) => player.id !== playerId),
      },
    })),

  // ── Plays ────────────────────────────────────────────────
  addPoints: (teamId, points, detail) =>
    set((state) => {
      const team = state[teamId];
      const updatedTeam: Team = {
        ...team,
        score: team.score + points,
        players: updatePlayer(team.players, detail?.playerId, (p) => ({ ...p, points: p.points + points })),
      };
      const scoreA = teamId === "teamA" ? updatedTeam.score : state.teamA.score;
      const scoreB = teamId === "teamB" ? updatedTeam.score : state.teamB.score;
      const isClutchMode = nextClutch(state, { scoreA, scoreB });

      const play: PlayEvent = {
        kind: "score",
        id: crypto.randomUUID(),
        teamId,
        playerId: detail?.playerId ?? null,
        points,
        // A shot detail only makes sense for the value it belongs to.
        shot: detail?.shot && points !== 1 ? detail.shot : null,
        quarter: state.quarter,
        timeRemaining: state.timeRemaining,
        score: { teamA: scoreA, teamB: scoreB },
        isClutch: isClutchMode,
        createdAt: Date.now(),
      };

      return { [teamId]: updatedTeam, isClutchMode, lastPlay: play };
    }),

  recordStat: (teamId, stat, playerId) =>
    set((state) => {
      const team = state[teamId];
      const updatedTeam: Team = {
        ...team,
        stats: { ...team.stats, [stat]: team.stats[stat] + 1 },
        players: updatePlayer(team.players, playerId, (p) => ({
          ...p,
          stats: { ...p.stats, [stat]: p.stats[stat] + 1 },
        })),
      };

      const play: PlayEvent = {
        kind: "stat",
        id: crypto.randomUUID(),
        teamId,
        playerId: playerId ?? null,
        stat,
        quarter: state.quarter,
        timeRemaining: state.timeRemaining,
        score: { teamA: state.teamA.score, teamB: state.teamB.score },
        isClutch: state.isClutchMode,
        createdAt: Date.now(),
      };

      return { [teamId]: updatedTeam, lastPlay: play };
    }),

  // ── Clock ────────────────────────────────────────────────
  setQuarter: (quarter) =>
    set((state) => {
      const timeRemaining = periodLength(quarter, state.gameFormat);
      return {
        quarter,
        timeRemaining,
        isClockRunning: false,
        isClutchMode: nextClutch(state, { quarter, timeRemaining }),
      };
    }),

  setGameFormat: (gameFormat) =>
    set((state) => {
      if (gameFormat === state.gameFormat) return {};
      return {
        gameFormat,
        quarter: 1,
        timeRemaining: periodLength(1, gameFormat),
        isClockRunning: false,
      };
    }),

  setClutchMode: (on) => set({ isClutchMode: on, clutchManual: true }),

  setTimeRemaining: (seconds) =>
    set((state) => {
      const timeRemaining = Math.min(MAX_CLOCK_SECONDS, Math.max(0, Math.round(seconds)));
      return {
        timeRemaining,
        isClockRunning: state.isClockRunning && timeRemaining > 0,
        isClutchMode: nextClutch(state, { timeRemaining }),
      };
    }),

  tick: () =>
    set((state) => {
      if (!state.isClockRunning || state.timeRemaining <= 0) return {};
      const timeRemaining = state.timeRemaining - 1;
      return {
        timeRemaining,
        isClockRunning: timeRemaining > 0,
        isClutchMode: nextClutch(state, { timeRemaining }),
      };
    }),

  startClock: () => set((state) => (state.timeRemaining > 0 ? { isClockRunning: true } : {})),
  stopClock: () => set({ isClockRunning: false }),

  // ── Commentary ───────────────────────────────────────────
  addCommentary: (entry) => set((state) => ({ commentary: [...state.commentary, entry] })),

  appendCommentaryText: (id, chunk) =>
    set((state) => ({
      commentary: state.commentary.map((entry) =>
        entry.id === id ? { ...entry, text: entry.text + chunk } : entry,
      ),
    })),

  finishCommentary: (id) =>
    set((state) => ({
      commentary: state.commentary.map((entry) =>
        entry.id === id ? { ...entry, isStreaming: false } : entry,
      ),
    })),

  failCommentary: (id, message) =>
    set((state) => ({
      commentary: state.commentary.map((entry) =>
        entry.id === id ? { ...entry, text: message, isStreaming: false, isError: true } : entry,
      ),
    })),

  setGeneratingCommentary: (value) => set({ isGeneratingCommentary: value }),

  // ── Audio ────────────────────────────────────────────────
  setTTSPlaying: (value) => set({ isTTSPlaying: value }),
  setSelectedVoice: (voice) => set({ selectedVoice: voice }),

  // ── Higgsfield ───────────────────────────────────────────
  setHiggsfieldStatus: (status) => set({ higgsfieldStatus: status }),

  startHiggsfieldMoment: (moment) =>
    set({
      higgsfieldMoment: moment,
      higgsfieldStatus: "generating",
      higgsfieldVideoUrl: null,
      higgsfieldError: null,
      showHiggsfieldModal: true,
    }),

  failHiggsfieldMoment: (message) => set({ higgsfieldStatus: "error", higgsfieldError: message }),

  addHiggsfieldClip: (clip) =>
    set((state) => ({
      higgsfieldClips: [...state.higgsfieldClips, clip].slice(-MAX_HIGGSFIELD_CLIPS),
      higgsfieldVideoUrl: clip.videoUrl,
      higgsfieldStatus: "ready",
      // Re-open even if the scorer dismissed the loading screen — this is the payoff.
      showHiggsfieldModal: true,
    })),

  openHiggsfieldModal: (videoUrl) => set({ higgsfieldVideoUrl: videoUrl, showHiggsfieldModal: true }),
  closeHiggsfieldModal: () => set({ showHiggsfieldModal: false }),

  // ── Lottie moments ───────────────────────────────────────
  showLottieMoment: (kind, label) =>
    set((state) => {
      const config = LOTTIE_MOMENTS[kind];
      const current = state.lottieMoment;
      // A moment stays until its animation finishes (the overlay clears it). A big
      // moment is never cut off — by a pop or by another big one (e.g. a clutch three
      // that also switched clutch on). Pops replace each other.
      if (current && LOTTIE_MOMENTS[current.kind].size === "full") return {};
      return {
        lottieMoment: { id: crypto.randomUUID(), kind, label: label ?? config.label, startedAt: Date.now() },
      };
    }),

  clearLottieMoment: (id) =>
    set((state) => (state.lottieMoment?.id === id ? { lottieMoment: null } : {})),

  // ── End of game ──────────────────────────────────────────
  endGame: () => set({ gamePhase: "potm", isClockRunning: false }),
  setPlayerOfMatch: (result) => set({ playerOfMatch: result }),
  setGameSummary: (summary) => set({ gameSummary: summary, gamePhase: "summary" }),
  resetGame: () => set(createInitialState()),
}));
