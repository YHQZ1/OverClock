import type { ItemId, RoomView } from "@server/types/contracts.js";
import { useState, type CSSProperties, type ReactNode } from "react";
import { SoundToggle } from "../../audio/SoundToggle";
import { Button, cx } from "../../components/ui";
import { KIND_STYLE, kindOf, stopsAttacks } from "../../game/arena/kinds";
import { ItemIcon } from "../../game/icons";
import { ATTACK_INFO, DEFENCE_INFO, ITEM_INFO, UTILITY_INFO } from "../../game/items";
import { useShortcuts } from "../../hooks/useShortcut";
import { continueBriefing } from "../../socket/api";
import { THEME_INFO, capitalise, itemHint, posterVars, wordsFor, type ThemeWords } from "../../themes/themes";
import { DemoPlayer } from "./DemoPlayer";

/*
 * Before round 1, in five steps, each player at their own pace:
 *   How to play → Attacks → Defences → Boosts → Watch a match
 * It stays in the app's colour from the "it is!" moment on. No visible timer
 * (reading shouldn't feel like a race); the server only keeps a hidden cap so
 * one absent player can't hold the room. Enter = next, Backspace = back.
 *
 * The card walls use the same colours as the real cards in the hand, so what
 * players learn here is exactly what they'll press.
 */

const STEPS = [
  { id: "how", title: "How to play" },
  { id: "attacks", title: "Attacks" },
  { id: "defences", title: "Defences" },
  { id: "boosts", title: "Boosts" },
  { id: "demo", title: "Watch a match" },
] as const;

const ids = <T extends string>(info: Record<T, unknown>) => Object.keys(info) as T[];

export function BriefingScreen({ room, playerId }: { room: RoomView; playerId: string }) {
  const words = wordsFor(room.theme);
  const [step, setStep] = useState(0);
  const done = room.briefed.includes(playerId);
  const last = step === STEPS.length - 1;

  const next = () => {
    if (done) return;
    if (last) void continueBriefing();
    else setStep((s) => s + 1);
  };
  const back = () => setStep((s) => Math.max(0, s - 1));
  useShortcuts({ Enter: next, ArrowRight: next, Backspace: back, ArrowLeft: back }, { enabled: !done });

  if (done) return <Waiting room={room} playerId={playerId} />;

  return (
    <div className="grid h-full min-h-[37.5rem] grid-rows-[auto_minmax(0,1fr)_auto] bg-bg">
      <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-6 px-6 py-3 sm:px-8">
        <div className="flex items-center gap-3 font-display text-xl font-extrabold tracking-[0.06em] uppercase">
          <span className="size-3.5 bg-accent" aria-hidden />
          Overclock
        </div>
        <h1 className="font-display text-[clamp(1.75rem,3.8vh,2.5rem)] leading-none font-extrabold tracking-[0.01em] uppercase">{STEPS[step]!.title}</h1>
        <div className="flex items-center justify-end gap-5">
          <span className="font-display text-base font-bold tracking-[0.14em] text-ink/60 uppercase">
            Step {step + 1} of {STEPS.length}
          </span>
          <SoundToggle />
        </div>
      </header>

      <main className="relative min-h-0 overflow-hidden">
        {step === 0 && <HowToPlay room={room} words={words} />}
        {step === 1 && <CardWall footerRows={2} ids={ids(ATTACK_INFO)} words={words} footer={(id) => <Chips label="Beaten by" ids={ATTACK_INFO[id as keyof typeof ATTACK_INFO].counter} words={words} />} />}
        {step === 2 && <CardWall footerRows={1} ids={ids(DEFENCE_INFO)} words={words} footer={(id) => <Stops id={id} words={words} />} />}
        {step === 3 && <CardWall footerRows={4} ids={ids(UTILITY_INFO)} words={words} footer={(id) => <Stops id={id} words={words} />} />}
        {step === 4 && (
          <div className="grid h-full content-center bg-bg px-4 sm:px-8">
            <DemoPlayer theme={room.theme} words={words} />
          </div>
        )}
      </main>

      <footer className="flex items-center justify-between gap-4 bg-bg px-6 py-3 sm:px-8">
        <ol className="flex items-center gap-1.5" aria-label="Progress">
          {STEPS.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setStep(i)}
                aria-label={s.title}
                aria-current={i === step}
                className={cx("block h-2.5 w-10 cursor-pointer transition-colors", i === step ? "bg-accent" : i < step ? "bg-accent/45" : "bg-line-strong")}
              />
            </li>
          ))}
        </ol>
        <div className="flex items-center gap-3">
          {step > 0 && (
            <Button variant="ghost" onClick={back}>
              Back <kbd>⌫</kbd>
            </Button>
          )}
          <Button variant="primary" onClick={next} className="min-w-48">
            {last ? "I’m ready" : "Next"} <kbd>Enter</kbd>
          </Button>
        </div>
      </footer>
    </div>
  );
}

