import { describe, expect, it } from "vitest";
import { createTravelTrace, getTaskSafetyPolicy, sanitizeTravelLog } from "./aiSafety";
import { decideTravelOrchestration } from "./aiOrchestrator";
import { estimateTravelUsage } from "./aiUsagePolicy";
import { buildTravelContext, createTravelIntelligenceRequest, summarizeTravelContext } from "./travelContext";
import { createJournalEntryFixture, createTripDraftFixture } from "../test/fixtures/tripDraftFixtures";

describe("aiSafety", () => {
  it("marks high-stakes tasks as current-information dependent", () => {
    expect(getTaskSafetyPolicy("emergency_guidance")).toMatchObject({
      highStakes: true,
      requiresCurrentInformation: true,
      requiresAuthoritativeTool: true,
      blocksGenericAnswer: true
    });
    expect(getTaskSafetyPolicy("trip_planning").highStakes).toBe(false);
  });

  it("sanitizes logs and traces without private values", () => {
    const secretPrompt = "SECRET_RAW_PROMPT_53";
    const secretBody = "SECRET_BODY_LOG_53";
    const request = createTravelIntelligenceRequest({
      id: "safe-log",
      task: "trip_reflection",
      scope: ["selected_trip", "journal_content"],
      userIntent: {
        rawText: secretPrompt,
        normalizedIntent: "reflection",
        task: "trip_reflection",
        urgency: "normal",
        destinationIds: [],
        tripIds: ["trip-log"],
        requestedOutput: "plain_text",
        requiresCurrentInformation: false,
        requiresUserPrivateContext: true,
        requiresExternalTools: false
      },
      permissions: { allowCurrentTrip: true, allowJournalMetadata: true, allowJournalContent: true }
    });
    const context = buildTravelContext({
      request,
      trips: [createTripDraftFixture({
        id: "trip-log",
        journalEntries: [createJournalEntryFixture({ body: secretBody })]
      })]
    });
    const summary = summarizeTravelContext(context);
    const usage = estimateTravelUsage(summary, 0, request.constraints.usagePolicy);
    const decision = decideTravelOrchestration({
      task: request.task,
      urgency: request.userIntent.urgency,
      contextSummary: summary,
      requiredCapabilities: ["conversation"],
      tools: { steps: [], canExecute: true, requiresConfirmation: false, blockedReasons: [] },
      constraints: request.constraints,
      availableModels: [],
      locale: "en"
    });
    const log = sanitizeTravelLog({ task: request.task, context, decision, usage, toolIds: [] });
    const trace = createTravelTrace({
      requestId: request.id,
      task: request.task,
      privacySummary: context.privacy,
      decision,
      toolIds: []
    });
    const serialized = JSON.stringify({ log, trace });

    expect(serialized).not.toContain(secretPrompt);
    expect(serialized).not.toContain(secretBody);
    expect(serialized).not.toContain("Casablanca Journey");
    expect(log.task).toBe("trip_reflection");
    expect(log.context.hasTrip).toBe(true);
  });
});
