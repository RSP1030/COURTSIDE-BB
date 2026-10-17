"use client";

import { useEffect, useRef } from "react";

import HiggsfieldMomentModal from "@/components/effects/HiggsfieldMomentModal";
import LottieMomentOverlay from "@/components/effects/LottieMomentOverlay";
import { useCinematicMoment } from "@/hooks/useCinematicMoment";
import { useGameStore } from "@/store/gameStore";
import type { PlayEvent } from "@/types/game";

/** Dunks, blocks and steals get a small corner pop (always Lottie, never a paid video). */
function bigPlayLabel(play: PlayEvent): string | null {
  if (play.kind === "score") return play.shot === "dunk" ? "Dunk!" : null;
  if (play.stat === "blk") return "Block!";
  if (play.stat === "stl") return "Steal!";
  return null;
}

/**
 * Hosts both moment systems and the automatic triggers:
 *   clutch activation → once (clutch mode latches), clutch three → every one,
 *   dunk/block/steal → corner pop. Game Winner is a button (GameWinnerButton).
 */
export default function CinematicMoments() {
  const isClutchMode = useGameStore((state) => state.isClutchMode);
  const lastPlay = useGameStore((state) => state.lastPlay);
  const status = useGameStore((state) => state.higgsfieldStatus);
  const videoUrl = useGameStore((state) => state.higgsfieldVideoUrl);
  const higgsfieldMoment = useGameStore((state) => state.higgsfieldMoment);
  const error = useGameStore((state) => state.higgsfieldError);
  const isModalOpen = useGameStore((state) => state.showHiggsfieldModal);
  const closeModal = useGameStore((state) => state.closeHiggsfieldModal);
  const lottieMoment = useGameStore((state) => state.lottieMoment);
  const clearLottieMoment = useGameStore((state) => state.clearLottieMoment);
  const showLottieMoment = useGameStore((state) => state.showLottieMoment);
  const playMoment = useCinematicMoment();

  const wasClutch = useRef(isClutchMode);
  useEffect(() => {
    if (isClutchMode && !wasClutch.current) playMoment("clutch-activation");
    wasClutch.current = isClutchMode;
  }, [isClutchMode, playMoment]);

  const handledPlay = useRef<string | null>(null);
  useEffect(() => {
    if (!lastPlay || handledPlay.current === lastPlay.id) return;
    handledPlay.current = lastPlay.id;

    if (lastPlay.kind === "score" && lastPlay.points === 3 && lastPlay.isClutch) {
      // If this three is also what switched clutch on, the activation moment is
      // already playing — the store won't let this one cut it off.
      playMoment("clutch-three");
      return;
    }
    const label = bigPlayLabel(lastPlay);
    if (label) showLottieMoment("big-play", label);
  }, [lastPlay, playMoment, showLottieMoment]);

  return (
    <>
      <LottieMomentOverlay moment={lottieMoment} onDone={clearLottieMoment} />
      <HiggsfieldMomentModal
        isOpen={isModalOpen}
        status={status}
        videoUrl={videoUrl}
        moment={higgsfieldMoment}
        error={error}
        onClose={closeModal}
      />
    </>
  );
}
