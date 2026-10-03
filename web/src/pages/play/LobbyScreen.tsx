import { useState } from "react";
import { TopBar } from "../../components/TopBar";
import { useShortcut } from "../../hooks/useShortcut";
import { MAX_PLAYERS, type MockSession } from "./mockSession";
import "./lobby.css";

const HOW_TO_PLAY = [
  { title: "Keep everyone happy", text: "Health drops when people can’t get in. Don’t let it hit zero." },
  { title: "Fix what breaks", text: "An alert tells you what’s wrong. Press the button that fixes it." },
  { title: "Don’t waste money", text: "Idle servers still cost you. Leftover budget becomes points." },
];

type Props = {
  session: MockSession;
  onLeave: () => void;
};

export function LobbyScreen({ session, onLeave }: Props) {
  const [startNote, setStartNote] = useState(false);
  const you = session.players.find((p) => p.isYou);
  const isHost = you?.isHost ?? false;
  const emptySlots = MAX_PLAYERS - session.players.length;

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen().catch(() => {});
  };

  useShortcut("f", toggleFullscreen);
  useShortcut("l", onLeave);
  useShortcut("s", () => setStartNote(true), { enabled: isHost });

  return (
    <div className="frame">
      <TopBar right="Lobby" />

      <main className="lobby">
        <section className="lobby__main">
          <div className="lobby__code">
            <h1 className="lobby__team">{session.teamName}</h1>
            <p className="label">Team code</p>
            <div className="code" aria-label={`Team code ${session.code.split("").join(" ")}`}>
              {session.code.split("").map((ch, i) => (
                <span key={i} className="code__char">
                  {ch}
                </span>
              ))}
            </div>
            <p className="lobby__hint">
              Teammates: open Overclock on your PC, choose <strong>Join a team</strong> and type this code.
            </p>
          </div>

          <div className="lobby__how">
            <h2 className="lobby__how-title">How to play</h2>
            <ol className="how">
              {HOW_TO_PLAY.map((h) => (
                <li key={h.title} className="how__item">
                  <h3 className="how__title">{h.title}</h3>
                  <p className="how__text">{h.text}</p>
                </li>
              ))}
            </ol>
          </div>

          <div className="lobby__tools">
            <button type="button" className="btn btn--ghost" onClick={toggleFullscreen}>
              <kbd>F</kbd> Go fullscreen
            </button>
            <button type="button" className="btn btn--ghost" onClick={onLeave}>
              <kbd>L</kbd> Leave team
            </button>
          </div>
        </section>

        <section className="lobby__side">
          <div className="block">
            <div className="block__head">
              <h2 className="block__title">Players</h2>
              <span className="label">
                {session.players.length} of {MAX_PLAYERS}
              </span>
            </div>
            <ul className="rows">
              {session.players.map((p) => (
                <li key={p.name} className="row">
                  <span className="row__mark">{p.name.charAt(0).toUpperCase()}</span>
                  <span className="row__text">
                    {p.name}
                    {p.isYou && <span className="row__muted"> (you)</span>}
                  </span>
                  {p.isHost && <span className="row__meta">Host</span>}
                </li>
              ))}
              {Array.from({ length: emptySlots }, (_, i) => (
                <li key={`empty-${i}`} className="row row--empty">
                  <span className="row__mark" />
                  <span className="row__text">Waiting for a teammate…</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Theme picker returns once the themes are decided (GAME.md → Themes). */}

          <div className="lobby__start">
            {isHost ? (
              <>
                <button type="button" className="btn btn--primary btn--block" onClick={() => setStartNote(true)}>
                  Start game <kbd>S</kbd>
                </button>
                {startNote && <p className="lobby__note">The game isn’t connected yet — coming soon.</p>}
              </>
            ) : (
              <p className="lobby__waiting">
                <span className="pulse" aria-hidden /> Waiting for the host to start…
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
