"use client";

import { useCallback } from "react";

import { useHiggsfieldMoment } from "@/hooks/useHiggsfieldMoment";
import { HIGGSFIELD_ENABLED } from "@/lib/constants";
import { useGameStore } from "@/store/gameStore";
import type { HiggsfieldTrigger } from "@/types/game";

/**
 * The single switch point for cinematic moments. Every trigger goes through here,
 * so turning Higgsfield on is one line: HIGGSFIELD_ENABLED = true in lib/constants.ts.
 *   off → instant Lottie animation (free)
 *   on  → Higgsfield video generation (paid, ~20–60s, modal with loading state)
 */
export function useCinematicMoment(): (trigger: HiggsfieldTrigger) => void {
  const generate = useHiggsfieldMoment();
  const showLottieMoment = useGameStore((state) => state.showLottieMoment);

  return useCallback(
    (trigger: HiggsfieldTrigger) => {
      if (HIGGSFIELD_ENABLED) void generate(trigger);
      else showLottieMoment(trigger);
    },
    [generate, showLottieMoment],
  );
}
