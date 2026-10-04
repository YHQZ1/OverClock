import type { PlayerView, RoomView, Side, Slot } from "@server/types/contracts.js";
import { useState, type FormEvent } from "react";
import { TopBar } from "../../components/TopBar";
import { Button, Frame, Label, SPLIT, cx } from "../../components/ui";
import { useShortcut, useShortcuts } from "../../hooks/useShortcut";
import { pickSlot, setReady, setTeamName } from "../../socket/api";

const HOW_TO_PLAY = [
  { title: "Keep your site alive", text: "Every visitor you let in earns coins. The red part of the map is what’s struggling." },
  { title: "Flood theirs", text: "Spend coins on attacks — they get a warning, so pick your moment." },
  { title: "Win 3 rounds", text: "Most visitors served wins. Defend, attack, or both — your call, any time." },
];

const sideOf = (slot: Slot): Side => (slot <= 2 ? 1 : 2);

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
    <Frame>
      <TopBar right="Room" />

      <main className={SPLIT}>
        <section className="flex min-w-0 flex-col">
          <div className="flex items-end justify-between gap-6 px-10 pt-[clamp(20px,4vh,40px)] pb-6">
            <div>
              <Label>Room code — share it with everyone playing</Label>
              <div className="mt-2 flex" aria-label={`Room code ${room.code.split("").join(" ")}`}>
                {room.code.split("").map((ch, i) => (
                  <span
                    key={i}
                    className="grid h-[clamp(64px,11vh,96px)] w-[clamp(56px,9.5vh,84px)] place-items-center border border-line-strong text-[clamp(38px,7vh,60px)] font-semibold tracking-[-0.04em] not-first:border-l-0"
                  >
                    {ch}
                  </span>
                ))}
              </div>
            </div>
            <p className="max-w-[30ch] pb-1 text-right text-sm text-muted">
              Pick a slot (<kbd>1</kbd>–<kbd>4</kbd>), then press Ready. Two players = 1v1, four = 2v2.
            </p>
          </div>

          <div className="grid flex-1 grid-cols-[1fr_auto_1fr] border-t border-line">
            <Team side={1} room={room} playerId={playerId} mine={mySide === 1} onTake={take} />
            <div className="grid place-items-center border-x border-line px-5 text-sm font-semibold text-faint">vs</div>
            <Team side={2} room={room} playerId={playerId} mine={mySide === 2} onTake={take} />
          </div>

          <div className="border-t border-line">
            <ol className="grid grid-cols-3">
              {HOW_TO_PLAY.map((h, i) => (
                <li key={h.title} className="py-4 pr-7 pl-10 not-first:border-l not-first:border-line not-first:pl-7">
                  <h3 className="mb-1 flex gap-2.5 text-[15px] font-semibold tracking-[-0.01em]">
                    <span className="text-accent">{i + 1}</span>
                    {h.title}
                  </h3>
                  <p className="text-sm text-muted">{h.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <aside className="flex flex-col border-l border-line">
          <div className="border-b border-line px-8 py-6">
            <Label>You</Label>
            <p className="mt-1 text-2xl font-semibold tracking-[-0.03em]">{me?.name}</p>
            <p className="mt-1 text-sm text-muted">
              {me?.slot ? `Slot ${me.slot} · ${room.teamNames[sideOf(me.slot)]}` : "Pick a slot to join a team"}
            </p>
          </div>

          <div className="flex-1 px-8 py-6">
            <Label>Starting</Label>
            <p className={cx("mt-2 text-[15px]", room.canStart.ok ? "text-ok" : "text-ink")}>
              {room.canStart.ok ? `Everyone’s ready — ${room.canStart.format}!` : room.canStart.reason}
            </p>
            <ul className="mt-4 grid gap-1.5 text-sm">
              {room.players.map((p) => (
                <li key={p.id} className="flex items-center gap-2.5">
                  <span className={cx("size-2", p.ready ? "bg-ok" : "border border-line-strong")} aria-hidden />
                  <span className={p.ready ? "text-ink" : "text-muted"}>{p.name}</span>
                  <span className="text-faint">{p.ready ? "ready" : p.connected ? "not ready" : "reconnecting…"}</span>
                </li>
              ))}
            </ul>
            {error && <p className="mt-4 text-[13px] text-bad">{error}</p>}
          </div>

          <div className="grid gap-3 px-8 pt-2 pb-7">
            <Button variant={me?.ready ? "default" : "primary"} block onClick={toggleReady} disabled={!me?.slot}>
              {me?.ready ? "Not ready" : "Ready"} <kbd>R</kbd>
            </Button>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={toggleFullscreen}>
                <kbd>F</kbd> Fullscreen
              </Button>
              <Button variant="ghost" onClick={onLeave}>
                <kbd>L</kbd> Leave room
              </Button>
            </div>
          </div>
        </aside>
      </main>
    </Frame>
  );
}

type TeamProps = { side: Side; room: RoomView; playerId: string; mine: boolean; onTake: (slot: Slot) => void };

function Team({ side, room, playerId, mine, onTake }: TeamProps) {
  const slots: Slot[] = side === 1 ? [1, 2] : [3, 4];
  return (
    <div className="flex min-w-0 flex-col px-8 py-6">
      <TeamName side={side} name={room.teamNames[side]} editable={mine} />
      <div className="mt-4 grid gap-3">
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
      <form onSubmit={save} className="flex gap-2">
        <input
          autoFocus
          value={value}
          maxLength={20}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
          className="h-10 min-w-0 flex-1 border border-accent bg-bg px-3 text-lg font-semibold outline-none"
        />
      </form>
    );
  }
  return (
    <div className="flex items-baseline justify-between gap-3">
      <div className="min-w-0">
        <Label>Team {side}</Label>
        <h2 className="truncate text-2xl font-semibold tracking-[-0.03em]">{name}</h2>
      </div>
      {editable && (
        <button
          type="button"
          className="shrink-0 cursor-pointer text-[13px] text-muted hover:text-ink"
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
        className="flex h-[68px] cursor-pointer items-center justify-between border border-dashed border-line-strong px-4 text-left text-muted transition-colors hover:border-accent hover:text-ink"
      >
        <span>Take slot {slot}</span>
        <kbd>{slot}</kbd>
      </button>
    );
  }
  const isYou = player.id === you;
  return (
    <div className={cx("flex h-[68px] items-center gap-3 border px-4", isYou ? "border-accent" : "border-line-strong", !player.connected && "opacity-50")}>
      <span className="grid size-8 place-items-center border border-line-strong text-sm font-semibold">{player.name.charAt(0).toUpperCase()}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {player.name}
          {isYou && <span className="font-normal text-faint"> (you)</span>}
        </p>
        <p className="text-xs text-faint">Slot {slot}</p>
      </div>
      <span className={cx("text-[13px] font-medium", player.ready ? "text-ok" : "text-faint")}>
        {player.ready ? "Ready" : player.connected ? "Not ready" : "Away"}
      </span>
    </div>
  );
}
