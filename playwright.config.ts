import { defineConfig, devices } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { isNonproductionSupabaseAuthEnvironment } from "./tests/e2e/helpers/auth";

loadEnvLocal();
const envConsistency = isNonproductionSupabaseAuthEnvironment();
if (!envConsistency.ok) {
  throw new Error(envConsistency.reason);
}
const useExternalServer = process.env.FANATLAS_E2E_EXTERNAL_SERVER === "true";
process.env.SUPABASE_URL ||= process.env.VITE_SUPABASE_URL;
process.env.SUPABASE_ANON_KEY ||= process.env.VITE_SUPABASE_ANON_KEY;
process.env.VITE_SUPABASE_URL ||= process.env.SUPABASE_URL;
process.env.VITE_SUPABASE_ANON_KEY ||= process.env.SUPABASE_ANON_KEY;
process.env.FANATLAS_E2E_AUTH_STORAGE_STATE ||= "tests/e2e/.auth/fanatlas-nonproduction.storage-state.json";

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

function parseEnvValue(rawValue: string) {
  const value = rawValue.trim();
  if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) return value.slice(1, -1);
  return value;
}

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["html"], ["github"]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:5177",
    trace: "on-first-retry",
    screenshot: "only-on-failure"
  },
  webServer: useExternalServer ? undefined : {
    command: "npm run dev -- --host 127.0.0.1 --port 5177 --strictPort",
    url: "http://127.0.0.1:5177",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 5"], viewport: { width: 375, height: 812 } }
    }
  ]
});
