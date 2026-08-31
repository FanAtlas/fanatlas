import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const FRONTEND_DIRS = ["src/pages", "src/hooks", "src/components", "src/lib"];
const ALLOWED_SERVER_BOUNDARY_FILES = ["src/lib/tripDayLiveContext.ts"];

describe("AI server-only boundary", () => {
  it("keeps server-only AI infrastructure out of frontend-facing modules", () => {
    const offenders = FRONTEND_DIRS.flatMap((dir) => filesUnder(dir))
      .filter((file) => !file.endsWith(".test.ts") && !file.endsWith(".test.tsx"))
      .filter((file) => !ALLOWED_SERVER_BOUNDARY_FILES.includes(file))
      .filter((file) => {
        const contents = readFileSync(file, "utf8");
        return contents.includes("../server/ai")
          || contents.includes("src/server/ai")
          || contents.includes("../server/tools")
          || contents.includes("src/server/tools");
      });

    expect(offenders).toEqual([]);
  });

  it("commits Supabase coordination tables, security, and RPC functions", () => {
    const schema = readFileSync("supabase/schema.sql", "utf8");
    const migration = readFileSync("supabase/migrations/20260806000000_fanatlas_step54_ai_coordination.sql", "utf8");
    const lockRepair = readFileSync("supabase/migrations/20260812000000_fanatlas_step545_lock_status_repair.sql", "utf8");
    const atomicLockRepair = readFileSync("supabase/migrations/20260812010000_fanatlas_step545_atomic_lock_repair.sql", "utf8");
    const halfOpenRepair = readFileSync("supabase/migrations/20260816000000_fanatlas_step545_atomic_half_open_repair.sql", "utf8");
    const idempotencyRepair = readFileSync("supabase/migrations/20260816010000_fanatlas_step545_atomic_idempotency_repair.sql", "utf8");
    [
      "fanatlas_ai_usage_daily",
      "fanatlas_ai_usage_minute",
      "fanatlas_ai_concurrency_locks",
      "fanatlas_ai_idempotency",
      "fanatlas_ai_provider_health",
      "fanatlas_ai_tool_cache",
      "fanatlas_ai_reserve_quota",
      "fanatlas_ai_acquire_lock",
      "fanatlas_ai_start_idempotency",
      "fanatlas_ai_before_provider_call",
      "fanatlas_ai_cleanup_coordination",
      "enable row level security",
      "revoke all on fanatlas_ai_usage_daily from public, anon, authenticated",
      "revoke all on fanatlas_ai_tool_cache from public, anon, authenticated",
      "grant select, insert, update, delete on fanatlas_ai_tool_cache to service_role",
      "revoke execute on function fanatlas_ai_reserve_quota",
      "grant execute on function fanatlas_ai_reserve_quota",
      "v_had_existing boolean := false",
      "v_had_existing := found",
      "case when v_had_existing then 'stale_lock_recovered' else 'acquired' end"
    ].forEach((expected) => {
      expect(schema).toContain(expected);
      expect(migration).toContain(expected);
    });

    [
      "v_had_existing boolean := false",
      "v_had_existing := found",
      "case when v_had_existing then 'stale_lock_recovered' else 'acquired' end",
      "revoke execute on function fanatlas_ai_acquire_lock(text, uuid, text, text, timestamptz, integer) from public, anon, authenticated",
      "grant execute on function fanatlas_ai_acquire_lock(text, uuid, text, text, timestamptz, integer) to service_role"
    ].forEach((expected) => {
      expect(lockRepair).toContain(expected);
    });

    [
      "perform pg_advisory_xact_lock(hashtextextended(p_lock_key, 0))",
      "v_had_existing boolean := false",
      "v_had_existing := found",
      "case when v_had_existing then 'stale_lock_recovered' else 'acquired' end",
      "revoke execute on function fanatlas_ai_acquire_lock(text, uuid, text, text, timestamptz, integer) from public, anon, authenticated",
      "grant execute on function fanatlas_ai_acquire_lock(text, uuid, text, text, timestamptz, integer) to service_role"
    ].forEach((expected) => {
      expect(schema).toContain(expected);
      expect(atomicLockRepair).toContain(expected);
    });

    [
      "pg_advisory_xact_lock(hashtextextended('fanatlas_ai_provider_health:' || p_provider_profile_id, 0))",
      "state = 'half_open'",
      "half_open_lease_until is null or half_open_lease_until <= p_now",
      "return jsonb_build_object('allowed', false, 'state', 'half_open')"
    ].forEach((expected) => {
      expect(schema).toContain(expected);
      expect(halfOpenRepair).toContain(expected);
    });

    [
      "pg_advisory_xact_lock(hashtextextended('fanatlas_ai_idempotency:' || p_user_id::text || ':' || p_client_request_id, 0))",
      "primary key (user_id, client_request_id)",
      "return jsonb_build_object('status', 'processing')",
      "return jsonb_build_object('status', 'conflict')"
    ].forEach((expected) => {
      expect(schema).toContain(expected);
    });
    [
      "pg_advisory_xact_lock(hashtextextended('fanatlas_ai_idempotency:' || p_user_id::text || ':' || p_client_request_id, 0))",
      "return jsonb_build_object('status', 'processing')",
      "return jsonb_build_object('status', 'conflict')"
    ].forEach((expected) => {
      expect(idempotencyRepair).toContain(expected);
    });

    [
      "fanatlas_ai_usage_daily",
      "fanatlas_ai_usage_minute",
      "fanatlas_ai_concurrency_locks",
      "fanatlas_ai_idempotency",
      "fanatlas_ai_provider_health",
      "fanatlas_ai_tool_cache"
    ].forEach((table) => {
      expect(schema).toContain(`revoke all on ${table} from public, anon, authenticated`);
      expect(migration).toContain(`revoke all on ${table} from public, anon, authenticated`);
    });

    [
      "fanatlas_ai_usage_daily",
      "fanatlas_ai_usage_minute",
      "fanatlas_ai_concurrency_locks",
      "fanatlas_ai_provider_health",
      "fanatlas_ai_tool_cache"
    ].forEach((table) => {
      expect(schema).toContain(`grant select, insert, update, delete on ${table} to service_role`);
      expect(migration).toContain(`grant select, insert, update, delete on ${table} to service_role`);
    });

    expect(schema).not.toContain("grant select, insert, update, delete on fanatlas_ai_idempotency to service_role");
    expect(migration).not.toContain("grant select, insert, update, delete on fanatlas_ai_idempotency to service_role");
  });

  it("keeps AI coordination grant repair narrow and server-only", () => {
    const script = readFileSync("scripts/repair-ai-coordination-grants.mjs", "utf8");
    const frontend = FRONTEND_DIRS.flatMap((dir) => filesUnder(dir))
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");

    expect(script).toContain("FANATLAS_E2E_NONPRODUCTION");
    expect(script).toContain("production_ref_rejected");
    expect(script).toContain("grant select, insert, update, delete on fanatlas_ai_tool_cache to service_role");
    expect(script).toContain("revoke all on fanatlas_ai_tool_cache from public, anon, authenticated");
    expect(script).toContain("grant execute on function fanatlas_ai_reserve_quota");
    expect(script).not.toContain("create or replace function");
    expect(script).not.toContain("/rest/v1/rpc");
    expect(script).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(script).not.toContain("grant select, insert, update, delete on fanatlas_ai_idempotency to service_role");
    expect(frontend).not.toContain("repair-ai-coordination-grants");
    expect(frontend).not.toContain("PERMISSION_REPAIR_SQL");
    expect(frontend).not.toContain("grant select, insert, update, delete on fanatlas_ai_tool_cache");
  });

  it("keeps authenticated E2E auth state ignored and production guarded", () => {
    const gitignore = readFileSync(".gitignore", "utf8");
    const authHelper = readFileSync("tests/e2e/helpers/auth.ts", "utf8");
    const setupScript = readFileSync("scripts/e2e-auth-setup.mjs", "utf8");
    const releaseGate = readFileSync("scripts/check-ai-release-gate.mjs", "utf8");

    expect(gitignore).toContain("tests/e2e/.auth/");
    expect(gitignore).toContain("*.storage-state.json");
    expect(authHelper).toContain("FANATLAS_E2E_NONPRODUCTION");
    expect(authHelper).toContain("Supabase URL appears to target production.");
    expect(setupScript).toContain("FANATLAS_E2E_AUTH_PASSWORD");
    expect(setupScript).toContain("Refusing to create auth state against production Supabase.");
    expect(setupScript).toContain("tests/e2e/.auth");
    expect(setupScript).not.toContain("console.log(config.password");
    expect(releaseGate).toContain("missing_evidence");
    expect(releaseGate).toContain("liveFlagShouldRemainFalse");
  });

  it("keeps secrets and test auth bypasses out of browser-facing code", () => {
    const frontend = FRONTEND_DIRS.flatMap((dir) => filesUnder(dir))
      .filter((file) => !file.endsWith(".test.ts") && !file.endsWith(".test.tsx"))
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");

    expect(frontend).not.toMatch(/import\.meta\.env\.(SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY|GOOGLE_GENERATIVE_AI_API_KEY)/);
    expect(frontend).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/);
    expect(frontend).not.toContain("FANATLAS_E2E_AUTH_PASSWORD");
    expect(frontend).not.toContain("FANATLAS_AI_OPERATIONAL_TELEMETRY");
    expect(frontend).not.toContain("aiOperationalTelemetry");
    expect(frontend).not.toContain("test-token");
    expect(frontend).not.toContain("auth_bypass");
    expect(frontend).not.toContain("fanatlas-validation-e2e");
  });

  it("keeps synthetic live validation cleanup scoped to test-owned identifiers", () => {
    const liveScript = readFileSync("scripts/live-ai-coordination.mjs", "utf8");

    expect(liveScript).toContain('const VALIDATION_PREFIX = "fanatlas-validation"');
    expect(liveScript).toContain("cleanupValidationNamespace(config, \"startup.namespace_cleanup\")");
    expect(liveScript).toContain("cleanupTrackedSyntheticRows(config)");
    expect(liveScript).toContain("provider_profile_id=like.");
    expect(liveScript).not.toMatch(/truncate\s+table/i);
    expect(liveScript).not.toContain("fanatlas_ai_usage_daily?user_id=like.");
    expect(liveScript).not.toContain("fanatlas_ai_idempotency?user_id=like.");
  });

  it("keeps live idempotency repair evidence explicit and repeatable", () => {
    const liveScript = readFileSync("scripts/live-ai-coordination.mjs", "utf8");
    const releaseGate = readFileSync("scripts/check-ai-release-gate.mjs", "utf8");
    const packageJson = readFileSync("package.json", "utf8");

    expect(liveScript).toContain('mode === "idempotency-definition"');
    expect(liveScript).toContain("pg_get_functiondef");
    expect(liveScript).toContain("status: \"unknown\"");
    expect(liveScript).toContain("\"repaired\"");
    expect(liveScript).toContain("\"outdated\"");
    expect(liveScript).toContain("mode === \"idempotency-stress\"");
    expect(liveScript).toContain("startedCountPerRun");
    expect(liveScript).not.toContain("console.log(definition");
    expect(releaseGate).toContain("live_coordination_contracts_first");
    expect(releaseGate).toContain("live_coordination_contracts_second");
    expect(releaseGate).toContain("live_idempotency_stress");
    expect(packageJson).toContain("check:ai-idempotency-definition");
    expect(packageJson).toContain("test:ai-coordination:idempotency-stress");
  });
});

function filesUnder(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) return filesUnder(path);
    return /\.(ts|tsx)$/.test(path) ? [path] : [];
  });
}
