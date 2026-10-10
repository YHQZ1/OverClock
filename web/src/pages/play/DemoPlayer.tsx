import type { DemoRecording, ItemId } from "@server/types/contracts.js";
import { useEffect, useState } from "react";
import { Arena, type Flight } from "../../game/arena/Arena";
import { cx } from "../../components/ui";
import { DEFAULT_NAMES } from "../../game/items";
import type { ThemeId } from "@server/types/contracts.js";
import type { ThemeWords } from "../../themes/themes";

/** "{bots}" → the theme's name for it; "{visitors}" and "{servers}" too. */
export function fillCaption(text: string, words: ThemeWords): string {
  return text.replace(/\{(\w+)\}/g, (_, key: string) => {
    if (key === "visitors") return words.visitors;
    if (key === "servers") return words.parts.servers.toLowerCase();
    return words.names[key as ItemId] ?? DEFAULT_NAMES[key as ItemId] ?? key;
  });
}

/** Loads the recorded demo (kept out of the main bundle — it's a few hundred KB). */
export function useDemo(): DemoRecording | null {
  const [rec, setRec] = useState<DemoRecording | null>(null);
  useEffect(() => {
    let live = true;
    void import("../../game/demo.json").then((m) => live && setRec(m.default as unknown as DemoRecording));
    return () => {
      live = false;
    };
  }, []);
  return rec;
}

/**
 * Plays the recorded match in the real arena, with a caption for each beat.
 * It's a recording of the actual engine, so every attack and counter shown is
 * exactly how the game works.
 */
export function DemoPlayer({ theme, words, className }: { theme: ThemeId | null; words: ThemeWords; className?: string }) {
  const rec = useDemo();
  const [t, setT] = useState(0);
  const [run, setRun] = useState(0); // bumped by Replay
  const ended = rec !== null && t >= rec.durationSec - 0.2;

  useEffect(() => {
    if (!rec) return;
    setT(0);
    const start = performance.now();
    const timer = setInterval(() => {
      const sec = (performance.now() - start) / 1000;
      setT(Math.min(sec, rec.durationSec));
      if (sec >= rec.durationSec) clearInterval(timer);
    }, 100);
    return () => clearInterval(timer);
  }, [rec, run]);

  if (!rec) return <div className={cx("grid place-items-center text-muted", className)}>Loading the demo…</div>;

  const frame = rec.frames[Math.min(rec.frames.length - 1, Math.floor(t * rec.fps))]!;
  const caption = [...rec.captions].reverse().find((c) => c.at <= t) ?? rec.captions[0]!;
  const flights: Flight[] = frame.flights.map((f) => ({ ...f, toward: f.side === 1 ? "left" : "right" }));

  return (
    <div className={cx("flex min-h-0 flex-col", className)}>
      {/* sized from the viewport height, so it never collapses inside the briefing */}
      <div className="relative mx-auto" style={{ aspectRatio: "1366 / 450", width: "min(100%, calc((100vh - 19rem) * 3.036))" }}>
        <Arena theme={theme} words={words} left={frame.sites[0]} right={frame.sites[1]} leftName="Red team" rightName="Blue team" flights={flights} />
        {/* dim whichever side the caption isn't about */}
        {caption.focus !== "both" && (
          <span
            className={cx("pointer-events-none absolute inset-y-0 w-1/2 bg-bg/55 transition-opacity", caption.focus === "left" ? "right-0" : "left-0")}
            aria-hidden
          />
        )}
      </div>
      <p
        key={caption.at}
        className="animate-flash mx-auto mt-3 w-full max-w-[60rem] border-4 border-black bg-paper px-5 py-2.5 text-center font-display text-[clamp(1.25rem,3.2vh,1.875rem)] leading-tight font-extrabold tracking-[0.01em] text-bg uppercase shadow-[6px_6px_0_#000]"
      >
        {fillCaption(caption.text, words)}
      </p>
      <div className="mx-auto mt-4 flex w-full max-w-[60rem] items-center gap-4">
        <span className="h-2 flex-1 overflow-hidden bg-line-strong">
          <span className="block h-full bg-accent" style={{ width: `${(t / rec.durationSec) * 100}%` }} />
        </span>
        {ended && (
          <button type="button" onClick={() => setRun((r) => r + 1)} className="cursor-pointer font-display text-lg font-extrabold tracking-[0.06em] text-muted uppercase hover:text-ink">
            Watch again
          </button>
        )}
      </div>
    </div>
  );
}
