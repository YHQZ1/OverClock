import type { RoomView, ThemeId } from "@server/types/contracts.js";
import { useEffect } from "react";
import { useSearchParams } from "react-router";
import { useGameStore } from "../../store/game";
import { THEME_IDS, accentVars } from "../../themes/themes";
import { RevealScreen } from "../play/RevealScreen";

/** Dev only: /dev/reveal?theme=gpay — "What you actually built" with a made-up match, no game needed. */
export function RevealPreview() {
  const [params] = useSearchParams();
  const asked = params.get("theme") as ThemeId | null;
  const theme: ThemeId = asked && THEME_IDS.includes(asked) ? asked : "bookmyshow";
  useEffect(() => {
    useGameStore.setState({ usage: { used: ["server", "bouncer", "shield", "bots", "wrongTurn"], hitBy: ["surge", "destroy"] } });
  }, []);
  const room: RoomView = {
    code: "ABCD",
    phase: "final",
    format: "1v1",
    players: [{ id: "p1", name: "Alpha", slot: 1, ready: true, connected: true }],
    teamNames: { 1: "Alpha", 2: "Bravo" },
    canStart: { ok: true, format: "1v1" },
    votes: {},
    theme,
    briefed: [],
    round: 3,
    totalRounds: 3,
    secondsLeft: null,
    rounds: [],
    final: null,
  };
  return (
    <div className="contents" style={accentVars(theme)}>
      <RevealScreen room={room} onDone={async () => {}} />
    </div>
  );
}
