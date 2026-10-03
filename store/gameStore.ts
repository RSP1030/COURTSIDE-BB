import { create } from "zustand";

import { meetsClutchConditions } from "@/lib/clutch";
import {
  DEFAULT_TEAM_A_NAME,
  DEFAULT_TEAM_B_NAME,
  DEFAULT_VOICE,
  MAX_HIGGSFIELD_CLIPS,
  emptyStats,
  periodLength,
} from "@/lib/constants";
import type {
  GameState,
  GameStore,
  Player,
  PlayEvent,
  Quarter,
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
    timeRemaining: periodLength(1),
    isClockRunning: false,
    isClutchMode: false,
    commentary: [],
    lastPlay: null,
    isGeneratingCommentary: false,
    isTTSPlaying: false,
    selectedVoice: DEFAULT_VOICE,
    higgsfieldVideoUrl: null,
    showHiggsfieldModal: false,
    higgsfieldStatus: "idle",
    higgsfieldClips: [],
    gamePhase: "live",
    playerOfMatch: null,
    gameSummary: null,
  };
}

/** Clutch mode latches: once on, it stays on for the rest of the game. */
function nextClutch(
  current: boolean,
  quarter: Quarter,
  timeRemaining: number,
  scoreA: number,
  scoreB: number,
): boolean {
  return current || meetsClutchConditions({ quarter, timeRemaining, scoreA, scoreB });
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
      const isClutchMode = nextClutch(state.isClutchMode, state.quarter, state.timeRemaining, scoreA, scoreB);

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
      const timeRemaining = periodLength(quarter);
      return {
        quarter,
        timeRemaining,
        isClockRunning: false,
        isClutchMode: nextClutch(
          state.isClutchMode,
          quarter,
          timeRemaining,
          state.teamA.score,
          state.teamB.score,
        ),
      };
    }),

  setTimeRemaining: (seconds) =>
    set((state) => {
      const timeRemaining = Math.max(0, Math.round(seconds));
      return {
        timeRemaining,
        isClutchMode: nextClutch(
          state.isClutchMode,
          state.quarter,
          timeRemaining,
          state.teamA.score,
          state.teamB.score,
        ),
      };
    }),

  tick: () =>
    set((state) => {
      if (!state.isClockRunning || state.timeRemaining <= 0) return {};
      const timeRemaining = state.timeRemaining - 1;
      return {
        timeRemaining,
        isClockRunning: timeRemaining > 0,
        isClutchMode: nextClutch(
          state.isClutchMode,
          state.quarter,
          timeRemaining,
          state.teamA.score,
          state.teamB.score,
        ),
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

  addHiggsfieldClip: (clip) =>
    set((state) => ({
      higgsfieldClips: [...state.higgsfieldClips, clip].slice(-MAX_HIGGSFIELD_CLIPS),
      higgsfieldVideoUrl: clip.videoUrl,
      higgsfieldStatus: "ready",
    })),

  openHiggsfieldModal: (videoUrl) => set({ higgsfieldVideoUrl: videoUrl, showHiggsfieldModal: true }),
  closeHiggsfieldModal: () => set({ showHiggsfieldModal: false }),

  // ── End of game ──────────────────────────────────────────
  endGame: () => set({ gamePhase: "potm", isClockRunning: false }),
  setPlayerOfMatch: (result) => set({ playerOfMatch: result }),
  setGameSummary: (summary) => set({ gameSummary: summary, gamePhase: "summary" }),
  resetGame: () => set(createInitialState()),
}));
