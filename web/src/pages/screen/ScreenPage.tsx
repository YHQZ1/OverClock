import { TopBar } from "../../components/TopBar";

// Big screen (leaderboard, now playing) — Milestone 9.
export function ScreenPage() {
  return (
    <div className="frame">
      <TopBar right="Big screen" />
      <main style={{ display: "grid", placeItems: "center" }}>
        <p className="label">Leaderboard coming soon</p>
      </main>
    </div>
  );
}
