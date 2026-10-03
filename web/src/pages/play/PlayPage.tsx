import { createTeam, joinTeam, leaveTeam, startGame } from "../../socket/api";
import { useGameSocket } from "../../socket/useGameSocket";
import { useGameStore } from "../../store/game";
import { CountdownScreen, MessageScreen } from "./CountdownScreen";
import { FinalScreen } from "./FinalScreen";
import { GameScreen } from "./GameScreen";
import { HomeScreen } from "./HomeScreen";
import { LobbyScreen } from "./LobbyScreen";

/** Renders the screen for the team's current phase — the server decides which. */
export function PlayPage() {
  useGameSocket();
  const session = useGameStore((s) => s.session);
  const playerId = useGameStore((s) => s.playerId);
  const match = useGameStore((s) => s.match);
  const connected = useGameStore((s) => s.connected);
  const restoring = useGameStore((s) => s.restoring);

  let screen;
  if (restoring) {
    screen = <MessageScreen message="Getting you back into your team…" />;
  } else if (!session || !playerId) {
    screen = <HomeScreen onCreate={createTeam} onJoin={joinTeam} />;
  } else {
    switch (session.phase) {
      case "lobby":
        screen = <LobbyScreen session={session} playerId={playerId} onLeave={() => void leaveTeam()} onStart={startGame} />;
        break;
      case "countdown":
        screen = <CountdownScreen seconds={session.countdown ?? 0} />;
        break;
      case "playing":
        screen = <GameScreen match={match} />;
        break;
      case "final":
        screen = <FinalScreen session={session} onDone={leaveTeam} />;
        break;
    }
  }

  return (
    <>
      {screen}
      {!connected && !restoring && session && (
        <div className="fixed inset-x-0 top-0 z-10 border-b border-bad bg-bg px-10 py-2.5 text-sm font-medium text-bad">
          Connection lost — reconnecting…
        </div>
      )}
    </>
  );
}
