import type { CommentaryEnergy, EnergyDelivery, PlayEvent } from "@/types/game";

// How hyped each call is — drives both the words (Groq prompt) and the
// delivery (ElevenLabs v3 audio tags + stability). Pure; safe on client and server.
//
// Tiers were tuned by measuring pitch/loudness of v3 output against a calm read
// (157 Hz median): lively ≈ 218 Hz, big ≈ 239 Hz with the call peaking ~350 Hz,
// max ≈ 281 Hz sustained. CAPS words land +80–100 Hz above the rest on v3.

/** "score-3", "score-2-dunk", "stat-reb", … — groups calls for the same kind of play. */
export function playTypeOf(play: PlayEvent): string {
  if (play.kind === "stat") return `stat-${play.stat}`;
  // Twos split by shot (a dunk call shouldn't steer a layup call); threes stay together
  // so BANG! doesn't repeat just because the spot changed.
  return play.points === 2 && play.shot ? `score-2-${play.shot}` : `score-${play.points}`;
}

/** 3s, dunks and blocks are the signature plays; clutch time turns everything up a tier. */
export function energyForPlay(play: PlayEvent): CommentaryEnergy {
  const isBigPlay = play.kind === "score" ? play.points === 3 || play.shot === "dunk" : play.stat === "blk";
  if (play.isClutch) return isBigPlay ? "max" : "high";
  return isBigPlay ? "high" : "medium";
}

/**
 * v3 only accepts stability 0 (creative, most expressive), 0.5 (natural) or 1 (robust).
 * Tag placement: none → punctuation carries it; at-call → calm build, then [shouting]
 * on the CAPS burst (the Breen shape); throughout → [shouting] from the first word.
 */
export const ENERGY_DELIVERY: Record<CommentaryEnergy, EnergyDelivery> = {
  medium: { stability: 0.5, tagMode: "none" },
  high: { stability: 0.5, tagMode: "at-call" },
  max: { stability: 0, tagMode: "throughout" },
};

const AUDIO_TAG = /\[[^\]]*\]?/g;
/** The CALL: a CAPS burst ending in "!" (e.g. "BANG!", "GET THAT OUTTA HERE!"). */
const CAPS_CALL = /\b[A-Z][A-Z'’\- ]*[A-Z]!/;
/** Fallback when there is no burst: the first CAPS word. */
const CAPS_WORD = /\b[A-Z]{3,}\b/;

/** Removes v3 audio tags (including a half-streamed "[shou") for display. */
export function stripAudioTags(text: string): string {
  return text.replace(AUDIO_TAG, "").replace(/\s{2,}/g, " ").trim();
}

/**
 * Turns a display call into the v3 speech script for its energy tier.
 * Always lands on "!" — measured: a call without it reads ~25% flatter (160 vs 218 Hz).
 */
export function toSpeechScript(text: string, energy: CommentaryEnergy): string {
  const stripped = stripAudioTags(text);
  const clean = /[!?]$/.test(stripped) ? stripped : `${stripped.replace(/[.,;:…\s]+$/, "")}!`;
  switch (ENERGY_DELIVERY[energy].tagMode) {
    case "none":
      return clean;
    case "throughout":
      return `[shouting] ${clean}`;
    case "at-call": {
      // Prefer the "!" burst — a CAPS word earlier in the BUILD ("from WAY downtown") must not steal the shout.
      const match = CAPS_CALL.exec(clean) ?? CAPS_WORD.exec(clean);
      if (!match) return `[excited] ${clean}`;
      return `${clean.slice(0, match.index)}[shouting] ${clean.slice(match.index)}`;
    }
  }
}

/** Per-tier direction appended to the Groq prompt. */
export const ENERGY_PROMPTS: Record<CommentaryEnergy, string> = {
  medium:
    "ENERGY: LIVELY — upbeat, a notch below the big plays. One flowing, grammatical sentence, BUILD... PAYOFF!, NO shouted CALL. You may put ONE key word in CAPS where a broadcaster would lean on it (like 'a SECOND chance') — never tack a lone CAPS word onto the end. 8–16 words.",
  high: "ENERGY: BIG — the building ERUPTS. Full BUILD... CALL! PAYOFF! At most 3 short sentences, 10–20 words.",
  max: "ENERGY: MAXIMUM — the call of the night. BUILD... CALL! (may double it) + a reaction (OH MY GOODNESS! / ARE YOU KIDDING ME?!) + PAYOFF! At most 4 short sentences, 12–24 words.",
};
