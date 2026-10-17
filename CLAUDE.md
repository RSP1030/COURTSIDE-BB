markdown
# COURTSIDE — AI Basketball Commentary App
## Project Memory for Claude Code

### VISION
Courtside is a premium AI-powered basketball scoreboard and live commentary platform.
It delivers real-time AI commentary in a Mike Breen broadcast style, cinematic
AI-generated video moments via Higgsfield for key plays, and stunning WebGL
particle effects via tsParticles. This is an IBDP portfolio flagship project —
it must be production-quality, well-architected, and genuinely impressive.

---

### TECH STACK (exact versions — do not upgrade without asking)
- Next.js 15 (App Router, TypeScript strict mode)
- React 19
- Tailwind CSS v4
- Framer Motion v11 (all animations)
- Zustand v5 (global state — game store)
- Groq SDK (AI commentary — model: openai/gpt-oss-120b)
- ElevenLabs API v2 (TTS — voice: Adam or Josh, model: eleven_v3 — audio tags + CAPS emphasis; streamed via GET /api/tts)
- Higgsfield API (cinematic AI video moments — via MCP or REST)
- tsparticles + @tsparticles/react v4 (dual-mode particle background — normal vs clutch)
- lottie-react v3 (instant cinematic moments; Lottie JSON in public/animations/)
- Vercel (deployment target)

---

### PROJECT STRUCTURE

courtside/ ├── CLAUDE.md ← YOU ARE HERE ├── .env.local ← API keys (never commit this) ├── app/ │ ├── layout.tsx ← Root layout, fonts, global styles │ ├── page.tsx ← Main game view │ ├── globals.css ← Tailwind + CSS variables │ └── api/ │ ├── commentary/route.ts ← Groq streaming API route │ ├── tts/route.ts ← ElevenLabs TTS API route │ └── higgsfield/route.ts ← Higgsfield video generation route ├── components/ │ ├── scoreboard/ │ │ ├── Scoreboard.tsx ← Main scoreboard container │ │ ├── TeamPanel.tsx ← One team's score + stats │ │ ├── GameClock.tsx ← Quarter + time display │ │ └── StatButton.tsx ← +REB, +AST, +FOUL, +TO buttons │ ├── commentary/ │ │ ├── CommentaryFeed.tsx ← Scrollable commentary history │ │ ├── CommentaryBubble.tsx ← Individual commentary entry │ │ └── VoiceSelector.tsx ← Switch commentator styles │ ├── effects/ │ │ ├── ClutchOverlay.tsx ← Red pulse + intensity on clutch mode │ │ ├── ParticleBackground.tsx ← tsParticles normal/clutch backdrop │ │ ├── ScoreCelebration.tsx ← Particle burst on big plays │ │ └── HighsfieldMomentModal.tsx ← Full-screen cinematic video moment │ ├── game/ │ │ ├── PlayerStats.tsx ← Per-player stat tracker │ │ ├── PlayerOfMatch.tsx ← AI-generated POTM reveal │ │ └── GameSummary.tsx ← Post-game AI recap │ └── audio/ │ └── AudioEngine.tsx ← Crowd noise, TTS playback, mixing ├── store/ │ └── gameStore.ts ← Zustand: all game state ├── lib/ │ ├── groq.ts ← Groq client + commentary prompt │ ├── elevenlabs.ts ← ElevenLabs client + voice map │ ├── higgsfield.ts ← Higgsfield API client │ └── constants.ts ← Game constants, voice configs ├── hooks/ │ ├── useCommentary.ts ← Commentary trigger logic │ ├── useClutchMode.ts ← Clutch mode detection + activation │ ├── useAudio.ts ← Audio playback hook │ └── useHighsfieldMoment.ts ← Trigger + poll cinematic generation ├── types/ │ └── game.ts ← All TypeScript types └── public/ └── sounds/ ├── crowd-cheer.mp3 ├── applause.mp3 └── stomp-cheer.mp3


---

### DESIGN SYSTEM

