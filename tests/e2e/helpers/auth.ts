import { existsSync } from "node:fs";
import type { Browser, BrowserContext } from "@playwright/test";

const KNOWN_PRODUCTION_SUPABASE_REF = "wipskgheygefoywebsmx";
const AUTH_STATE_DIR = "tests/e2e/.auth/";

export function authenticatedStorageStatePath() {
  const path = process.env.FANATLAS_E2E_AUTH_STORAGE_STATE;
  return path && isSafeStorageStatePath(path) && existsSync(path) ? path : undefined;
}

export function shouldRunAuthenticatedE2E() {
  return Boolean(authenticatedStorageStatePath() && isNonproductionSupabaseAuthEnvironment().ok);
}

export function authenticatedE2ESkipReason() {
  const env = isNonproductionSupabaseAuthEnvironment();
  if (!env.ok) return env.reason;
  const path = process.env.FANATLAS_E2E_AUTH_STORAGE_STATE;
  if (!path) return "FANATLAS_E2E_AUTH_STORAGE_STATE is not set.";
  if (!isSafeStorageStatePath(path)) return "FANATLAS_E2E_AUTH_STORAGE_STATE must point under tests/e2e/.auth/.";
  if (!existsSync(path)) return "FANATLAS_E2E_AUTH_STORAGE_STATE file does not exist.";
  return "";
}

export async function newAuthenticatedContext(browser: Browser): Promise<BrowserContext> {
  const storageState = authenticatedStorageStatePath();
  const environment = isNonproductionSupabaseAuthEnvironment();
  if (!storageState || !environment.ok) {
    throw new Error(`Authenticated FanAtlas E2E requires nonproduction storage state. ${authenticatedE2ESkipReason()}`);
  }
  return browser.newContext({ storageState });
}

export function isNonproductionSupabaseAuthEnvironment() {
  if (process.env.FANATLAS_E2E_NONPRODUCTION !== "true") return { ok: false as const, reason: "FANATLAS_E2E_NONPRODUCTION must be true." };
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const productionRef = process.env.FANATLAS_PRODUCTION_SUPABASE_REF || KNOWN_PRODUCTION_SUPABASE_REF;
  if (!url) return { ok: false as const, reason: "SUPABASE_URL or VITE_SUPABASE_URL is required." };
  const urlConsistency = resolveSupabasePairConsistency();
  if (!urlConsistency.ok) return urlConsistency;
  try {
    const hostname = new URL(url).hostname;
    if (hostname.includes(productionRef) || hostname.includes(KNOWN_PRODUCTION_SUPABASE_REF)) {
      return { ok: false as const, reason: "Supabase URL appears to target production." };
    }
    return { ok: true as const };
  } catch {
    return { ok: false as const, reason: "Supabase URL is malformed." };
  }
}

function resolveSupabasePairConsistency() {
  const publicUrl = process.env.VITE_SUPABASE_URL;
  const privateUrl = process.env.SUPABASE_URL;
  const publicKey = process.env.VITE_SUPABASE_ANON_KEY;
  const privateKey = process.env.SUPABASE_ANON_KEY;
  if (publicUrl && privateUrl && publicUrl !== privateUrl) {
    return { ok: false as const, reason: "SUPABASE_URL and VITE_SUPABASE_URL must match the same project." };
  }
  if (publicKey && privateKey && publicKey !== privateKey) {
    return { ok: false as const, reason: "SUPABASE_ANON_KEY and VITE_SUPABASE_ANON_KEY must match the same project." };
  }
  return { ok: true as const };
}

function isSafeStorageStatePath(path: string) {
  return path.includes(AUTH_STATE_DIR) && path.endsWith(".json");
}
