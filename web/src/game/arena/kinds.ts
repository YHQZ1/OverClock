import type { ItemId } from "@server/types/contracts.js";
import { ATTACK_INFO, DEFENCE_INFO, UTILITY_INFO } from "../items";

export type CardKind = "defence" | "utility" | "attack";

/** How each kind of card looks: Defend (blue), Boost (amber), Attack (coral). Never used for health. */
export const KIND_STYLE = {
  defence: { label: "Defend", text: "text-defend", solid: "bg-defend", edge: "border-defend/45", fill: "bg-defend/10", glow: "#4cc9f0" },
  utility: { label: "Boost", text: "text-boost", solid: "bg-boost", edge: "border-boost/45", fill: "bg-boost/10", glow: "#ffb020" },
  attack: { label: "Attack", text: "text-attack", solid: "bg-attack", edge: "border-attack/45", fill: "bg-attack/10", glow: "#ff6b4a" },
} as const;

export const kindOf = (id: ItemId): CardKind => (id in DEFENCE_INFO ? "defence" : id in UTILITY_INFO ? "utility" : "attack");

/** The attacks a card is a counter to, best match first. */
export const stopsAttacks = (id: ItemId) => (Object.keys(ATTACK_INFO) as (keyof typeof ATTACK_INFO)[]).filter((a) => ATTACK_INFO[a].counter.includes(id));
