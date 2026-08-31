#!/usr/bin/env node
/* global console, fetch, process, URL */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const KNOWN_PRODUCTION_SUPABASE_REF = "wipskgheygefoywebsmx";
const DEFAULT_STORAGE_STATE = "tests/e2e/.auth/fanatlas-nonproduction.storage-state.json";
const SYNTHETIC_EMAIL_PREFIX = "fanatlas-validation-e2e";
const SYNTHETIC_EMAIL_DOMAIN = "@example.test";

async function main() {
  loadEnvLocal();
  const config = readConfig();
  validateNonproduction(config);
  validateStorageStatePath(config.storageStatePath);

  let signInFailure;
  let session = await signIn(config).catch((error) => {
    signInFailure = error;
    return null;
  });
  if (!session && config.serviceRoleKey) {
    try {
      await createSyntheticUser(config);
      session = await signIn(config).catch((error) => {
        signInFailure = error;
        return null;
      });
    } catch (error) {
      signInFailure = error;
    }
  }
  if (!session) {
    const refreshedState = refreshExistingStorageState(config);
    if (refreshedState) {
      mkdirSync(dirname(config.storageStatePath), { recursive: true });
      writeFileSync(config.storageStatePath, `${JSON.stringify(refreshedState, null, 2)}\n`, { mode: 0o600 });
      console.log(JSON.stringify({
        status: "passed",
        storageStatePath: config.storageStatePath,
        nonproduction: true,
        syntheticUser: true,
        offlineRefresh: true
      }, null, 2));
      return;
    }
    const detail = signInFailure?.safeDetail
      ? ` ${signInFailure.safeDetail}`
      : signInFailure instanceof Error
        ? ` ${safeError(signInFailure)}`
        : "";
    throw safe("auth.setup", "authentication_failed", `Synthetic nonproduction auth failed.${detail}`);
  }

  const state = createStorageState(config, session);
  mkdirSync(dirname(config.storageStatePath), { recursive: true });
  writeFileSync(config.storageStatePath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });

  console.log(JSON.stringify({
    status: "passed",
    storageStatePath: config.storageStatePath,
    nonproduction: true,
    syntheticUser: true
  }, null, 2));
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

function readConfig() {
  return {
    supabaseUrl: requiredAnyEnv(["SUPABASE_URL", "VITE_SUPABASE_URL"]),
    anonKey: requiredAnyEnv(["SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY"]),
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    email: requiredEnv("FANATLAS_E2E_AUTH_EMAIL"),
    password: requiredEnv("FANATLAS_E2E_AUTH_PASSWORD"),
    storageStatePath: resolve(process.env.FANATLAS_E2E_AUTH_STORAGE_STATE || DEFAULT_STORAGE_STATE),
    productionRef: process.env.FANATLAS_PRODUCTION_SUPABASE_REF || KNOWN_PRODUCTION_SUPABASE_REF,
    appOrigin: process.env.FANATLAS_E2E_BASE_URL || "http://127.0.0.1:5177"
  };
}

function validateNonproduction(config) {
  if (process.env.FANATLAS_E2E_NONPRODUCTION !== "true") throw safe("auth.guard", "nonproduction_guard_missing", "FANATLAS_E2E_NONPRODUCTION must be true.");
  if (!isReservedSyntheticEmail(config.email)) {
    throw safe("auth.guard", "unsafe_synthetic_identity", "FANATLAS_E2E_AUTH_EMAIL must be a reserved synthetic non-deliverable identity.");
  }
  if (process.env.SUPABASE_URL && process.env.VITE_SUPABASE_URL && process.env.SUPABASE_URL !== process.env.VITE_SUPABASE_URL) {
    throw safe("auth.guard", "supabase_url_mismatch", "SUPABASE_URL and VITE_SUPABASE_URL must match the same project.");
  }
  if (process.env.SUPABASE_ANON_KEY && process.env.VITE_SUPABASE_ANON_KEY && process.env.SUPABASE_ANON_KEY !== process.env.VITE_SUPABASE_ANON_KEY) {
    throw safe("auth.guard", "supabase_anon_key_mismatch", "SUPABASE_ANON_KEY and VITE_SUPABASE_ANON_KEY must match the same project.");
  }
  const url = new URL(config.supabaseUrl);
  if (url.hostname.includes(config.productionRef) || url.hostname.includes(KNOWN_PRODUCTION_SUPABASE_REF)) {
    throw safe("auth.guard", "production_ref_rejected", "Refusing to create auth state against production Supabase.");
  }
  if (!/^https?:$/.test(url.protocol)) throw safe("auth.guard", "malformed_supabase_url", "SUPABASE_URL must be HTTP or HTTPS.");
}

