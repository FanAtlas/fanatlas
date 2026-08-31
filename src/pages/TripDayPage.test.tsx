/** @vitest-environment jsdom */
import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TripDayPage } from "./TripDayPage";
import { renderWithProviders } from "../test/renderWithProviders";
import { createItineraryDayFixture, createJournalEntryFixture, createPlaceReferenceFixture, createTripDraftFixture } from "../test/fixtures/tripDraftFixtures";
import { deriveDestinationIntelligence } from "../lib/destinationIntelligence";
import { sendTripDayLiveContextRequest } from "../lib/tripDayLiveContextClient";
import type { TripDraft, TripPlaceVisitStatus } from "../lib/tripDrafts";

const activeTrip = createTripDraftFixture({
  id: "lisbon-today-trip",
  name: "Lisbon Today",
  destination: { label: "Lisbon, Portugal", countryCode: "PT", country: "Portugal", city: "Lisbon" },
  travelDates: { startDate: "2026-08-20", endDate: "2026-08-22" },
  planningActions: [{ id: "prep-1", text: "Review documents", completed: false, createdAt: "2026-08-01T00:00:00.000Z" }],
  itineraryDays: [
    createItineraryDayFixture({ id: "day-1", title: "Arrival", order: 0 }),
    createItineraryDayFixture({ id: "day-2", title: "Today", order: 1 }),
    createItineraryDayFixture({ id: "day-3", title: "Finale", order: 2 })
  ],
  placeReferences: [
    createPlaceReferenceFixture({ logicalPlaceId: "visited-place", dayId: "day-2", timeBlock: "morning", visitStatus: "visited", order: 0, photoIds: ["PRIVATE_PHOTO_ID"] }),
    createPlaceReferenceFixture({ logicalPlaceId: "next-place", dayId: "day-2", timeBlock: "morning", visitStatus: "planned", planningNote: "Use west entrance.", order: 1, photoIds: [] }),
    createPlaceReferenceFixture({ logicalPlaceId: "later-place", dayId: "day-2", timeBlock: "afternoon", visitStatus: "planned", order: 2, photoIds: [] }),
    createPlaceReferenceFixture({ logicalPlaceId: "unscheduled-place", dayId: "unscheduled", visitStatus: "planned", order: 3, photoIds: [] })
  ],
  journalEntries: [createJournalEntryFixture({ body: "PRIVATE_TODAY_JOURNAL_BODY", photoIds: ["PRIVATE_JOURNAL_PHOTO"] })]
});

let connectivityMode: "online" | "offline" = "online";

const updatePlaceVisitStatus = vi.fn((tripDraftId: string, input: { logicalPlaceId: string; status: TripPlaceVisitStatus }) => {
  mockedDrafts = mockedDrafts.map((draft) => {
    if (draft.id !== tripDraftId) return draft;
    return {
      ...draft,
      placeReferences: draft.placeReferences.map((reference) => reference.logicalPlaceId === input.logicalPlaceId ? { ...reference, visitStatus: input.status } : reference)
    };
  });
  return { ok: true as const };
});
let mockedDrafts: TripDraft[] = [activeTrip];

