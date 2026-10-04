import type { AttackId, ItemId, Part, ThemeId } from "@server/types/contracts.js";
import type { CSSProperties } from "react";
import type { MusicStyle } from "../audio/sfx";
import { ATTACK_INFO, DEFAULT_NAMES, ITEM_INFO } from "../game/items";

/**
 * The worlds a room votes between (docs/GAME.md → Themes). Cosmetic only:
 * words, an accent colour, a logo and a music style — never rules or numbers.
 * The background stays our dark grey; ok / warn / bad stay the game signals.
 */
export type Theme = {
  name: string;
  /** What the site is, for anyone who hasn't heard of it. */
  about: string;
  /** The crowd-rush moment. */
  blurb: string;
  key: string;
  /** Served from web/public; falls back to the name if missing. */
  logo: string;
  accent: string;
  accentHover: string;
  /** Text on an accent-filled button. */
  onAccent: string;
  /** Crowd dots on the map, when the accent is too close to the red "turned away" dots. */
  crowd?: string;
  words: ThemeWords;
  music: MusicStyle;
};

/** The words the game fills in: "{Visitors} can't get in!" */
export type ThemeWords = {
  /** Plural, lower case: "traders". */
  visitors: string;
  /** Alert title when the servers can't keep up. */
  crowded: string;
  /** Said under "Your site is down". */
  downLine: string;
  /** Feed line when a rush starts. */
  rush: string;
  /** Buy-phase line per round (1, 2, 3). */
  rounds: [string, string, string];
  /** Map labels, Title case: "Trading gate", "Trading engines" (plural), "Quote board", "Ledger". */
  parts: Record<Part, string>;
  /** Every shop item's name in this world. */
  names: Record<ItemId, string>;
};

/** Used outside a themed match (and by tests). */
export const DEFAULT_WORDS: ThemeWords = {
  visitors: "visitors",
  crowded: "People can’t get in!",
  downLine: "nobody can get in",
  rush: "A rush is coming in",
  rounds: ["Round 1", "Round 2", "Final round"],
  parts: { door: "Front door", servers: "Servers", shelf: "Fast shelf", db: "Database" },
  names: DEFAULT_NAMES,
};

