import type { HiggsfieldJobStatus, HiggsfieldPollResponse, HiggsfieldTrigger } from "@/types/game";

// Server-only: imported by app/api/higgsfield/route.ts. Never import from a client component.
//
// Higgsfield's API (docs.higgsfield.ai): every model has its own endpoint, jobs are
// async (submit → request_id → poll /requests/{id}/status), auth is
// `Authorization: Key KEY_ID:KEY_SECRET`. CLAUDE.md's "POST /v1/video/generate"
// predates checking the docs — that endpoint doesn't exist.

const API_BASE = "https://api.higgsfield.ai";

/** Seedance 2.0 text-to-video: best cinematic quality on Higgsfield. */
const MODEL_PATH = "/bytedance/seedance-2.0/text-to-video";

/**
 * Billed per output pixel-second: 5s at 720p ≈ $1.50, at 480p ≈ $0.65 (Higgsfield's
 * published formula). No generated audio: autoplay with sound is blocked by browsers,
 * and it would clash with the commentary voice.
 */
const GENERATION_SETTINGS = {
  duration: 5,
  resolution: "720p",
  aspect_ratio: "16:9",
  generate_audio: false,
} as const;

/**
 * Prompts live server-side and are picked by trigger — the client can't send its own
 * prompt, so the API key can't be used to generate arbitrary videos.
 * Base wording from CLAUDE.md §7, expanded with camera + lighting direction for Seedance.
 */
export const HIGGSFIELD_PROMPTS: Record<HiggsfieldTrigger, string> = {
  "clutch-activation":
    "Intense NBA arena atmosphere, crowd roaring, slow motion. Packed stands on their feet under dramatic red and orange arena lights, haze drifting through the spotlights, slow dolly push toward the court, shallow depth of field, cinematic broadcast look.",
  "clutch-three":
    "Basketball swishing through net in slow motion, cinematic. Extreme close-up of the ball dropping through the net, net snapping upward, arena lights flaring behind, crowd blurred in the background, high-speed camera.",
  "buzzer-beater":
    "Basketball buzzer-beater in slow motion: the ball in the air as the shot clock hits zero and the red backboard light flashes, crowd frozen mid-gasp, then erupting, cinematic arena lighting.",
  "game-winner":
    "Victory celebration, confetti falling, crowd erupting. Orange and gold confetti raining over a packed basketball arena, players' silhouettes jumping in celebration at center court, spotlights sweeping, slow motion, cinematic.",
  "player-of-match":
    "Basketball player portrait, dramatic lighting, ESPN style. A silhouetted athlete in a dark arena, rim light in orange, slow push-in, smoke in the spotlight, premium sports broadcast intro.",
};

const JOB_STATUSES: readonly HiggsfieldJobStatus[] = ["queued", "in_progress", "completed", "failed", "nsfw", "canceled"];

/** Request ids are UUIDs — validated before they're put in an upstream URL. */
export const REQUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class HiggsfieldError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function authHeader(): string {
  const key = process.env.HIGGSFIELD_API_KEY?.trim();
  if (!key) throw new HiggsfieldError("HIGGSFIELD_API_KEY is not set in .env.local", 500);
  if (!key.includes(":")) {
    throw new HiggsfieldError("HIGGSFIELD_API_KEY must be KEY_ID:KEY_SECRET (both parts, from console.higgsfield.ai)", 500);
  }
  return `Key ${key}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isJobStatus(value: unknown): value is HiggsfieldJobStatus {
  return JOB_STATUSES.some((status) => status === value);
}

async function call(path: string, init: RequestInit = {}): Promise<Record<string, unknown>> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { Authorization: authHeader(), "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
  });
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const detail = isRecord(body) && typeof body.detail === "string" ? body.detail : `HTTP ${response.status}`;
    const message =
      response.status === 401
        ? "Higgsfield rejected the API key — HIGGSFIELD_API_KEY must be KEY_ID:KEY_SECRET from console.higgsfield.ai"
        : response.status === 402 || /credit|balance|insufficient/i.test(detail)
          ? "Higgsfield balance is too low for this video — top up at console.higgsfield.ai"
          : `Higgsfield error: ${detail}`;
    throw new HiggsfieldError(message, response.status);
  }
  if (!isRecord(body)) throw new HiggsfieldError("Higgsfield returned an unreadable response", 502);
  return body;
}

/** Submits a Seedance job for this trigger; returns Higgsfield's request id. */
export async function startGeneration(trigger: HiggsfieldTrigger): Promise<{ jobId: string; status: HiggsfieldJobStatus }> {
  const body = await call(MODEL_PATH, {
    method: "POST",
    body: JSON.stringify({ prompt: HIGGSFIELD_PROMPTS[trigger], ...GENERATION_SETTINGS }),
  });
  const jobId = body.request_id;
  if (typeof jobId !== "string" || !REQUEST_ID_PATTERN.test(jobId)) {
    throw new HiggsfieldError("Higgsfield didn't return a request id", 502);
  }
  return { jobId, status: isJobStatus(body.status) ? body.status : "queued" };
}

/** One poll of a job's status. */
export async function getJobStatus(jobId: string): Promise<HiggsfieldPollResponse> {
  const body = await call(`/requests/${jobId}/status`);
  const status = isJobStatus(body.status) ? body.status : "in_progress";
  const video = isRecord(body.video) && typeof body.video.url === "string" ? body.video.url : null;
  const error =
    status === "nsfw"
      ? "Higgsfield's safety filter blocked this video"
      : status === "failed"
        ? typeof body.error === "string" && body.error
          ? body.error
          : "Higgsfield couldn't generate this video"
        : status === "canceled"
          ? "The generation was canceled"
          : null;
  return { status, videoUrl: status === "completed" ? video : null, error };
}
