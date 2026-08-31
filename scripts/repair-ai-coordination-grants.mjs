#!/usr/bin/env node
/* global console, process, URL */
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const PROD_REF = "wipskgheygefoywebsmx";

const PERMISSION_REPAIR_SQL = `
revoke all on fanatlas_ai_usage_daily from public, anon, authenticated;
revoke all on fanatlas_ai_usage_minute from public, anon, authenticated;
revoke all on fanatlas_ai_concurrency_locks from public, anon, authenticated;
revoke all on fanatlas_ai_idempotency from public, anon, authenticated;
revoke all on fanatlas_ai_provider_health from public, anon, authenticated;
revoke all on fanatlas_ai_tool_cache from public, anon, authenticated;

grant select, insert, update, delete on fanatlas_ai_usage_daily to service_role;
grant select, insert, update, delete on fanatlas_ai_usage_minute to service_role;
grant select, insert, update, delete on fanatlas_ai_concurrency_locks to service_role;
grant select, insert, update, delete on fanatlas_ai_provider_health to service_role;
grant select, insert, update, delete on fanatlas_ai_tool_cache to service_role;

revoke execute on function fanatlas_ai_reserve_quota(uuid, text, date, timestamptz, integer, integer, timestamptz) from public, anon, authenticated;
revoke execute on function fanatlas_ai_finalize_usage(uuid, date, integer, integer, integer, integer, integer, integer) from public, anon, authenticated;
revoke execute on function fanatlas_ai_acquire_lock(text, uuid, text, text, timestamptz, integer) from public, anon, authenticated;
revoke execute on function fanatlas_ai_release_lock(text, text) from public, anon, authenticated;
revoke execute on function fanatlas_ai_start_idempotency(uuid, text, text, timestamptz, integer) from public, anon, authenticated;
revoke execute on function fanatlas_ai_complete_idempotency(uuid, text, text, text, jsonb, timestamptz, integer) from public, anon, authenticated;
revoke execute on function fanatlas_ai_before_provider_call(text, timestamptz, integer) from public, anon, authenticated;
revoke execute on function fanatlas_ai_record_provider_success(text, timestamptz) from public, anon, authenticated;
revoke execute on function fanatlas_ai_record_provider_failure(text, text, timestamptz, integer) from public, anon, authenticated;
revoke execute on function fanatlas_ai_cleanup_coordination(timestamptz) from public, anon, authenticated;

grant execute on function fanatlas_ai_reserve_quota(uuid, text, date, timestamptz, integer, integer, timestamptz) to service_role;
grant execute on function fanatlas_ai_finalize_usage(uuid, date, integer, integer, integer, integer, integer, integer) to service_role;
grant execute on function fanatlas_ai_acquire_lock(text, uuid, text, text, timestamptz, integer) to service_role;
grant execute on function fanatlas_ai_release_lock(text, text) to service_role;
grant execute on function fanatlas_ai_start_idempotency(uuid, text, text, timestamptz, integer) to service_role;
grant execute on function fanatlas_ai_complete_idempotency(uuid, text, text, text, jsonb, timestamptz, integer) to service_role;
grant execute on function fanatlas_ai_before_provider_call(text, timestamptz, integer) to service_role;
grant execute on function fanatlas_ai_record_provider_success(text, timestamptz) to service_role;
grant execute on function fanatlas_ai_record_provider_failure(text, text, timestamptz, integer) to service_role;
grant execute on function fanatlas_ai_cleanup_coordination(timestamptz) to service_role;
`;

function main() {
  try {
    loadEnvLocal();
    const config = readConfig();
    validateNonproduction(config);
    validateCommittedSql();
    applyRepair(config.databaseUrl);
    printSafe({ status: "passed", phase: "repair.apply_grants" });
  } catch (error) {
    printSafe({
      status: "failed",
      phase: error?.phase || "repair.startup",
      errorCode: error?.code || "repair_failed",
      message: safeError(error)
    });
    process.exit(1);
  }
}

