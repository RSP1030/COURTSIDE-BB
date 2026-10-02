"use client";

import { motion } from "framer-motion";

import { formatClock, formatQuarter } from "@/lib/format";
import type { CommentaryBubbleProps, CommentaryVariant } from "@/types/game";

const VARIANT_STYLES: Record<CommentaryVariant, { rail: string; text: string; tag: string | null }> = {
  normal: { rail: "bg-border", text: "text-white", tag: null },
  clutch: { rail: "bg-clutch", text: "text-clutch", tag: "Clutch" },
  highlight: { rail: "bg-orange", text: "text-orange", tag: "Highlight" },
};

export default function CommentaryBubble({ entry, teamAName, teamBName }: CommentaryBubbleProps) {
  const style = VARIANT_STYLES[entry.variant];

  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      className="relative flex gap-3 rounded-xl bg-surface-2/60 p-3"
    >
      <span aria-hidden className={`w-0.5 shrink-0 rounded-full ${style.rail}`} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
          <span className="text-white/80">{formatQuarter(entry.quarter)}</span>
          <span className="tabular">{formatClock(entry.timeRemaining)}</span>
          <span aria-hidden>·</span>
          <span className="tabular">
            {teamAName} {entry.score.teamA}–{entry.score.teamB} {teamBName}
          </span>
          {style.tag && <span className={`ml-auto ${style.text}`}>{style.tag}</span>}
        </div>
        <p className={`mt-1.5 text-[15px] font-medium leading-snug ${style.text}`}>
          {entry.text}
          {entry.isStreaming && (
            <motion.span
              aria-hidden
              className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] bg-current"
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.9, repeat: Infinity }}
            />
          )}
        </p>
      </div>
    </motion.li>
  );
}
