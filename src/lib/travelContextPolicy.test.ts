import { describe, expect, it } from "vitest";
import {
  DEFAULT_TRAVEL_CONTEXT_PERMISSIONS,
  DEFAULT_TRAVEL_INTELLIGENCE_FEATURE_FLAGS,
  canIncludeField,
  taskIsHighStakes,
  taskRequiresCurrentInformation
} from "./travelContextPolicy";

describe("travelContextPolicy", () => {
  it("defaults sensitive permissions and provider features to closed", () => {
    expect(Object.values(DEFAULT_TRAVEL_CONTEXT_PERMISSIONS).every((value) => value === false)).toBe(true);
    expect(DEFAULT_TRAVEL_INTELLIGENCE_FEATURE_FLAGS.travelIntelligenceFoundation).toBe(true);
    expect(DEFAULT_TRAVEL_INTELLIGENCE_FEATURE_FLAGS.aiProviderCalls).toBe(false);
    expect(DEFAULT_TRAVEL_INTELLIGENCE_FEATURE_FLAGS.aiToolExecution).toBe(false);
    expect(DEFAULT_TRAVEL_INTELLIGENCE_FEATURE_FLAGS.aiWriteActions).toBe(false);
  });

  it("requires explicit compatible permission for journal body", () => {
    expect(canIncludeField("journal.body", "trip_reflection", true)).toBe(true);
    expect(canIncludeField("journal.body", "trip_reflection", false)).toBe(false);
    expect(canIncludeField("journal.body", "trip_planning", true)).toBe(false);
  });

  it("marks high-stakes current-information tasks deterministically", () => {
    expect(taskRequiresCurrentInformation("visa_rule_research")).toBe(true);
    expect(taskRequiresCurrentInformation("trip_planning")).toBe(false);
    expect(taskIsHighStakes("emergency_guidance")).toBe(true);
    expect(taskIsHighStakes("language_assistance")).toBe(false);
  });
});
