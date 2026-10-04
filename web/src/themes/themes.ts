import type { ThemeId } from "@server/types/contracts.js";

/**
 * Placeholder themes until the real ones are chosen (docs/GAME.md → Themes).
 * Themes are cosmetic: words and colours only — never rules or numbers.
 */
export const THEME_INFO: Record<ThemeId, { name: string; blurb: string; key: string }> = {
  results: { name: "Results Day", blurb: "The whole college refreshing at 10 AM.", key: "1" },
  tickets: { name: "Ticket Drop", blurb: "A sold-out concert goes on sale.", key: "2" },
  sale: { name: "Mega Sale", blurb: "Everything 70% off for one hour.", key: "3" },
  launch: { name: "Launch Night", blurb: "A huge game update drops at midnight.", key: "4" },
};

export const THEME_IDS = Object.keys(THEME_INFO) as ThemeId[];
