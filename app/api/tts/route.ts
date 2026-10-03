import { ElevenLabsError } from "@elevenlabs/elevenlabs-js";
import { NextResponse } from "next/server";

import { ELEVENLABS_MODEL, VOICE_CONFIG } from "@/lib/constants";
import { getElevenLabsClient, voiceIdFor } from "@/lib/elevenlabs";
import { ENERGY_DELIVERY, toSpeechScript } from "@/lib/energy";
import type { CommentaryEnergy, TTSRequest, VoiceStyle } from "@/types/game";

// Streams ElevenLabs speech back as audio/mpeg.
// GET (not POST) so an <audio src> can play it progressively while v3 is still
// generating — first audio in ~1s instead of waiting ~4s for the whole clip.

const MAX_TEXT_LENGTH = 600;

function isVoiceStyle(value: unknown): value is VoiceStyle {
  return typeof value === "string" && value in VOICE_CONFIG;
}

function isEnergy(value: unknown): value is CommentaryEnergy {
  return typeof value === "string" && value in ENERGY_DELIVERY;
}

function parseRequest(params: URLSearchParams): TTSRequest | null {
  const text = params.get("text")?.trim();
  const voice = params.get("voice");
  const energy = params.get("energy");
  if (!text || !isVoiceStyle(voice)) return null;
  return { text: text.slice(0, MAX_TEXT_LENGTH), voice, energy: isEnergy(energy) ? energy : "medium" };
}

export async function GET(request: Request) {
  const parsed = parseRequest(new URL(request.url).searchParams);
  if (!parsed) return NextResponse.json({ error: "Invalid TTS request" }, { status: 400 });

  try {
    const audio = await getElevenLabsClient().textToSpeech.stream(
      voiceIdFor(parsed.voice),
      {
        text: toSpeechScript(parsed.text, parsed.energy),
        modelId: ELEVENLABS_MODEL,
        outputFormat: "mp3_44100_128",
        voiceSettings: { stability: ENERGY_DELIVERY[parsed.energy].stability },
      },
      { abortSignal: request.signal },
    );

    return new Response(audio, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = describeError(error);
    console.error("[tts]", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

/** ElevenLabs reports both bad keys and an empty credit balance as 401 — tell them apart. */
function describeError(error: unknown): string {
  if (error instanceof ElevenLabsError && error.statusCode === 401) {
    return JSON.stringify(error.body ?? "").includes("quota_exceeded")
      ? "ElevenLabs credits are used up for this billing period — top up or wait for the monthly reset"
      : "ElevenLabs rejected the API key — check ELEVENLABS_API_KEY in .env.local";
  }
  return error instanceof Error ? error.message : "Speech generation failed";
}

/** Warm-up target for hooks/useWarmRoutes.ts: compiles the route in dev, calls nothing external. */
export function HEAD() {
  return new Response(null, { status: 204 });
}
