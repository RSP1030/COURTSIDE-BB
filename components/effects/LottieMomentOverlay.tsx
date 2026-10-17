"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";

import { LOTTIE_FALLBACK_MS, LOTTIE_MOMENTS } from "@/lib/constants";
import type { LottieMomentOverlayProps, TextBurstProps } from "@/types/game";

// lottie-web touches `document` at import time, so the player is client-only and
// code-split: it loads the first time a moment plays, not with the page.
// LottieSvg = SVG renderer only (smaller engine, still runs expressions, which many
// LottieFiles animations use).
const LottieSvg = dynamic(() => import("lottie-react").then((mod) => mod.LottieSvg), { ssr: false });

/** A Lottie file's own timing — enough to retime it to fit its slot. */
interface LottieTiming {
  fr: number;
  ip: number;
  op: number;
}

type LoadedAnimation = { data: object; seconds: number } | null;

/** Parsed files, by path. `null` = missing or not a Lottie file → text fallback. */
const cache = new Map<string, Promise<LoadedAnimation>>();

function isLottie(value: unknown): value is LottieTiming & object {
  if (typeof value !== "object" || value === null) return false;
  const { fr, ip, op } = value as Record<string, unknown>;
  return typeof fr === "number" && fr > 0 && typeof ip === "number" && typeof op === "number" && op > ip;
}

function loadAnimation(file: string): Promise<LoadedAnimation> {
  let pending = cache.get(file);
  if (!pending) {
    pending = fetch(file)
      .then((response) => (response.ok ? response.json() : null))
      .then((json: unknown) => (isLottie(json) ? { data: json, seconds: (json.op - json.ip) / json.fr } : null))
      .catch(() => null);
    cache.set(file, pending);
  }
  return pending;
}

/** Shown when the animation file isn't in public/animations/ yet. */
function TextBurst({ label, compact }: TextBurstProps) {
  return (
    <motion.span
      className={`block text-center font-display leading-none tracking-[0.06em] text-orange drop-shadow-[0_0_30px_var(--color-orange-glow)] ${
        compact ? "text-4xl" : "text-[clamp(3.5rem,14vw,9rem)]"
      }`}
      initial={{ scale: 0.6, rotate: -4 }}
      animate={{ scale: [0.6, 1.12, 1], rotate: [-4, 2, 0] }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {label}
    </motion.span>
  );
}

export default function LottieMomentOverlay({ moment, onDone }: LottieMomentOverlayProps) {
  const [loaded, setLoaded] = useState<{ id: string; animation: LoadedAnimation } | null>(null);
  const config = moment ? LOTTIE_MOMENTS[moment.kind] : null;

  // Load (or reuse) the file for this moment.
  useEffect(() => {
    if (!moment || !config) return;
    let cancelled = false;
    void loadAnimation(config.file).then((animation) => {
      if (!cancelled) setLoaded({ id: moment.id, animation });
    });
    return () => {
      cancelled = true;
    };
  }, [moment, config]);

  const ready = moment && loaded?.id === moment.id;
  const animation = ready ? loaded.animation : null;
  const isPop = config?.size === "pop";

  // The animation plays once at its natural length and closes itself when it ends.
  const subscriptions = useMemo(
    () => ({ complete: () => (moment ? onDone(moment.id) : undefined) }),
    [moment, onDone],
  );

  // Safety net so a moment can never stick on screen (e.g. "complete" missed while the
  // tab was hidden): natural length + 1.5s, the fallback time, or 8s while loading.
  useEffect(() => {
    if (!moment) return;
    const ms = !ready ? 8000 : animation ? animation.seconds * 1000 + 1500 : LOTTIE_FALLBACK_MS;
    const timer = window.setTimeout(() => onDone(moment.id), ms);
    return () => window.clearTimeout(timer);
  }, [moment, ready, animation, onDone]);

  return (
    <AnimatePresence>
      {moment && config && (
        <motion.div
          key={moment.id}
          aria-live="polite"
          role="status"
          aria-label={moment.label}
          // pointer-events-none: taps go straight through to the scoreboard underneath.
          // Always centred over a dim backdrop; pops (dunk/block/steal) are smaller and lighter.
          className={`pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center gap-2 px-4 ${
            isPop ? "bg-black/45" : "bg-black/60"
          }`}
          initial={{ opacity: 0, scale: isPop ? 0.85 : 1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: isPop ? 0.92 : 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {ready &&
            (animation ? (
              <LottieSvg
                src={animation.data}
                autoplay
                loop={false}
                subscriptions={subscriptions}
                className={isPop ? "aspect-square w-[min(55vw,42vh)]" : "aspect-square w-[min(80vw,70vh)]"}
              />
            ) : (
              <TextBurst label={moment.label} compact={isPop} />
            ))}
          {ready && animation && (
            <span
              className={`font-display leading-none tracking-[0.15em] text-white ${isPop ? "text-3xl" : "text-4xl sm:text-5xl"}`}
            >
              {moment.label}
            </span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