**Colors (define as CSS custom properties in globals.css):**
```css
--color-bg:          #0A0A0A;      /* Near-black base */
--color-surface:     #141414;      /* Card/panel background */
--color-surface-2:   #1E1E1E;      /* Elevated surfaces */
--color-border:      #2A2A2A;      /* Subtle borders */
--color-orange:      #FF6B00;      /* Primary accent — Courtside brand */
--color-orange-glow: #FF6B0033;    /* Orange glow for clutch mode */
--color-white:       #FFFFFF;
--color-muted:       #888888;      /* Secondary text */
--color-clutch:      #FF1A1A;      /* Clutch mode red */
--color-clutch-glow: #FF1A1A44;
```

**Typography:**
- Headlines: `font-family: 'Bebas Neue', sans-serif` (Google Fonts)
- Body/UI: `font-family: 'Inter', sans-serif`
- Score numbers: Bebas Neue, massive (6rem+ on desktop)
- Import both in layout.tsx via next/font/google

**Aesthetic:** Premium sports broadcast. Think ESPN/NBA scoreboard energy.
Dark, high-contrast, orange accents. NOT generic SaaS. NOT "clean minimal startup."
Cinematic and athletic.

---

### ENVIRONMENT VARIABLES (.env.local)

GROQ_API_KEY= ELEVENLABS_API_KEY= HIGGSFIELD_API_KEY=


---

### FEATURE SPECIFICATIONS

#### 1. GAME STATE (Zustand store — gameStore.ts)
```typescript
interface GameState {
  teamA: Team;
  teamB: Team;
  quarter: 1 | 2 | 3 | 4 | 'OT';
  timeRemaining: number;           // seconds
  isClutchMode: boolean;
  commentary: CommentaryEntry[];
  lastPlay: PlayEvent | null;
  isGeneratingCommentary: boolean;
  isTTSPlaying: boolean;
  selectedVoice: VoiceStyle;
  higsfieldVideoUrl: string | null;
  showHighsfieldModal: boolean;
}
```

#### 2. SCOREBOARD
- Team name editable on click
- Score increments: +1, +2, +3 buttons (not generic +1)
- Shot detail (ShotPicker.tsx): +2 asks Layup / Dunk / Jumper / Floater; +3 asks the spot on a
  mini court (corners, wings, top, logo). One-tap "Just +2/+3" skips it; Cancel/Esc scores nothing.
  The detail feeds the commentary prompt; dunks count as big plays (high energy) like 3s and blocks
- Live stat tracking: REB, AST, FOUL, TO, STL, BLK per team
- Game format switch: 4Q (Q1–Q4 + OT, 10-min quarters) or 2H (H1–H2 + OT, 20-min halves);
  switching resets to period 1 with a full clock, scores kept. Feed labels follow the format
- Period selector for the chosen format
- Countdown clock: tap it to edit (separate MM / SS boxes — phone keypads have no ":"), max 99:59
- Clutch toggle button next to Start/Reset (see §5)
- Smooth score increment animation (Framer Motion number spring)

#### 3. AI COMMENTARY (Groq)
**System prompt for Mike Breen style:**

You are Mike Breen, NBA's premier play-by-play announcer on ESPN/ABC. You deliver electric, specific, moment-capturing commentary. Rules:

Max 2 sentences per call
Reference the EXACT play (team name, stat type, score)
Use Mike Breen signatures: "BANG!", "Oh my goodness!", "For the lead!"
Vary energy based on context (routine play vs clutch moment)
Clutch mode calls must be dramatically intense
Never be generic. Every call is specific to this exact moment. Output ONLY the commentary text. No quotes, no formatting.
**Trigger:** Every score/stat change triggers commentary generation.
**Stream:** Use Groq streaming API for real-time text appearance in feed.

#### 4. TTS (ElevenLabs)
- Voice: Adam (default), Josh, Rachel (female option)
- Model: eleven_v3 (only model with real shouting/emphasis; streamed so first audio ~1s). Energy tiers + [shouting] tag placement live in lib/energy.ts. Costs ~1 credit/char — the account is on the 10k-credit free tier, so check quota before voice tests
- Stream audio directly via browser Audio API
- Queue system: if TTS is playing, queue next commentary
- Voice selector: dropdown with preview button

