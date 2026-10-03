import Groq from "groq-sdk";

import { ENERGY_PROMPTS, energyForPlay } from "@/lib/energy";
import { TWO_POINT_SHOTS } from "@/lib/constants";
import type { CommentaryRequest, ShotDetail, StatType, ThreePointSpot, TwoPointShot } from "@/types/game";

// Server-only: imported by app/api/commentary/route.ts. Never import from a client component.

let client: Groq | null = null;

export function getGroqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not set in .env.local");
  client ??= new Groq({ apiKey });
  return client;
}

/** Mike Breen system prompt — verbatim from CLAUDE.md §3. */
export const COMMENTARY_SYSTEM_PROMPT = `You are Mike Breen, NBA's premier play-by-play announcer on ESPN/ABC. You deliver electric, specific, moment-capturing commentary. Rules:

- Max 2 sentences per call
- Reference the EXACT play (team name, stat type, score)
- Use Mike Breen signatures: "BANG!", "Oh my goodness!", "For the lead!"
- Vary energy based on context (routine play vs clutch moment)
- Clutch mode calls must be dramatically intense
- Never be generic. Every call is specific to this exact moment.

Output ONLY the commentary text. No quotes, no formatting.`;

/**
 * Distilled from transcripts of Mike Breen, Kevin Harlan, Gus Johnson and other
 * iconic NBA calls: the BUILD → CALL → PAYOFF shape, broadcast score-talk and
 * play-specific vocabulary. All wording here is original — no transcript text is copied.
 * Kept short on purpose: Groq's free tier allows 8k tokens/minute.
 */
const BROADCAST_STYLE =
  'STYLE (elite NBA play-by-play): BUILD... CALL! PAYOFF! — BUILD = team name + present-tense action ending "..."; CALL = 1–3 SHOUTED words in CAPS; PAYOFF = what it means, full energy to the last word. Perfect grammar — team names take plural verbs ("Celtics crash", never "Celtics crashes"). Every sentence ends with "!".';

type VocabKey = "three" | "two" | "freeThrow" | TwoPointShot | StatType;

/**
 * Few-shot examples for THIS play type only (cross-play examples got copied onto the
 * wrong plays). {TEAM}/{OPP}/{CLOCK} are filled in, so borrowed phrasing stays correct.
 * Two are sampled per call so the model can't settle into one template.
 */
const PLAY_EXAMPLES: Record<VocabKey, string[]> = {
  three: [
    "{TEAM} pull up {SPOT}... BANG! And it's {TEAM} by six!",
    "{TEAM} get a look {SPOT}... lets it FLY... BANG!",
    "{TEAM} step back {SPOT}... SPLASH! {TEAM} stretch it to eight!",
  ],
  blk: [
    "{TEAM} meet it at the rim... REJECTED! Not in here!",
    "{TEAM} rotate over... GET THAT OUTTA HERE! What a stand by {TEAM}!",
    "{TEAM} rise with the shooter... SENT BACK! Nothing easy for {OPP} tonight!",
  ],
  two: [
    "{TEAM} attack the rim... and they lay it in, {TEAM} by FOUR!",
    "{TEAM} work it inside... and they THROW it down!",
    "{TEAM} float one up in the lane... and it DROPS!",
  ],
  layup: [
    "{TEAM} blow by their man... and lay it in OFF the glass!",
    "{TEAM} cut backdoor... and it's an EASY two!",
    "{TEAM} go up and under... and they FINISH at the rim!",
  ],
  dunk: [
    "{TEAM} get out in transition... THROWS IT DOWN! What a SLAM!",
    "{TEAM} take off from the dotted line... OH, THE HAMMER! The building is SHAKING!",
    "{TEAM} catch the lob... SLAMS IT HOME! Are you kidding me?!",
  ],
  jumper: [
    "{TEAM} rise up at the elbow... and it's NOTHING but net!",
    "{TEAM} pull up from mid-range... and that one is GOOD!",
    "{TEAM} create a little space... and drain the JUMPER!",
  ],
  floater: [
    "{TEAM} float one up over the big man... and it DROPS!",
    "{TEAM} toss up the teardrop... and it kisses in SOFTLY!",
  ],
  freeThrow: [
    "{TEAM} step to the line... and knock it DOWN!",
    "{TEAM} at the stripe... nothing but NET!",
  ],
  reb: [
    "{TEAM} crash the offensive glass... and that's a SECOND chance!",
    "{TEAM} clean the defensive glass... and they're running the other WAY!",
    "{TEAM} battle in the paint... and come away with the BOARD!",
  ],
  ast: [
    "{TEAM} swing it around the arc... and the extra pass finds the OPEN man!",
    "{TEAM} thread the needle... what a FEED to the cutter!",
  ],
  stl: [
    "{TEAM} jump the passing lane... and they're off to the RACES!",
    "{TEAM} pick the pocket... and that's a FREE run the other way!",
  ],
  to: [
    "{TEAM} get careless... and hand it right back to {OPP}!",
    "{TEAM} cough it up... and {OPP} will GLADLY take that gift!",
  ],
  foul: [
    "{TEAM} reach in... and the whistle BLOWS!",
    "{TEAM} get caught hand-checking... and that's a FOUL on {TEAM}!",
  ],
};

