import { fileURLToPath } from "node:url";
import { z } from "zod";

const defaultWebDist = fileURLToPath(new URL("../../../web/dist", import.meta.url));

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  WEB_DIST: z.string().default(defaultWebDist),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}
