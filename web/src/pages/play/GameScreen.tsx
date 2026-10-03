import type { MatchView, PartStatus } from "@server/types/contracts.js";
import { TopBar } from "../../components/TopBar";
import { useShortcut } from "../../hooks/useShortcut";
import { sendAction } from "../../socket/api";
import "./game.css";

// Basic live screen for Milestone 2: proves the shared match works end to end.
// Milestone 3 turns this into the real game screen (map, alerts rhythm, juice).

const clock = (sec: number) => {
  const s = Math.ceil(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const healthLevel = (h: number): PartStatus => (h >= 60 ? "ok" : h >= 25 ? "strained" : "failing");

function Alert({ match }: { match: MatchView }) {
  if (match.downSecondsLeft !== null) return <div className="alert alert--failing">Site is down — back in {match.downSecondsLeft}s</div>;
  if (match.critical) return <div className="alert alert--failing">Health critical — act now!</div>;
  if (match.rush) return <div className="alert alert--strained">Too many people!</div>;
  return <div className="alert">All calm</div>;
}

export function GameScreen({ match }: { match: MatchView | null }) {
  const down = match?.downSecondsLeft != null;
  const add = () => !down && sendAction("addServer");
  const remove = () => !down && sendAction("removeServer");
  useShortcut("2", add);
  useShortcut("1", remove);

  if (!match) {
    return (
      <div className="frame">
        <TopBar right="Round 1" />
        <main className="countdown">
          <p className="label">Loading the round…</p>
        </main>
      </div>
    );
  }

  const busy = match.servers.filter((s) => s.state === "busy").length;
  const idle = match.servers.filter((s) => s.state === "idle").length;
  const booting = match.servers.length - busy - idle;

  return (
    <div className="frame">
      <TopBar right={`Round 1 · ${clock(match.timeLeftSec)}`} />

      <main className={`game${down ? " is-down" : ""}`}>
        <section className="game__stage">
          <Alert match={match} />

          <div className="stats">
            <div className="stat">
              <span className="label">Health</span>
              <span className="stat__value">{match.health}</span>
              <div className={`meter meter--${healthLevel(match.health)}`}>
                <span style={{ width: `${match.health}%` }} />
              </div>
            </div>
            <div className="stat">
              <span className="label">Budget</span>
              <span className={`stat__value${match.budget < 0 ? " is-negative" : ""}`}>
                {match.budget.toLocaleString()}
              </span>
              <span className="stat__sub">−{match.spendPerSec}/s</span>
            </div>
            <div className="stat">
              <span className="label">Score</span>
              <span className="stat__value">{match.score.toLocaleString()}</span>
              <span className="stat__sub">
                {match.served.toLocaleString()} served · {match.lost.toLocaleString()} turned away
              </span>
            </div>
          </div>

          <div className="rack">
            <div className="rack__head">
              <span className={`dot dot--${match.serversStatus}`} aria-hidden />
              <h2 className="rack__title">Servers</h2>
              <span className="label">
                {busy} busy · {idle} idle{booting > 0 ? ` · ${booting} starting` : ""}
              </span>
            </div>
            <ul className="rack__slots">
              {match.servers.map((s) => (
                <li key={s.id} className={`slot slot--${s.state}`} title={s.state}>
                  {s.state === "booting" && <span className="slot__boot" style={{ height: `${s.bootProgress * 100}%` }} />}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <aside className="game__controls">
          <button type="button" className="control control--primary" disabled={down || match.budget <= 0} onClick={add}>
            <span className="control__cooldown" style={{ width: `${match.addCooldown * 100}%` }} />
            <span className="control__label">+ Servers</span>
            <kbd>2</kbd>
          </button>
          <button type="button" className="control" disabled={down || match.servers.length <= 1} onClick={remove}>
            <span className="control__label">– Server</span>
            <kbd>1</kbd>
          </button>
          <p className="game__hint">
            Add servers when people are being turned away. Remove idle ones — they still cost money.
          </p>
        </aside>

        {down && (
          <div className="down" role="alert">
            <p className="down__title">Site is down</p>
            <p className="down__sub">Rebooting in {match.downSecondsLeft}s…</p>
          </div>
        )}
      </main>
    </div>
  );
}