/** Clutch time: every play is at least BIG, so it needs its own shouted examples. */
const CLUTCH_EXAMPLES: Record<"three" | "blk" | "two" | "dunk" | "other", string[]> = {
  three: [
    "{TEAM} fire from the top of the key... BANG! BANG! OH MY GOODNESS! {TEAM} with {CLOCK}!",
    "{TEAM} rise up from deep... BANG! ARE YOU KIDDING ME?! What a shot with {CLOCK}!",
  ],
  blk: [
    "{TEAM} meet it at the rim... REJECTED! OH MY GOODNESS! What a stop with {CLOCK}!",
    "{TEAM} come from nowhere... GET THAT OUTTA HERE! ARE YOU KIDDING ME?! {OPP} denied!",
  ],
  two: [
    "{TEAM} attack the basket... AND IT'S GOOD! Ice in the veins with {CLOCK}!",
    "{TEAM} rise up in traffic... GOOD! What a bucket with {CLOCK}!",
  ],
  dunk: [
    "{TEAM} drive and rise... THROWS IT DOWN! OH MY GOODNESS! {CLOCK}!",
    "{TEAM} get loose at the rim... SLAMS IT HOME! ARE YOU KIDDING ME?! What a time for it!",
  ],
  other: [
    "{TEAM} come up with it... HUGE PLAY! Ball back with {CLOCK}!",
    "{TEAM} won't be denied... WHAT A PLAY! Massive with {CLOCK}!",
  ],
};

function clutchKey(key: VocabKey): keyof typeof CLUTCH_EXAMPLES {
  if (key === "three" || key === "blk" || key === "dunk") return key;
  if (key === "two" || key === "layup" || key === "jumper" || key === "floater") return "two";
  return "other";
}

function pickExamples(key: VocabKey, isClutch: boolean): string[] {
  const pool = isClutch
    ? CLUTCH_EXAMPLES[clutchKey(key)]
    : PLAY_EXAMPLES[key];
  return [...pool].sort(() => Math.random() - 0.5).slice(0, 2);
}

/** Only the current play's vocabulary goes in the prompt (keeps tokens down, stops cross-play mix-ups). */
const PLAY_VOCAB: Record<VocabKey, string> = {
  three: "BANG!, from downtown, from WAY downtown, lets it fly, splash, from the parking lot",
  two: "throws it DOWN!, lays it in, the floater... GOOD!, puts it in, gets it to go — never BANG!/splash/downtown, those are only for threes",
  layup: "lays it in, up and under, off the glass, finishes at the rim, the easy two",
  dunk: "THROWS IT DOWN!, SLAMS it home!, the HAMMER!, flushes it, the building is shaking",
  jumper: "pulls up... GOOD!, rises and fires, the elbow jumper, nothing but net, drains it",
  floater: "the floater... GOOD!, the teardrop, floats it over the top, drops it in softly",
  freeThrow: "knocks it down, perfect from the line, good",
  reb: "rebound taken by, cleans the glass, keeps it alive, crashes the boards",
  ast: "finds the cutter, threads the needle, what a feed, the dish",
  stl: "picks the pocket, stolen by, jumps the passing lane, knocked away",
  to: "coughs it up, throws it away, gives it right back — bad for that team",
  foul: "reaching in, the whistle, called for the foul — committed by that team",
  blk: "REJECTED!, sends it back!, GET THAT OUTTA HERE!, not in here!",
};

const PLAY_DESCRIPTIONS: Record<VocabKey, string> = {
  three: "hits a THREE-POINTER",
  two: "scores a two-point basket (NOT a three)",
  layup: "scores on a LAYUP (2 points)",
  dunk: "throws down a DUNK (2 points)",
  jumper: "hits a mid-range JUMPER (2 points)",
  floater: "drops in a FLOATER (2 points)",
  freeThrow: "makes a free throw (1 point)",
  reb: "grabs a rebound",
  ast: "gets an assist",
  foul: "is called for a foul",
  to: "turns the ball over",
  stl: "comes up with a steal",
  blk: "blocks a shot",
};

const NUMBER_WORDS = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen",
];
const TENS_WORDS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

