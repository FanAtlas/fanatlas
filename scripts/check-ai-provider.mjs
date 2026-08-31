#!/usr/bin/env node
/* global console, fetch, process, URL */
import { existsSync, readFileSync } from "node:fs";

const KNOWN_PRODUCTION_SUPABASE_REF = "wipskgheygefoywebsmx";
const OFFICIAL_OPENAI_BASE_URL = "https://api.openai.com";
const ALLOWED_MODELS = new Set(["gpt-4o-mini", "gpt-4o-mini-2024-07-18"]);
const REQUIRED_INTERNAL_TASKS = new Set([
  "general_travel_question",
  "itinerary_generation",
  "packing_guidance",
  "budget_guidance",
  "emergency_guidance",
  "safety_guidance"
]);
const APPROVED_TOOLS = new Set([
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

async function main() {
  loadEnvLocal();
  aliasSupabaseEnv();

  const probe = process.argv.includes("--probe");
  const reasons = [];
  const model = process.env.FANATLAS_AI_PRIMARY_MODEL || "gpt-4o-mini";
  const baseUrl = normalizeBaseUrl(process.env.OPENAI_BASE_URL || OFFICIAL_OPENAI_BASE_URL);

  checkConfig(reasons, model, baseUrl);
  const circuit = await readCircuitState().catch(() => ({ status: "unknown", state: "unknown" }));
  if (circuit.state === "open" && circuit.cooldownActive) reasons.push("provider_circuit_open");

  let modelLookup;
  if (reasons.length === 0) {
    modelLookup = await retrieveModel(baseUrl, model);
    if (modelLookup.status !== "available") reasons.push(modelLookup.reasonCode);
  }

  let probeResult;
  if (probe && reasons.length === 0) {
    probeResult = await runMinimalProviderProbe(baseUrl, model);
    if (probeResult.status !== "passed") reasons.push(probeResult.failureCategory);
  }

  const ready = reasons.length === 0;
  console.log(JSON.stringify({
    status: ready ? "READY" : "NOT_READY",
    probeExecuted: Boolean(probeResult),
    checks: {
      openAIKeyPresent: Boolean(process.env.OPENAI_API_KEY),
      openAIKeyFormatPlausible: plausibleOpenAIKey(process.env.OPENAI_API_KEY),
      viteOpenAIKeyAbsent: !process.env.VITE_OPENAI_API_KEY,
      modelConfigured: Boolean(model),
      modelAllowlisted: ALLOWED_MODELS.has(model),
      releaseModeInternal: process.env.FANATLAS_AI_RELEASE_MODE === "internal",
      internalEntitlementConfigured: Boolean(process.env.FANATLAS_AI_INTERNAL_ALLOWLIST),
      killSwitchOff: process.env.FANATLAS_AI_KILL_SWITCH !== "true",
      sharedCoordination: process.env.FANATLAS_AI_COORDINATION_BACKEND === "supabase",
      liveCoordinationValidated: process.env.FANATLAS_AI_COORDINATION_LIVE_VALIDATED === "true",
      nonproductionSupabase: nonproductionSupabaseOk(),
      taskAllowlistValid: taskAllowlistOk(),
      toolAllowlistValid: toolAllowlistOk(),
      officialOpenAIEndpoint: baseUrl === OFFICIAL_OPENAI_BASE_URL,
      providerCircuit: circuit.state || "unknown",
      providerCircuitCooldownActive: Boolean(circuit.cooldownActive),
      modelLookup: modelLookup?.status || "not_checked"
    },
    diagnostics: {
      model,
      circuitState: circuit.state || "unknown",
      providerHttpStatus: probeResult?.httpStatus || modelLookup?.httpStatus,
      providerErrorCategory: probeResult?.failureCategory || modelLookup?.failureCategory,
      normalizedErrorCode: probeResult?.normalizedErrorCode || modelLookup?.normalizedErrorCode,
      retryAfterSeconds: probeResult?.retryAfterSeconds || modelLookup?.retryAfterSeconds,
      providerRequestIdPresent: Boolean(probeResult?.requestId || modelLookup?.requestId)
    },
    reasonCodes: [...new Set(reasons)]
  }, null, 2));
  if (!ready) process.exitCode = 1;
}

function checkConfig(reasons, model, baseUrl) {
  if (!process.env.OPENAI_API_KEY) reasons.push("openai_api_key_missing");
  if (!plausibleOpenAIKey(process.env.OPENAI_API_KEY)) reasons.push("openai_api_key_format_invalid");
  if (process.env.VITE_OPENAI_API_KEY) reasons.push("browser_openai_key_configured");
  if (!model) reasons.push("model_missing");
  if (!ALLOWED_MODELS.has(model)) reasons.push("model_not_allowlisted");
  if (process.env.FANATLAS_AI_RELEASE_MODE !== "internal") reasons.push("release_mode_not_internal");
  if (!process.env.FANATLAS_AI_INTERNAL_ALLOWLIST) reasons.push("internal_allowlist_missing");
  if (process.env.FANATLAS_AI_KILL_SWITCH === "true") reasons.push("kill_switch_on");
  if (process.env.FANATLAS_AI_COORDINATION_BACKEND !== "supabase") reasons.push("coordination_backend_not_shared");
  if (process.env.FANATLAS_AI_COORDINATION_LIVE_VALIDATED !== "true") reasons.push("live_coordination_not_validated");
  if (!nonproductionSupabaseOk()) reasons.push("supabase_nonproduction_guard_failed");
  if (!taskAllowlistOk()) reasons.push("task_allowlist_missing_or_incomplete");
  if (!toolAllowlistOk()) reasons.push("tool_allowlist_invalid");
  if (baseUrl !== OFFICIAL_OPENAI_BASE_URL) reasons.push("openai_base_url_not_official");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) reasons.push("service_role_missing");
}

async function retrieveModel(baseUrl, model) {
  const response = await fetch(`${baseUrl}/v1/models/${encodeURIComponent(model)}`, {
    headers: authHeaders()
  });
  const requestId = response.headers.get("x-request-id") || undefined;
  const retryAfterSeconds = parseRetryAfter(response.headers.get("retry-after"));
  const body = await parseJson(response);
  if (response.ok) return { status: "available", httpStatus: response.status, requestId };
  const classified = classifyProviderError(response.status, body);
  return {
    status: "unavailable",
    httpStatus: response.status,
    requestId,
    retryAfterSeconds,
    ...classified
  };
}

async function runMinimalProviderProbe(baseUrl, model) {
  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 2,
      messages: [{ role: "user", content: "Reply OK." }]
    })
  });
  const requestId = response.headers.get("x-request-id") || undefined;
  const retryAfterSeconds = parseRetryAfter(response.headers.get("retry-after"));
  const body = await parseJson(response);
  if (!response.ok) {
    return {
      status: "failed",
      httpStatus: response.status,
      requestId,
      retryAfterSeconds,
      ...classifyProviderError(response.status, body)
    };
  }
  const content = String(body?.choices?.[0]?.message?.content || "").trim();
  if (!content) {
    return {
      status: "failed",
      httpStatus: response.status,
      requestId,
      failureCategory: "malformed_provider_response",
      normalizedErrorCode: "malformed_provider_response"
    };
  }
  return {
    status: "passed",
    httpStatus: response.status,
    requestId,
    failureCategory: undefined,
    normalizedErrorCode: undefined,
    usagePresent: Boolean(body?.usage)
  };
}

