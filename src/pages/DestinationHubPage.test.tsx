/** @vitest-environment jsdom */
import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DestinationHubPage } from "./DestinationHubPage";
import { renderWithProviders } from "../test/renderWithProviders";
import { createJournalEntryFixture, createTripDraftFixture } from "../test/fixtures/tripDraftFixtures";
import { deriveDestinationIntelligence } from "../lib/destinationIntelligence";
import { deriveTravelPassport } from "../lib/travelPassport";
import { deriveTravelInsights } from "../lib/travelInsights";
import { deriveTravelExplorer } from "../lib/travelExplorer";

let connectivityMode: "online" | "offline" = "online";

vi.mock("../hooks/useConnectivity", () => ({
  useConnectivity: () => ({
    status: connectivityMode,
    isOnline: connectivityMode === "online",
    isOffline: connectivityMode === "offline",
    isUnknown: false
  })
}));

const privateTrip = createTripDraftFixture({
  id: "lisbon-trip",
  name: "FanAtlas Lisbon SECRET_TRIP_TITLE",
  destination: { label: "Lisbon, Portugal", countryCode: "PT", country: "Portugal", city: "Lisbon" },
  journalEntries: [createJournalEntryFixture({
    id: "private-journal",
    body: "PRIVATE_DESTINATION_HUB_JOURNAL_BODY",
    photoIds: ["PRIVATE_DESTINATION_HUB_PHOTO_ID"],
    status: "complete"
  })],
  placeReferences: [{
    logicalPlaceId: "place-1",
    persistedReferences: [],
    addedAt: "2026-01-10T00:00:00.000Z",
    dayId: "day-1",
    visitStatus: "visited",
    photoIds: ["PRIVATE_DESTINATION_HUB_PLACE_PHOTO_ID"],
    order: 0
  }]
});

vi.mock("../hooks/useDestinationIntelligence", () => ({
  useDestinationIntelligence: () => deriveDestinationIntelligence({ tripDrafts: [privateTrip], generatedAt: "test" })
}));

