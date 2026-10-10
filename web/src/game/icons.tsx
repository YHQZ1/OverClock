import type { ItemId } from "@server/types/contracts.js";
import type { ReactNode } from "react";

/*
 * One drawn icon per card (SVG, so every lab PC shows the same thing — emoji
 * differ by OS). Each icon is the same shape in every theme: icon, key and
 * position never change, only the name does. 24×24, stroke = currentColor.
 */

const PATHS: Record<ItemId, ReactNode> = {
  // ---- defences ----
  // A counter with someone behind it.
  server: (
    <>
      <circle cx="12" cy="6.5" r="2.5" />
      <path d="M3 21v-7.5h18V21" />
      <path d="M3 13.5h18" />
      <path d="M8 21v-4h8v4" />
    </>
  ),
  // Someone with a hand up: stop.
  bouncer: (
    <>
      <circle cx="12" cy="6" r="2.8" />
      <path d="M6 21v-3.5A6 6 0 0 1 12 12a6 6 0 0 1 6 5.5V21" />
      <path d="M3.5 10.5h17" />
    </>
  ),
  // A padlock.
  lockAddress: (
    <>
      <rect x="5" y="11" width="14" height="9.5" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      <circle cx="12" cy="15.5" r="1.2" />
    </>
  ),
  // ---- boosts ----
  repair: <path d="M12 20.5s-8-4.7-8-10.6a4.4 4.4 0 0 1 8-2.5 4.4 4.4 0 0 1 8 2.5c0 5.9-8 10.6-8 10.6z" />,
  shield: (
    <>
      <path d="M12 3l7.5 3v6c0 4.7-3.2 7.8-7.5 9.5C7.700 19.800 4.500 16.700 4.500 12V6z" />
      <path d="M9 12l2.2 2.2L15.500 10" />
    </>
  ),
  overclock: <path d="M13.500 2.500L5 13.500h6l-1 8 8.500-11.500h-6z" />,
  instantBackup: (
    <>
      <path d="M20 12a8 8 0 1 1-2.800-6.100" />
      <path d="M20.500 3.500v4.500H16" />
    </>
  ),
  // ---- attacks ----
  // A crowd.
  surge: (
    <>
      <circle cx="12" cy="7" r="2.6" />
      <circle cx="5.500" cy="9" r="2.100" />
      <circle cx="18.500" cy="9" r="2.100" />
      <path d="M7.500 20c0-3.500 2-6 4.500-6s4.500 2.500 4.500 6" />
      <path d="M1.500 19c0-2.600 1.500-4.500 4-4.500M22.500 19c0-2.600-1.500-4.500-4-4.500" />
    </>
  ),
  // A robot head.
  bots: (
    <>
      <rect x="4.500" y="8" width="15" height="11" rx="3" />
      <path d="M12 4.500V8" />
      <circle cx="12" cy="3.600" r="1.100" />
      <circle cx="9" cy="13" r="1.400" />
      <circle cx="15" cy="13" r="1.400" />
      <path d="M9 16.500h6" />
    </>
  ),
  // A blast.
  destroy: <path d="M12 2l2.300 5.400L20 6l-2.600 5.200L22 14l-5.600.6L15 20.500l-3-4.300-3 4.300-1.400-5.900L2 14l4.600-2.800L4 6l5.700 1.400z" />,
  // An arrow turning off to the side.
  wrongTurn: (
    <>
      <path d="M4 19c0-6 3-9.500 8.500-9.500H19" />
      <path d="M15.500 5.500l4 4-4 4" />
    </>
  ),
  // A snowflake.
  jam: (
    <>
      <path d="M12 2.500v19M3.800 7.250l16.400 9.500M3.800 16.750l16.400-9.500" />
      <path d="M9.500 4.500L12 6.800l2.500-2.300M9.500 19.500L12 17.200l2.500 2.300" />
    </>
  ),
};

/** The bare drawing, to place inside another SVG: `<g transform="translate(x y) scale(s)">`. */
export function ItemGlyph({ id }: { id: ItemId }) {
  return (
    <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {PATHS[id]}
    </g>
  );
}

export function ItemIcon({ id, className }: { id: ItemId; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <ItemGlyph id={id} />
    </svg>
  );
}
