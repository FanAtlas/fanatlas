/** @vitest-environment jsdom */
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TravelExplorerPage } from "./TravelExplorerPage";
import { renderWithProviders } from "../test/renderWithProviders";
import { deriveTravelExplorer } from "../lib/travelExplorer";
import { deriveTravelInsights } from "../lib/travelInsights";
import { deriveTravelPassport } from "../lib/travelPassport";
import { createTripDraftFixture } from "../test/fixtures/tripDraftFixtures";

vi.mock("../hooks/useTravelExplorer", () => ({
  useTravelExplorer: () => {
    const trips = [
      createTripDraftFixture({
        id: "morocco-2025",
        name: "Morocco Return",
        travelDates: { startDate: "2025-05-01", endDate: "2025-05-04" }
      }),
      createTripDraftFixture({
        id: "morocco-2026",
        name: "Casablanca Journey",
        journalEntries: [{
          id: "journal-secret",
          title: "Safe Explorer Title",
          body: "EXPLORER_COMPONENT_PRIVATE_BODY",
          entryDate: "2026-01-11",
          itineraryDayId: "day-1",
          placeReferenceId: "place-1",
          photoIds: ["EXPLORER_COMPONENT_PHOTO_ID"],
          favorite: true,
          status: "complete",
          createdAt: "2026-01-15T12:00:00.000Z",
          updatedAt: "2026-01-15T12:00:00.000Z"
        }],
        travelDates: { startDate: "2026-01-10", endDate: "2026-01-12" }
      }),
      createTripDraftFixture({
        id: "france-2027",
        name: "Paris Plan",
        completionStatus: "draft",
        completedAt: undefined,
        destination: { label: "Paris, France", countryCode: "FR", country: "France", city: "Paris" },
        travelDates: { startDate: "2027-06-01", endDate: "2027-06-03" }
      })
    ];
    const passport = deriveTravelPassport(trips, { currentDate: "2026-07-30", generatedAt: "test" });
    const insights = deriveTravelInsights(trips, { currentDate: "2026-07-30", generatedAt: "test" });
    return { drafts: trips, passport, insights, explorer: deriveTravelExplorer({ trips, passport, insights }) };
  }
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("TravelExplorerPage", () => {
  it("renders summary, filters destinations, and opens Explorer panels", async () => {
    const user = userEvent.setup();

    renderWithProviders(<TravelExplorerPage onBack={vi.fn()} setTab={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Global Travel Explorer" })).toBeInTheDocument();
    expect(screen.getByLabelText("Explorer summary")).toHaveTextContent("Countries visited");

    await user.type(screen.getByPlaceholderText("Search countries, cities or trips"), "Morocco");
    await user.click(screen.getByRole("button", { name: /Morocco, visited/i }));

    expect(screen.getByRole("heading", { name: "Morocco" })).toBeInTheDocument();
    expect(screen.getByText("Completed trips")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Cities" }));
    await user.click(screen.getByRole("button", { name: "Cities: Casablanca" }));
    expect(screen.getByRole("heading", { name: "Casablanca" })).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Trips" }));
    await user.click(screen.getByRole("button", { name: "Trips: Morocco Return" }));
    expect(screen.getByRole("heading", { name: "Morocco Return" })).toBeInTheDocument();
  });

  it("supports replay controls without autoplaying", async () => {
    const user = userEvent.setup();

    renderWithProviders(<TravelExplorerPage onBack={vi.fn()} setTab={vi.fn()} />);

    expect(screen.getAllByText("Replay recorded trips in chronological order. It never starts automatically.").length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: /Start replay/i }));
    expect(screen.getAllByText(/Morocco Return/i).length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: /Stop replay/i }));
    expect(screen.getAllByText("Replay recorded trips in chronological order. It never starts automatically.").length).toBeGreaterThan(0);
  });

  it("keeps private journal bodies and photo identifiers out of the Explorer document", async () => {
    const user = userEvent.setup();

    renderWithProviders(<TravelExplorerPage onBack={vi.fn()} setTab={vi.fn()} />);

    await user.type(screen.getByPlaceholderText("Search countries, cities or trips"), "EXPLORER_COMPONENT_PRIVATE_BODY");
    expect(document.body).not.toHaveTextContent("EXPLORER_COMPONENT_PRIVATE_BODY");
    expect(document.body.innerHTML).not.toContain("EXPLORER_COMPONENT_PHOTO_ID");
    expect(screen.getByText("No destinations match the current filters.")).toBeInTheDocument();
  });

  it("pauses automatic replay progression when reduced motion is requested", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }));

    renderWithProviders(<TravelExplorerPage onBack={vi.fn()} setTab={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /Start replay/i }));

    await waitFor(() => expect(screen.getByRole("button", { name: /Start replay/i })).toBeInTheDocument());
    expect(screen.getAllByText(/Morocco Return/i).length).toBeGreaterThan(0);
  });
});
