import type { ItemId, RoomView } from "@server/types/contracts.js";
import { Fragment, useState, type ReactNode } from "react";
import { TopBar } from "../../components/TopBar";
import { Button, Label, cx } from "../../components/ui";
import { DECODED, PARTS_DECODED, THEME_REVEAL } from "../../game/reveal";
import { ATTACK_INFO, DEFENCE_INFO, UTILITY_INFO } from "../../game/items";
import { useShortcut } from "../../hooks/useShortcut";
import { useGameStore } from "../../store/game";
import { THEME_INFO, capitalise, wordsFor, type ThemeWords } from "../../themes/themes";

/**
 * After the final: what the game really was. Their site with real names, every
 * item decoded (what they used first), and real apps built the same way. They
 * read for as long as they like; Enter clears the PC for the next players.
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
  const words = wordsFor(room.theme);
  const story = THEME_REVEAL[theme];
  const used = new Set<ItemId>(usage.used);
  const hitBy = new Set<ItemId>(usage.hitBy);
  const firstUsed = <T extends ItemId>(ids: T[]) =>
    [...ids].sort((a, b) => Number(used.has(b) || hitBy.has(b)) - Number(used.has(a) || hitBy.has(a)));

  return (
    <div className="grid h-full min-h-[37.5rem] grid-rows-[auto_minmax(0,1fr)_auto]">
      <TopBar theme={room.theme} right="What you actually built" />

      <main className="min-h-0 overflow-y-auto">
        {/* ---- headline ---- */}
        <section className="border-b border-line px-4 sm:px-6 lg:px-10 pt-[clamp(1.5rem,5vh,3rem)] pb-8">
          <Label>What you actually built</Label>
          <h1 className="mt-2 max-w-[22ch] text-[clamp(2.25rem,6.5vh,3.75rem)] leading-[1.05] font-semibold tracking-[-0.045em]">
            {story.headline}
          </h1>
          <p className="mt-4 max-w-[70ch] text-[1.0625rem] text-muted">
            Under the game, you were running <span className="text-ink">{story.really}</span>. Every button you pressed was a real piece of
            system design — the same parts engineers use at {THEME_INFO[theme].name}, Netflix and IRCTC. Here’s what each one really was.
          </p>
        </section>

        {/* ---- the site, with real names ---- */}
        <section className="border-b border-line px-4 sm:px-6 lg:px-10 py-8">
          <SectionTitle
            title="Your site, with its real names"
            note="Every visitor travelled through these, in this order. The slowest part decided how many got in."
          />
          <ol className="mt-5 flex flex-col items-stretch lg:flex-row">
            {PARTS_DECODED.map((p, i) => (
              <Fragment key={p.part}>
                {i > 0 && (
                  <li className="grid h-7 shrink-0 place-items-center text-faint lg:h-auto lg:w-8" aria-hidden>
                    <span className="rotate-90 lg:rotate-0">→</span>
                  </li>
                )}
                <li className="flex min-w-0 flex-1 flex-col border border-line-strong p-4">
                  <span className="text-xs text-faint">
                    You called it: {p.part === "crowd" ? capitalise(words.visitors) : words.parts[p.part]}
                  </span>
                  <span className="mt-1 text-[1.0625rem] leading-tight font-semibold text-accent">{p.real}</span>
                  <span className="mt-2 text-[0.8125rem] leading-snug text-muted">{p.what}</span>
                </li>
              </Fragment>
            ))}
          </ol>
        </section>

        {/* ---- decoded ---- */}
        <section className="border-b border-line px-4 sm:px-6 lg:px-10 py-8">
          <SectionTitle
            title="Decoded"
            note="Your game names on the left, the real thing on the right. Highlighted: what your team used — and what hit you."
          />
          <div className="mt-5 grid gap-8 lg:grid-cols-3">
            <DecodedColumn
              title="Your defences"
              ids={firstUsed(Object.keys(DEFENCE_INFO) as ItemId[])}
              words={words}
              used={used}
              hitBy={hitBy}
            />
            <DecodedColumn
              title="Your boosts"
              ids={firstUsed(Object.keys(UTILITY_INFO) as ItemId[])}
              words={words}
              used={used}
              hitBy={hitBy}
            />
            <DecodedColumn
              title="The attacks"
              ids={firstUsed(Object.keys(ATTACK_INFO) as ItemId[])}
              words={words}
              used={used}
              hitBy={hitBy}
            />
          </div>
        </section>

        {/* ---- build next ---- */}
        <section className="px-4 sm:px-6 lg:px-10 py-8">
          <SectionTitle
            title="You could build these too"
            note="Same building blocks every time: servers behind a load balancer, a cache, a database with replicas, and protection at the front door."
          />
          <ul className="mt-5 grid gap-3 md:grid-cols-3">
            {story.build.map((b) => (
              <li key={b.name} className="border border-line-strong p-5">
                <p className="text-[1.0625rem] font-semibold">{b.name}</p>
                <p className="mt-1.5 text-sm text-muted">{b.why}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="flex flex-col gap-3 border-t border-line px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6 lg:px-10">
        <p className="text-sm text-muted">Take your time. When you’re done, this PC goes back to the start for the next players.</p>
        <Button variant="primary" className="w-full shrink-0 sm:w-[20rem]" disabled={leaving} onClick={done}>
          Done — next players <kbd>Enter</kbd>
        </Button>
      </footer>
    </div>
  );
}

function SectionTitle({ title, note }: { title: string; note: string }) {
  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-[-0.03em]">{title}</h2>
      <p className="mt-1 text-sm text-muted">{note}</p>
    </div>
  );
}

function DecodedColumn({
  title,
  ids,
  words,
  used,
  hitBy,
}: {
  title: string;
  ids: ItemId[];
  words: ThemeWords;
  used: Set<ItemId>;
  hitBy: Set<ItemId>;
}) {
  return (
    <div>
      <h3 className="border-b border-line pb-2 text-sm font-semibold text-muted">{title}</h3>
      <ul>
        {ids.map((id) => {
          const d = DECODED[id];
          const attack = id in ATTACK_INFO;
          const badges: ReactNode[] = [];
          if (used.has(id)) badges.push(<Badge key="u">{attack ? "You sent this" : "You used this"}</Badge>);
          if (hitBy.has(id))
            badges.push(
              <Badge key="h" bad>
                It hit you
              </Badge>,
            );
          const mine = badges.length > 0;
          return (
            <li key={id} className={cx("border-b border-line py-3.5", !mine && "opacity-75")}>
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-sm text-muted">{words.names[id]}</span>
                <span className="text-faint" aria-hidden>
                  →
                </span>
                <span className={cx("text-[0.9375rem] font-semibold", mine ? "text-accent" : "text-ink")}>{d.real}</span>
                {badges}
              </div>
              <p className="mt-1 text-[0.8125rem] leading-snug text-muted">{d.what}</p>
              <p className="mt-1 text-xs text-faint">
                {attack ? "Real world: " : "e.g. "}
                {d.example}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Badge({ children, bad = false }: { children: ReactNode; bad?: boolean }) {
  return (
    <span
      className={cx("ml-1 border px-1.5 py-px text-[0.6875rem] font-medium", bad ? "border-bad/50 text-bad" : "border-accent/50 text-accent")}
    >
      {children}
    </span>
  );
}
