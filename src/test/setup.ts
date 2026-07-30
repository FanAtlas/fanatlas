import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";

beforeEach(() => {
  globalThis.localStorage?.clear();
  vi.stubGlobal("fetch", vi.fn(() => {
    throw new Error("Unexpected network request in test");
  }));
});

afterEach(() => {
  globalThis.localStorage?.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
