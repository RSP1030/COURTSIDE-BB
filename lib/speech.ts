import type { TTSRequest } from "@/types/game";

// Client-side helper: builds the URL of our own /api/tts route (never ElevenLabs
// directly). Used as an <audio> src so the browser streams and starts playing
// the clip while it is still being generated.
export function speechUrl({ text, voice, energy }: TTSRequest): string {
  return `/api/tts?${new URLSearchParams({ text, voice, energy }).toString()}`;
}

/** An <audio> element that starts downloading the clip immediately. */
export function preloadSpeech(request: TTSRequest): HTMLAudioElement {
  const audio = new Audio();
  audio.preload = "auto";
  audio.src = speechUrl(request);
  return audio;
}

/** Stops a clip and cancels its download. */
export function discardSpeech(audio: HTMLAudioElement): void {
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
}
