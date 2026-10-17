"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";

import CommentaryBubble from "@/components/commentary/CommentaryBubble";
import VoiceSelector from "@/components/commentary/VoiceSelector";
import { useCommentary } from "@/hooks/useCommentary";
import { COMMENTARY_FEED_LIMIT } from "@/lib/constants";
import { useGameStore } from "@/store/gameStore";

export default function CommentaryFeed() {
  useCommentary();

  const commentary = useGameStore((state) => state.commentary);
  const teamAName = useGameStore((state) => state.teamA.name);
  const teamBName = useGameStore((state) => state.teamB.name);
  const isClutchMode = useGameStore((state) => state.isClutchMode);
  const gameFormat = useGameStore((state) => state.gameFormat);
  const scrollRef = useRef<HTMLDivElement>(null);

  const visible = commentary.slice(-COMMENTARY_FEED_LIMIT);
  const latest = visible.at(-1);

  // Auto-scroll on new entries and as streamed text grows.
  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [latest?.id, latest?.text.length]);

  return (
    <section
      aria-label="Live commentary"
      className="flex h-[60dvh] min-h-80 flex-col overflow-hidden rounded-2xl border border-border bg-surface/90 backdrop-blur-sm lg:sticky lg:top-4 lg:h-[calc(100dvh-7rem)]"
    >
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="relative flex size-2.5">
            <motion.span
              aria-hidden
              className={`absolute inset-0 rounded-full ${isClutchMode ? "bg-clutch" : "bg-orange"}`}
              animate={{ scale: [1, 2.2], opacity: [0.7, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
            />
            <span className={`relative size-2.5 rounded-full ${isClutchMode ? "bg-clutch" : "bg-orange"}`} />
          </span>
          <h2 className="font-display text-2xl leading-none tracking-wide">Live Commentary</h2>
        </div>
        <VoiceSelector />
      </header>

      <div ref={scrollRef} className="scrollbar-court flex-1 overflow-y-auto px-3 py-3">
        {visible.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <p className="font-display text-4xl leading-none text-white/90">Waiting for tip-off</p>
            <p className="max-w-60 text-sm text-muted">
              Every basket and stat you log gets a live play-by-play call.
            </p>
          </div>
        ) : (
          <ol className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {visible.map((entry) => (
                <CommentaryBubble
                  key={entry.id}
                  entry={entry}
                  teamAName={teamAName}
                  teamBName={teamBName}
                  gameFormat={gameFormat}
                />
              ))}
            </AnimatePresence>
          </ol>
        )}
      </div>
    </section>
  );
}
