"use client";

import { useEffect, useRef } from "react";

import { energyForPlay, playTypeOf } from "@/lib/energy";
import { useGameStore } from "@/store/gameStore";
import type { CommentaryRequest, PlayEvent } from "@/types/game";

async function readError(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  if (typeof body === "object" && body !== null && "error" in body && typeof body.error === "string") {
    return body.error;
  }
  return `Commentary failed (${response.status})`;
}

/** Streams one call for `play` into a new feed entry. */
async function streamCommentary(play: PlayEvent, signal: AbortSignal): Promise<void> {
  const store = useGameStore.getState();
  const id = crypto.randomUUID();

  store.addCommentary({
    id,
    playId: play.id,
    playType: playTypeOf(play),
    text: "",
    variant: play.isClutch ? "clutch" : "normal",
    quarter: play.quarter,
    timeRemaining: play.timeRemaining,
    score: play.score,
    isStreaming: true,
    isError: false,
    energy: energyForPlay(play),
    createdAt: Date.now(),
  });

  const body: CommentaryRequest = {
    play,
    teamA: { name: store.teamA.name, stats: store.teamA.stats },
    teamB: { name: store.teamB.name, stats: store.teamB.stats },
    score: play.score,
    quarter: play.quarter,
    isClutch: play.isClutch,
    // Same play type only: calls for other plays leaked their phrases ("a SECOND chance" on a foul).
    recentCalls: store.commentary
      .filter((entry) => !entry.isStreaming && !entry.isError && entry.playType === playTypeOf(play))
      .slice(-3)
      .map((entry) => entry.text),
  };

  try {
    const response = await fetch("/api/commentary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
    if (!response.ok || !response.body) throw new Error(await readError(response));

    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.length;
      useGameStore.getState().appendCommentaryText(id, value);
    }

    if (received === 0) throw new Error("The commentator was lost for words — empty response");
    useGameStore.getState().finishCommentary(id);
  } catch (error) {
    if (signal.aborted) return;
    const message = error instanceof Error ? error.message : "Commentary failed";
    console.warn("[commentary]", message);
    useGameStore.getState().failCommentary(id, `Commentary unavailable — ${message}`);
  }
}

// Watches lastPlay → calls /api/commentary → streams text into the store.
// Every play gets its own call; overlapping streams are fine.
export function useCommentary(): void {
  const lastPlay = useGameStore((state) => state.lastPlay);
  const setGeneratingCommentary = useGameStore((state) => state.setGeneratingCommentary);
  const handledPlays = useRef(new Set<string>());
  const inFlight = useRef(new Set<AbortController>());

  useEffect(() => {
    if (!lastPlay || handledPlays.current.has(lastPlay.id)) return;
    handledPlays.current.add(lastPlay.id);

    const controller = new AbortController();
    inFlight.current.add(controller);
    setGeneratingCommentary(true);

    void streamCommentary(lastPlay, controller.signal).finally(() => {
      inFlight.current.delete(controller);
      if (inFlight.current.size === 0) setGeneratingCommentary(false);
    });
  }, [lastPlay, setGeneratingCommentary]);

  // Abort everything only on unmount — a new play must not cancel the previous call.
  useEffect(() => {
    const controllers = inFlight.current;
    return () => controllers.forEach((controller) => controller.abort());
  }, []);
}
