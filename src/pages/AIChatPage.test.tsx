/** @vitest-environment jsdom */
import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AIChatPage } from "./AIChatPage";
import { renderWithProviders } from "../test/renderWithProviders";

const hookMocks = vi.hoisted(() => ({
  sendMessage: vi.fn(),
  cancel: vi.fn(),
  clearConversation: vi.fn(),
  retryLast: vi.fn(),
  setActiveTripId: vi.fn(),
  setConsent: vi.fn(),
  setInput: vi.fn(),
  consent: {
    allowActiveTrip: true,
    allowTravelPreferences: false,
    allowPassportHistory: false,
    allowTravelInsights: false,
    allowSavedPlaces: false,
    allowJournalMetadata: false,
    allowJournalContent: false,
    allowCurrentLocation: false
  }
}));

vi.mock("../hooks/useFanAtlasAI", () => ({
  useFanAtlasAI: () => ({
    activeTrip: undefined,
    activeTripId: "",
    consent: hookMocks.consent,
    conversation: {
      id: "conversation-1",
      title: "FanAtlas AI",
      createdAt: "2026-07-30T00:00:00.000Z",
      updatedAt: "2026-07-30T00:00:00.000Z",
      messages: [],
      locale: "en",
      allowedContextScopes: [],
      consent: hookMocks.consent,
      usageCounters: { requestCount: 0, toolCallCount: 0 }
    },
    drafts: [{ id: "trip-1", name: "Paris Spring Trip" }],
    error: "",
    input: "",
    loading: false,
    toolActivity: [],
    cancel: hookMocks.cancel,
    clearConversation: hookMocks.clearConversation,
    retryLast: hookMocks.retryLast,
    sendMessage: hookMocks.sendMessage,
    setActiveTripId: hookMocks.setActiveTripId,
    setConsent: hookMocks.setConsent,
    setInput: hookMocks.setInput
  })
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("AIChatPage", () => {
  it("renders the unified FanAtlas AI interface without provider branding", () => {
    renderWithProviders(<AIChatPage onBack={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "FanAtlas AI" })).toBeInTheDocument();
    expect(screen.getByText("Private by design")).toBeInTheDocument();
    expect(screen.getByLabelText("Message FanAtlas AI")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("OpenAI");
    expect(document.body).not.toHaveTextContent("GPT");
    expect(document.body).not.toHaveTextContent("Gemini");
    expect(document.body).not.toHaveTextContent("Claude");
  });

  it("sends deterministic suggested prompts through the hook", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AIChatPage onBack={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Packing list" }));

    expect(hookMocks.sendMessage).toHaveBeenCalledWith("Create a packing list for my next destination.", "packing_guidance");
  });

  it("updates context controls without exposing raw context", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AIChatPage onBack={vi.fn()} />);

    await user.click(screen.getByText("Privacy controls"));
    await user.click(screen.getByLabelText("Use Passport history"));

    expect(hookMocks.setConsent).toHaveBeenCalled();
    expect(document.body.innerHTML).not.toContain("contextSnapshot");
  });
});
