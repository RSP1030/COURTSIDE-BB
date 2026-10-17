"use client";

import { useEffect } from "react";

// In `next dev`, each API route is compiled on its first request — the first
// TTS call after a restart took ~11s (9.4s of it compiling). A HEAD request to
// each route on load compiles them up front; HEAD returns 204 without any
// external call, so this never spends Groq or ElevenLabs credits.
// Production builds are precompiled, so this only runs in development.
export function useWarmRoutes(): void {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const controller = new AbortController();
    const ignore = () => undefined;
    fetch("/api/tts", { method: "HEAD", signal: controller.signal }).catch(ignore);
    fetch("/api/commentary", { method: "HEAD", signal: controller.signal }).catch(ignore);
    fetch("/api/higgsfield", { method: "HEAD", signal: controller.signal }).catch(ignore);
    return () => controller.abort();
  }, []);
}
