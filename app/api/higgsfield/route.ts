import { NextResponse } from "next/server";

import { getJobStatus, HIGGSFIELD_PROMPTS, HiggsfieldError, REQUEST_ID_PATTERN, startGeneration } from "@/lib/higgsfield";
import type { HiggsfieldStartResponse, HiggsfieldTrigger } from "@/types/game";

// Server-side proxy for Higgsfield — the API key never reaches the browser.
//   POST { trigger }      → starts a Seedance job, returns { jobId, status }
//   GET  ?job_id=<uuid>   → { status, videoUrl, error }

/**
 * Each video costs real money (~$1.50), and on Vercel this route is public. Cap new
 * jobs per server instance as a backstop against runaway loops or abuse. In-memory
 * and best-effort — a real deployment would add auth or a shared rate limiter.
 */
const MAX_JOBS_PER_HOUR = 6;
const recentJobStarts: number[] = [];

function isTrigger(value: unknown): value is HiggsfieldTrigger {
  return typeof value === "string" && value in HIGGSFIELD_PROMPTS;
}

function errorResponse(error: unknown) {
  const status = error instanceof HiggsfieldError ? (error.status === 401 || error.status === 402 ? error.status : 502) : 502;
  const message = error instanceof Error ? error.message : "Higgsfield request failed";
  console.error("[higgsfield]", message);
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const trigger = typeof body === "object" && body !== null && "trigger" in body ? body.trigger : null;
  if (!isTrigger(trigger)) return NextResponse.json({ error: "Unknown cinematic trigger" }, { status: 400 });

  const hourAgo = Date.now() - 60 * 60 * 1000;
  while (recentJobStarts.length && (recentJobStarts[0] ?? 0) < hourAgo) recentJobStarts.shift();
  if (recentJobStarts.length >= MAX_JOBS_PER_HOUR) {
    return NextResponse.json({ error: "Cinematic moment limit reached for this hour" }, { status: 429 });
  }

  try {
    const job = await startGeneration(trigger);
    recentJobStarts.push(Date.now());
    const response: HiggsfieldStartResponse = job;
    return NextResponse.json(response, { status: 202 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET(request: Request) {
  const jobId = new URL(request.url).searchParams.get("job_id");
  if (!jobId || !REQUEST_ID_PATTERN.test(jobId)) {
    return NextResponse.json({ error: "job_id must be a Higgsfield request id" }, { status: 400 });
  }
  try {
    return NextResponse.json(await getJobStatus(jobId), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

/** Warm-up target for hooks/useWarmRoutes.ts: compiles the route in dev, calls nothing external. */
export function HEAD() {
  return new Response(null, { status: 204 });
}