#### 5. CLUTCH MODE
Activates automatically when ALL of these are true:
- Final regulation period (Q4 in quarters, H2 in halves) or OT
- Time remaining ≤ 120 seconds (2 minutes)
- Score difference ≤ 5 points
STAYS ON once activated (does not deactivate mid-game).
Manual toggle (GameClock "Clutch" button, shows an AUTO badge until used): once the scorer
taps it, their choice wins and automatic detection stays out of it for the rest of the game
(clutchManual in the store). Turning it on by hand fires the same activation effects.
Effects on activation:
- UI border pulses red (Framer Motion animate)
- "CLUTCH MODE" banner slides in from top
- Particle background crossfades from ambient spotlights to clutch embers
- Commentary prompt intensifies
- Trigger Higgsfield generation for a cinematic crowd/arena moment

#### 6. CROWD NOISE (AudioEngine)
- 3 sounds: cheer, applause, stomp-cheer
- Random selection on each play
- Broadcast "bed": holds at full volume until the voice starts, ducks to 40% under it,
  fades out when the call ends (7s safety fade if no voice comes)
- Volume via Web Audio GainNode ramps — iOS ignores audio.volume, and gain ramps keep
  working in background tabs (rAF-driven fades stall there)
- Volume: 0.35 max (balanced under TTS)
- In clutch mode: volume increases to 0.55, stomp-cheer more frequent

#### 7. CINEMATIC MOMENTS — Lottie now, Higgsfield behind a flag
`HIGGSFIELD_ENABLED` in lib/constants.ts is the ONE switch (currently false):
- false → instant Lottie animation (free). true → Higgsfield video (paid, ~$1.50/clip)
- Every trigger goes through hooks/useCinematicMoment.ts; nothing else reads the flag
- Dunk/Block/Steal corner pops are always Lottie

Lottie moments (LOTTIE_MOMENTS in lib/constants.ts, rendered by components/effects/LottieMomentOverlay.tsx):
- Clutch activation → fire-explosion.json (big)
- 3-pointer in clutch → basketball-score.json (big)
- Game winner (header button) → confetti-celebration.json (big)
- Player of the Match reveal → crowd-cheer.json (big — wire when POTM is built)
- Dunk / Block / Steal → basketball-score.json ("pop": smaller, same centre position)
- All centred over a dim backdrop. Each plays ONCE AT ITS NATURAL LENGTH (never sped up or
  slowed) and closes on the animation's "complete" event (+ safety timer: length + 1.5s).
  pointer-events-none so the scoreboard stays usable underneath. A big moment is never cut
  off by another moment; pops replace pops
- File names must match exactly (case-sensitive): basketball-score.json, fire-explosion.json,
  confetti-celebration.json, crowd-cheer.json
- Files are fetched at runtime from public/animations/ — a missing file falls back to an
  animated text burst, so nothing breaks before the JSON is added
- lottie-react is client-only + code-split (next/dynamic, ssr:false); LottieSvg renderer

#### 7b. HIGGSFIELD (when HIGGSFIELD_ENABLED = true)
Triggered on:
a) Clutch mode activation → "Intense NBA arena atmosphere, crowd roaring, slow motion"
b) 3-pointer in clutch mode → "Basketball swishing through net in slow motion, cinematic"
c) Game-winning play → "Victory celebration, confetti falling, crowd erupting"
d) Player of the Match reveal → "Basketball player portrait, dramatic lighting, ESPN style"

Implementation (verified against docs.higgsfield.ai — "POST /v1/video/generate" does not exist):
- Base https://api.higgsfield.ai, auth header `Authorization: Key KEY_ID:KEY_SECRET`
  (HIGGSFIELD_API_KEY must hold both parts, from console.higgsfield.ai)
- Submit: POST /bytedance/seedance-2.0/text-to-video { prompt, duration 4–15, resolution, aspect_ratio,
  generate_audio } → { request_id, status }
- Poll: GET /requests/{id}/status → queued | in_progress | completed | failed | nsfw | canceled;
  the clip is at video.url
- Settings: 5s, 720p, 16:9, no audio (muted autoplay; avoids clashing with commentary) ≈ $1.50/clip
- Prompts are server-side, picked by trigger — clients send only the trigger name
- app/api/higgsfield: POST { trigger } → { jobId }, GET ?job_id= → { status, videoUrl, error };
  job ids validated as UUIDs; max 6 new jobs/hour per server instance (cost backstop)
