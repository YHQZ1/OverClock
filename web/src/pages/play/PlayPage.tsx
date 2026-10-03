import { useState } from "react";
import { HomeScreen } from "./HomeScreen";
import { LobbyScreen } from "./LobbyScreen";
import { mockCreate, mockJoin, type MockSession } from "./mockSession";

// Renders one screen per session phase. For now the phase is local mock
// state; Milestone 2 replaces it with session:state from the server.
export function PlayPage() {
  const [session, setSession] = useState<MockSession | null>(null);

  if (!session) {
    return (
      <HomeScreen
        onCreate={(team, player) => setSession(mockCreate(team, player))}
        onJoin={(code, player) => setSession(mockJoin(code, player))}
      />
    );
  }
  return <LobbyScreen session={session} onLeave={() => setSession(null)} />;
}
