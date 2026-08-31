import { describe, expect, it } from "vitest";
import { normalizeTravelCitations, validateCitationUrl } from "./fanAtlasAICitations";
import { redactSensitiveOutput, validateProviderTextOutput } from "./fanAtlasAIOutputValidation";

describe("FanAtlas AI output validation", () => {
  it("allows only safe citation links", () => {
    expect(validateCitationUrl("https://example.com/path?q=1")).toBe("https://example.com/path?q=1");
    expect(validateCitationUrl("http://example.com/")).toBe("http://example.com/");
    expect(validateCitationUrl("javascript:alert(1)")).toBeUndefined();
    expect(validateCitationUrl("data:text/html,secret")).toBeUndefined();
  });

  it("normalizes citations without trusting provider-generated URLs blindly", () => {
    const citations = normalizeTravelCitations([
      { id: " source 1 ", title: " Official source ", source: "Gov", url: "javascript:alert(1)", retrievedAt: "", category: "official" },
      { id: "source-1", title: "Duplicate", source: "Gov", url: "https://example.com", retrievedAt: "", category: "official" }
    ], "2026-07-30T00:00:00.000Z");

    expect(citations).toHaveLength(1);
    expect(citations[0]).toMatchObject({
      id: "source-1",
      title: "Official source",
      source: "Gov",
      retrievedAt: "2026-07-30T00:00:00.000Z"
    });
    expect(citations[0].url).toBeUndefined();
  });

  it("redacts obvious secrets and unsafe link schemes from provider text", () => {
    const text = redactSensitiveOutput("Token Bearer abc.def.ghi with sk-testsecret and fanatlas_trip_drafts_v1 plus javascript:alert(1). SECRET_PRIVATE OPENAI_API_KEY=sk-realish eyJabcde1234567890.eyJabcde1234567890.signature12");

    expect(text).not.toContain("Bearer abc.def.ghi");
    expect(text).not.toContain("sk-testsecret");
    expect(text).not.toContain("fanatlas_trip_drafts_v1");
    expect(text).not.toContain("javascript:");
    expect(text).not.toContain("SECRET_PRIVATE");
    expect(text).not.toContain("OPENAI_API_KEY=");
    expect(text).not.toContain("eyJabcde");
  });

  it("rejects empty and oversized provider content", () => {
    expect(validateProviderTextOutput({ content: "  ", citations: [], retrievedAt: "now" }).ok).toBe(false);
    expect(validateProviderTextOutput({ content: "abcdef", citations: [], retrievedAt: "now", maxCharacters: 5 }).ok).toBe(false);
    expect(validateProviderTextOutput({ content: "A safe answer.", citations: [], retrievedAt: "now" })).toMatchObject({
      ok: true,
      content: "A safe answer."
    });
  });

  it("blocks unsupported completed actions and fake current-information claims", () => {
    expect(validateProviderTextOutput({
      content: "I've booked your hotel.",
      citations: [],
      retrievedAt: "now"
    })).toMatchObject({ ok: false, errorCode: "invalid_provider_output" });

    expect(validateProviderTextOutput({
      content: "Today's weather is sunny and I checked current sources.",
      citations: [],
      retrievedAt: "now",
      currentInformationVerified: false
    })).toMatchObject({ ok: false, errorCode: "invalid_provider_output" });
  });

  it("validates citation integrity against executed tool output", () => {
    expect(validateProviderTextOutput({
      content: "Current source summary.",
      citations: [{ id: "fake", title: "Unknown", source: "Unknown", url: "https://example.com", retrievedAt: "", category: "unknown" }],
      retrievedAt: "now",
      currentInformationVerified: true,
      executedCitationIds: ["official-1"]
    })).toMatchObject({ ok: false, errorCode: "invalid_provider_output" });

    expect(validateProviderTextOutput({
      content: "Official source summary.",
      citations: [{ id: "official-1", title: "Official", source: "Gov", url: "https://example.gov", retrievedAt: "", category: "official_government" }],
      retrievedAt: "now",
      currentInformationVerified: true,
      highStakes: true,
      executedCitationIds: ["official-1"]
    })).toMatchObject({ ok: true });
  });
});
