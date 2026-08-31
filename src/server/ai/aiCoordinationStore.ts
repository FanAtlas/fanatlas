import type { FanAtlasAIReleaseMode } from "../../lib/fanAtlasAIContracts";
import type { AICoordinationConfig, AICoordinationStores } from "./aiCoordinationTypes";
import { createMemoryAICoordinationStores } from "./memoryAICoordinationStore";
import { createSupabaseAICoordinationStores } from "./supabaseAICoordinationStore";

let memoryStores: AICoordinationStores | undefined;

export function validateAICoordinationConfig(input: {
  coordination: AICoordinationConfig;
  releaseMode: FanAtlasAIReleaseMode;
}) {
  const errors: string[] = [];
  const { coordination, releaseMode } = input;
  if (coordination.lockTtlMs < 5_000 || coordination.lockTtlMs > 10 * 60_000) errors.push("invalid_lock_ttl");
  if (coordination.idempotencyTtlMs < 60_000 || coordination.idempotencyTtlMs > 7 * 24 * 60 * 60_000) errors.push("invalid_idempotency_ttl");
  if (coordination.providerCooldownMs < 10_000 || coordination.providerCooldownMs > 30 * 60_000) errors.push("invalid_provider_cooldown");
  if (coordination.backend === "memory" && releaseMode === "production" && !coordination.allowMemoryInProduction) errors.push("memory_backend_not_allowed_in_production");
  if (coordination.backend === "supabase" && (!coordination.supabaseUrl || !coordination.supabaseServiceRoleKey)) errors.push("missing_supabase_coordination_config");
  return {
    ok: errors.length === 0,
    errors
  };
}

export function createAICoordinationStores(config: AICoordinationConfig): AICoordinationStores {
  if (config.backend === "memory") {
    if (!memoryStores) memoryStores = createMemoryAICoordinationStores();
    return memoryStores;
  }
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    throw Object.assign(new Error("AI coordination backend unavailable"), { code: "coordination_unavailable" });
  }
  return createSupabaseAICoordinationStores({
    supabaseUrl: config.supabaseUrl,
    serviceRoleKey: config.supabaseServiceRoleKey
  });
}

export function resetMemoryAICoordinationStoresForTests() {
  memoryStores = createMemoryAICoordinationStores();
  return memoryStores;
}