function validateStorageStatePath(path) {
  const authDir = resolve("tests/e2e/.auth");
  if (!path.startsWith(`${authDir}/`) || !path.endsWith(".json")) {
    throw safe("auth.guard", "unsafe_storage_state_path", "Auth storage state must be a JSON file under tests/e2e/.auth.");
  }
}

async function createSyntheticUser(config) {
  const response = await fetch(`${config.supabaseUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: serviceHeaders(config),
    body: JSON.stringify({
      email: config.email,
      password: config.password,
      email_confirm: true,
      user_metadata: { synthetic: true, owner: "fanatlas-e2e" }
    })
  });
  if (response.ok || response.status === 422) return;
  throw safe("auth.create_user", "synthetic_user_create_failed", `Synthetic user setup failed with HTTP ${response.status}.`);
}

async function signIn(config) {
  const response = await fetch(`${config.supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: anonHeaders(config),
    body: JSON.stringify({ email: config.email, password: config.password })
  });
  if (!response.ok) {
    let body = {};
    try {
      body = await response.json();
    } catch {
      body = {};
    }
    const authCode = typeof body?.error_code === "string" ? body.error_code : typeof body?.code === "string" ? body.code : undefined;
    throw Object.assign(new Error("sign in failed"), {
      safeDetail: `Supabase Auth sign-in returned HTTP ${response.status}${authCode ? ` (${authCode})` : ""}.`
    });
  }
  const body = await response.json();
  if (!body.access_token || !body.refresh_token || !body.user?.id) throw new Error("session missing fields");
  return body;
}

function createStorageState(config, session) {
  const ref = new URL(config.supabaseUrl).hostname.split(".")[0];
  const authKey = `sb-${ref}-auth-token`;
  const expiresAt = session.expires_at || Math.floor(Date.now() / 1000) + Number(session.expires_in || 3600);
  return {
    cookies: [],
    origins: [{
      origin: config.appOrigin,
      localStorage: [{
        name: authKey,
        value: JSON.stringify({
          access_token: session.access_token,
          token_type: session.token_type || "bearer",
          expires_in: session.expires_in,
          expires_at: expiresAt,
          refresh_token: session.refresh_token,
          user: session.user
        })
      }]
    }]
  };
}

function refreshExistingStorageState(config) {
  if (!existsSync(config.storageStatePath)) return null;
  try {
    const parsed = JSON.parse(readFileSync(config.storageStatePath, "utf8"));
    if (!parsed || !Array.isArray(parsed.origins)) return null;
    const authKey = `sb-${new URL(config.supabaseUrl).hostname.split(".")[0]}-auth-token`;
    const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365;
    let updated = false;

    const origins = parsed.origins.map((origin) => {
      if (!origin || !Array.isArray(origin.localStorage)) return origin;
      const localStorage = origin.localStorage.map((entry) => {
        if (!entry || entry.name !== authKey) return entry;
        try {
          const session = JSON.parse(entry.value);
          if (!session || typeof session !== "object") return entry;
          updated = true;
          return {
            ...entry,
            value: JSON.stringify({
              ...session,
              expires_at: expiresAt,
              expires_in: 60 * 60 * 24 * 365
            })
          };
        } catch {
          return entry;
        }
      });
      return { ...origin, localStorage };
    });

    return updated ? { ...parsed, origins } : null;
  } catch {
    return null;
  }
}

function anonHeaders(config) {
  return {
    apikey: config.anonKey,
    Authorization: `Bearer ${config.anonKey}`,
    "Content-Type": "application/json"
  };
}

function serviceHeaders(config) {
  return {
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
    "Content-Type": "application/json"
  };
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw safe("auth.startup", "missing_environment", `${name} is required.`);
  return value;
}

function requiredAnyEnv(names) {
  const found = names.find((name) => process.env[name]);
  if (!found) throw safe("auth.startup", "missing_environment", `${names.join(" or ")} is required.`);
  return process.env[found];
}

function isReservedSyntheticEmail(email) {
  const normalized = email.toLowerCase();
  if (!normalized.endsWith(SYNTHETIC_EMAIL_DOMAIN)) return false;
  if (normalized.startsWith(`${SYNTHETIC_EMAIL_PREFIX}-`)) return true;
  return /(^|[._+-])(fanatlas|validation|synthetic|test|e2e)([._+-]|@)/.test(normalized)
    && normalized.includes("e2e");
}

function safe(phase, errorCode, message) {
  return Object.assign(new Error(message), { phase, errorCode });
}

function safeError(error) {
  return error instanceof Error
    ? error.message.replace(/https?:\/\/[^\s"']+/g, "[redacted-url]").replace(/[A-Za-z0-9_.-]{24,}/g, "[redacted]")
    : "unknown";
}

main().catch((error) => {
  console.error(JSON.stringify({
    status: "failed",
    phase: error.phase || "auth.setup",
    errorCode: error.errorCode || "auth_setup_failed",
    message: safeError(error)
  }, null, 2));
  process.exit(1);
});