/** 7 → "seven", 42 → "forty-two"; larger numbers stay as digits. Voices read words more naturally. */
function numberWords(n: number): string {
  if (n < 20) return NUMBER_WORDS[n] ?? String(n);
  if (n < 100) {
    const tens = TENS_WORDS[Math.floor(n / 10)] ?? "";
    return n % 10 === 0 ? tens : `${tens}-${NUMBER_WORDS[n % 10]}`;
  }
  return String(n);
}

function vocabKey(play: CommentaryRequest["play"]): VocabKey {
  if (play.kind === "stat") return play.stat;
  if (play.points === 3) return "three";
  if (play.points === 1) return "freeThrow";
  return play.shot && isTwoPointShot(play.shot) ? play.shot : "two";
}

function isTwoPointShot(shot: ShotDetail): shot is TwoPointShot {
  return TWO_POINT_SHOTS.some((option) => option.id === shot);
}

/** Where a three came from, as a broadcaster would say it. */
const SPOT_PHRASES: Record<ThreePointSpot, string> = {
  "left-corner": "from the left corner",
  "left-wing": "from the left wing",
  top: "from the top of the key",
  "right-wing": "from the right wing",
  "right-corner": "from the right corner",
  deep: "from WAY downtown — logo range",
};

function spotPhrase(play: CommentaryRequest["play"]): string | null {
  if (play.kind !== "score" || play.points !== 3 || !play.shot || isTwoPointShot(play.shot)) return null;
  return SPOT_PHRASES[play.shot];
}

/** "HOME" → "Home": the store keeps names upper-case, but CAPS are reserved for shouted words. */
function speakableName(name: string): string {
  return name.toLowerCase().replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
}

/**
 * Pre-computes the exact broadcast wording for the scoreline so the model never
 * does the arithmetic itself (it got leads and margins wrong when it did).
 */
function scoreFacts(actorName: string, opponentName: string, margin: number, play: CommentaryRequest["play"]): string {
  const now =
    margin === 0
      ? "all tied up"
      : margin > 0
        ? `${actorName} by ${numberWords(margin)}`
        : `${opponentName} still up ${numberWords(-margin)}`;
  if (play.kind === "stat") {
    return `SCORE: unchanged (${now}). Optional — if you mention it, phrase it as "${now}".`;
  }
  const before = margin - play.points;
  if (before <= 0 && margin > 0) return `SCORE: LEAD CHANGE — the PAYOFF must say "for the lead!" (now ${now}).`;
  if (margin === 0) return 'SCORE: this basket TIES it — say "all tied up!"';
  return `SCORE: now "${now}" (if you mention it, use that phrase naturally) — NOT a lead change, never say "for the lead".`;
}

/** Turns one play + game context into the user message for the model. */
export function buildCommentaryPrompt({ play, teamA, teamB, score, isClutch, recentCalls }: CommentaryRequest): string {
  const actorName = speakableName(play.teamId === "teamA" ? teamA.name : teamB.name);
  const opponentName = speakableName(play.teamId === "teamA" ? teamB.name : teamA.name);
  const margin = play.teamId === "teamA" ? score.teamA - score.teamB : score.teamB - score.teamA;
  const energy = energyForPlay(play);
  const key = vocabKey(play);
  const spot = spotPhrase(play);

  const clock =
    play.timeRemaining < 60
      ? `${numberWords(Math.max(1, Math.round(play.timeRemaining)))} seconds left`
      : "under two minutes left";

  return [
    BROADCAST_STYLE,
    `PLAY: ${actorName} ${PLAY_DESCRIPTIONS[key]}${spot ? ` ${spot}` : ""}.`,
    spot ? `SHOT LOCATION: ${spot} — work it into the BUILD.` : "",
    scoreFacts(actorName, opponentName, margin, play),
    isClutch ? `CLUTCH TIME: ${clock}, one-possession game — this is the call fans will replay.` : "",
    ENERGY_PROMPTS[energy],
    `EXAMPLES for this kind of play (match the style and energy, write a fresh call): ${pickExamples(key, isClutch)
      .map(
        (call) =>
          `"${call
            .replaceAll("{TEAM}", actorName)
            .replaceAll("{OPP}", opponentName)
            .replaceAll("{CLOCK}", clock)
            .replaceAll("{SPOT}", spot?.replace(/ —.*$/, "") ?? "from behind the arc")}"`,
      )
      .join(" / ")}`,
    `VOCABULARY for this play (pick one, vary it): ${PLAY_VOCAB[key]}`,
    recentCalls.length
      ? `RECENT CALLS — do not reuse their openers or phrases: ${recentCalls.map((call) => `"${call}"`).join(" / ")}`
      : "",
    `Teams are only ever "${actorName}" and "${opponentName}" — never invent players, cities or nicknames. Output only the call.`,
  ]
    .filter(Boolean)
    .join("\n");
}