vi.mock("../lib/tripDayLiveContextClient", () => ({
  sendTripDayLiveContextRequest: vi.fn(async (request: any) => {
    const retrievedAt = "2026-08-21T12:00:00.000Z";
    if (request.action === "weather") {
      return {
        kind: "weather",
        requestId: request.requestId,
        currentDate: request.currentDate,
        identity: request.identity,
        status: "success",
        retrievedAt,
        freshness: { class: "live", retrievedAt, expiresAt: "2026-08-21T13:00:00.000Z", staleAt: "2026-08-21T12:30:00.000Z" },
        source: "Mock Weather Service",
        sourceQuality: "recognized_weather",
        warningCodes: [],
        destination: request.destination.label,
        date: request.currentDate,
        forecastStart: request.currentDate,
        forecastEnd: request.currentDate,
        units: request.units,
        daily: [{ date: request.currentDate, condition: "partly cloudy", temperatureMin: 16, temperatureMax: 24, precipitationChance: 20 }],
        alerts: [],
        citationCount: 1
      };
    }
    if (request.action === "currency") {
      return {
        kind: "currency",
        requestId: request.requestId,
        currentDate: request.currentDate,
        identity: request.identity,
        status: "success",
        retrievedAt,
        freshness: { class: "live", retrievedAt, expiresAt: "2026-08-21T13:00:00.000Z", staleAt: "2026-08-21T12:30:00.000Z" },
        source: "Mock Exchange Service",
        sourceQuality: "reputable_secondary",
        warningCodes: [],
        baseCurrency: request.baseCurrency,
        targetCurrency: request.targetCurrency,
        amount: request.amount,
        rate: 1.25,
        convertedAmount: Math.round(request.amount * 1.25 * 100) / 100,
        rateDate: request.currentDate,
        citationCount: 1,
        ratesMayChange: true
      };
    }
    return {
      kind: "official_updates",
      requestId: request.requestId,
      currentDate: request.currentDate,
      identity: request.identity,
      status: "success",
      retrievedAt,
      freshness: { class: "recent", retrievedAt, expiresAt: "2026-08-21T13:00:00.000Z", staleAt: "2026-08-21T12:30:00.000Z" },
      source: "Official source",
      sourceQuality: "official_tourism",
      warningCodes: [],
      destination: request.destination.label,
      categoryCount: request.categories.length,
      findings: [{
        title: "Official notice",
        source: "Official source",
        url: "https://example.test/notice",
        fact: "Review before you go.",
        sourceQuality: "official_tourism",
        retrievedAt,
        category: request.categories[0],
        updatedAt: request.currentDate
      }],
      citationCount: 1
    };
  })
}));

vi.mock("../contexts/TravelIntelligenceContext", () => ({
  TravelIntelligenceProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useTravelIntelligence: () => ({ savedPlaces: [] })
}));

vi.mock("../hooks/useDestinationIntelligence", () => ({
  useDestinationIntelligence: () => deriveDestinationIntelligence({ tripDrafts: mockedDrafts, generatedAt: "test" })
}));

vi.mock("../hooks/useConnectivity", () => ({
  useConnectivity: () => ({
    status: connectivityMode,
    isOnline: connectivityMode === "online",
    isOffline: connectivityMode === "offline",
    isUnknown: false
  })
}));

vi.mock("../hooks/useTripDrafts", () => ({
  useTripDrafts: () => ({
    drafts: mockedDrafts,
    updatePlaceVisitStatus
  })
}));

