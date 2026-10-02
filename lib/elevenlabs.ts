import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

import { VOICE_CONFIG } from "@/lib/constants";
import type { VoiceStyle } from "@/types/game";

// Server-only: imported by app/api/tts/route.ts. Never import from a client component.

let client: ElevenLabsClient | null = null;

export function getElevenLabsClient(): ElevenLabsClient {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set in .env.local");
  client ??= new ElevenLabsClient({ apiKey });
  return client;
}

export function voiceIdFor(voice: VoiceStyle): string {
  return VOICE_CONFIG[voice].elevenLabsVoiceId;
}