function loadEnvLocal() {
  const path = ".env.local";
  if (!existsSync(path)) return;
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

function parseEnvValue(rawValue) {
  const value = rawValue.trim();
  if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function readConfig() {
  const databaseUrl = process.env.SUPABASE_DB_URL
    || process.env.DATABASE_URL
    || process.env.POSTGRES_URL
    || process.env.POSTGRES_PRISMA_URL;
  if (!databaseUrl) {
    throw safe("repair.no_database_url", "database_connection_missing", "No nonproduction Postgres connection string is configured.");
  }
  return {
    databaseUrl,
    supabaseUrl: process.env.SUPABASE_URL,
    nonproduction: process.env.FANATLAS_E2E_NONPRODUCTION === "true",
    productionRef: process.env.FANATLAS_PRODUCTION_SUPABASE_REF || PROD_REF
  };
}

function validateNonproduction(config) {
  if (!config.nonproduction) throw safe("repair.guard", "nonproduction_guard_missing", "FANATLAS_E2E_NONPRODUCTION must be true.");
  validateUrl(config.databaseUrl, config.productionRef, "repair.database_guard");
  if (config.supabaseUrl) validateUrl(config.supabaseUrl, config.productionRef, "repair.supabase_guard");
  if (process.env.FANATLAS_AI_COORDINATION_LIVE_VALIDATED === "true") {
    throw safe("repair.guard", "live_validation_flag_enabled", "Live validation flag must remain disabled during grant repair.");
  }
}

function validateUrl(value, productionRef, phase) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw safe(phase, "invalid_url", "Configured URL is invalid.");
  }
  if (url.hostname.includes(productionRef) || url.hostname.includes(PROD_REF)) {
    throw safe(phase, "production_ref_rejected", "Refusing to modify the known production Supabase project.");
  }
}

function validateCommittedSql() {
  const migration = readFileSync("supabase/migrations/20260806000000_fanatlas_step54_ai_coordination.sql", "utf8");
  [
    "revoke all on fanatlas_ai_tool_cache from public, anon, authenticated",
    "grant select, insert, update, delete on fanatlas_ai_tool_cache to service_role",
    "revoke execute on function fanatlas_ai_reserve_quota",
    "grant execute on function fanatlas_ai_reserve_quota"
  ].forEach((expected) => {
    if (!migration.includes(expected)) {
      throw safe("repair.committed_sql", "committed_sql_mismatch", "Committed coordination permission SQL is missing an expected statement.");
    }
  });
}

function applyRepair(databaseUrl) {
  const result = spawnSync("psql", [
    databaseUrl,
    "--no-psqlrc",
    "--set=ON_ERROR_STOP=1",
    "--quiet"
  ], {
    input: PERMISSION_REPAIR_SQL,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"]
  });

  if (result.error?.code === "ENOENT") {
    throw safe("repair.apply_grants", "psql_unavailable", "psql is not available for nonproduction grant repair.");
  }
  if (result.error) {
    throw safe("repair.apply_grants", "database_repair_failed", "Database grant repair failed.");
  }
  if (result.status !== 0) {
    throw safe("repair.apply_grants", "database_repair_failed", sanitizePsqlError(result.stderr));
  }
}

function sanitizePsqlError(stderr) {
  const firstLine = String(stderr || "").split(/\r?\n/).find(Boolean);
  if (!firstLine) return "Database grant repair failed.";
  return firstLine
    .replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted-database-url]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .slice(0, 180);
}

function safe(phase, code, message) {
  return Object.assign(new Error(message), { phase, code });
}

function safeError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(/https?:\/\/\S+/gi, "[redacted-url]")
    .replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted-database-url]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .slice(0, 220);
}

function printSafe(payload) {
  console.log(JSON.stringify(payload, null, 2));
}

main();
