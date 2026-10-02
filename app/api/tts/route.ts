import { NextResponse } from "next/server";

// TODO(session: TTS): stream ElevenLabs audio using lib/elevenlabs.ts.
export async function POST() {
  return NextResponse.json({ error: "TTS route not implemented yet" }, { status: 501 });
}
