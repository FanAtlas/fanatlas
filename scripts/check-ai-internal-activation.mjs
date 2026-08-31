#!/usr/bin/env node
/* global console, process, URL */
import { existsSync, readFileSync } from "node:fs";

const PROD_REF = "wipskgheygefoywebsmx";
const ALLOWED_TOOLS = new Set([
  "weather_lookup",
  "currency_conversion",
  "emergency_services_lookup",
  "destination_current_information",
  "itinerary_read",
  "trip_summary_read",
  "saved_places_read",
  "passport_summary_read",
  "travel_insights_read",
  "explorer_destination_summary_read"
]);
const ALLOWED_MODELS = new Set(["gpt-4o-mini"]);
const REQUIRED_INTERNAL_TASKS = new Set([
  "general_travel_question",
  "itinerary_generation",
  "packing_guidance",
  "budget_guidance",
  "emergency_guidance",
  "safety_guidance"
]);

function main() {
  loadEnvLocal();
  process.env.SUPABASE_URL ||= process.env.VITE_SUPABASE_URL;
  process.env.SUPABASE_ANON_KEY ||= process.env.VITE_SUPABASE_ANON_KEY;
  const reasons = [];

  requireEquals("FANATLAS_E2E_NONPRODUCTION", "true", reasons, "nonproduction_guard_missing");
  requireEquals("FANATLAS_AI_RELEASE_MODE", "internal", reasons, "release_mode_not_internal");
  requireEquals("FANATLAS_AI_COORDINATION_BACKEND", "supabase", reasons, "coordination_backend_not_shared");
  requireEquals("FANATLAS_AI_COORDINATION_LIVE_VALIDATED", "true", reasons, "live_coordination_not_validated");
  requireNotEquals("FANATLAS_AI_KILL_SWITCH", "true", reasons, "kill_switch_on");
  requireNotEquals("FANATLAS_AI_MOCK", "true", reasons, "mock_provider_enabled");
  requirePresent("FANATLAS_AI_INTERNAL_ALLOWLIST", reasons, "internal_allowlist_missing");
  requirePresent("OPENAI_API_KEY", reasons, "provider_key_missing");
  requirePresent("SUPABASE_URL", reasons, "supabase_url_missing");
  requirePresent("SUPABASE_ANON_KEY", reasons, "supabase_anon_missing");
  requirePresent("SUPABASE_SERVICE_ROLE_KEY", reasons, "service_role_missing");

  validateNonproductionSupabase(reasons);
  validateModel(reasons);
  validateQuotas(reasons);
  validateTaskAllowlist(reasons);
  validateToolAllowlist(reasons);
  validateToolConfig(reasons);

  const ready = reasons.length === 0;
  console.log(JSON.stringify({
    status: ready ? "READY" : "NOT_READY",
    productionDisabled: process.env.FANATLAS_AI_RELEASE_MODE !== "production",
    checks: {
      releaseMode: process.env.FANATLAS_AI_RELEASE_MODE === "internal",
      sharedCoordination: process.env.FANATLAS_AI_COORDINATION_BACKEND === "supabase",
      liveCoordinationValidated: process.env.FANATLAS_AI_COORDINATION_LIVE_VALIDATED === "true",
      internalEntitlementConfigured: Boolean(process.env.FANATLAS_AI_INTERNAL_ALLOWLIST),
      killSwitchOff: process.env.FANATLAS_AI_KILL_SWITCH !== "true",
      providerConfigured: Boolean(process.env.OPENAI_API_KEY),
      mockDisabled: process.env.FANATLAS_AI_MOCK !== "true",
      quotasConfigured: quotaOk(),
      taskAllowlistValid: taskAllowlistOk(),
      toolAllowlistValid: toolAllowlistOk(),
      toolConfigValid: toolConfigOk()
    },
    reasonCodes: reasons
  }, null, 2));
  if (!ready) process.exitCode = 1;
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

function requireEquals(name, expected, reasons, code) {
  if (process.env[name] !== expected) reasons.push(code);
}

function requireNotEquals(name, rejected, reasons, code) {
  if (process.env[name] === rejected) reasons.push(code);
}

function requirePresent(name, reasons, code) {
  if (!process.env[name]) reasons.push(code);
}

function validateNonproductionSupabase(reasons) {
  if (!process.env.SUPABASE_URL) return;
  try {
    const url = new URL(process.env.SUPABASE_URL);
    const productionRef = process.env.FANATLAS_PRODUCTION_SUPABASE_REF || PROD_REF;
    if (url.hostname.includes(productionRef) || url.hostname.includes(PROD_REF)) reasons.push("production_project_rejected");
    if (!/^https?:$/.test(url.protocol)) reasons.push("supabase_url_malformed");
  } catch {
    reasons.push("supabase_url_malformed");
  }
}

function validateModel(reasons) {
  const model = process.env.FANATLAS_AI_PRIMARY_MODEL || "gpt-4o-mini";
  if (!ALLOWED_MODELS.has(model)) reasons.push("model_not_allowlisted");
}

function validateQuotas(reasons) {
  if (!quotaOk()) reasons.push("quota_config_invalid");
}

function quotaOk() {
  return validInt(process.env.FANATLAS_AI_MAX_REQUESTS_PER_MINUTE, 1, 60)
    && validInt(process.env.FANATLAS_AI_MAX_REQUESTS_PER_DAY, 1, 500)
    && validInt(process.env.FANATLAS_AI_MAX_MODEL_CALLS_PER_REQUEST, 0, 3)
    && validInt(process.env.FANATLAS_AI_MAX_TOOL_CALLS_PER_REQUEST, 0, 3)
    && validInt(process.env.FANATLAS_AI_MAX_OUTPUT_CHARACTERS, 200, 4000);
}

function validateTaskAllowlist(reasons) {
  if (!taskAllowlistOk()) reasons.push("task_allowlist_missing_or_incomplete");
}

function taskAllowlistOk() {
  const values = new Set(csv(process.env.FANATLAS_AI_TASK_ALLOWLIST));
  if (values.size === 0) return false;
  return [...REQUIRED_INTERNAL_TASKS].every((task) => values.has(task));
}

function validateToolAllowlist(reasons) {
  if (!toolAllowlistOk()) reasons.push("tool_allowlist_invalid");
}

function toolAllowlistOk() {
  const values = csv(process.env.FANATLAS_AI_TOOL_ALLOWLIST);
  if (values.length === 0) return false;
  return values.every((tool) => ALLOWED_TOOLS.has(tool));
}

function validateToolConfig(reasons) {
  if (!toolConfigOk()) reasons.push("tool_config_invalid");
}

function toolConfigOk() {
  const weather = !enabled("FANATLAS_WEATHER_ENABLED") || ["open_meteo", "mock"].includes(process.env.FANATLAS_WEATHER_PROVIDER || "open_meteo");
  const currency = !enabled("FANATLAS_CURRENCY_ENABLED") || ["open_er_api", "mock"].includes(process.env.FANATLAS_CURRENCY_PROVIDER || "open_er_api");
  const research = !enabled("FANATLAS_CURRENT_RESEARCH_ENABLED") || ["configured_allowlist", "mock"].includes(process.env.FANATLAS_CURRENT_RESEARCH_PROVIDER || "configured_allowlist");
  return weather && currency && research;
}

function validInt(value, min, max) {
  if (value === undefined || value === "") return true;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max;
}

function csv(value) {
  return typeof value === "string" ? value.split(",").map((item) => item.trim()).filter(Boolean) : [];
}

function enabled(name) {
  return process.env[name] === "true";
}

main();
