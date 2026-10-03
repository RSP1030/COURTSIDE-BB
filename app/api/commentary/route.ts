import Groq from "groq-sdk";
import { NextResponse } from "next/server";

import { GROQ_MODEL, STAT_TYPES, THREE_POINT_SPOTS, TWO_POINT_SHOTS } from "@/lib/constants";
import { buildCommentaryPrompt, COMMENTARY_SYSTEM_PROMPT, getGroqClient } from "@/lib/groq";
import type { CommentaryRequest, CommentaryTeamContext, PlayEvent, Quarter, ScoreSnapshot } from "@/types/game";

// Streams a Mike Breen-style call back as plain UTF-8 text chunks.

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isQuarter(value: unknown): value is Quarter {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === "OT";
}

function isScore(value: unknown): value is ScoreSnapshot {
  return isRecord(value) && typeof value.teamA === "number" && typeof value.teamB === "number";
}

function isTeam(value: unknown): value is CommentaryTeamContext {
  if (!isRecord(value) || typeof value.name !== "string" || !isRecord(value.stats)) return false;
  const stats = value.stats;
  return STAT_TYPES.every((stat) => typeof stats[stat] === "number");
}

function isPlay(value: unknown): value is PlayEvent {
  if (!isRecord(value)) return false;
  if (value.teamId !== "teamA" && value.teamId !== "teamB") return false;
  if (typeof value.timeRemaining !== "number") return false;
  if (value.kind === "score") {
    const { points, shot } = value;
    if (shot !== null && shot !== undefined) {
      // The shot detail must belong to the value scored (no "layup" on a three).
      const valid = points === 2 ? TWO_POINT_SHOTS : THREE_POINT_SPOTS;
      if (points === 1 || !valid.some((option) => option.id === shot)) return false;
    }
    return points === 1 || points === 2 || points === 3;
  }
  if (value.kind === "stat") return STAT_TYPES.some((stat) => stat === value.stat);
  return false;
}

const MAX_RECENT_CALLS = 3;
const MAX_CALL_LENGTH = 300;

function parseRecentCalls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((call): call is string => typeof call === "string")
    .slice(-MAX_RECENT_CALLS)
    .map((call) => call.slice(0, MAX_CALL_LENGTH));
}

function parseRequest(body: unknown): CommentaryRequest | null {
  if (!isRecord(body)) return null;
  const { play, teamA, teamB, score, quarter, isClutch, recentCalls } = body;
  if (!isPlay(play) || !isTeam(teamA) || !isTeam(teamB) || !isScore(score)) return null;
  if (!isQuarter(quarter) || typeof isClutch !== "boolean") return null;
  // Older clients omit `shot` — normalise so the prompt builder can rely on it.
  const normalisedPlay: PlayEvent = play.kind === "score" ? { ...play, shot: play.shot ?? null } : play;
  return { play: normalisedPlay, teamA, teamB, score, quarter, isClutch, recentCalls: parseRecentCalls(recentCalls) };
}

export async function POST(request: Request) {
  const parsed = parseRequest(await request.json().catch(() => null));
  if (!parsed) return NextResponse.json({ error: "Invalid commentary request" }, { status: 400 });

  const prompt = buildCommentaryPrompt(parsed);
  const generate = () =>
    getGroqClient().chat.completions.create(
      {
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: COMMENTARY_SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        stream: true,
        temperature: 0.6,
        // gpt-oss reasons before answering: keep it brief for live latency and out of
        // the stream. Reasoning tokens count toward the cap — 300 occasionally ran out
        // mid-thought and returned an empty call.
        reasoning_effort: "low",
        include_reasoning: false,
        max_completion_tokens: 512,
      },
      { signal: request.signal },
    );

  try {
    let completion = await generate();

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          // One retry if the model produced no words at all (e.g. spent its budget reasoning).
          for (let attempt = 0; attempt < 2; attempt++) {
            let hasWords = false;
            let heldBack = ""; // punctuation before the first word, dropped if we retry
            for await (const chunk of completion) {
              const text = chunk.choices[0]?.delta?.content;
              if (!text) continue;
              if (hasWords) {
                controller.enqueue(encoder.encode(text));
              } else if (/\p{L}/u.test(text)) {
                hasWords = true;
                controller.enqueue(encoder.encode(heldBack + text));
              } else {
                heldBack += text;
              }
            }
            if (hasWords || attempt === 1) break;
            completion = await generate();
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
      cancel() {
        completion.controller.abort();
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message =
      error instanceof Groq.APIError && error.status === 401
        ? "Groq rejected the API key — check GROQ_API_KEY in .env.local"
        : error instanceof Error
          ? error.message
          : "Commentary generation failed";
    console.error("[commentary]", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

/** Warm-up target for hooks/useWarmRoutes.ts: compiles the route in dev, calls nothing external. */
export function HEAD() {
  return new Response(null, { status: 204 });
}
