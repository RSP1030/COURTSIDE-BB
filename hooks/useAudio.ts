"use client";

import { useEffect, useRef } from "react";

import {
  CROWD_DUCK_DURATION_S,
  CROWD_DUCK_RATIO,
  CROWD_FADE_DURATION_S,
  CROWD_MAX_HOLD_MS,
  CROWD_REACTION_MS,
  CROWD_SOUNDS,
  CROWD_STOMP_CHANCE_CLUTCH,
  CROWD_VOLUME,
  CROWD_VOLUME_CLUTCH,
  TTS_QUEUE_LIMIT,
} from "@/lib/constants";
import { discardSpeech, preloadSpeech } from "@/lib/speech";
import { useGameStore } from "@/store/gameStore";
import type { TTSQueueItem } from "@/types/game";

/** A queued call whose audio starts streaming in as soon as it is enqueued. */
interface PendingSpeech {
  item: TTSQueueItem;
  audio: HTMLAudioElement;
}

/**
 * The crowd clip currently on air. Volume runs through a Web Audio GainNode, not
 * `audio.volume`: iOS Safari ignores `volume` entirely, and gain ramps run on the
 * audio clock, so ducks and fades stay smooth even when the tab is backgrounded.
 */
interface CrowdBed {
  audio: HTMLAudioElement;
  /** null only if Web Audio is unavailable — then volume jumps instead of ramping. */
  gain: GainNode | null;
  peak: number;
  timer: number | null;
  stopTimer: number | null;
}

const ALL_CROWD_SOUNDS = Object.values(CROWD_SOUNDS);

let sharedContext: AudioContext | null = null;

/** One AudioContext for the app, resumed on use (it starts suspended until a user gesture). */
function audioContext(): AudioContext | null {
  if (typeof AudioContext === "undefined") return null;
  sharedContext ??= new AudioContext();
  if (sharedContext.state === "suspended") void sharedContext.resume();
  return sharedContext;
}

function pickCrowdSound(isClutch: boolean): string {
  if (isClutch && Math.random() < CROWD_STOMP_CHANCE_CLUTCH) return CROWD_SOUNDS.stompCheer;
  return ALL_CROWD_SOUNDS[Math.floor(Math.random() * ALL_CROWD_SOUNDS.length)] ?? CROWD_SOUNDS.cheer;
}

function startCrowd(isClutch: boolean): CrowdBed {
  const peak = isClutch ? CROWD_VOLUME_CLUTCH : CROWD_VOLUME;
  const audio = new Audio(pickCrowdSound(isClutch));
  const context = audioContext();
  let gain: GainNode | null = null;
  if (context) {
    gain = context.createGain();
    gain.gain.value = peak;
    context.createMediaElementSource(audio).connect(gain).connect(context.destination);
  } else {
    audio.volume = peak;
  }
  audio.play().catch(() => {
    // Autoplay can be refused before the first user gesture — crowd noise is optional.
  });
  return { audio, gain, peak, timer: null, stopTimer: null };
}

/** Ramps the crowd's volume on the audio clock; stops the clip once it reaches silence. */
function rampCrowd(bed: CrowdBed, to: number, duration: number): void {
  if (bed.stopTimer !== null) window.clearTimeout(bed.stopTimer);
  bed.stopTimer = null;
  if (bed.gain) {
    const param = bed.gain.gain;
    const now = bed.gain.context.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(to, now + duration);
  } else {
    bed.audio.volume = to;
  }
  if (to === 0) bed.stopTimer = window.setTimeout(() => bed.audio.pause(), duration * 1000);
}

function clearCrowdTimer(bed: CrowdBed): void {
  if (bed.timer !== null) window.clearTimeout(bed.timer);
  bed.timer = null;
}

/** A clip that hasn't started within this long (stalled stream, no source) is skipped. */
const VOICE_START_TIMEOUT_MS = 10_000;

/** Resolves when the clip finishes, fails, is paused or never starts — never rejects. */
function playUntilEnded(audio: HTMLAudioElement): Promise<void> {
  return new Promise((resolve) => {
    const stall = window.setTimeout(resolve, VOICE_START_TIMEOUT_MS);
    audio.addEventListener("playing", () => window.clearTimeout(stall), { once: true });
    audio.addEventListener("ended", () => resolve(), { once: true });
    // A pause (e.g. unmount cleanup) never fires "ended" — without this the queue stalls forever.
    audio.addEventListener("pause", () => resolve(), { once: true });
    audio.addEventListener("error", () => resolve(), { once: true });
    audio.play().catch(() => resolve());
  });
}

