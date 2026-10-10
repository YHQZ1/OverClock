import type { PlayerView, RoomView, Side, Slot } from "@server/types/contracts.js";
import { useState, type FormEvent } from "react";
import { ClubFooter } from "../../components/ClubFooter";
import { Button, cx } from "../../components/ui";
import { StageHeader } from "../../components/StageHeader";
import { useShortcut, useShortcuts } from "../../hooks/useShortcut";
import { pickSlot, setReady, setTeamName } from "../../socket/api";

const TIPS = [
  { title: "Keep your site alive", text: "Every request you let in earns coins." },
  { title: "Flood theirs", text: "Attacks show a warning first — pick your moment." },
  { title: "Win 3 rounds", text: "Most people served wins. Defend, attack, or both." },
];

const sideOf = (slot: Slot): Side => (slot <= 2 ? 1 : 2);

/** GDSC's four colours: one per letter of the room code, and the numbers on the tips. Seats stay neutral. */
const GDSC = ["bg-gdsc-blue", "bg-gdsc-red", "bg-gdsc-yellow", "bg-gdsc-green"];
const GDSC_TEXT = ["text-gdsc-blue", "text-gdsc-red", "text-gdsc-yellow"];

type Props = { room: RoomView; playerId: string; onLeave: () => void };

export function RoomScreen({ room, playerId, onLeave }: Props) {
  const [error, setError] = useState<string | null>(null);
  const me = room.players.find((p) => p.id === playerId);
  const mySide = me?.slot ? sideOf(me.slot) : null;

  const run = async (request: Promise<string | null>) => setError(await request);
  const take = (slot: Slot) => void run(pickSlot(slot));
  const toggleReady = () => me && void run(setReady(!me.ready));
  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen().catch(() => {});
  };

  useShortcuts({ "1": () => take(1), "2": () => take(2), "3": () => take(3), "4": () => take(4) });
  useShortcut("r", toggleReady);
  useShortcut("f", toggleFullscreen);
  useShortcut("l", onLeave);

  return (
    <div className="grid h-full min-h-[37.5rem] grid-rows-[auto_minmax(0,1fr)_auto] bg-bg">
      <StageHeader title="The room" right={room.format ?? "waiting for players"} />

      <main className="grid min-h-0 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)]">
          {/* the code everyone types in */}
          <div className="flex flex-col gap-3 px-6 pt-[clamp(0.75rem,2.4vh,1.75rem)] pb-[clamp(0.75rem,2.4vh,1.75rem)] sm:flex-row sm:items-end sm:justify-between sm:px-8">
            <div>
              <span className="font-display text-[0.9375rem] font-bold tracking-[0.14em] text-ink/60 uppercase">Room code — share it with everyone playing</span>
              <div className="mt-2 flex gap-1.5" aria-label={`Room code ${room.code.split("").join(" ")}`}>
                {room.code.split("").map((ch, i) => (
                  <span
                    key={i}
                    className={cx("grid h-[clamp(4.25rem,12vh,6.5rem)] w-[clamp(3.5rem,9.5vh,5.25rem)] place-items-center font-display text-[clamp(3rem,9vh,5rem)] leading-none font-extrabold text-bg", GDSC[i % 4])}
                  >
                    {ch}
                  </span>
                ))}
              </div>
            </div>
            <p className="max-w-[30ch] text-sm text-ink/70 sm:text-right">
              Pick a slot (<kbd>1</kbd>–<kbd>4</kbd>), then press Ready. Two players = 1v1, four = 2v2.
            </p>
          </div>

          {/* the two sides */}
          <div className="relative grid min-h-0 sm:grid-cols-2">
            <Team side={1} room={room} playerId={playerId} mine={mySide === 1} onTake={take} />
            <Team side={2} room={room} playerId={playerId} mine={mySide === 2} onTake={take} />
            <span className="pointer-events-none absolute top-1/2 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 border-[3px] border-line-strong bg-bg px-3 py-0.5 font-display text-3xl font-extrabold uppercase sm:block">
              vs
            </span>
          </div>
        </section>

        <aside className="flex min-h-0 flex-col gap-5 px-6 py-5 sm:px-8">
          <div>
            <span className="font-display text-[0.9375rem] font-bold tracking-[0.14em] text-ink/60 uppercase">You</span>
            <p className="font-display text-[clamp(2.25rem,6vh,3.5rem)] leading-none font-extrabold uppercase">{me?.name}</p>
            <p className="mt-1 text-sm text-ink/70">{me?.slot ? `Slot ${me.slot} · ${room.teamNames[sideOf(me.slot)]}` : "Pick a slot to join a team"}</p>
          </div>

          <div className="min-h-0 flex-1 border-t-[3px] border-ink pt-4">
            <p className={cx("font-display text-[clamp(1.25rem,2.8vh,1.75rem)] leading-tight font-extrabold uppercase", room.canStart.ok ? "text-gdsc-green" : "text-ink")}>
              {room.canStart.ok ? `Everyone’s ready — ${room.canStart.format}!` : room.canStart.reason}
            </p>
            <ul className="mt-3 grid gap-1.5">
              {room.players.map((p) => (
                <li key={p.id} className="flex items-center gap-3 font-display text-xl font-bold tracking-[0.02em] uppercase">
                  <span className={cx("size-3.5 border-[3px]", p.ready ? "border-gdsc-green bg-gdsc-green" : "border-ink/50")} aria-hidden />
                  <span className={p.ready ? "text-ink" : "text-ink/60"}>{p.name}</span>
                  <span className="text-base text-ink/50">{p.ready ? "ready" : p.connected ? "not ready" : "reconnecting…"}</span>
                </li>
              ))}
            </ul>
            {error && <p className="mt-3 text-sm font-bold text-bad">× {error}</p>}

            <ol className="mt-5 grid gap-2 border-t-[3px] border-ink/25 pt-4">
              {TIPS.map((t, i) => (
                <li key={t.title} className="flex items-baseline gap-3">
                  <b className={cx("font-display text-2xl leading-none font-extrabold", GDSC_TEXT[i])}>0{i + 1}</b>
                  <span className="text-sm leading-snug text-ink/80">
                    <span className="font-display text-lg font-bold tracking-[0.02em] text-ink uppercase">{t.title}. </span>
                    {t.text}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="grid gap-3">
            <Button variant={me?.ready ? "default" : "primary"} block onClick={toggleReady} disabled={!me?.slot}>
              {me?.ready ? "Not ready" : "Ready"} <kbd>R</kbd>
            </Button>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={toggleFullscreen}>
                Fullscreen <kbd>F</kbd>
              </Button>
              <Button variant="ghost" onClick={onLeave}>
                Leave room <kbd>L</kbd>
              </Button>
            </div>
          </div>
        </aside>
      </main>
      <ClubFooter />
    </div>
  );
}

type TeamProps = { side: Side; room: RoomView; playerId: string; mine: boolean; onTake: (slot: Slot) => void };

/** One side: a flat block of colour — paper for team 1, a quiet dark panel for team 2 — with its two slots. */
function Team({ side, room, playerId, mine, onTake }: TeamProps) {
  const slots: Slot[] = side === 1 ? [1, 2] : [3, 4];
  return (
    <div className={cx("flex min-w-0 flex-col justify-center px-6 py-5 sm:px-8", side === 1 ? "bg-paper text-bg" : "bg-night-2 text-ink")}>
      <TeamName side={side} name={room.teamNames[side]} editable={mine} />
      <div className="mt-[2vh] grid gap-[1.6vh]">
        {slots.map((slot) => (
          <SlotCard key={slot} slot={slot} player={room.players.find((p) => p.slot === slot)} you={playerId} onTake={onTake} />
        ))}
      </div>
    </div>
  );
}

function TeamName({ side, name, editable }: { side: Side; name: string; editable: boolean }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed && trimmed !== name) await setTeamName(trimmed);
    setEditing(false);
  };

  if (editing) {
    return (
      <form onSubmit={save}>
        <input
          autoFocus
          value={value}
          maxLength={20}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
          className="w-full border-0 border-b-4 border-current bg-transparent pb-1 font-display text-[clamp(2rem,5.4vh,3.25rem)] leading-none font-extrabold uppercase outline-none"
        />
      </form>
    );
  }
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <span className="font-display text-[0.9375rem] font-bold tracking-[0.16em] uppercase opacity-70">Team {side}</span>
        <h2 className="truncate font-display text-[clamp(2rem,5.4vh,3.25rem)] leading-none font-extrabold uppercase">{name}</h2>
      </div>
      {editable && (
        <button
          type="button"
          className="mt-1 shrink-0 cursor-pointer font-display text-base font-bold tracking-[0.1em] uppercase opacity-70 hover:opacity-100"
          onClick={() => (setValue(name), setEditing(true))}
        >
          Rename
        </button>
      )}
    </div>
  );
}

