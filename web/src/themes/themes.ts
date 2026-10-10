import type { AttackId, ItemId, Part, ThemeId } from "@server/types/contracts.js";
import type { CSSProperties } from "react";
import type { MusicStyle } from "../audio/sfx";
import { ATTACK_INFO, DEFAULT_NAMES, ITEM_INFO } from "../game/items";

/**
 * The worlds a room votes between (docs/GAME.md → Themes): four apps on your
 * phone, each with the moment the whole country opened it at once. Cosmetic
 * only — words, an accent colour, a logo, a music style and how the site is
 * drawn. Never rules or numbers. ok / warn / bad stay the game signals.
 */
export type Theme = {
  name: string;
  /** "Tickets", "Watch", "Listen", "Pay" — the category on the vote card. */
  category: string;
  /** What the app is, for anyone who hasn't used it. */
  about: string;
  /** The rush moment. */
  blurb: string;
  key: string;
  /** Served from web/public; falls back to the name if missing. */
  logo: string;
  accent: string;
  accentHover: string;
  /** Text on an accent-filled button. */
  onAccent: string;
  /** How the logo sits on a colour: on a paper label (transparent glyphs), or bare (an opaque app-icon tile). */
  logoStyle: "label" | "tile";
  /** The vote poster: this app's own colours, and the moment everyone opened it at once. */
  poster: Poster;
  /** The arena: the colours that take over the ground and the building. */
  arena: ArenaColours;
  /** Crowd colour on the arena, when the accent is too close to the red "gave up" dots. */
  crowd?: string;
  /** How the site is drawn in the arena. */
  place: "boxoffice" | "cinema" | "stage" | "terminals";
  words: ThemeWords;
  music: MusicStyle;
};

export type Poster = {
  bg: string;
  fg: string;
  /** The darker tone the votes fill the panel with. */
  deep: string;
  /** Colour of the big numerals, when not the text colour. */
  timeColor?: string;
  /** The hero: the time (or date) of the rush, stacked in two lines. */
  time: [string, string];
  moment: string;
  /** "People arriving" — a polyline over a 200×60 box, spiking at the moment. */
  rush: string;
  motif: "ticket" | "curtain" | "rings" | "dots";
};

export type ArenaColours = { ground: string; ground2: string; build: string; roof: string; roof2: string; crowd: string; nameInk: string };

/** The words the game fills in: "{Visitors} can't get in!" */
export type ThemeWords = {
  /** Plural, lower case: "fans". */
  visitors: string;
  /** Alert title when the counters can't keep up. */
  crowded: string;
  /** Said under "Your site is down". */
  downLine: string;
  /** Feed line when a rush starts. */
  rush: string;
  /** Buy-phase line per round (1, 2, 3). */
  rounds: [string, string, string];
  /** Arena labels, Title case: "Entry gate", "Ticket counters" (plural). */
  parts: Record<Part, string>;
  /** Every card's name in this world. */
  names: Record<ItemId, string>;
};

/** Used outside a themed match (and by tests). */
export const DEFAULT_WORDS: ThemeWords = {
  visitors: "visitors",
  crowded: "People can’t get in!",
  downLine: "nobody can get in",
  rush: "A rush is coming in",
  rounds: ["Round 1", "Round 2", "Final round"],
  parts: { door: "Gate", servers: "Servers" },
  names: DEFAULT_NAMES,
};

