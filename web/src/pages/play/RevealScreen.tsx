import type { ItemId, RoomView } from "@server/types/contracts.js";
import { useState, type CSSProperties, type ReactNode } from "react";
import { SoundToggle } from "../../audio/SoundToggle";
import { Button, cx } from "../../components/ui";
import { Arena } from "../../game/arena/Arena";
import { KIND_STYLE, kindOf } from "../../game/arena/kinds";
import { ItemIcon } from "../../game/icons";
import { ATTACK_INFO, DEFENCE_INFO, UTILITY_INFO } from "../../game/items";
import { DECODED, PARTS_DECODED, THEME_REVEAL } from "../../game/reveal";
import { useShortcut } from "../../hooks/useShortcut";
import { useGameStore } from "../../store/game";
import { THEME_INFO, capitalise, posterVars, wordsFor, type ThemeWords } from "../../themes/themes";
import { useDemo } from "./DemoPlayer";

/**
 * After the final: what the game really was. The server room they just played,
 * with its real names pinned on; every card decoded (what they used first, in
 * the card's own colour); and real apps built the same way. They read for as
 * long as they like; Enter clears the PC for the next players.
 */
export function RevealScreen({ room, onDone }: { room: RoomView; onDone: () => Promise<void> }) {
  const [leaving, setLeaving] = useState(false);
  const usage = useGameStore((s) => s.usage);
  const done = () => {
    if (leaving) return;
    setLeaving(true);
    void onDone();
  };
  useShortcut("Enter", done);

  const theme = room.theme ?? "bookmyshow";
  const info = THEME_INFO[theme];
  const words = wordsFor(room.theme);
  const story = THEME_REVEAL[theme];
  const used = new Set<ItemId>(usage.used);
  const hitBy = new Set<ItemId>(usage.hitBy);
  const firstUsed = (ids: ItemId[]) => [...ids].sort((a, b) => Number(used.has(b) || hitBy.has(b)) - Number(used.has(a) || hitBy.has(a)));
  const hot = { color: info.poster.timeColor ?? info.poster.fg } as CSSProperties;

  return (
    <div className="grid h-full min-h-[37.5rem] grid-rows-[auto_minmax(0,1fr)_auto] bg-bg">
      <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-6 px-6 py-3 sm:px-8">
        <div className="flex items-center gap-3 font-display text-xl font-extrabold tracking-[0.06em] uppercase">
          <span className="size-3.5 bg-accent" aria-hidden />
          Overclock
        </div>
        <span className="font-display text-[clamp(1.375rem,3vh,2rem)] leading-none font-extrabold tracking-[0.01em] uppercase">What you actually built</span>
        <div className="flex justify-end">
          <SoundToggle />
        </div>
      </header>

      <main className="min-h-0 overflow-y-auto">
        {/* ---- the headline, in the app's colour ---- */}
        <section style={posterVars(room.theme)} className={cx("relative overflow-hidden px-6 py-[clamp(2rem,7vh,4.5rem)] sm:px-[6vw]", `motif-${info.poster.motif}`)}>
          <h1 className="relative max-w-[18ch] font-display text-[clamp(3rem,10vh,6.5rem)] leading-[0.88] font-extrabold tracking-[-0.005em] uppercase">
            {story.headline}
          </h1>
          <p className="relative mt-[3vh] max-w-[62ch] text-[clamp(1rem,2.3vh,1.375rem)] leading-snug font-medium">
            Under the game you were running <span className="font-bold" style={hot}>{story.really}</span>. Every card you pressed was a real piece of
            system design — the same parts engineers use at companies like Netflix, Spotify and IRCTC.
          </p>
        </section>

        {/* ---- the room they played, with real names ---- */}
        <section className="bg-bg">
          <Title n="1" title="Your site, with its real names" note="Every request travelled through these, in this order. The slowest part decided how many got in." />
          <LabelledRoom room={room} words={words} />
          <ol className="grid border-t-4 border-black md:grid-cols-5">
            {PARTS_DECODED.map((p, i) => (
              <li key={p.part} className={cx("border-black p-5 md:border-r-4 last:md:border-r-0", p.played ? "bg-surface" : "bg-bg")}>
                <div className="flex items-center gap-3">
                  <Pin n={p.played ? pinOf(p.part) : i + 1} ghost={!p.played} />
                  <span className="font-display text-[0.9375rem] font-bold tracking-[0.1em] text-ink/60 uppercase">
                    {!p.played
                      ? "Not in your game"
                      : `You called it: ${p.part === "crowd" ? capitalise(words.visitors) : words.parts[p.part as "door" | "servers"]}`}
                  </span>
                </div>
                <h3 className="mt-2 font-display text-[1.625rem] leading-none font-extrabold uppercase" style={{ color: p.played ? "var(--color-accent)" : undefined }}>
                  {p.real}
                </h3>
                <p className="mt-2 text-sm leading-snug text-ink/75">{p.what}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ---- every card, decoded, in its own colour ---- */}
        <section className="bg-bg">
          <Title n="2" title="Decoded" note="The name on your card, and the real thing behind it. Brighter: what your team used — and what hit you." />
          <Group title="Your defences" ids={firstUsed(Object.keys(DEFENCE_INFO) as ItemId[])} words={words} used={used} hitBy={hitBy} />
          <Group title="Your boosts" ids={firstUsed(Object.keys(UTILITY_INFO) as ItemId[])} words={words} used={used} hitBy={hitBy} />
          <Group title="The attacks" ids={firstUsed(Object.keys(ATTACK_INFO) as ItemId[])} words={words} used={used} hitBy={hitBy} />
        </section>

        {/* ---- build next ---- */}
        <section style={posterVars(room.theme)} className="px-6 py-[clamp(2rem,6vh,4rem)] sm:px-[6vw]">
          <h2 className="font-display text-[clamp(2rem,5.4vh,3.5rem)] leading-none font-extrabold uppercase">You could build these too</h2>
          <p className="mt-2 max-w-[60ch] text-[clamp(0.9375rem,2vh,1.1875rem)] font-medium opacity-85">
            Same building blocks every time: servers behind a load balancer, a cache, a database with replicas, and protection at the front door.
          </p>
          <ol className="mt-[3vh] grid border-t-[3px] border-current md:grid-cols-3">
            {story.build.map((b, i) => (
              <li key={b.name} className="border-b-[3px] border-current py-5 md:border-r-[3px] md:pr-6 md:pl-6 md:first:pl-0 md:last:border-r-0">
                <span className="font-display text-[clamp(2.25rem,6vh,3.5rem)] leading-none font-extrabold opacity-40">0{i + 1}</span>
                <p className="mt-1 font-display text-[clamp(1.5rem,3.6vh,2.25rem)] leading-[0.95] font-extrabold uppercase">{b.name}</p>
                <p className="mt-2 text-[clamp(0.9375rem,2vh,1.125rem)] leading-snug font-medium opacity-85">{b.why}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="flex flex-col gap-3 bg-bg px-6 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-8">
        <p className="text-sm text-ink/70">Take your time. When you’re done, this PC goes back to the start for the next players.</p>
        <Button variant="primary" className="w-full shrink-0 sm:w-[20rem]" disabled={leaving} onClick={done}>
          Done — next players <kbd>Enter</kbd>
        </Button>
      </footer>
    </div>
  );
}

function Title({ n, title, note }: { n: string; title: string; note: string }) {
  return (
    <div className="flex items-end gap-5 px-6 pt-[clamp(1.5rem,4.5vh,3rem)] pb-4 sm:px-8">
      <span className="font-display text-[clamp(3rem,8vh,5rem)] leading-[0.8] font-extrabold text-accent">{n}</span>
      <div>
        <h2 className="font-display text-[clamp(1.75rem,4.4vh,2.75rem)] leading-none font-extrabold uppercase">{title}</h2>
        <p className="mt-1 max-w-[70ch] text-sm text-ink/70">{note}</p>
      </div>
    </div>
  );
}

// ---------- 1 · the room, with its parts pinned ----------

/** Which numbered pin a played part gets: 1 requests · 2 gateway + firewall · 3 load balancer + servers. */
const pinOf = (part: string) => (part === "crowd" ? 1 : part === "door" ? 2 : 3);

function Pin({ n, ghost = false, className, style }: { n: number; ghost?: boolean; className?: string; style?: CSSProperties }) {
  return (
    <span
      style={style}
      className={cx(
        "grid size-[clamp(1.75rem,3.6vh,2.25rem)] shrink-0 place-items-center border-[3px] font-display text-[clamp(1rem,2.2vh,1.25rem)] leading-none font-extrabold",
        ghost ? "border-dashed border-ink/60 bg-bg/80 text-ink" : "border-black bg-accent text-on-accent shadow-[3px_3px_0_#000]",
        className,
      )}
    >
      {n}
    </span>
  );
}

/** One server room, as the demo shows it, with numbered pins on its parts — and the two it never had. */
function LabelledRoom({ room, words }: { room: RoomView; words: ThemeWords }) {
  const rec = useDemo();
  const frame = rec ? rec.frames[Math.floor(rec.frames.length * 0.38)]! : null;
  // positions are percentages of the 1366×450 arena
  const at = (x: number, y: number): CSSProperties => ({ left: `${(x / 1366) * 100}%`, top: `${(y / 450) * 100}%`, transform: "translate(-50%, -50%)" });
  return (
    <div className="px-4 pb-6 sm:px-8">
      <div className="relative mx-auto w-full overflow-hidden border-4 border-black" style={{ aspectRatio: "1366 / 450" }}>
        {frame ? (
          <>
            <Arena
              theme={room.theme}
              words={words}
              left={{ ...frame.sites[0], settingUp: [] }}
              right={{ ...frame.sites[1], settingUp: [] }}
              leftName="Your site"
              rightName="Their site"
            />
            {/* their room, quieter, so the eye stays on yours */}
            <div className="pointer-events-none absolute inset-y-0 right-0 w-[47%] bg-bg/45" />
            <Pin n={1} className="absolute" style={at(560, 318)} />
            <Pin n={2} className="absolute" style={at(259, 232)} />
            <Pin n={3} className="absolute" style={at(150, 273)} />
            <Pin n={3} className="absolute" style={at(262, 168)} />
            <Pin n={4} ghost className="absolute" style={at(580, 200)} />
            <Pin n={5} ghost className="absolute" style={at(790, 200)} />
            <span className="absolute font-display text-[clamp(0.75rem,1.7vh,1rem)] font-bold tracking-[0.12em] text-ink uppercase" style={{ ...at(685, 238) }}>
              not in your game
            </span>
          </>
        ) : (
          <div className="grid h-full place-items-center text-muted">Drawing your site…</div>
        )}
      </div>
    </div>
  );
}

// ---------- 2 · decoded ----------

function Group({ title, ids, words, used, hitBy }: { title: string; ids: ItemId[]; words: ThemeWords; used: Set<ItemId>; hitBy: Set<ItemId> }) {
  return (
    <div className="border-t-4 border-black">
      <h3 className="px-6 pt-4 pb-2 font-display text-[1.125rem] font-extrabold tracking-[0.16em] text-ink/60 uppercase sm:px-8">{title}</h3>
      <ul className="grid border-t-4 border-black sm:grid-cols-2 lg:grid-cols-3">
        {ids.map((id) => {
          const d = DECODED[id];
          const style = KIND_STYLE[kindOf(id)];
          const attack = id in ATTACK_INFO;
          const mine = used.has(id) || hitBy.has(id);
          return (
            <li
              key={id}
              className={cx(
                "relative flex flex-col border-r-4 border-b-4 border-black p-5 text-bg",
                // a last card on its own row stretches across it, so there's never a hole
                "sm:max-lg:[&:nth-child(odd):last-child]:col-span-2 lg:[&:nth-child(3n+1):last-child]:col-span-3 lg:[&:nth-child(3n+2):last-child]:col-span-2",
                style.solid,
                !mine && "opacity-60",
              )}
            >
              <ItemIcon id={id} className="absolute top-4 right-4 size-12 fill-none stroke-bg stroke-[1.7] [stroke-linecap:round] [stroke-linejoin:round]" />
              <span className="font-display text-[0.9375rem] font-bold tracking-[0.1em] uppercase opacity-80">You called it: {words.names[id]}</span>
              <h4 className="mt-1 max-w-[16ch] font-display text-[1.875rem] leading-[0.92] font-extrabold uppercase">{d.real}</h4>
              <p className="mt-2 text-[0.9375rem] leading-snug font-semibold">{d.what}</p>
              <p className="mt-auto pt-3 text-[0.8125rem] leading-snug font-medium opacity-80">
                {attack ? "Real world: " : "e.g. "}
                {d.example}
              </p>
              {mine && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {used.has(id) && <Stamp>{attack ? "You sent this" : "You used this"}</Stamp>}
                  {hitBy.has(id) && <Stamp>It hit you</Stamp>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Stamp({ children }: { children: ReactNode }) {
  return <span className="bg-bg px-2 py-0.5 font-display text-[0.9375rem] font-extrabold tracking-[0.08em] text-ink uppercase">{children}</span>;
}
