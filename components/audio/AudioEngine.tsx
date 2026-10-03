"use client";

import { useAudio } from "@/hooks/useAudio";
import { useWarmRoutes } from "@/hooks/useWarmRoutes";

// Headless: crowd bed, queued TTS playback and mixing live in useAudio.
export default function AudioEngine() {
  useWarmRoutes();
  useAudio();
  return null;
}
