"use client";

import { useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Particles, { ParticlesProvider, type ParticlesPluginRegistrar } from "@tsparticles/react";

import { colors } from "@/lib/colors";
import { useGameStore } from "@/store/gameStore";
import type { ParticleContainer, ParticleLayerProps, ParticleOptions } from "@/types/game";

// Dual-mode particle backdrop (replaces Unicorn Studio).
// Each mode is its own tsParticles container with *fixed* options: changing a
// container's options makes @tsparticles/react destroy and rebuild it (a visible
// pop), so modes switch by crossfading two layers with Framer Motion instead.

/** Mode switch crossfade, per spec. */
const MODE_FADE_S = 0.8;

/**
 * Soft spotlight sprite: a radial-gradient circle drawn once as an image.
 * Far cheaper per frame than canvas shadowBlur or a CSS blur filter on the canvas.
 */
function glowSprite(hex: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><defs><radialGradient id='g'><stop offset='0' stop-color='${hex}'/><stop offset='0.3' stop-color='${hex}' stop-opacity='0.6'/><stop offset='1' stop-color='${hex}' stop-opacity='0'/></radialGradient></defs><circle cx='32' cy='32' r='32' fill='url(#g)'/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const ORANGE_GLOW = { src: glowSprite(colors.orange), width: 64, height: 64 };
const RED_GLOW = { src: glowSprite(colors.clutch), width: 64, height: 64 };

/** Shared engine settings: 60fps cap, no retina upscaling (soft glows don't need it). */
const BASE = {
  fullScreen: { enable: false },
  fpsLimit: 60,
  detectRetina: false,
  background: { color: "transparent" },
} as const;

/** Normal: 40 large, faint orange spotlights drifting slowly upward. */
const NORMAL_OPTIONS: ParticleOptions = {
  ...BASE,
  particles: {
    number: { value: 40, density: { enable: false } },
    shape: { type: "image", options: { image: ORANGE_GLOW } },
    opacity: { value: { min: 0.12, max: 0.3 } },
    size: { value: { min: 24, max: 72 } },
    move: {
      enable: true,
      direction: "top",
      speed: { min: 0.2, max: 0.6 },
      random: true,
      straight: false,
      outModes: { default: "out" },
    },
  },
};

/** Clutch: 120 red/orange embers, 3× faster, bursting out of centre court and flickering like flames. */
const CLUTCH_OPTIONS: ParticleOptions = {
  ...BASE,
  particles: {
    number: { value: 120, density: { enable: false }, limit: { mode: "wait", value: 120 } },
    shape: { type: "image", options: { image: [RED_GLOW, RED_GLOW, ORANGE_GLOW] } },
    opacity: {
      value: { min: 0.15, max: 0.85 },
      animation: { enable: true, speed: 4, sync: false, startValue: "random", mode: "auto" },
    },
    size: {
      value: { min: 8, max: 34 },
      animation: { enable: true, speed: 12, sync: false, startValue: "random", mode: "auto" },
    },
    wobble: { enable: true, distance: 6, speed: { min: -12, max: 12 } },
    move: {
      enable: true,
      direction: "outside",
      center: { x: 50, y: 50, mode: "percent" },
      speed: { min: 0.6, max: 1.8 },
      straight: false,
      outModes: { default: "destroy" },
    },
  },
  // Keeps the burst going: embers leaving the screen are replaced from centre court.
  // They spawn on a small ring, not the exact centre: "outside" means "away from the
  // centre", which is undefined at the centre itself (they all left in one stream).
  emitters: {
    position: { x: 50, y: 50 },
    shape: { type: "circle" },
    fill: false,
    size: { width: 8, height: 8, mode: "percent" },
    rate: { quantity: 3, delay: 0.1 },
  },
};

/** Respect reduced-motion: same look, nothing moving or flickering. */
function stillVersion(options: ParticleOptions): ParticleOptions {
  return {
    ...options,
    emitters: [],
    particles: {
      ...options.particles,
      move: { enable: false },
      opacity: { value: { min: 0.12, max: 0.3 } },
      size: { value: { min: 24, max: 72 } },
      wobble: { enable: false },
    },
  };
}

const prefersReducedMotion =
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Engine plugins are code-split: tsParticles loads after first paint, not in the main bundle. */
const loadEngine: ParticlesPluginRegistrar = async (engine) => {
  const { loadFull } = await import("tsparticles");
  await loadFull(engine);
};

/** One tsParticles canvas that stops rendering while the tab is hidden. */
function ParticleLayer({ id, options }: ParticleLayerProps) {
  const container = useRef<ParticleContainer>(undefined);

  // Stable callback — a new function identity would make <Particles> rebuild the canvas.
  const handleLoaded = useCallback((loaded?: ParticleContainer) => {
    container.current = loaded;
    if (loaded && document.hidden) loaded.pause();
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) container.current?.pause();
      else container.current?.play();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return <Particles id={id} options={options} particlesLoaded={handleLoaded} className="absolute inset-0" />;
}

const NORMAL = prefersReducedMotion ? stillVersion(NORMAL_OPTIONS) : NORMAL_OPTIONS;
const CLUTCH = prefersReducedMotion ? stillVersion(CLUTCH_OPTIONS) : CLUTCH_OPTIONS;

/** Hand-drawn full court: a barely-there texture under the particles. */
function CourtLines() {
  const half = (
    <>
      <rect x="0" y="170" width="190" height="160" />
      <circle cx="190" cy="250" r="60" />
      <path d="M0 30 H140 A237.5 237.5 0 0 1 140 470 H0" />
      <circle cx="52.5" cy="250" r="7.5" />
    </>
  );

  return (
    <svg
      aria-hidden
      viewBox="0 0 940 500"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full fill-none stroke-white/[0.04] [stroke-width:2]"
    >
      <rect x="1" y="1" width="938" height="498" />
      <line x1="470" y1="0" x2="470" y2="500" />
      <circle cx="470" cy="250" r="60" />
      <circle cx="470" cy="250" r="20" />
      {half}
      <g transform="translate(940 0) scale(-1 1)">{half}</g>
    </svg>
  );
}

export default function ParticleBackground() {
  const isClutchMode = useGameStore((state) => state.isClutchMode);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-bg">
      <CourtLines />

      <ParticlesProvider init={loadEngine}>
        <AnimatePresence>
          <motion.div
            key={isClutchMode ? "clutch" : "normal"}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: MODE_FADE_S, ease: "easeInOut" }}
          >
            {isClutchMode ? (
              <ParticleLayer id="particles-clutch" options={CLUTCH} />
            ) : (
              <ParticleLayer id="particles-normal" options={NORMAL} />
            )}
          </motion.div>
        </AnimatePresence>
      </ParticlesProvider>

      {/* Clutch: the screen edges catch fire — a red glow bleeding in from every side. */}
      <AnimatePresence>
        {isClutchMode && (
          <motion.div
            key="clutch-edge-glow"
            className="absolute inset-0 shadow-[inset_0_0_180px_var(--color-clutch-glow)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: MODE_FADE_S, ease: "easeInOut" }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
