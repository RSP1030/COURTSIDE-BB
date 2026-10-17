"use client";

import { useCallback } from "react";

import { HIGGSFIELD_FALLBACK_CAPTIONS, HIGGSFIELD_POLL_INTERVAL_MS, HIGGSFIELD_TIMEOUT_MS } from "@/lib/constants";
import { stripAudioTags } from "@/lib/energy";
import { useGameStore } from "@/store/gameStore";
import type { HiggsfieldPollResponse, HiggsfieldStartResponse, HiggsfieldTrigger } from "@/types/game";

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

async function readError(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  if (typeof body === "object" && body !== null && "error" in body && typeof body.error === "string") return body.error;
  return `Cinematic moment failed (${response.status})`;
}

/** The most recent finished commentary call — it becomes the line overlaid on the video. */
function latestCall(trigger: HiggsfieldTrigger): string {
  const entry = useGameStore
    .getState()
    .commentary.findLast((call) => !call.isStreaming && !call.isError && call.text.trim().length > 0);
  return entry ? stripAudioTags(entry.text) : HIGGSFIELD_FALLBACK_CAPTIONS[trigger];
}

/**
 * Runs one moment end to end: open the modal (loading), start the job via
 * /api/higgsfield, poll every 3s, then store the clip — which opens the modal on
 * the video. Not tied to component lifetime: an abandoned job is still paid for.
 */
async function runMoment(trigger: HiggsfieldTrigger): Promise<string | null> {
  const store = useGameStore.getState();
  // One at a time — every video costs money, and a second job would fight for the modal.
  if (store.higgsfieldStatus === "generating") return null;
  store.startHiggsfieldMoment({ trigger, caption: HIGGSFIELD_FALLBACK_CAPTIONS[trigger], startedAt: Date.now() });

  try {
    const start = await fetch("/api/higgsfield", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trigger }),
    });
    if (!start.ok) throw new Error(await readError(start));
    const { jobId } = (await start.json()) as HiggsfieldStartResponse;

    const deadline = Date.now() + HIGGSFIELD_TIMEOUT_MS;
    while (Date.now() < deadline) {
      await wait(HIGGSFIELD_POLL_INTERVAL_MS);
      const poll = await fetch(`/api/higgsfield?job_id=${encodeURIComponent(jobId)}`, { cache: "no-store" });
      if (!poll.ok) throw new Error(await readError(poll));
      const { status, videoUrl, error } = (await poll.json()) as HiggsfieldPollResponse;

      if (status === "completed" && videoUrl) {
        const state = useGameStore.getState();
        state.addHiggsfieldClip({ id: jobId, trigger, prompt: trigger, videoUrl, createdAt: Date.now() });
        useGameStore.setState({
          higgsfieldMoment: { trigger, caption: latestCall(trigger), startedAt: state.higgsfieldMoment?.startedAt ?? Date.now() },
        });
        return videoUrl;
      }
      if (error) throw new Error(error);
    }
    throw new Error("Higgsfield took too long — try again in a moment");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cinematic moment failed";
    console.warn("[higgsfield]", message);
    useGameStore.getState().failHiggsfieldMoment(message);
    return null;
  }
}

/**
 * Returns `generate(trigger)`: starts a cinematic moment and resolves with the video
 * URL (or null if it failed / one is already generating). Modal state lives in the
 * store, so any component can trigger a moment and HiggsfieldMomentModal shows it.
 */
export function useHiggsfieldMoment(): (trigger: HiggsfieldTrigger) => Promise<string | null> {
  return useCallback((trigger: HiggsfieldTrigger) => runMoment(trigger), []);
}
