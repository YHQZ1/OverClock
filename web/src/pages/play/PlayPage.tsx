import type { RoomView, Side } from "@server/types/contracts.js";
import { useCallback, useState } from "react";
import { useSoundEffects } from "../../audio/useSoundEffects";
import { useTitle } from "../../hooks/useTitle";
import { THEME_INFO } from "../../themes/themes";
import { createRoom, joinRoom, leaveRoom } from "../../socket/api";
import { useGameSocket } from "../../socket/useGameSocket";
import { useGameStore } from "../../store/game";
import { BriefingScreen } from "./BriefingScreen";
import { FinalScreen } from "./FinalScreen";
import { GameScreen } from "./GameScreen";
import { HomeScreen } from "./HomeScreen";
import { MessageScreen } from "./MessageScreen";
import { RoomScreen } from "./RoomScreen";
import { RoundResultScreen } from "./RoundResultScreen";
import { RevealScreen } from "./RevealScreen";
import { ThemePickScreen } from "./ThemePickScreen";
import { VoteScreen } from "./VoteScreen";
import { accentVars } from "../../themes/themes";

/** Renders the screen for the room's current phase — the server decides which. */
export function PlayPage() {
  useGameSocket();
  useSoundEffects();
  const room = useGameStore((s) => s.room);
  const playerId = useGameStore((s) => s.playerId);
  const match = useGameStore((s) => s.match);
  const connected = useGameStore((s) => s.connected);
  const restoring = useGameStore((s) => s.restoring);

  // After the final, the reveal — per match, so the next match starts on its final again.
  const [revealed, setRevealed] = useState<string | null>(null);
  const matchId = room?.phase === "final" ? (room.final?.matchId ?? null) : null;
  const showReveal = matchId !== null && revealed === matchId;
  const toReveal = useCallback(() => setRevealed(matchId), [matchId]);

  useTitle(restoring || !room || !playerId ? null : showReveal ? "What you actually built" : tabTitle(room));

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
      case "themePick":
        screen = <ThemePickScreen room={room} />;
        break;
      case "briefing":
        screen = <BriefingScreen room={room} playerId={playerId} />;
        break;
      case "buy":
      case "live":
        screen = <GameScreen room={room} match={match && match.round === room.round ? match : null} />;
        break;
      case "roundResult":
        screen = <RoundResultScreen room={room} mySide={mySide} />;
        break;
      case "final":
        screen = showReveal ? (
          <RevealScreen room={room} onDone={leaveRoom} />
        ) : (
          <FinalScreen room={room} mySide={mySide} onNext={toReveal} />
        );
        break;
    }
  }

  // Once the vote has picked a world, its colour replaces the neutral accent.
  const themed = room?.theme && room.phase !== "room" && room.phase !== "vote" ? accentVars(room.theme) : undefined;

  return (
    <>
      <div className="contents" style={themed}>
        {screen}
      </div>
      {!connected && !restoring && room && (
        <div className="fixed inset-x-0 top-0 z-10 border-b border-bad bg-bg px-4 sm:px-6 lg:px-10 py-2.5 text-sm font-medium text-bad">
          Connection lost — reconnecting…
        </div>
      )}
    </>
  );
}

/** What the browser tab says for each screen. */
function tabTitle(room: RoomView): string {
  const site = room.theme ? THEME_INFO[room.theme].name : null;
  switch (room.phase) {
    case "room":
      return `Room ${room.code}`;
    case "vote":
      return "Pick the app";
    case "themePick":
      return site ? `${site} it is!` : "Theme picked";
    case "briefing":
      return site ? `How to play ${site}` : "How to play";
    case "buy":
    case "live":
      return [`Round ${room.round}`, site].filter(Boolean).join(" · ");
    case "roundResult":
      return `Round ${room.round} result`;
    case "final":
      return "Match over";
  }
}