function SlotCard({ slot, player, you, onTake }: { slot: Slot; player?: PlayerView; you: string; onTake: (slot: Slot) => void }) {
  if (!player) {
    return (
      <button
        type="button"
        onClick={() => onTake(slot)}
        className="flex h-[clamp(4.5rem,13vh,7.5rem)] cursor-pointer items-center justify-between border-[3px] border-dashed border-current/60 px-4 text-left font-display text-2xl font-bold tracking-[0.02em] uppercase opacity-80 transition-opacity hover:opacity-100"
      >
        <span>Take slot {slot}</span>
        <kbd>{slot}</kbd>
      </button>
    );
  }
  const isYou = player.id === you;
  return (
    <div className={cx("flex h-[clamp(4.5rem,13vh,7.5rem)] items-center gap-4 border-[3px] border-current px-4", isYou ? "bg-black/20" : "bg-black/10", !player.connected && "opacity-50")}>
      <span className={cx("grid size-[clamp(2.5rem,6.4vh,3.75rem)] place-items-center font-display text-[clamp(1.25rem,3vh,1.875rem)] font-extrabold", sideOf(slot) === 1 ? "bg-bg text-ink" : "bg-ink text-bg")}>{player.name.charAt(0).toUpperCase()}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-[clamp(1.625rem,3.6vh,2.5rem)] leading-none font-extrabold uppercase">
          {player.name}
          {isYou && <span className="ml-2 text-base font-bold opacity-70">you</span>}
        </p>
        <p className="font-display text-sm font-bold tracking-[0.1em] uppercase opacity-70">Slot {slot}</p>
      </div>
      <span className="flex items-center gap-2 font-display text-lg font-extrabold tracking-[0.06em] uppercase">
        <span className={cx("size-3.5 border-[3px] border-current", player.ready && "bg-current")} aria-hidden />
        {player.ready ? "Ready" : player.connected ? "Not ready" : "Away"}
      </span>
    </div>
  );
}
