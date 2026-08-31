import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "src/**/*.test.js"],
    exclude: ["node_modules", "dist", "coverage", "playwright-report", "test-results"],
    setupFiles: ["src/test/setup.ts"],
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "coverage",
      exclude: ["dist/**", "coverage/**", "src/test/**", "**/*.config.*", "tests/**"]
    }
  }
});