export const THEME_INFO: Record<ThemeId, Theme> = {
  nasdaq: {
    name: "Nasdaq",
    about: "One of the world’s biggest stock exchanges — where Apple, Google and Tesla shares trade live.",
    blurb: "Market open. Every second is money.",
    key: "1",
    logo: "/themes/nasdaq.png",
    accent: "#1aa3dc",
    accentHover: "#4cb8e6",
    onAccent: "#0b0b0c",
    words: {
      visitors: "traders",
      crowded: "Traders can’t place orders!",
      downLine: "trading has halted",
      rush: "The market’s going wild!",
      rounds: ["Opening bell", "Midday rally", "Closing hour"],
      parts: { door: "Trading gate", servers: "Trading engines", shelf: "Quote board", db: "Ledger" },
      names: {
        server: "Trading engine",
        splitter: "Order router",
        bouncer: "Fraud check",
        shelf: "Quote board",
        backupDb: "Backup ledger",
        lockAddress: "Verified link",
        backupMonitor: "Spare screens",
        repair: "Emergency fix",
        shield: "Circuit breaker",
        overclock: "Turbo trading",
        instantBackup: "Backup floor",
        surge: "Panic buying",
        bots: "Bot traders",
        slowDb: "Jam their ledger",
        destroy: "Crash their engines",
        slowServers: "Lag their engines",
        breakSplitter: "Break their router",
        blindfold: "Black out their screens",
        wrongTurn: "Fake trading link",
        jam: "Freeze their desk",
      },
    },
    music: "ticker",
  },
  fancode: {
    name: "FanCode",
    about: "India’s sports streaming app — live F1, cricket and football, with millions watching at once.",
    blurb: "Race day. Final lap. Everyone’s watching.",
    key: "2",
    logo: "/themes/fancode.png",
    accent: "#f26a21",
    accentHover: "#f5884d",
    onAccent: "#0b0b0c",
    words: {
      visitors: "fans",
      crowded: "Fans can’t load the stream!",
      downLine: "the race is going dark",
      rush: "Final lap — everyone’s tuning in!",
      rounds: ["Lights out", "Safety car in", "Final laps"],
      parts: { door: "Stream gate", servers: "Stream servers", shelf: "Replay shelf", db: "Race archive" },
      names: {
        server: "Stream server",
        splitter: "Pit crew",
        bouncer: "Ticket check",
        shelf: "Replay shelf",
        backupDb: "Backup archive",
        lockAddress: "Lock the channel",
        backupMonitor: "Spare camera",
        repair: "Pit stop",
        shield: "Safety car",
        overclock: "DRS boost",
        instantBackup: "Spare car",
        surge: "Fan stampede",
        bots: "Bot fans",
        slowDb: "Slow their archive",
        destroy: "Wreck their servers",
        slowServers: "Make them buffer",
        breakSplitter: "Take out their pit crew",
        blindfold: "Red flag",
        wrongTurn: "Pirate stream",
        jam: "Black flag",
      },
    },
    music: "race",
  },
  miniclip: {
    name: "Miniclip",
    about: "The classic free online games site — home of 8 Ball Pool and hundreds of browser games.",
    blurb: "A new game just dropped. Everyone’s in.",
    key: "3",
    logo: "/themes/miniclip.png",
    accent: "#ffa01c",
    accentHover: "#ffb54f",
    onAccent: "#0b0b0c",
    words: {
      visitors: "players",
      crowded: "Players are stuck on loading!",
      downLine: "game over for everyone",
      rush: "New game drop — players flooding in!",
      rounds: ["Level 1", "Level 2", "Boss level"],
      parts: { door: "Lobby", servers: "Game servers", shelf: "Quick-load", db: "Save files" },
      names: {
        server: "Game server",
        splitter: "Matchmaker",
        bouncer: "Anti-cheat",
        shelf: "Quick-load",
        backupDb: "Backup saves",
        lockAddress: "Lock the link",
        backupMonitor: "Spare minimap",
        repair: "Respawn",
        shield: "Bubble shield",
        overclock: "Power-up",
        instantBackup: "Extra life",
        surge: "Player rush",
        bots: "Bot swarm",
        slowDb: "Corrupt their saves",
        destroy: "Boss smash",
        slowServers: "Lag spike",
        breakSplitter: "Break matchmaking",
        blindfold: "Fog of war",
        wrongTurn: "Fake game link",
        jam: "Freeze their controller",
      },
    },
    music: "chip",
  },
  bookmyshow: {
    name: "BookMyShow",
    about: "India’s ticket-booking app — movies, concerts and shows. Big concerts sell out in minutes.",
    blurb: "Concert tickets go live at 12:00.",
    key: "4",
    logo: "/themes/bookmyshow.png",
    accent: "#d8324f",
    accentHover: "#e25a72",
    onAccent: "#ffffff",
    crowd: "#ececee",
    words: {
      visitors: "fans",
      crowded: "Fans are stuck in the queue!",
      downLine: "no one’s getting tickets",
      rush: "Tickets are live — fans rushing in!",
      rounds: ["Presale", "General sale", "Last tickets"],
      parts: { door: "Queue", servers: "Booking counters", shelf: "Seat map", db: "Ticket vault" },
      names: {
        server: "Booking counter",
        splitter: "Queue manager",
        bouncer: "Robot check",
        shelf: "Seat map",
        backupDb: "Backup vault",
        lockAddress: "Verified link",
        backupMonitor: "Spare screens",
        repair: "Quick fix",
        shield: "Security",
        overclock: "Express lane",
        instantBackup: "Backup counter",
        surge: "Fan frenzy",
        bots: "Scalper bots",
        slowDb: "Slow their vault",
        destroy: "Shut their counters",
        slowServers: "Slow their counters",
        breakSplitter: "Break their queue",
        blindfold: "Lights out",
        wrongTurn: "Fake ticket site",
        jam: "Freeze their screens",
      },
    },
    music: "trailer",
  },
};

export const THEME_IDS = Object.keys(THEME_INFO) as ThemeId[];

export const wordsFor = (theme: ThemeId | null | undefined): ThemeWords => (theme ? THEME_INFO[theme].words : DEFAULT_WORDS);

export const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** CSS variables that re-colour every `accent` utility inside an element. */
export function accentVars(theme: ThemeId): CSSProperties {
  const t = THEME_INFO[theme];
  return {
    "--color-accent": t.accent,
    "--color-accent-hover": t.accentHover,
    "--color-accent-dim": `color-mix(in srgb, ${t.accent} 14%, transparent)`,
    "--color-on-accent": t.onAccent,
    "--color-crowd": t.crowd ?? t.accent,
  } as CSSProperties;
}

// ---------- item words ----------

export const itemName = (w: ThemeWords, id: ItemId) => w.names[id];

/** The item's hint with this world's words filled in. */
export const itemHint = (w: ThemeWords, id: ItemId) =>
  ITEM_INFO[id].hint
    .replaceAll("{visitors}", w.visitors)
    .replaceAll("{servers}", w.parts.servers.toLowerCase())
    .replaceAll("{db}", w.parts.db.toLowerCase());

/** "Fraud check or Circuit breaker" — what beats this attack. */
export function counterText(w: ThemeWords, attack: AttackId): string {
  const names = ATTACK_INFO[attack].counter.map((id) => w.names[id]);
  return attack === "jam" ? `${names[0]} — before it lands` : names.join(" or ");
}
