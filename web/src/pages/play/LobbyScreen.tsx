import type { SessionView } from "@server/types/contracts.js";
import { useState, type ReactNode } from "react";
import { TopBar } from "../../components/TopBar";
import { Button, Frame, Label, SPLIT, cx } from "../../components/ui";
import { useShortcut } from "../../hooks/useShortcut";
import { MAX_PLAYERS } from "./constants";

const HOW_TO_PLAY = [
  { title: "Keep everyone happy", text: "Health drops when people can’t get in. Don’t let it hit zero." },
  { title: "Fix what breaks", text: "An alert tells you what’s wrong. Press the button that fixes it." },
  { title: "Don’t waste money", text: "Idle servers still cost you. Leftover budget becomes points." },
];

type Props = {
  session: SessionView;
  playerId: string;
  onLeave: () => void;
  /** Resolves to an error message, or null once the game is starting. */
  onStart: () => Promise<string | null>;
};

export function LobbyScreen({ session, playerId, onLeave, onStart }: Props) {
  const [startError, setStartError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const isHost = session.players.some((p) => p.id === playerId && p.isHost);
  const emptySlots = MAX_PLAYERS - session.players.length;

  const start = async () => {
    if (starting) return;
    setStarting(true);
    setStartError(await onStart());
    setStarting(false);
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen().catch(() => {});
  };

  useShortcut("f", toggleFullscreen);
  useShortcut("l", onLeave);
  useShortcut("s", () => void start(), { enabled: isHost });

  return (
    <Frame>
      <TopBar right="Lobby" />

      <main className={SPLIT}>
        <section className="flex flex-col">
          <div className="px-10 pt-[clamp(24px,5vh,56px)] pb-7">
            <h1 className="mb-[clamp(16px,4vh,40px)] text-[clamp(40px,7vh,72px)] leading-none font-semibold tracking-[-0.045em]">
              {session.teamName}
            </h1>
            <Label>Team code</Label>
            <div className="mt-2.5 mb-[18px] flex" aria-label={`Team code ${session.code.split("").join(" ")}`}>
              {session.code.split("").map((ch, i) => (
                <span
                  key={i}
                  className="grid h-[clamp(92px,15vh,160px)] w-[clamp(80px,13vh,136px)] place-items-center border border-line-strong text-[clamp(52px,9vh,96px)] font-semibold tracking-[-0.04em] not-first:border-l-0"
                >
                  {ch}
                </span>
              ))}
            </div>
            <p className="max-w-[44ch] text-base text-muted">
              Teammates: open Overclock on your PC, choose <strong className="font-medium text-ink">Join a team</strong>{" "}
              and type this code.
            </p>
          </div>

          <div className="mt-auto border-t border-line">
            <h2 className="px-10 pt-[18px] text-[13px] font-medium text-muted">How to play</h2>
            <ol className="grid grid-cols-3">
              {HOW_TO_PLAY.map((h, i) => (
                <li key={h.title} className="py-2.5 pr-7 pb-[22px] pl-10 not-first:border-l not-first:border-line not-first:pl-7">
                  <h3 className="mb-1.5 flex gap-2.5 text-[15px] font-semibold tracking-[-0.01em]">
                    <span className="text-accent">{i + 1}</span>
                    {h.title}
                  </h3>
                  <p className="text-sm text-muted">{h.text}</p>
                </li>
              ))}
            </ol>
          </div>

          <div className="flex gap-1 border-t border-line px-7 py-4">
            <Button variant="ghost" onClick={toggleFullscreen}>
              <kbd>F</kbd> Go fullscreen
            </Button>
            <Button variant="ghost" onClick={onLeave}>
              <kbd>L</kbd> Leave team
            </Button>
          </div>
        </section>

        <section className="flex flex-col border-l border-line">
          <div className="border-b border-line px-8 py-6">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-lg font-semibold tracking-[-0.02em]">Players</h2>
              <Label>
                {session.players.length} of {MAX_PLAYERS}
              </Label>
            </div>
            <ul className="grid border-t border-line">
              {session.players.map((p) => (
                <PlayerRow key={p.id} mark={p.name.charAt(0).toUpperCase()} dim={!p.connected}>
                  <span className="flex-1 font-medium">
                    {p.name}
                    {p.id === playerId && <span className="font-normal text-faint"> (you)</span>}
                    {!p.connected && <span className="font-normal text-faint"> · reconnecting…</span>}
                  </span>
                  {p.isHost && <span className="text-[13px] font-medium text-accent">Host</span>}
                </PlayerRow>
              ))}
              {Array.from({ length: emptySlots }, (_, i) => (
                <PlayerRow key={`empty-${i}`} empty>
                  <span className="flex-1 text-faint">Waiting for a teammate…</span>
                </PlayerRow>
              ))}
            </ul>
          </div>

          {/* Theme picker returns once the themes are decided (GAME.md → Themes). */}

          <div className="mt-auto px-8 pt-6 pb-7">
            {isHost ? (
              <>
                <Button variant="primary" block disabled={starting} onClick={() => void start()}>
                  {starting ? "Starting…" : "Start game"} <kbd>S</kbd>
                </Button>
                {startError && <p className="mt-2.5 text-[13px] text-bad">{startError}</p>}
              </>
            ) : (
              <p className="flex items-center gap-2.5 text-muted">
                <span className="size-2 animate-fade-pulse bg-accent" aria-hidden /> Waiting for the host to start…
              </p>
            )}
          </div>
        </section>
      </main>
    </Frame>
  );
}

type PlayerRowProps = { mark?: string; empty?: boolean; dim?: boolean; children: ReactNode };

function PlayerRow({ mark, empty = false, dim = false, children }: PlayerRowProps) {
  return (
    <li className="flex h-11 items-center gap-3 border-b border-line px-1">
      <span
        className={cx(
          "grid size-6 place-items-center border border-line-strong text-xs font-semibold",
          empty && "border-dashed",
          dim && "opacity-40",
        )}
      >
        {mark}
      </span>
      {children}
    </li>
  );
}