function classifyProviderError(httpStatus, body) {
  const error = body?.error && typeof body.error === "object" ? body.error : {};
  const type = String(error.type || "").toLowerCase();
  const code = String(error.code || "").toLowerCase();
  const message = String(error.message || "").toLowerCase();
  const combined = `${type} ${code} ${message}`;

  if (httpStatus === 401) return providerFailure("invalid_api_key");
  if (httpStatus === 404 || combined.includes("model_not_found") || combined.includes("does not exist")) return providerFailure("model_not_found");
  if (combined.includes("insufficient_quota") || combined.includes("billing") || combined.includes("quota")) return providerFailure("billing_or_quota_exhausted");
  if (httpStatus === 429) return providerFailure("request_rate_limited");
  if (httpStatus === 403 && (combined.includes("project") || combined.includes("organization"))) return providerFailure("project_configuration_error");
  if (httpStatus === 403 || combined.includes("not have access") || combined.includes("not allowed")) return providerFailure("model_not_allowed_for_project");
  if (httpStatus >= 500) return providerFailure("provider_unavailable");
  return providerFailure("unknown");
}

function providerFailure(category) {
  const normalized = category === "request_rate_limited" || category === "billing_or_quota_exhausted"
    ? "provider_rate_limited"
    : category === "provider_timeout"
      ? "provider_timeout"
      : category === "malformed_provider_response"
        ? "invalid_provider_output"
        : "provider_unavailable";
  return { failureCategory: category, normalizedErrorCode: normalized, reasonCode: category };
}