// Crowd bed on every play + a sequential TTS queue for finished commentary.
export function useAudio(): void {
  const lastPlay = useGameStore((state) => state.lastPlay);
  const commentary = useGameStore((state) => state.commentary);
  const setTTSPlaying = useGameStore((state) => state.setTTSPlaying);

  const queue = useRef<PendingSpeech[]>([]);
  const isProcessing = useRef(false);
  const isVoiceOnAir = useRef(false);
  const spoken = useRef(new Set<string>());
  const crowdPlays = useRef(new Set<string>());
  const current = useRef<HTMLAudioElement | null>(null);
  const crowd = useRef<CrowdBed | null>(null);

  // ── Crowd reaction per play: full volume, held until the voice takes over ──
  useEffect(() => {
    if (!lastPlay || crowdPlays.current.has(lastPlay.id)) return;
    crowdPlays.current.add(lastPlay.id);

    const previous = crowd.current;
    if (previous) {
      clearCrowdTimer(previous);
      rampCrowd(previous, 0, CROWD_DUCK_DURATION_S);
    }

    const bed = startCrowd(lastPlay.isClutch);
    crowd.current = bed;

    // Already mid-call: let the crowd react, then duck under the voice.
    // Otherwise hold until the voice starts (see drain) — or fade if it never does.
    bed.timer = isVoiceOnAir.current
      ? window.setTimeout(() => rampCrowd(bed, bed.peak * CROWD_DUCK_RATIO, CROWD_DUCK_DURATION_S), CROWD_REACTION_MS)
      : window.setTimeout(() => rampCrowd(bed, 0, CROWD_FADE_DURATION_S), CROWD_MAX_HOLD_MS);
  }, [lastPlay]);

  // ── TTS: enqueue each call once it has finished streaming ──
  useEffect(() => {
    const drain = async () => {
      // This effect re-runs on every streamed text chunk — only start when there is something to say.
      if (isProcessing.current || queue.current.length === 0) return;
      isProcessing.current = true;
      setTTSPlaying(true);

      for (let next = queue.current.shift(); next; next = queue.current.shift()) {
        const { audio, item } = next;
        current.current = audio;
        audio.addEventListener("error", () => console.warn("[tts] playback failed for call", item.id), { once: true });
        audio.addEventListener(
          "playing",
          () => {
            isVoiceOnAir.current = true;
            const bed = crowd.current;
            if (!bed) return;
            clearCrowdTimer(bed);
            rampCrowd(bed, bed.peak * CROWD_DUCK_RATIO, CROWD_DUCK_DURATION_S);
          },
          { once: true },
        );
        await playUntilEnded(audio);
        discardSpeech(audio);
        current.current = null;
      }

      isVoiceOnAir.current = false;
      const bed = crowd.current;
      if (bed) {
        clearCrowdTimer(bed);
        if (useGameStore.getState().isGeneratingCommentary) {
          // Another call is still being written — bring the crowd back up to bridge the gap.
          rampCrowd(bed, bed.peak, CROWD_DUCK_DURATION_S);
          bed.timer = window.setTimeout(() => rampCrowd(bed, 0, CROWD_FADE_DURATION_S), CROWD_MAX_HOLD_MS);
        } else {
          // Call finished — let the crowd bed fade out under the silence.
          rampCrowd(bed, 0, CROWD_FADE_DURATION_S);
        }
      }

      isProcessing.current = false;
      setTTSPlaying(false);
    };

    const { selectedVoice } = useGameStore.getState();
    for (const entry of commentary) {
      if (entry.isStreaming || entry.isError || spoken.current.has(entry.id)) continue;
      spoken.current.add(entry.id);

      const item: TTSQueueItem = { id: entry.id, text: entry.text, voice: selectedVoice, energy: entry.energy };
      const audio = preloadSpeech({ text: item.text, voice: item.voice, energy: item.energy });
      queue.current.push({ item, audio });

      // Drop the oldest pending calls so the voice stays close to live.
      while (queue.current.length > TTS_QUEUE_LIMIT) {
        const dropped = queue.current.shift();
        if (dropped) discardSpeech(dropped.audio);
      }
    }

    void drain();
  }, [commentary, setTTSPlaying]);

  // Stop everything on unmount.
  useEffect(
    () => () => {
      current.current?.pause();
      crowd.current?.audio.pause();
    },
    [],
  );
}
