import { describe, expect, it } from "vitest";
import { DEFAULT_TRAVEL_USAGE_POLICY, estimateContextSizeClass, estimateTravelUsage } from "./aiUsagePolicy";

describe("aiUsagePolicy", () => {
  it("classifies context sizes with deterministic boundaries", () => {
    expect(estimateContextSizeClass(0)).toBe("tiny");
    expect(estimateContextSizeClass(1200)).toBe("tiny");
    expect(estimateContextSizeClass(1201)).toBe("small");
    expect(estimateContextSizeClass(6001)).toBe("medium");
    expect(estimateContextSizeClass(18001)).toBe("large");
  });

  it("estimates usage without currency claims", () => {
    const estimate = estimateTravelUsage({
      hasUserPreferences: false,
      hasTrip: true,
      destinationCount: 1,
      hasDates: true,
      hasItinerary: true,
      hasTravelHistory: false,
      hasCurrentLocation: false,
      includesSensitiveData: false,
      estimatedSize: 5000
    }, 1, DEFAULT_TRAVEL_USAGE_POLICY);

    expect(estimate).toMatchObject({
      contextSizeClass: "small",
      expectedModelCalls: 1,
      expectedToolCalls: 1,
      estimatedCostClass: "medium",
      estimatedLatencyClass: "standard"
    });
  });
});
