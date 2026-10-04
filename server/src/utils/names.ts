// Keeps rude names off lab PCs and the projector. Not exhaustive — the admin
// can still hide a team — just the obvious ones, including common Hindi abuse.

/** Caught anywhere in a name (after normalising): unambiguous even inside other words. */
const ANYWHERE = [
  "fuck", "bullshit", "bitch", "cunt", "nigg", "slut", "whore", "rapist", "porn", "pussy", "penis", "vagina",
  "chutiya", "chutia", "chootiya", "madarchod", "maderchod", "behenchod", "bhenchod", "benchod", "bhosd", "gaand", "gandu", "lauda",
  "lavda", "jhaant", "harami",
];

/**
 * Only as a whole word: they'd otherwise hit real names — Kshitij, Gandhi,
 * Chodankar, Randive, Peacock, Kutty, Dickens, Lundgren, Assam, class.
 */
const WHOLE_WORDS = new Set([
  "ass", "arse", "sex", "rape", "nazi", "hitler", "mc", "bc", "bsdk", "tits", "fag", "shit", "shitty", "dick", "cock", "boobs",
  "lund", "loda", "lodu", "randi", "chod", "kutta", "kutti", "kamina", "kamine",
]);

const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", $: "s", "!": "i" };

const normalise = (s: string) =>
  [...s.toLowerCase()]
    .map((c) => LEET[c] ?? c)
    .join("")
    .replace(/(.)\1{2,}/g, "$1"); // "fuuuck" → "fuck" (but "gaand" ≠ "Gandhi")

/** True if the name is fine to show on screen. */
export function isCleanName(name: string): boolean {
  const n = normalise(name);
  const squashed = n.replace(/[^a-z]/g, "");
  if (ANYWHERE.some((w) => squashed.includes(w))) return false;
  return !n.split(/[^a-z]+/).some((w) => WHOLE_WORDS.has(w));
}