// ---------- 1 · how to play: three big statements, in the app's colour ----------

function HowToPlay({ room, words }: { room: RoomView; words: ThemeWords }) {
  const info = THEME_INFO[room.theme ?? "bookmyshow"];
  const p = info.poster;
  const hot = { color: p.timeColor ?? p.fg } as CSSProperties;
  const lines: { title: ReactNode; text: string }[] = [
    {
      title: (
        <>
          <span style={hot}>{capitalise(words.visitors)}</span> come to your {info.name} site.
        </>
      ),
      text: "Every one you serve earns you coins. The ones who can’t get in give up.",
    },
    {
      title: (
        <>
          Spend coins to <span style={hot}>protect yours</span> — or <span style={hot}>flood theirs</span>.
        </>
      ),
      text: "Defend your site, send attacks at theirs, or give yourself a boost.",
    },
    {
      title: (
        <>
          <span style={hot}>Serve the most people</span> over three rounds.
        </>
      ),
      text: "Hurting their site cuts their coins. Neglecting yours makes you the easy target.",
    },
  ];
  return (
    <section style={posterVars(room.theme)} className={cx("relative grid h-full content-center overflow-hidden px-[6vw] py-[2vh]", `motif-${p.motif}`)}>
      <ol className="relative z-[1] grid max-w-[78rem]">
        {lines.map((l, i) => (
          <li key={i} className="grid grid-cols-[auto_1fr] items-baseline gap-[3vw] border-b-[3px] border-current py-[2.2vh] first:border-t-[3px]">
            <span className="font-display text-[min(15vh,9vw)] leading-[0.8] font-extrabold tabular-nums opacity-40">0{i + 1}</span>
            <span>
              <span className="block font-display text-[min(7.4vh,5.4vw)] leading-[0.95] font-extrabold tracking-[0.005em] uppercase">{l.title}</span>
              <span className="mt-[1vh] block max-w-[52ch] text-[clamp(0.9375rem,2.2vh,1.25rem)] font-medium opacity-85">{l.text}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ---------- 2–4 · the cards, as a wall of full-height panels ----------

/** `footerRows`: how many chips the tallest footer has, so every panel's name lines up. */
function CardWall({ ids, words, footer, footerRows }: { ids: ItemId[]; words: ThemeWords; footer: (id: ItemId) => ReactNode; footerRows: number }) {
  return (
    <div className="card-wall flex h-full">
      {ids.map((id) => {
        const style = KIND_STYLE[kindOf(id)];
        return (
          <section
            key={id}
            className={cx("wall-panel relative grid min-w-0 flex-1 basis-0 grid-rows-[auto_1fr_auto_auto_auto] overflow-hidden px-[clamp(1rem,7cqw,2.25rem)] pt-5 text-bg", style.solid)}
          >
            <span className="grid size-[1.875rem] place-items-center border-2 border-current font-display text-[0.9375rem] leading-none font-extrabold">
              {ITEM_INFO[id].key.toUpperCase()}
            </span>
            <div className="grid place-items-center">
              <ItemIcon id={id} className="size-[min(62cqw,28vh)] fill-none stroke-bg stroke-[1.5] [stroke-linecap:round] [stroke-linejoin:round]" />
            </div>
            <h2 className="grid min-h-[1.8em] items-end font-display text-[min(15cqw,7.4vh)] leading-[0.9] font-extrabold tracking-[0.005em] uppercase">{words.names[id]}</h2>
            <p className="mt-[3cqw] min-h-[2.7em] text-[clamp(0.9375rem,6cqw,1.25rem)] leading-snug font-semibold">{itemHint(words, id)}</p>
            <div className="mt-[3cqw] border-t-[3px] border-current py-[4cqw] pb-5" style={{ minHeight: `${3.2 + footerRows * 2.5}rem` }}>
              {footer(id)}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Chip({ id, words }: { id: ItemId; words: ThemeWords }) {
  const style = KIND_STYLE[kindOf(id)];
  return (
    <span className="inline-flex items-center gap-1.5 bg-bg py-1 pr-2.5 pl-1.5 font-display text-[clamp(0.9375rem,1.9vh,1.0625rem)] leading-none font-bold tracking-[0.02em] text-ink uppercase">
      <ItemIcon id={id} className={cx("size-5 fill-none stroke-current stroke-[2.2] [stroke-linecap:round] [stroke-linejoin:round]", style.text)} />
      {words.names[id]}
    </span>
  );
}

function Chips({ label, ids, words }: { label: string; ids: ItemId[]; words: ThemeWords }) {
  return (
    <div>
      <p className="mb-1.5 font-display text-[0.8125rem] font-extrabold tracking-[0.16em] uppercase opacity-70">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {ids.map((id) => (
          <Chip key={id} id={id} words={words} />
        ))}
      </div>
    </div>
  );
}

/** "Helps against" — which attacks this card is the answer to. */
function Stops({ id, words }: { id: ItemId; words: ThemeWords }) {
  if (id === "repair") return <p className="font-display text-lg leading-tight font-bold uppercase">Gives health back after any hit.</p>;
  const attacks = stopsAttacks(id);
  if (attacks.length === 0) return null;
  return <Chips label={id === "shield" ? "Blocks any of these" : "Helps against"} ids={attacks} words={words} />;
}

// ---------- after finishing ----------

function Waiting({ room, playerId }: { room: RoomView; playerId: string }) {
  const waiting = room.players.filter((p) => p.slot !== null && !room.briefed.includes(p.id) && p.connected && p.id !== playerId);
  const p = THEME_INFO[room.theme ?? "bookmyshow"].poster;
  return (
    <main style={posterVars(room.theme)} className={cx("relative grid h-full min-h-[37.5rem] content-center justify-items-start gap-[3vh] px-[8vw]", `motif-${p.motif}`)}>
      <h1 className="font-display text-[min(15vw,24vh)] leading-[0.84] font-extrabold tracking-[-0.005em] uppercase">
        You’re
        <br />
        ready{waiting.length > 0 ? "" : "!"}
      </h1>
      {waiting.length > 0 && (
        <p className="font-display text-[clamp(1.5rem,4vh,2.5rem)] leading-tight font-bold tracking-[0.02em] uppercase">
          Waiting for {waiting.map((w) => w.name).join(" and ")}…
        </p>
      )}
      <ul className="grid gap-1.5">
        {room.players
          .filter((pl) => pl.slot !== null)
          .map((pl) => {
            const ok = room.briefed.includes(pl.id);
            return (
              <li key={pl.id} className="flex items-center gap-3 font-display text-[clamp(1.125rem,2.8vh,1.625rem)] font-bold tracking-[0.02em] uppercase">
                <span className={cx("size-3.5 border-[3px] border-current", ok && "bg-current")} aria-hidden />
                {pl.name}
                <span className="opacity-60">{ok ? "ready" : pl.connected ? "reading…" : "away"}</span>
              </li>
            );
          })}
      </ul>
    </main>
  );
}