async function readCircuitState() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return { status: "unknown", state: "unknown" };
  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/fanatlas_ai_provider_health?provider_profile_id=eq.fanatlas-primary-concierge&select=state,cooldown_until,half_open_lease_until&limit=1`, {
    headers: serviceHeaders()
  });
  if (!response.ok) return { status: "unknown", state: "unknown" };
  const rows = await response.json().catch(() => []);
  const row = Array.isArray(rows) ? rows[0] : undefined;
  if (!row) return { status: "absent", state: "closed", cooldownActive: false };
  const now = Date.now();
  return {
    status: "present",
    state: row.state || "unknown",
    cooldownActive: Boolean(row.cooldown_until && Date.parse(row.cooldown_until) > now),
    halfOpenLeaseActive: Boolean(row.half_open_lease_until && Date.parse(row.half_open_lease_until) > now)
  };
}

function authHeaders() {
  return { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` };
}

function serviceHeaders() {
  return {
    apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json"
  };
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

function aliasSupabaseEnv() {
  process.env.SUPABASE_URL ||= process.env.VITE_SUPABASE_URL;
  process.env.SUPABASE_ANON_KEY ||= process.env.VITE_SUPABASE_ANON_KEY;
}

function plausibleOpenAIKey(value) {
  return typeof value === "string" && /^sk-[A-Za-z0-9_-]{20,}$/.test(value);
}

function nonproductionSupabaseOk() {
  const value = process.env.SUPABASE_URL || "";
  if (process.env.FANATLAS_E2E_NONPRODUCTION !== "true" || !value) return false;
  try {
    const url = new URL(value);
    const productionRef = process.env.FANATLAS_PRODUCTION_SUPABASE_REF || KNOWN_PRODUCTION_SUPABASE_REF;
    return !url.hostname.includes(productionRef) && !url.hostname.includes(KNOWN_PRODUCTION_SUPABASE_REF);
  } catch {
    return false;
  }
}

function taskAllowlistOk() {
  const values = new Set(csv(process.env.FANATLAS_AI_TASK_ALLOWLIST));
  return [...REQUIRED_INTERNAL_TASKS].every((task) => values.has(task));
}

function toolAllowlistOk() {
  const values = csv(process.env.FANATLAS_AI_TOOL_ALLOWLIST);
  return values.length > 0 && values.every((tool) => APPROVED_TOOLS.has(tool));
}

function normalizeBaseUrl(value) {
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}`;
  } catch {
    return value;
  }
}

function csv(value) {
  return typeof value === "string" ? value.split(",").map((item) => item.trim()).filter(Boolean) : [];
}

function parseRetryAfter(value) {
  if (!value) return undefined;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : undefined;
}

async function parseJson(response) {
  const text = await response.text().catch(() => "");
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

main().catch((error) => {
  console.log(JSON.stringify({
    status: "NOT_READY",
    probeExecuted: process.argv.includes("--probe"),
    checks: {},
    diagnostics: {
      providerErrorCategory: "unknown",
      normalizedErrorCode: "provider_unavailable"
    },
    reasonCodes: ["provider_check_failed"]
  }, null, 2));
  if (process.env.DEBUG_PROVIDER_CHECK === "true") console.error(error);
  process.exitCode = 1;
});
