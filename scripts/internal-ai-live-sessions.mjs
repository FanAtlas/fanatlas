#!/usr/bin/env node
/* global process */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

loadEnvLocal();
process.env.FANATLAS_AI_INTERNAL_LIVE = "true";
const check = spawnSync("node", ["scripts/check-ai-internal-activation.mjs"], { stdio: "inherit", env: process.env });
if (check.status !== 0) process.exit(check.status || 1);

const result = spawnSync("npx", ["vitest", "run", "src/server/ai/internalLiveSessions.test.js"], {
  stdio: "inherit",
  env: process.env
});
process.exit(result.status || 0);

function loadEnvLocal() {
  for (const path of [".env.local", ".env"]) {
    if (!existsSync(path)) continue;
    const contents = readFileSync(path, "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key] !== undefined) continue;
      process.env[key] = parseEnvValue(rawValue);
    }
  }
  process.env.SUPABASE_URL ||= process.env.VITE_SUPABASE_URL;
  process.env.SUPABASE_ANON_KEY ||= process.env.VITE_SUPABASE_ANON_KEY;
}

function parseEnvValue(rawValue) {
  const value = rawValue.trim();
  if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) return value.slice(1, -1);
  return value;
}
