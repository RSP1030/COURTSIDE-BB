"use client";

import { VOICE_CONFIG } from "@/lib/constants";
import { useGameStore } from "@/store/gameStore";
import type { VoiceStyle } from "@/types/game";

const VOICES = Object.values(VOICE_CONFIG);

function isVoiceStyle(value: string): value is VoiceStyle {
  return value in VOICE_CONFIG;
}

// TODO(session: TTS): add the preview button once /api/tts is live.
export default function VoiceSelector() {
  const selectedVoice = useGameStore((state) => state.selectedVoice);
  const setSelectedVoice = useGameStore((state) => state.setSelectedVoice);

  return (
    <label className="flex items-center gap-2">
      <span className="sr-only">Commentator voice</span>
      <select
        value={selectedVoice}
        onChange={(event) => {
          if (isVoiceStyle(event.target.value)) setSelectedVoice(event.target.value);
        }}
        className="rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-white outline-none focus:border-orange"
      >
        {VOICES.map((voice) => (
          <option key={voice.id} value={voice.id}>
            {voice.label}
          </option>
        ))}
      </select>
    </label>
  );
}
