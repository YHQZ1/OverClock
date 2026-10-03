import { TopBar } from "../../components/TopBar";
import { createTeam, joinTeam, leaveTeam, startGame } from "../../socket/api";
import { useGameSocket } from "../../socket/useGameSocket";
import { useGameStore } from "../../store/game";
import { CountdownScreen } from "./CountdownScreen";
import { FinalScreen } from "./FinalScreen";
import { GameScreen } from "./GameScreen";
import { HomeScreen } from "./HomeScreen";
import { LobbyScreen } from "./LobbyScreen";
import "./phases.css";

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
    screen = (
      <div className="frame">
        <TopBar />
        <main className="countdown">
          <p className="label">Getting you back into your team…</p>
        </main>
      </div>
    );
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
      {!connected && !restoring && session && <div className="offline">Connection lost — reconnecting…</div>}
    </>
  );
}
