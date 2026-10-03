// Public surface of the pure game engine. Nothing in sim/ may touch
// Express, Socket.IO, the database, the clock or Math.random.

export { DEFAULT_CONFIG, toTicks, type SimConfig } from "./config.js";
export { ROUND_1, type Scenario, type EventSpec, type RushSpec } from "./scenario.js";
export { createMatch, step, type MatchSetup } from "./engine.js";
export { scoreOf, type ScoreBreakdown } from "./score.js";
export { runMatch, replay, type ActionLog, type MatchRun, type Policy } from "./run.js";
export { BOTS, type BotName } from "./bots.js";
export type * from "./types.js";
