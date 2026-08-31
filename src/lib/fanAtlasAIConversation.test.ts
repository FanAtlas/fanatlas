import { describe, expect, it } from "vitest";
import {
  createFanAtlasAIConversation,
  createFanAtlasAIMessage,
  parseVisibleConversation,
  serializeVisibleConversation,
  trimConversationMessages
} from "./fanAtlasAIConversation";

describe("FanAtlas AI conversation state", () => {
  it("trims visible messages deterministically", () => {
    const messages = Array.from({ length: 4 }, (_value, index) => createFanAtlasAIMessage(index % 2 ? "assistant" : "user", `message-${index}`));

    expect(trimConversationMessages(messages, 2).map((message) => message.content)).toEqual(["message-2", "message-3"]);
    expect(messages.map((message) => message.content)).toEqual(["message-0", "message-1", "message-2", "message-3"]);
  });

  it("persists only visible conversation fields", () => {
    const conversation = createFanAtlasAIConversation("en");
    const serialized = serializeVisibleConversation({
      ...conversation,
      activeTripId: "trip-1",
      messages: [createFanAtlasAIMessage("user", "Visible request SECRET_VISIBLE_MESSAGE")]
    });

    expect(serialized).toContain("Visible request SECRET_VISIBLE_MESSAGE");
    expect(serialized).not.toContain("contextSnapshot");
    expect(serialized).not.toContain("provider");

    const parsed = parseVisibleConversation(serialized, "en");
    expect(parsed.activeTripId).toBe("trip-1");
    expect(parsed.messages[0].content).toBe("Visible request SECRET_VISIBLE_MESSAGE");
  });

  it("falls back safely when stored conversation JSON is malformed", () => {
    const parsed = parseVisibleConversation("{not-json", "fr");

    expect(parsed.locale).toBe("fr");
    expect(parsed.messages).toEqual([]);
  });

  it("bounds stored citations and serialized conversation size", () => {
    const conversation = createFanAtlasAIConversation("en");
    const citations = Array.from({ length: 8 }, (_value, index) => ({
      id: `source-${index}`,
      title: `Source ${index}`,
      source: "Synthetic",
      retrievedAt: "2026-08-06T00:00:00.000Z",
      category: "research" as const
    }));
    const serialized = serializeVisibleConversation({
      ...conversation,
      messages: Array.from({ length: 80 }, (_value, index) => ({
        ...createFanAtlasAIMessage(index % 2 ? "assistant" : "user", `message-${index} ${"x".repeat(1000)}`),
        citations
      }))
    });
    const parsed = parseVisibleConversation(serialized, "en");

    expect(serialized.length).toBeLessThanOrEqual(60000);
    expect(parsed.messages.length).toBeLessThanOrEqual(50);
    expect(parsed.messages.every((message) => (message.citations?.length || 0) <= 5)).toBe(true);
  });
});
