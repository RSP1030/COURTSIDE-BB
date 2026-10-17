import AudioEngine from "@/components/audio/AudioEngine";
import CommentaryFeed from "@/components/commentary/CommentaryFeed";
import CinematicMoments from "@/components/effects/CinematicMoments";
import ClutchOverlay, { ClutchBanner } from "@/components/effects/ClutchOverlay";
import ParticleBackground from "@/components/effects/ParticleBackground";
import GameWinnerButton from "@/components/game/GameWinnerButton";
import Scoreboard from "@/components/scoreboard/Scoreboard";

export default function Home() {
  return (
    <div className="relative isolate min-h-dvh overflow-x-hidden">
      {/* Effects layer — behind everything */}
      <ParticleBackground />
      <ClutchOverlay />
      <AudioEngine />

      <div className="relative z-10 mx-auto flex max-w-[1440px] flex-col gap-4 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 lg:px-8">
        <ClutchBanner />

        <header className="flex items-end justify-between gap-4 pt-1">
          <div className="flex items-baseline gap-3">
            <h1 className="font-display text-4xl leading-none tracking-[0.04em] sm:text-5xl">
              Court<span className="text-orange">side</span>
            </h1>
            <span className="hidden text-[10px] font-semibold uppercase tracking-[0.3em] text-muted sm:inline">
              AI Play-by-Play
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-md border border-border bg-surface/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-muted sm:inline">
              Scorer&apos;s table
            </span>
            <GameWinnerButton />
          </div>
        </header>

        <main className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]">
          <Scoreboard />
          <CommentaryFeed />
        </main>
      </div>

      {/* Higgsfield cinematic moments — full-screen modal above everything */}
      <CinematicMoments />
    </div>
  );
}
