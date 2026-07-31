import type { TravelContextSummary, TravelUsageEstimate, TravelUsagePolicy } from "./travelIntelligenceTypes";

export const DEFAULT_TRAVEL_USAGE_POLICY: TravelUsagePolicy = {
  mode: "balanced",
  maxCostClass: "medium",
  maxToolCalls: 2,
  allowFallback: true,
  allowExternalResearch: false,
  allowImageAnalysis: false,
  allowDocumentAnalysis: false
};

export function estimateContextSizeClass(characters: number): TravelUsageEstimate["contextSizeClass"] {
  if (characters <= 1200) return "tiny";
  if (characters <= 6000) return "small";
  if (characters <= 18000) return "medium";
  return "large";
}

export function estimateTravelUsage(
  contextSummary: TravelContextSummary,
  expectedToolCalls: number,
  policy: TravelUsagePolicy
): TravelUsageEstimate {
  const contextSizeClass = estimateContextSizeClass(contextSummary.estimatedSize);
  const expectedModelCalls = contextSummary.estimatedSize === 0 ? 0 : 1;
  const toolCost = expectedToolCalls > 0 ? "medium" : "low";
  const contextCost = contextSizeClass === "large" ? "high" : contextSizeClass === "medium" ? "medium" : "low";
  const estimatedCostClass = expectedModelCalls === 0 ? "none" : minCostClass(maxCostClass(contextCost, toolCost), policy.maxCostClass);
  const estimatedLatencyClass = expectedModelCalls === 0
    ? "instant"
    : expectedToolCalls > 1 || contextSizeClass === "large"
      ? "slow"
      : expectedToolCalls === 1 || contextSizeClass === "medium"
        ? "standard"
        : "fast";

  return {
    contextSizeClass,
    expectedModelCalls,
    expectedToolCalls,
    estimatedCostClass,
    estimatedLatencyClass
  };
}

export function costClassValue(value: "none" | "low" | "medium" | "high") {
  return { none: 0, low: 1, medium: 2, high: 3 }[value];
}

function maxCostClass(a: "low" | "medium" | "high", b: "low" | "medium" | "high") {
  return costClassValue(a) >= costClassValue(b) ? a : b;
}

function minCostClass(a: "none" | "low" | "medium" | "high", b: "low" | "medium" | "high") {
  return costClassValue(a) <= costClassValue(b) ? a : b;
}
