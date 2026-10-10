import type { ItemId, MatchView, ShopItemView } from "@server/types/contracts.js";
import type { CSSProperties } from "react";
import { cx } from "../../components/ui";
import { useShortcuts } from "../../hooks/useShortcut";
import { sendAction } from "../../socket/api";
import { itemHint, type ThemeWords } from "../../themes/themes";
import { ItemIcon } from "../icons";
import { ITEM_INFO } from "../items";
import { KIND_STYLE } from "./kinds";

/*
 * The hand: every card as a chunky, cost-badged tile in three groups.
 * Keys never change. A card you can't afford greys out, a cooling-down card
 * darkens from the top, a frozen hand is covered in ice, and the card worth
 * pressing right now bounces.
 */

function press(item: ShopItemView) {
  const kind = item.kind === "defence" ? "buy" : item.kind === "utility" ? "use" : "attack";
  sendAction({ kind, item: item.id } as Parameters<typeof sendAction>[0]);
}

function Card({ item, words, locked, recommended }: { item: ShopItemView; words: ThemeWords; locked: boolean; recommended: boolean }) {
  const style = KIND_STYLE[item.kind];
  const info = ITEM_INFO[item.id];
  const maxed = item.kind === "defence" && item.owned >= item.max;
  const kept = item.kind === "defence" && item.id !== "server" && item.owned > 0;
  const cooling = item.cooldown > 0;
  const disabled = locked || !item.affordable || maxed || cooling || kept;

  return (
    <button
      type="button"
      onClick={() => press(item)}
      disabled={disabled}
      title={itemHint(words, item.id)}
      style={{ "--cd": item.cooldown } as CSSProperties}
      className={cx(
        "group relative grid min-w-0 flex-1 basis-0 grid-rows-[1fr_auto] overflow-hidden border-[3px] border-black text-center text-bg shadow-[0_5px_0_#000] transition-transform duration-100",
        "h-[clamp(6.25rem,17vh,9.5rem)] cursor-pointer enabled:hover:-translate-y-1 enabled:active:translate-y-0.5 enabled:active:shadow-[0_2px_0_#000] disabled:cursor-not-allowed",
        style.solid,
        recommended && "-translate-y-2 animate-bob",
        !kept && !item.affordable && !cooling && "saturate-[0.25] brightness-[0.7]",
      )}
    >
      {cooling && <span className="absolute inset-0 z-[1] origin-top bg-bg/70" style={{ transform: `scaleY(${item.cooldown})` }} aria-hidden />}
      <span className="absolute top-1 left-1 z-[2] grid h-[1.875rem] min-w-[1.875rem] place-items-center rounded-full border-[3px] border-black bg-[#ffd23f] px-1.5 font-display text-base leading-none font-extrabold tabular-nums">
        {item.price}
      </span>
      <span className="absolute top-1.5 right-1.5 z-[2] grid size-5 place-items-center bg-bg font-display text-[0.8125rem] leading-none font-extrabold text-ink">
        {info.key.toUpperCase()}
      </span>
      {item.kind === "defence" && item.id === "server" && (
        <span className="absolute right-1.5 bottom-[2.6rem] z-[2] font-display text-sm leading-none font-extrabold">×{item.owned}</span>
      )}
      <span className="grid place-items-center pt-3.5">
        <ItemIcon id={item.id} className="size-[clamp(1.75rem,5.2vh,2.875rem)] fill-none stroke-bg stroke-[2.2] [stroke-linecap:round] [stroke-linejoin:round]" />
      </span>
      <span className="relative z-[2] grid min-h-[2.5em] place-items-center bg-bg px-0.5 pt-1.5 pb-1 font-display text-[clamp(0.8125rem,1.9vh,1rem)] leading-none font-extrabold tracking-[0.02em] text-ink uppercase">
        {words.names[item.id]}
      </span>
      {kept && <span className="absolute inset-x-0 bottom-[2.6rem] z-[2] font-display text-sm font-extrabold tracking-[0.1em] uppercase">Ready</span>}
      {maxed && !kept && <span className="absolute inset-x-0 bottom-[2.6rem] z-[2] font-display text-sm font-extrabold tracking-[0.1em] uppercase">Max</span>}
    </button>
  );
}

function Group({
  kind,
  items,
  words,
  locked,
  recommended,
  className,
}: {
  kind: ShopItemView["kind"];
  items: ShopItemView[];
  words: ThemeWords;
  locked: boolean;
  recommended?: ItemId;
  className: string;
}) {
  const style = KIND_STYLE[kind];
  return (
    <section className={cx("flex min-w-0 flex-col gap-1", className)}>
      <h2 className={cx("font-display text-[0.8125rem] font-extrabold tracking-[0.16em] uppercase", style.text)}>{style.label}</h2>
      <div className="flex min-h-0 flex-1 gap-1.5">
        {items.map((item) => (
          <Card key={item.id} item={item} words={words} locked={locked} recommended={recommended === item.id} />
        ))}
      </div>
    </section>
  );
}

export function Hand({ match, words, recommended }: { match: MatchView; words: ThemeWords; recommended?: ItemId }) {
  const frozen = match.me.effects.find((e) => e.kind === "jam");
  const locked = match.me.downSecondsLeft !== null || frozen !== undefined;

  // Every card keeps its key, wherever it sits.
  useShortcuts(Object.fromEntries(match.shop.map((item) => [ITEM_INFO[item.id].key, () => press(item)])), { enabled: !locked });

  const by = (kind: ShopItemView["kind"]) => match.shop.filter((i) => i.kind === kind);
  return (
    <div className="relative grid grid-cols-[auto_1fr] gap-4 border-t-4 border-black bg-bg px-4 pt-2.5 pb-3 sm:px-5">
      <div className="grid min-w-28 content-center gap-1">
        <span className="font-display text-[0.8125rem] font-bold tracking-[0.16em] text-ink/60 uppercase">Coins</span>
        <b className="font-display text-[clamp(2.5rem,6.4vh,3.625rem)] leading-[0.9] font-extrabold text-[#ffd23f] tabular-nums">{match.me.coins.toLocaleString()}</b>
        <em className="text-[0.8125rem] font-semibold text-ink/60 not-italic">+{match.me.incomePerSec} / s</em>
      </div>
      <div className="flex min-w-0 gap-3.5">
        <Group kind="defence" items={by("defence")} words={words} locked={locked} recommended={recommended} className="flex-[3]" />
        <Group kind="utility" items={by("utility")} words={words} locked={locked} recommended={recommended} className="flex-[4]" />
        <Group kind="attack" items={by("attack")} words={words} locked={locked} recommended={recommended} className="flex-[5]" />
      </div>
      {frozen && (
        <p className="absolute inset-0 z-[3] grid place-items-center bg-defend/55 font-display text-[3.25rem] font-black tracking-[0.1em] text-white uppercase" role="alert">
          Frozen · {frozen.secondsLeft}s
        </p>
      )}
    </div>
  );
}
