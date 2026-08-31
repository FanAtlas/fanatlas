import { describe, expect, it } from "vitest";
import { emergencyNumbers, findEmergencyNumbers, getEmergencyNumbers } from "./emergencyNumbers";

describe("canonical emergency number adapter", () => {
  it("derives supported emergency records from curated Destination Intelligence data", () => {
    expect(findEmergencyNumbers("Portugal")).toMatchObject({
      country: "Portugal",
      emergency: "112",
      police: "112",
      ambulance: "112",
      fire: "112",
      verificationState: "locally_reviewed",
      reviewedAt: "2026-08-19"
    });
    expect(findEmergencyNumbers("JP")).toMatchObject({
      country: "Japan",
      police: "110",
      ambulance: "119"
    });
  });

  it("matches aliases but does not silently fall back for unsupported countries", () => {
    expect(findEmergencyNumbers("United States of America")).toMatchObject({ country: "United States", emergency: "911" });
    expect(findEmergencyNumbers("Atlantis")).toBeNull();
    expect(getEmergencyNumbers("Atlantis")).toMatchObject({
      country: "Atlantis",
      emergency: "Not available yet",
      verificationState: "unknown"
    });
  });

  it("keeps every exposed emergency record reviewed and sourced", () => {
    expect(emergencyNumbers.length).toBeGreaterThanOrEqual(12);
    for (const record of emergencyNumbers) {
      expect(record.reviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(record.sourceId).toBe("fanatlas-emergency-review-2026-08");
      expect(record.emergency).not.toMatch(/local emergency services/i);
    }
  });
});
