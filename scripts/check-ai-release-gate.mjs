#!/usr/bin/env node
/* global console, process */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const REQUIRED_LIVE_ENV = [
  "FANATLAS_E2E_NONPRODUCTION",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY"
];

const checks = [];
const DEFAULT_AUTH_STORAGE_STATE = "tests/e2e/.auth/fanatlas-nonproduction.storage-state.json";
const OFFLINE_ENV_REMOVALS = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_DB_URL",
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "VITE_OPENAI_API_KEY",
  "VITE_ANTHROPIC_API_KEY",
  "VITE_GOOGLE_GENERATIVE_AI_API_KEY"
];

function main() {
  loadEnvLocal();
  process.env.SUPABASE_URL ||= process.env.VITE_SUPABASE_URL;
  process.env.SUPABASE_ANON_KEY ||= process.env.VITE_SUPABASE_ANON_KEY;
  process.env.VITE_SUPABASE_URL ||= process.env.SUPABASE_URL;
  process.env.VITE_SUPABASE_ANON_KEY ||= process.env.SUPABASE_ANON_KEY;
  process.env.FANATLAS_E2E_AUTH_STORAGE_STATE ||= DEFAULT_AUTH_STORAGE_STATE;
  run("typecheck", ["npm", "run", "typecheck"], offlineEnv());
  run("lint", ["npm", "run", "lint"], offlineEnv());
  run("unit", ["npm", "run", "test"], offlineEnv());
  run("ai_evaluations", ["npm", "run", "test:ai-evals"], offlineEnv());
  run("ai_coordination", ["npm", "run", "test:ai-coordination"], offlineEnv());
  run("ai_tools", ["npm", "run", "test:ai-tools"], offlineEnv());
  run("server_boundary_security", ["npm", "run", "test", "--", "src/server/ai/aiServerBoundary.test.js"], offlineEnv());

  if (process.env.FANATLAS_AI_RELEASE_GATE_RUN_LIVE === "true" && hasEnv(REQUIRED_LIVE_ENV)) {
    run("live_coordination_readiness", ["npm", "run", "check:ai-coordination"], process.env);
    run("live_coordination_contracts_first", ["npm", "run", "test:ai-coordination:live"], process.env);
    run("live_coordination_contracts_second", ["npm", "run", "test:ai-coordination:live"], process.env);
    run("live_idempotency_stress", ["npm", "run", "test:ai-coordination:idempotency-stress"], process.env);
  } else {
    checks.push({ name: "live_coordination_readiness", status: "missing_evidence" });
    checks.push({ name: "live_coordination_contracts_first", status: "missing_evidence" });
    checks.push({ name: "live_coordination_contracts_second", status: "missing_evidence" });
    checks.push({ name: "live_idempotency_stress", status: "missing_evidence" });
  }

  if (hasAuthEvidence()) {
    run("authenticated_e2e", ["npm", "run", "test:e2e:authenticated"], process.env);
  } else {
    checks.push({ name: "authenticated_e2e", status: "missing_evidence" });
  }

  const ready = checks.every((check) => check.status === "passed");
  console.log(JSON.stringify({
    status: ready ? "ready" : "not_ready",
    liveFlagShouldRemainFalse: true,
    checks
  }, null, 2));
  if (!ready) process.exit(1);
}

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
}

function parseEnvValue(rawValue) {
  const value = rawValue.trim();
  if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) return value.slice(1, -1);
  return value;
}

function run(name, command, env) {
  const result = spawnSync(command[0], command.slice(1), {
    stdio: "inherit",
    env
  });
  checks.push({ name, status: result.status === 0 ? "passed" : "failed" });
}

function offlineEnv() {
  const env = { ...process.env };
  for (const name of OFFLINE_ENV_REMOVALS) delete env[name];
  for (const name of Object.keys(env)) {
    if (name.startsWith("FANATLAS_AI_")) delete env[name];
  }
  env.FANATLAS_AI_COORDINATION_BACKEND = "memory";
  env.FANATLAS_AI_COORDINATION_LIVE_VALIDATED = "false";
  return env;
}

function hasEnv(names) {
  return names.every((name) => Boolean(process.env[name]));
}

function hasAuthEvidence() {
  return process.env.FANATLAS_E2E_NONPRODUCTION === "true"
    && Boolean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)
    && Boolean(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY)
    && Boolean(process.env.FANATLAS_E2E_AUTH_STORAGE_STATE)
    && existsSync(process.env.FANATLAS_E2E_AUTH_STORAGE_STATE || "");
}

main();
