"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

import { VOICE_CONFIG, VOICE_PREVIEW_TEXT } from "@/lib/constants";
import { discardSpeech, preloadSpeech } from "@/lib/speech";
import { useGameStore } from "@/store/gameStore";
import type { VoiceStyle } from "@/types/game";

const VOICES = Object.values(VOICE_CONFIG);

type PreviewState = "idle" | "loading" | "playing" | "error";

function isVoiceStyle(value: string): value is VoiceStyle {
  return value in VOICE_CONFIG;
}

export default function VoiceSelector() {
  const selectedVoice = useGameStore((state) => state.selectedVoice);
  const setSelectedVoice = useGameStore((state) => state.setSelectedVoice);
  const [preview, setPreview] = useState<PreviewState>("idle");
  const previewAudio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => previewAudio.current?.pause(), []);

  async function playPreview() {
    if (previewAudio.current) discardSpeech(previewAudio.current);
    setPreview("loading");
    const audio = preloadSpeech({ text: VOICE_PREVIEW_TEXT, voice: selectedVoice, energy: "high" });
    previewAudio.current = audio;
    audio.addEventListener("playing", () => setPreview("playing"), { once: true });
    audio.addEventListener("ended", () => setPreview("idle"), { once: true });
    audio.addEventListener("error", () => setPreview("error"), { once: true });
    try {
      await audio.play();
    } catch (error) {
      console.warn("[tts preview]", error instanceof Error ? error.message : error);
      setPreview("error");
    }
  }

  const previewLabel =
    preview === "error" ? "Voice preview failed — try again" : `Preview ${VOICE_CONFIG[selectedVoice].label}'s voice`;

  return (
    <div className="flex items-center gap-1.5">
      <label className="flex items-center gap-2">
        <span className="sr-only">Commentator voice</span>
        <select
          value={selectedVoice}
          onChange={(event) => {
            if (isVoiceStyle(event.target.value)) setSelectedVoice(event.target.value);
            setPreview("idle");
          }}
          title={VOICE_CONFIG[selectedVoice].description}
          className="rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-white outline-none focus:border-orange"
        >
          {VOICES.map((voice) => (
            <option key={voice.id} value={voice.id}>
              {voice.label}
            </option>
          ))}
        </select>
      </label>

      <motion.button
        type="button"
        onClick={playPreview}
        disabled={preview === "loading" || preview === "playing"}
        whileTap={{ scale: 0.9 }}
        aria-label={previewLabel}
        title={previewLabel}
        className={`grid size-8 place-items-center rounded-lg border bg-surface-2 ${
          preview === "error" ? "border-clutch text-clutch" : "border-border text-white hover:text-orange"
        }`}
      >
        {preview === "loading" || preview === "playing" ? (
          <span aria-hidden className="flex h-3 items-end gap-[2px]">
            {[0, 1, 2].map((bar) => (
              <motion.span
                key={bar}
                className="w-[3px] rounded-full bg-orange"
                animate={{ height: preview === "playing" ? ["30%", "100%", "30%"] : "30%", opacity: preview === "loading" ? [0.3, 1, 0.3] : 1 }}
                transition={{ duration: 0.7, repeat: Infinity, delay: bar * 0.15 }}
              />
            ))}
          </span>
        ) : (
          <svg aria-hidden viewBox="0 0 12 12" className="size-3 fill-current">
            <path d="M3 1.5v9l7.5-4.5z" />
          </svg>
        )}
      </motion.button>
    </div>
  );
}
