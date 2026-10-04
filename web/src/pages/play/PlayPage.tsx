import type { Side } from "@server/types/contracts.js";
import { useSoundEffects } from "../../audio/useSoundEffects";
import { createRoom, joinRoom, leaveRoom } from "../../socket/api";
import { useGameSocket } from "../../socket/useGameSocket";
import { useGameStore } from "../../store/game";
import { FinalScreen } from "./FinalScreen";
import { GameScreen } from "./GameScreen";
import { HomeScreen } from "./HomeScreen";
import { MessageScreen } from "./MessageScreen";
import { RoomScreen } from "./RoomScreen";
import { RoundResultScreen } from "./RoundResultScreen";
import { VoteScreen } from "./VoteScreen";

/** Renders the screen for the room's current phase — the server decides which. */
export function PlayPage() {
  useGameSocket();
  useSoundEffects();
  const room = useGameStore((s) => s.room);
  const playerId = useGameStore((s) => s.playerId);
  const match = useGameStore((s) => s.match);
  const connected = useGameStore((s) => s.connected);
  const restoring = useGameStore((s) => s.restoring);

  const slot = room?.players.find((p) => p.id === playerId)?.slot ?? null;
  const mySide: Side | null = slot === null ? null : slot <= 2 ? 1 : 2;

  let screen;
  if (restoring) {
    screen = <MessageScreen message="Getting you back into your room…" />;
  } else if (!room || !playerId) {
    screen = <HomeScreen onCreate={createRoom} onJoin={joinRoom} />;
  } else {
    switch (room.phase) {
      case "room":
        screen = <RoomScreen room={room} playerId={playerId} onLeave={() => void leaveRoom()} />;
        break;
      case "vote":
        screen = <VoteScreen room={room} playerId={playerId} />;
        break;
      case "buy":
      case "live":
        screen = <GameScreen room={room} match={match && match.round === room.round ? match : null} />;
        break;
      case "roundResult":
        screen = <RoundResultScreen room={room} mySide={mySide} />;
        break;
      case "final":
        screen = <FinalScreen room={room} mySide={mySide} onDone={leaveRoom} />;
        break;
    }
  }

  return (
    <>
      {screen}
      {!connected && !restoring && room && (
        <div className="fixed inset-x-0 top-0 z-10 border-b border-bad bg-bg px-10 py-2.5 text-sm font-medium text-bad">
          Connection lost — reconnecting…
        </div>
      )}
    </>
  );
}
