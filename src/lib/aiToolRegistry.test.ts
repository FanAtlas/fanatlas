import { describe, expect, it } from "vitest";
import { planTravelTools, TRAVEL_TOOL_REGISTRY, validateToolRegistry } from "./aiToolRegistry";
import { buildTravelContext, createTravelIntelligenceRequest } from "./travelContext";

describe("aiToolRegistry", () => {
  it("defines unique deterministic tool contracts", () => {
    const validation = validateToolRegistry(TRAVEL_TOOL_REGISTRY);

    expect(validation).toEqual({ valid: true, errors: [] });
    expect(TRAVEL_TOOL_REGISTRY.every((tool) => typeof tool.requiresNetwork === "boolean")).toBe(true);
    expect(TRAVEL_TOOL_REGISTRY.every((tool) => tool.kind === "read" || tool.kind === "suggest")).toBe(true);
  });

  it("blocks disabled network tools without executing them", () => {
    const request = createTravelIntelligenceRequest({
      id: "tool-1",
      task: "visa_rule_research",
      scope: ["none"]
    });
    const context = buildTravelContext({ request });
    const plan = planTravelTools(request, context);

    expect(plan.canExecute).toBe(false);
    expect(plan.steps[0]).toMatchObject({ toolId: "visa_rules_lookup", status: "disabled" });
    expect(plan.blockedReasons).toContain("tool_disabled");
  });

  it("allows local read tools when required permissions are present", () => {
    const request = createTravelIntelligenceRequest({
      id: "tool-2",
      task: "travel_summary",
      scope: ["passport_history", "travel_insights"],
      permissions: { allowPassport: true, allowInsights: true }
    });
    const context = buildTravelContext({ request });
    const plan = planTravelTools(request, context);

    expect(plan.canExecute).toBe(true);
    expect(plan.steps.map((step) => step.status)).toEqual(["planned", "planned"]);
  });
});
