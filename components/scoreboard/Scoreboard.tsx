import GameClock from "@/components/scoreboard/GameClock";
import TeamPanel from "@/components/scoreboard/TeamPanel";

export default function Scoreboard() {
  return (
    <div className="flex min-w-0 flex-col gap-3 sm:gap-4">
      <GameClock />
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <TeamPanel teamId="teamA" align="left" />
        <TeamPanel teamId="teamB" align="right" />
      </div>
    </div>
  );
}
