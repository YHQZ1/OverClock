import type { RoomView, ThemeId } from "@server/types/contracts.js";
import { useSearchParams } from "react-router";
import { THEME_IDS, accentVars } from "../../themes/themes";
import { BriefingScreen } from "../play/BriefingScreen";

/** Dev only: /dev/briefing?theme=netflix — the briefing without playing a match. `&done=1` shows the waiting screen. */
export function BriefingPreview() {
  const [params] = useSearchParams();
  const asked = params.get("theme") as ThemeId | null;
  const theme: ThemeId = asked && THEME_IDS.includes(asked) ? asked : "bookmyshow";
  const room: RoomView = {
    code: "ABCD",
    phase: "briefing",
    format: "1v1",
    players: [
      { id: "p1", name: "Alpha", slot: 1, ready: true, connected: true },
      { id: "p2", name: "Bravo", slot: 3, ready: true, connected: true },
    ],
    teamNames: { 1: "Alpha", 2: "Bravo" },
    canStart: { ok: true, format: "1v1" },
    votes: {},
    theme,
    briefed: params.get("done") ? ["p1"] : [],
    round: 0,
    totalRounds: 3,
    secondsLeft: null,
    rounds: [],
    final: null,
  };
  return (
    <div className="contents" style={accentVars(theme)}>
      <BriefingScreen room={room} playerId="p1" />
    </div>
  );
}
