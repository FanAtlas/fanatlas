import { describe, expect, it, vi } from "vitest";
import legacyHandler from "../../api/ai";

describe("legacy AI endpoint", () => {
  it("does not execute unauthenticated provider calls", async () => {
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));

    await legacyHandler({ method: "POST", body: { message: "hello" } }, { status });

    expect(status).toHaveBeenCalledWith(410);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      errorCode: "legacy_ai_endpoint_retired"
    }));
  });
});
