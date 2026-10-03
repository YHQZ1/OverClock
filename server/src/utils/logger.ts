type Level = "info" | "warn" | "error";

function log(level: Level, msg: string, extra?: Record<string, unknown>) {
  const line = `${new Date().toISOString()} ${level.toUpperCase().padEnd(5)} ${msg}`;
  const out = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  if (extra) out(line, extra);
  else out(line);
}

export const logger = {
  info: (msg: string, extra?: Record<string, unknown>) => log("info", msg, extra),
  warn: (msg: string, extra?: Record<string, unknown>) => log("warn", msg, extra),
  error: (msg: string, extra?: Record<string, unknown>) => log("error", msg, extra),
};
