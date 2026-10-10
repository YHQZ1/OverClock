// Re-record the briefing's demo match from the real engine.
// Usage: pnpm --filter @overclock/server demo   (writes web/src/game/demo.json)

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildDemo } from "../services/demo.js";

const out = fileURLToPath(new URL("../../../web/src/game/demo.json", import.meta.url));
const { recording, summary } = buildDemo();
writeFileSync(out, `${JSON.stringify(recording)}\n`);

const kb = Math.round(JSON.stringify(recording).length / 1024);
console.log(`Wrote ${out}`);
console.log(`${recording.frames.length} frames · ${recording.durationSec}s · ${kb} KB`);
console.log(`landed: ${summary.landed.join(", ") || "-"} · blocked: ${summary.blocked.join(", ") || "-"}`);