- hooks/useHiggsfieldMoment.ts polls every 3s (5 min timeout), one moment at a time
- HiggsfieldMomentModal: bouncing-ball loading state → muted autoplay video + latest commentary
  call overlaid; reopens when ready even if dismissed while generating
- Wired: clutch activation (once — clutch latches) and the "Game Winner" header button
- Store last 3 generated clips in session

#### 8. PARTICLE EFFECTS (tsParticles — replaced Unicorn Studio)
components/effects/ParticleBackground.tsx, fixed full-screen at z-index 0 behind all UI.

NORMAL MODE (isClutchMode === false):
- #0A0A0A background + faint court-line texture
- 40 large soft orange (#FF6B00) spotlights, opacity ≤ 0.3, drifting slowly upward

CLUTCH MODE (isClutchMode === true):
- 120 red/orange (#FF1A1A / #FF6B00) embers bursting outward from centre court, 3× speed
- Flame flicker (fast opacity + size animation, wobble); centre emitter keeps the burst going
- Red edge glow fades in; ClutchOverlay pulses the screen border red (Framer Motion)

Implementation notes:
- Each mode is its own container with FIXED options, crossfaded over 0.8s with Framer Motion —
  changing a container's options makes @tsparticles/react destroy + rebuild it (visible pop)
- Options and the particlesLoaded callback must be stable references for the same reason
- Soft particles are pre-rendered radial-gradient sprites (shape "image"), not shadowBlur/CSS blur
- 60fps cap, detectRetina off, pauses on visibilitychange, still frame for prefers-reduced-motion
- tsparticles (loadFull) is dynamically imported, so it stays out of the main bundle

#### 9. COMMENTARY HISTORY FEED
- Max 20 entries shown, oldest scrolls off
- Each entry: timestamp, quarter, score context, commentary text
- Smooth slide-in animation (Framer Motion)
- Color coding: normal (white), clutch (red), POTM/summary (orange)
- Auto-scroll to latest

#### 10. PLAYER OF THE MATCH
- Triggered manually via "End Game" button
- AI analyzes all stats via Groq: determines best performer
- Dramatic reveal animation: flash, then name + stats display
- Trigger Higgsfield for player portrait moment video

#### 11. GAME SUMMARY
- Triggered after POTM reveal
- Groq generates: final score recap, key moments, POTM highlight, dramatic narrative
- Displayed in elegant modal
- Copy-to-clipboard option for sharing

---

### CODE STANDARDS

1. **TypeScript strict mode always on** — no `any`, no shortcuts
2. **No barrel imports** — import directly from file paths
3. **Server components by default** — only use 'use client' when needed
4. **API routes for all external calls** — never call Groq/ElevenLabs/Higgsfield from client directly
5. **Error boundaries on all async components**
6. **Loading states for everything async** — skeleton UIs, not spinners
7. **Zustand actions are pure** — no side effects in store, use hooks for that
8. **Every component gets a proper TypeScript interface** — defined in types/game.ts
9. **Framer Motion for ALL animations** — no CSS transitions (inconsistent)
10. **Mobile-first responsive** — works perfectly on phones (scorer uses their phone courtside)

---

### WHAT NOT TO DO
- Do NOT use `any` type anywhere
- Do NOT call external APIs directly from client components
- Do NOT use inline styles (use Tailwind or CSS vars)
- Do NOT add unnecessary dependencies
- Do NOT over-engineer state — Zustand is enough, no Redux
- Do NOT use placeholder data for final UI — build real integration
- Do NOT make generic-looking UI — this must look premium
- Do NOT touch working audio files in public/sounds/
- Do NOT commit .env.local

---

### WHAT MAKES THIS PORTFOLIO-WORTHY
- Real AI integration (not mocked)
- Real-time streaming commentary
- Cinematic AI video generation on key moments
- Dual-mode particle effects (tsParticles)
- Professional design system
- Clean TypeScript architecture
- Deployable on Vercel
- One person built this with Claude Code — document that honestly