export const THEME_INFO: Record<ThemeId, Theme> = {
  bookmyshow: {
    name: "BookMyShow",
    category: "Tickets",
    about: "India’s ticket-booking app — movies, concerts and shows. Big concerts sell out in minutes.",
    blurb: "Concert tickets go live at 12:00.",
    key: "1",
    logo: "/themes/bookmyshow.png",
    accent: "#f84464",
    accentHover: "#ff6b86",
    onAccent: "#ffffff",
    logoStyle: "label",
    poster: { bg: "#f84464", fg: "#ffffff", deep: "#5a0014", time: ["12", "00"], moment: "The minute the concert tickets go live.", rush: "0,54 88,54 100,5 114,14 140,36 200,44", motif: "ticket" },
    arena: { ground: "#f84464", ground2: "#e53a59", build: "#fff4ee", roof: "#ffffff", roof2: "#f84464", crowd: "#ffffff", nameInk: "#0d0d0d" },
    crowd: "#ececee",
    place: "boxoffice",
    words: {
      visitors: "fans",
      crowded: "Fans are stuck in the queue!",
      downLine: "no one’s getting tickets",
      rush: "Tickets are live — fans rushing in!",
      rounds: ["Presale", "General sale", "Last tickets"],
      parts: { door: "Entry gate", servers: "Ticket counters" },
      names: {
        server: "Ticket counter",
        bouncer: "Robot check",
        lockAddress: "Verified link",
        repair: "Quick fix",
        shield: "Security",
        overclock: "Express lane",
        instantBackup: "Spare counters",
        surge: "Fan frenzy",
        bots: "Scalper bots",
        destroy: "Shut their counters",
        wrongTurn: "Fake ticket site",
        jam: "Freeze their screens",
      },
    },
    music: "race",
  },
  netflix: {
    name: "Netflix",
    category: "Watch",
    about: "The streaming app — films, series and live events, on every screen in the house.",
    blurb: "The season finale drops at midnight.",
    key: "2",
    logo: "/themes/netflix.png",
    accent: "#e50914",
    accentHover: "#f0444c",
    onAccent: "#ffffff",
    logoStyle: "label",
    poster: { bg: "#0c0c0c", fg: "#f3efe6", deep: "#e50914", timeColor: "#e50914", time: ["00", "00"], moment: "Midnight. The finale just dropped.", rush: "0,52 96,52 102,8 200,6", motif: "curtain" },
    arena: { ground: "#161616", ground2: "#1e1e1e", build: "#2b2b2b", roof: "#e50914", roof2: "#8f0710", crowd: "#f3efe6", nameInk: "#f3efe6" },
    crowd: "#ececee",
    place: "cinema",
    words: {
      visitors: "viewers",
      crowded: "Viewers are stuck buffering!",
      downLine: "everyone’s staring at a spinning wheel",
      rush: "The finale just dropped — everyone’s pressing play!",
      rounds: ["Episode 1", "Episode 2", "The finale"],
      parts: { door: "Entrance", servers: "Screens" },
      names: {
        server: "Extra screen",
        bouncer: "Password check",
        lockAddress: "Verified link",
        repair: "Rewind",
        shield: "Skip intro",
        overclock: "1.5× speed",
        instantBackup: "Backup screens",
        surge: "Binge wave",
        bots: "Fake accounts",
        destroy: "Smash their screens",
        wrongTurn: "Fake Netflix link",
        jam: "Freeze their remote",
      },
    },
    music: "trailer",
  },
  spotify: {
    name: "Spotify",
    category: "Listen",
    about: "The music app — playlists, podcasts, and your year in review once a year.",
    blurb: "Wrapped day — everyone opens it at once.",
    key: "3",
    logo: "/themes/spotify.png",
    accent: "#1ed760",
    accentHover: "#4be683",
    onAccent: "#0b0b0c",
    logoStyle: "tile",
    poster: { bg: "#1ed760", fg: "#08130c", deep: "#000000", time: ["01", "DEC"], moment: "Wrapped day. Everyone opens it at once.", rush: "0,50 60,46 120,38 150,22 160,5 172,26 200,32", motif: "rings" },
    arena: { ground: "#1ed760", ground2: "#19c556", build: "#0f2418", roof: "#0d0d0d", roof2: "#1ed760", crowd: "#f3efe6", nameInk: "#0d0d0d" },
    crowd: "#ececee",
    place: "stage",
    words: {
      visitors: "listeners",
      crowded: "Listeners are stuck loading!",
      downLine: "the music’s stopped",
      rush: "Wrapped is live — everyone’s opening it!",
      rounds: ["Intro", "Chorus", "The drop"],
      parts: { door: "Entry", servers: "DJ booths" },
      names: {
        server: "DJ booth",
        bouncer: "Stream check",
        lockAddress: "Verified link",
        repair: "Tune-up",
        shield: "Noise cancelling",
        overclock: "Bass boost",
        instantBackup: "Backup booths",
        surge: "Viral hit",
        bots: "Fake streams",
        destroy: "Wreck their booths",
        wrongTurn: "Fake Spotify link",
        jam: "Freeze their player",
      },
    },
    music: "chip",
  },
  gpay: {
    name: "Google Pay",
    category: "Pay",
    about: "The payments app — pay a shop, split a bill, or send money to a friend in seconds.",
    blurb: "Sale night — midnight deals, everyone paying at once.",
    key: "4",
    logo: "/themes/gpay.png",
    accent: "#1a73e8",
    accentHover: "#4a93f2",
    onAccent: "#ffffff",
    logoStyle: "label",
    poster: { bg: "#f6f4ee", fg: "#12315e", deep: "#1a73e8", timeColor: "#1a73e8", time: ["11", "59"], moment: "Sale night. Everyone paying at once.", rush: "0,52 40,50 50,14 60,48 100,46 110,10 120,46 160,44 170,6 182,42 200,42", motif: "dots" },
    arena: { ground: "#f2efe7", ground2: "#e7e3d8", build: "#ffffff", roof: "#1a73e8", roof2: "#8ab4f8", crowd: "#1a73e8", nameInk: "#0d0d0d" },
    place: "terminals",
    words: {
      visitors: "customers",
      crowded: "Payments are stuck on “processing”!",
      downLine: "every payment is failing",
      rush: "Midnight deals — everyone’s paying at once!",
      rounds: ["Sale opens", "Lightning deals", "Last minute"],
      parts: { door: "Shop door", servers: "Payment lanes" },
      names: {
        server: "Payment lane",
        bouncer: "Fraud check",
        lockAddress: "Verified QR",
        repair: "Quick fix",
        shield: "Safety shield",
        overclock: "Turbo pay",
        instantBackup: "Backup lanes",
        surge: "Sale rush",
        bots: "Scam bots",
        destroy: "Crash their lanes",
        wrongTurn: "Fake QR code",
        jam: "Freeze their phone",
      },
    },
    music: "ticker",
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

/** A page in the app's own poster colours (background, text, and the vars the motifs read). */
export function posterVars(theme: ThemeId | null | undefined): CSSProperties {
  const p = THEME_INFO[theme ?? "bookmyshow"].poster;
  return { backgroundColor: p.bg, color: p.fg, "--c": p.bg, "--fg": p.fg, "--deep": p.deep } as CSSProperties;
}

/** The CSS variables the arena scene reads — the app's colours on the ground and the building. */
export function arenaVars(theme: ThemeId | null | undefined): CSSProperties {
  const a = THEME_INFO[theme ?? "bookmyshow"].arena;
  return {
    "--arena-ground": a.ground,
    "--arena-ground2": a.ground2,
    "--arena-build": a.build,
    "--arena-roof": a.roof,
    "--arena-roof2": a.roof2,
    "--arena-crowd": a.crowd,
    "--arena-name": a.nameInk,
  } as CSSProperties;
}

// ---------- card words ----------

export const itemName = (w: ThemeWords, id: ItemId) => w.names[id];

/** The card's hint with this world's words filled in. */
export const itemHint = (w: ThemeWords, id: ItemId) =>
  ITEM_INFO[id].hint
    .replaceAll("{visitors}", w.visitors)
    .replaceAll("{servers}", w.parts.servers.toLowerCase())
    .replaceAll("{server}", w.names.server.toLowerCase());

/** What beats this attack, by name: "Robot check or Security". */
export function counterText(w: ThemeWords, attack: AttackId): string {
  const names = ATTACK_INFO[attack].counter.map((id) => w.names[id]);
  return attack === "jam" ? `${names[0]} — before it lands` : names.join(" or ");
}