vi.mock("../hooks/useTravelExplorer", () => ({
  useTravelExplorer: () => {
    const passport = deriveTravelPassport([privateTrip], { currentDate: "2026-08-19", generatedAt: "test" });
    const insights = deriveTravelInsights([privateTrip], { currentDate: "2026-08-19", generatedAt: "test" });
    return {
      drafts: [privateTrip],
      passport,
      insights,
      explorer: deriveTravelExplorer({ trips: [privateTrip], passport, insights, currentDate: "2026-08-19" })
    };
  }
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  connectivityMode = "online";
});

describe("DestinationHubPage", () => {
  it("renders a resolved country with high-stakes source treatment and actions", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    renderWithProviders(<DestinationHubPage destinationId="country:PT" onBack={vi.fn()} onOpenDestination={vi.fn()} setTab={vi.fn()} />);

    expect(screen.getByRole("heading", { level: 1, name: "Portugal" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Emergency information" })).toBeInTheDocument();
    expect(screen.getByText("+351")).toBeInTheDocument();
    expect(screen.getByText("Europe/Lisbon")).toBeInTheDocument();
    expect(screen.getByText("230 V")).toBeInTheDocument();
    expect(screen.getByText("50 Hz")).toBeInTheDocument();
    expect(screen.getByText("Entry rules depend on nationality, travel document, purpose, and dates. Use official current sources before travel.")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Open Currency Converter" }).length).toBeGreaterThan(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("renders a resolved city with personal counts and no private journal or photo content", () => {
    renderWithProviders(<DestinationHubPage destinationId="city:PT:lisbon" onBack={vi.fn()} onOpenDestination={vi.fn()} setTab={vi.fn()} />);

    expect(screen.getByRole("heading", { level: 1, name: "Lisbon" })).toBeInTheDocument();
    expect(screen.getByText("Your FanAtlas history")).toBeInTheDocument();
    expect(screen.getByText("Visited")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("PRIVATE_DESTINATION_HUB_JOURNAL_BODY");
    expect(document.body.innerHTML).not.toContain("PRIVATE_DESTINATION_HUB_PHOTO_ID");
    expect(document.body.innerHTML).not.toContain("PRIVATE_DESTINATION_HUB_PLACE_PHOTO_ID");
  });

  it("keeps static destination data available offline and marks current cards separately", () => {
    connectivityMode = "offline";
    renderWithProviders(<DestinationHubPage destinationId="city:PT:lisbon" onBack={vi.fn()} onOpenDestination={vi.fn()} setTab={vi.fn()} />);

    expect(screen.getByRole("status")).toHaveTextContent("Static destination information stays available offline.");
    expect(screen.getByRole("heading", { level: 1, name: "Lisbon" })).toBeInTheDocument();
    expect(screen.getByText("+351")).toBeInTheDocument();
    expect(screen.getAllByText("Current information required").length).toBeGreaterThan(0);
  });

  it("supports local destination search and unknown destination states", async () => {
    const user = userEvent.setup();
    const onOpenDestination = vi.fn();
    renderWithProviders(<DestinationHubPage destinationId="country:PT" onBack={vi.fn()} onOpenDestination={onOpenDestination} setTab={vi.fn()} />);

    await user.type(screen.getByLabelText("Search country, city, or ISO code"), "Lisbon");
    await user.click(screen.getByRole("button", { name: /Lisbon/i }));
    expect(onOpenDestination).toHaveBeenCalledWith("city:PT:lisbon");

    cleanup();
    renderWithProviders(<DestinationHubPage destinationId="city:UNRESOLVED:nowhere" onBack={vi.fn()} onOpenDestination={vi.fn()} setTab={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Destination not available yet" })).toBeInTheDocument();
  });

  it("renders Arabic RTL without raw canonical identifiers", () => {
    const { container } = renderWithProviders(
      <DestinationHubPage destinationId="country:PT" onBack={vi.fn()} onOpenDestination={vi.fn()} setTab={vi.fn()} />,
      { language: "ar" }
    );

    expect(container.querySelector(".destination-hub-page")).toHaveAttribute("dir", "rtl");
    expect(screen.getByRole("region", { name: "مركز الوجهة" })).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("country:PT");
  });

  it("renders richer curated data for Morocco, the United States, and Japan only when available", () => {
    renderWithProviders(<DestinationHubPage destinationId="country:MA" onBack={vi.fn()} onOpenDestination={vi.fn()} setTab={vi.fn()} />);
    expect(screen.getByRole("heading", { level: 1, name: "Morocco" })).toBeInTheDocument();
    expect(screen.getByText("+212")).toBeInTheDocument();
    expect(screen.getByText("Arabic · official")).toBeInTheDocument();
    expect(screen.getByText("Amazigh · official")).toBeInTheDocument();
    expect(screen.getAllByText("Reviewed: 2026-08-19").length).toBeGreaterThan(0);

    cleanup();
    renderWithProviders(<DestinationHubPage destinationId="country:US" onBack={vi.fn()} onOpenDestination={vi.fn()} setTab={vi.fn()} />);
    expect(screen.getByText("Washington, DC")).toBeInTheDocument();
    expect(screen.getByText("customary")).toBeInTheDocument();
    expect(screen.getByText("120 V")).toBeInTheDocument();

    cleanup();
    renderWithProviders(<DestinationHubPage destinationId="country:JP" onBack={vi.fn()} onOpenDestination={vi.fn()} setTab={vi.fn()} />);
    expect(screen.getByRole("heading", { level: 1, name: "Japan" })).toBeInTheDocument();
    expect(screen.getByText("100 V")).toBeInTheDocument();
    expect(screen.getByText("50 / 60 Hz")).toBeInTheDocument();
    expect(screen.getByText("110 / 119")).toBeInTheDocument();
  });
});
