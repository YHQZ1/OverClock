import type { ItemId, RoomView } from "@server/types/contracts.js";
import type { ReactNode } from "react";
import { TopBar } from "../../components/TopBar";
import { Button, Frame, Label, cx } from "../../components/ui";
import { ATTACK_INFO, DEFENCE_INFO, ITEM_INFO, UTILITY_INFO } from "../../game/items";
import { useShortcut } from "../../hooks/useShortcut";
import { continueBriefing } from "../../socket/api";
import { THEME_INFO, counterText, itemHint, wordsFor, type ThemeWords } from "../../themes/themes";

const ids = <T extends string>(info: Record<T, unknown>) => Object.keys(info) as T[];

/**
 * Before round 1: every shop item in this match's words, so first-timers know
 * what they're buying. Round 1 starts when everyone presses Continue (or the
 * timer runs out). Rounds 2–3 skip it — the shop keeps each one-line hint.
 */
export function BriefingScreen({ room, playerId }: { room: RoomView; playerId: string }) {
  const words = wordsFor(room.theme);
  const site = room.theme ? THEME_INFO[room.theme].name : "site";
  const done = room.briefed.includes(playerId);
  const go = () => {
    if (!done) void continueBriefing();
  };
  useShortcut("Enter", go);

  return (
    <Frame>
      <TopBar theme={room.theme} right={`${room.format ?? ""} · how to play`} />
      <main className="grid lg:min-h-0 lg:grid-rows-[auto_minmax(0,1fr)]">
        <div className="flex items-end justify-between gap-8 border-b border-line px-4 sm:px-6 lg:px-10 pt-[clamp(0.625rem,2.2vh,2rem)] pb-[clamp(0.5rem,1.6vh,1.25rem)]">
          <div className="min-w-0">
            <Label>Before round 1 · read this once</Label>
            <h1 className="mt-1 text-[clamp(1.625rem,4.4vh,2.875rem)] leading-tight font-semibold tracking-[-0.04em]">
              Serve {words.visitors} to earn coins. <span className="text-accent">Spend them wisely.</span>
            </h1>
            <p className="mt-1 text-[0.9375rem] text-muted">
              Defend your {site}, or flood theirs. Every attack has a counter — build it before it lands. Most {words.visitors} served over
              three rounds wins.
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[clamp(1.875rem,5.6vh,3rem)] leading-none font-semibold tabular-nums">{room.secondsLeft ?? 0}</p>
            <Label>starts automatically</Label>
          </div>
        </div>

        <div className="grid gap-px bg-line lg:min-h-0 lg:grid-cols-3">
          <Column title="Defend" keys="1–7" note="Build and keep · costs a little every second">
            {ids(DEFENCE_INFO).map((id) => (
              <Item key={id} id={id} words={words} />
            ))}
          </Column>
          <Column title="Attack" keys="A–L" note="Hits their site after a 3s warning">
            {ids(ATTACK_INFO).map((id) => (
              <Item key={id} id={id} words={words} counter={counterText(words, id)} />
            ))}
          </Column>
          <div className="flex flex-col bg-bg lg:min-h-0">
            <Column title="Boost" keys="Q–R" note="One-off · use any time">
              {ids(UTILITY_INFO).map((id) => (
                <Item key={id} id={id} words={words} />
              ))}
            </Column>
            <div className="mt-auto border-t border-line px-4 sm:px-6 lg:px-8 py-5">
              <ul className="grid gap-1.5 text-sm">
                {room.players
                  .filter((p) => p.slot !== null)
                  .map((p) => {
                    const ok = room.briefed.includes(p.id);
                    return (
                      <li key={p.id} className="flex items-center gap-2.5">
                        <span className={cx("size-2", ok ? "bg-ok" : "border border-line-strong")} aria-hidden />
                        <span className={ok ? "text-ink" : "text-muted"}>{p.name}</span>
                        <span className="text-faint">{ok ? "ready" : p.connected ? "reading…" : "away"}</span>
                      </li>
                    );
                  })}
              </ul>
              <Button variant={done ? "default" : "primary"} block className="mt-4" disabled={done} onClick={go}>
                {done ? "Waiting for the others…" : "Got it — continue"} {!done && <kbd>Enter</kbd>}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </Frame>
  );
}

function Column({ title, keys, note, children }: { title: string; keys: string; note: string; children: ReactNode }) {
  return (
    <section className="flex flex-col bg-bg lg:min-h-0">
      <div className="flex items-baseline justify-between border-b border-line px-4 sm:px-6 lg:px-8 py-2">
        <span className="text-[0.9375rem] font-semibold">
          {title} <span className="ml-1 text-xs font-normal text-faint">{keys}</span>
        </span>
        <span className="text-xs text-faint">{note}</span>
      </div>
      <ul className="min-h-0">{children}</ul>
    </section>
  );
}

function Item({ id, words, counter }: { id: ItemId; words: ThemeWords; counter?: string }) {
  return (
    <li className="flex items-start gap-3 border-b border-line px-4 sm:px-6 lg:px-8 py-[clamp(3px,0.5vh,0.5625rem)]">
      <kbd className="mt-0.5 shrink-0">{ITEM_INFO[id].key.toUpperCase()}</kbd>
      <span className="min-w-0">
        <span className="block truncate text-sm leading-[1.125rem] font-medium">{words.names[id]}</span>
        <span className="block truncate text-xs leading-[0.9375rem] text-muted">{itemHint(words, id)}</span>
        {counter && <span className="block truncate text-xs leading-[0.9375rem] text-accent">Beaten by: {counter}</span>}
      </span>
    </li>
  );
}
