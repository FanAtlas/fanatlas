import { afterEach, describe, expect, it, vi } from "vitest";
import { recordAIOperationalEvent } from "./aiOperationalTelemetry";

describe("AI operational telemetry", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("emits only sanitized operational metadata when explicitly enabled", () => {
    vi.stubEnv("FANATLAS_AI_OPERATIONAL_TELEMETRY", "console");
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

    recordAIOperationalEvent({
      event: "request_failed",
      requestId: "request-with-private-content",
      userId: "real-user-id",
      releaseMode: "internal",
      task: "packing_guidance",
      toolsRequested: ["weather_lookup"],
      failureCategory: "provider_timeout",
      totalLatencyMs: 1234
    });

    expect(info).toHaveBeenCalledTimes(1);
    const line = String(info.mock.calls[0]?.[0] || "");
    expect(line).toContain("\"event\":\"request_failed\"");
    expect(line).toContain("\"releaseMode\":\"internal\"");
    expect(line).not.toContain("request-with-private-content");
    expect(line).not.toContain("real-user-id");
    expect(line).not.toContain("journal");
    expect(line).not.toContain("Bearer");
  });

  it("stays silent unless telemetry is explicitly enabled", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

    recordAIOperationalEvent({
      event: "request_started",
      requestId: "request-1",
      releaseMode: "internal"
    });

    expect(info).not.toHaveBeenCalled();
  });
});
