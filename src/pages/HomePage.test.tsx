/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageContext } from "../LanguageContext";
import { text, type Language } from "../i18n";
import { createTripDraftFixture, createItineraryDayFixture, createPlaceReferenceFixture } from "../test/fixtures/tripDraftFixtures";
import { HomePage } from "./HomePage";
import { useConnectivity } from "../hooks/useConnectivity";
import { useTravelLocation } from "../TravelLocationContext";
import { useTripDrafts } from "../hooks/useTripDrafts";

vi.mock("../components/LegalFooter", () => ({ LegalFooter: () => null }));
vi.mock("./InstallBanner", () => ({ InstallBanner: () => null }));
vi.mock("../hooks/useConnectivity", () => ({ useConnectivity: vi.fn() }));
vi.mock("../TravelLocationContext", () => ({ useTravelLocation: vi.fn() }));
vi.mock("../hooks/useTripDrafts", () => ({ useTripDrafts: vi.fn() }));

const setTab = vi.fn();
const setExploreCategory = vi.fn();
const setMapDestination = vi.fn();
const setSelectedRestaurant = vi.fn();
const setLanguage = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useConnectivity).mockReturnValue({
    status: "online",
    isOnline: true,
    isOffline: false,
    isUnknown: false
  });
  vi.mocked(useTravelLocation).mockReturnValue({
    travelLocation: {
      originCountry: "Portugal",
      destinationCountry: "Portugal",
      destinationCity: "Lisbon",
      latitude: 38.7223,
      longitude: -9.1393,
      locationSource: "manual"
    },
    destination: {
      city: "Lisbon",
      country: "Portugal",
      latitude: 38.7223,
      longitude: -9.1393,
      currency: "EUR",
      language: "Portuguese",
      emergencyNumber: "112",
      policeNumber: "112",
      ambulanceNumber: "112",
      fireNumber: "112"
    },
    hasManualDestination: true,
    saveTravelLocation: vi.fn()
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderHome(drafts = [], language: Language = "en") {
  vi.mocked(useTripDrafts).mockReturnValue({ drafts } as any);
  return render(
    <LanguageContext.Provider value={{ language, setLanguage, t: text[language] }}>
      <HomePage
        setExploreCategory={setExploreCategory}
        setMapDestination={setMapDestination}
        setSelectedRestaurant={setSelectedRestaurant}
        setTab={setTab}
        onOpenDestination={vi.fn()}
        onOpenPreparation={vi.fn()}
        onOpenTripDay={vi.fn()}
      />
    </LanguageContext.Provider>
  );
}

function activeTrip() {
  return createTripDraftFixture({
    name: "Lisbon Today",
    destination: { label: "Lisbon, Portugal", countryCode: "PT", country: "Portugal", city: "Lisbon" },
    travelDates: { startDate: "2026-08-29", endDate: "2026-09-02" },
    itineraryDays: [
      createItineraryDayFixture({ id: "day-1", order: 0, title: "Day 1" }),
      createItineraryDayFixture({ id: "day-2", order: 1, title: "Day 2" }),
      createItineraryDayFixture({ id: "day-3", order: 2, title: "Day 3" })
    ],
    placeReferences: [
      createPlaceReferenceFixture({ logicalPlaceId: "Rossio Square", dayId: "day-2", order: 0, visitStatus: "visited" }),
      createPlaceReferenceFixture({ logicalPlaceId: "Lisbon Cathedral", dayId: "day-2", order: 1, visitStatus: "planned" })
    ]
  });
}

describe("HomePage", () => {
  it("keeps the no-trip experience compact and navigable", async () => {
    const user = userEvent.setup();
    renderHome([]);

    expect(screen.getByRole("heading", { level: 1, name: "No trip selected" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Plan your trip in seconds" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Travel Passport" })[0]).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Travel Journal" })[0]).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Global Travel Explorer" })[0]).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Plan your trip in seconds" }));
    expect(setTab).toHaveBeenCalledWith("tripDrafts");
  });

  it("shows the active trip context, Today handoff, and local details without network calls", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    renderHome([activeTrip()]);

    expect(screen.getByRole("heading", { level: 1, name: "Lisbon Today" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `Continue today's plan` })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Today" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: `Continue today's plan` }));
    expect(setTab).toHaveBeenCalledWith("today");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("shows honest offline state and supports RTL rendering", () => {
    vi.mocked(useConnectivity).mockReturnValue({
      status: "offline",
      isOnline: false,
      isOffline: true,
      isUnknown: false
    });

    const { container } = renderHome([], "ar");

    expect(screen.getByRole("status")).toHaveTextContent("أساسيات الرحلة تظل متاحة بدون إنترنت.");
    expect(container.firstElementChild).toHaveAttribute("dir", "rtl");
    expect(screen.getByRole("heading", { level: 1, name: "لا توجد رحلة محددة" })).toBeInTheDocument();
  });
});
