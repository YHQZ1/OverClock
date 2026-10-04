// Join a room as a bot player — a sparring partner for testing.
// Usage: pnpm --filter @overclock/server exec tsx src/scripts/play.ts <CODE> [name] [url]

import { runBot } from "./botClient.js";

const [code, name = "Claude", url = "http://localhost:3000"] = process.argv.slice(2);
if (!code) {
  console.error("Usage: tsx src/scripts/play.ts <CODE> [name] [url]");
  process.exit(1);
}

const log = (msg: string) => console.log(`${new Date().toISOString().slice(11, 19)} ${msg}`);
const result = await runBot({ url, name, code, log });

if (result.final) {
  const t = result.final.totals;
  log(`FINAL — side 1 ${t[1].total} vs side 2 ${t[2].total}. GG!`);
}
for (const e of result.errors) log(`error: ${e}`);
process.exit(result.errors.length ? 1 : 0);