beforeEach(() => {
  mockedDrafts = [activeTrip];
  connectivityMode = "online";
  updatePlaceVisitStatus.mockClear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("TripDayPage", () => {
  it("renders Today from local Trip Draft data without private journal or photo content", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    renderWithProviders(
      <TripDayPage userId="user-1" currentDate={new Date("2026-08-21T12:00:00.000Z")} onBack={vi.fn()} onOpenDestination={vi.fn()} onOpenMapDestination={vi.fn()} setTab={vi.fn()} />
    );

    expect(screen.getByRole("heading", { level: 1, name: "Today" })).toBeInTheDocument();
    expect(screen.getByText(/Lisbon Today · Lisbon, Portugal/)).toBeInTheDocument();
    expect(screen.getByText(/Day 2 of 3/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Next in your plan" })).toBeInTheDocument();
    expect(screen.getAllByText("next-place").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Morning" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Afternoon" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Evening" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Still unscheduled" })).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("PRIVATE_TODAY_JOURNAL_BODY");
    expect(document.body.innerHTML).not.toContain("PRIVATE_PHOTO_ID");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(vi.mocked(sendTripDayLiveContextRequest)).not.toHaveBeenCalled();
  });

  it("uses existing status mutation and quick-action callbacks", async () => {
    const user = userEvent.setup();
    const setTab = vi.fn();
    const onOpenDestination = vi.fn();
    renderWithProviders(
      <TripDayPage userId="user-1" currentDate={new Date("2026-08-21T12:00:00.000Z")} onBack={vi.fn()} onOpenDestination={onOpenDestination} onOpenMapDestination={vi.fn()} setTab={setTab} />
    );

    await user.click(screen.getAllByRole("button", { name: /Mark visited: next-place/ })[0]);
    expect(updatePlaceVisitStatus).toHaveBeenCalledWith("lisbon-today-trip", { logicalPlaceId: "next-place", status: "visited" });

    await user.click(screen.getByRole("button", { name: "Destination Guide" }));
    expect(onOpenDestination).toHaveBeenCalledWith("city:PT:lisbon");
    await user.click(screen.getByRole("button", { name: "Translator" }));
    expect(setTab).toHaveBeenCalledWith("translator");
    await user.click(screen.getByRole("button", { name: "Currency" }));
    expect(setTab).toHaveBeenCalledWith("currency");
    await user.click(screen.getByRole("button", { name: "SOS" }));
    expect(setTab).toHaveBeenCalledWith("sos");
    await user.click(screen.getByRole("button", { name: "Edit itinerary" }));
    expect(setTab).toHaveBeenCalledWith("tripDrafts");
  });

  it("advances next place and reaches the day-complete state after explicit status changes", async () => {
    const user = userEvent.setup();
    const renderResult = renderWithProviders(
      <TripDayPage userId="user-1" currentDate={new Date("2026-08-21T12:00:00.000Z")} onBack={vi.fn()} onOpenDestination={vi.fn()} onOpenMapDestination={vi.fn()} setTab={vi.fn()} />
    );

    await user.click(screen.getAllByRole("button", { name: /Mark visited: next-place/ })[0]);
    renderResult.rerender(
      <TripDayPage userId="user-1" currentDate={new Date("2026-08-21T12:00:00.000Z")} onBack={vi.fn()} onOpenDestination={vi.fn()} onOpenMapDestination={vi.fn()} setTab={vi.fn()} />
    );
    expect(screen.getByRole("heading", { name: "Next in your plan" })).toBeInTheDocument();
    expect(screen.getAllByText("later-place").length).toBeGreaterThan(0);

    await user.click(screen.getAllByRole("button", { name: /Skip: later-place/ })[0]);
    renderResult.rerender(
      <TripDayPage userId="user-1" currentDate={new Date("2026-08-21T12:00:00.000Z")} onBack={vi.fn()} onOpenDestination={vi.fn()} onOpenMapDestination={vi.fn()} setTab={vi.fn()} />
    );
    expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
    expect(screen.getAllByText("Today's plan is complete.").length).toBeGreaterThan(0);
  });

  it("keeps live context idle until the user triggers it", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <TripDayPage userId="user-1" currentDate={new Date("2026-08-21T12:00:00.000Z")} onBack={vi.fn()} onOpenDestination={vi.fn()} onOpenMapDestination={vi.fn()} setTab={vi.fn()} />
    );

    expect(vi.mocked(sendTripDayLiveContextRequest)).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Check weather" }));
    expect(vi.mocked(sendTripDayLiveContextRequest)).toHaveBeenCalledTimes(1);
    await screen.findByText(/partly cloudy/i);

    await user.click(screen.getByRole("button", { name: "Check current rate" }));
    expect(vi.mocked(sendTripDayLiveContextRequest)).toHaveBeenCalledTimes(2);
    await screen.findByText(/1 USD = 1\.2500 EUR/i);

    await user.click(screen.getByRole("button", { name: "Check official updates" }));
    expect(vi.mocked(sendTripDayLiveContextRequest)).toHaveBeenCalledTimes(3);
    await screen.findByText("Official notice");
  });

  it("keeps Today usable offline while marking live context unavailable", () => {
    connectivityMode = "offline";
    renderWithProviders(
      <TripDayPage userId="user-1" currentDate={new Date("2026-08-21T12:00:00.000Z")} onBack={vi.fn()} onOpenDestination={vi.fn()} onOpenMapDestination={vi.fn()} setTab={vi.fn()} />
    );

    expect(screen.getByText("Current information unavailable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check weather" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Mark visited: next-place" }).length).toBeGreaterThan(0);
    expect(vi.mocked(sendTripDayLiveContextRequest)).not.toHaveBeenCalled();
  });

  it("requires a trip choice for overlapping trips and renders RTL safely", () => {
    mockedDrafts = [activeTrip, { ...activeTrip, id: "second-active-trip", name: "Second Lisbon Today" }];
    const { container } = renderWithProviders(
      <TripDayPage userId="user-1" currentDate={new Date("2026-08-21T12:00:00.000Z")} onBack={vi.fn()} onOpenDestination={vi.fn()} onOpenMapDestination={vi.fn()} setTab={vi.fn()} />,
      { language: "ar" }
    );

    expect(container.querySelector(".trip-day-page")).toHaveAttribute("dir", "rtl");
    expect(screen.getByRole("heading", { level: 1, name: "اختر الرحلة" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Lisbon Today/ }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("button", { name: /Second Lisbon Today/ })).toBeInTheDocument();
  });
});
