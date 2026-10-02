import Groq from "groq-sdk";

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

// TODO(session: commentary): buildCommentaryPrompt(play, state) → user message.
