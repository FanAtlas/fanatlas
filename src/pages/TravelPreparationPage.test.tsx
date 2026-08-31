/** @vitest-environment jsdom */
import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TravelPreparationPage } from "./TravelPreparationPage";
import { renderWithProviders } from "../test/renderWithProviders";
import { createJournalEntryFixture, createTripDraftFixture } from "../test/fixtures/tripDraftFixtures";
import { deriveDestinationIntelligence } from "../lib/destinationIntelligence";
import type { TripDraft } from "../lib/tripDrafts";

const privateTrip = createTripDraftFixture({
  id: "lisbon-prep-trip",
  name: "FanAtlas Lisbon Preparation",
  destination: { label: "Lisbon, Portugal", countryCode: "PT", country: "Portugal", city: "Lisbon" },
  travelDates: { startDate: "2026-06-01", endDate: "2026-06-05" },
  planningActions: [
    { id: "prep-1", text: "Check passport or travel document validity", completed: false, createdAt: "2026-01-01T00:00:00.000Z" },
    { id: "prep-2", text: "Review destination currency (EUR)", completed: true, createdAt: "2026-01-01T00:00:00.000Z" },
    { id: "prep-3", text: "Review emergency information in SOS", completed: false, createdAt: "2026-01-01T00:00:00.000Z" },
    { id: "prep-4", text: "Pack trip essentials for the planned duration", completed: false, createdAt: "2026-01-01T00:00:00.000Z" },
    { id: "custom-1", text: "Pack synthetic snacks", completed: false, createdAt: "2026-01-01T00:00:00.000Z" }
  ],
  journalEntries: [createJournalEntryFixture({
    body: "PRIVATE_PREPARATION_JOURNAL_BODY",
    photoIds: ["PRIVATE_PREPARATION_PHOTO_ID"]
  })]
});

const addTripPlanningAction = vi.fn(() => ({ ok: true as const }));
const updateTripPlanningAction = vi.fn(() => ({ ok: true as const }));
const toggleTripPlanningAction = vi.fn(() => ({ ok: true as const }));
const removeTripPlanningAction = vi.fn(() => ({ ok: true as const }));
const updateTripPreparationReminderSettings = vi.fn(() => ({ ok: true as const }));
const acknowledgeTripPreparationReminder = vi.fn(() => ({ ok: true as const }));
const markTripPreparationReminderNotified = vi.fn(() => ({ ok: true as const }));
let mockedDrafts: TripDraft[] = [privateTrip];
let connectivityMode: "online" | "offline" = "online";

vi.mock("../hooks/useDestinationIntelligence", () => ({
  useDestinationIntelligence: () => deriveDestinationIntelligence({ tripDrafts: [privateTrip], generatedAt: "test" })
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
    addTripPlanningAction,
    updateTripPlanningAction,
    toggleTripPlanningAction,
    removeTripPlanningAction,
    updateTripPreparationReminderSettings,
    acknowledgeTripPreparationReminder,
    markTripPreparationReminderNotified
  })
}));

beforeEach(() => {
  mockedDrafts = [privateTrip];
  connectivityMode = "online";
  addTripPlanningAction.mockClear();
  updateTripPlanningAction.mockClear();
  toggleTripPlanningAction.mockClear();
  removeTripPlanningAction.mockClear();
  updateTripPreparationReminderSettings.mockClear();
  acknowledgeTripPreparationReminder.mockClear();
  markTripPreparationReminderNotified.mockClear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("TravelPreparationPage", () => {
  it("renders trip-scoped preparation from existing planning actions without network or private content", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    renderWithProviders(<TravelPreparationPage tripId="lisbon-prep-trip" now={new Date("2026-05-20T12:00:00.000Z")} onBack={vi.fn()} onOpenDestination={vi.fn()} setTab={vi.fn()} />);

    expect(screen.getByRole("heading", { level: 1, name: "Trip Preparation" })).toBeInTheDocument();
    expect(screen.getByText(/FanAtlas Lisbon Preparation · Lisbon, Portugal/)).toBeInTheDocument();
    expect(screen.getByText("Phase: Early preparation")).toBeInTheDocument();
    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.getByText("Check passport or travel document validity")).toBeInTheDocument();
    expect(screen.getByText("Pack synthetic snacks")).toBeInTheDocument();
    expect(screen.queryByText("Review destination currency (EUR)")).not.toBeInTheDocument();
    expect(screen.queryByText("Review emergency information in SOS")).not.toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "20");
    expect(document.body).not.toHaveTextContent("PRIVATE_PREPARATION_JOURNAL_BODY");
    expect(document.body.innerHTML).not.toContain("PRIVATE_PREPARATION_PHOTO_ID");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("keeps trip preparation available offline with explicit offline labeling", () => {
    connectivityMode = "offline";
    renderWithProviders(<TravelPreparationPage tripId="lisbon-prep-trip" now={new Date("2026-05-20T12:00:00.000Z")} onBack={vi.fn()} onOpenDestination={vi.fn()} setTab={vi.fn()} />);

    expect(screen.getAllByRole("status")[0]).toHaveTextContent("Trip preparation stays available offline.");
    expect(screen.getByText("In progress")).toBeInTheDocument();
  });

  it("switches timing groups while preserving section metadata and completed items", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TravelPreparationPage tripId="lisbon-prep-trip" now={new Date("2026-05-25T12:00:00.000Z")} onBack={vi.fn()} onOpenDestination={vi.fn()} setTab={vi.fn()} />);

    expect(screen.getByText("Phase: Week before")).toBeInTheDocument();
    expect(screen.getByText("Review emergency information in SOS")).toBeInTheDocument();
    expect(screen.getByText("Health & safety · Week before")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Coming up/i }));
    expect(screen.getByText("Pack trip essentials for the planned duration")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Completed/i }));
    expect(screen.getByText("Review destination currency (EUR)")).toBeInTheDocument();
    expect(screen.getByLabelText("Review destination currency (EUR)")).toBeChecked();
  });

  it("uses existing checklist callbacks for completion, custom items, and shortcuts", async () => {
    const user = userEvent.setup();
    const setTab = vi.fn();
    const onOpenDestination = vi.fn();
    renderWithProviders(<TravelPreparationPage tripId="lisbon-prep-trip" now={new Date("2026-05-20T12:00:00.000Z")} onBack={vi.fn()} onOpenDestination={onOpenDestination} setTab={setTab} />);

    await user.click(screen.getByLabelText("Check passport or travel document validity"));
    expect(toggleTripPlanningAction).toHaveBeenCalledWith("lisbon-prep-trip", { actionId: "prep-1" });

    await user.click(screen.getByRole("button", { name: "Add personal preparation item" }));
    await user.type(screen.getByLabelText("Add your own preparation item"), "Call bank before departure");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(addTripPlanningAction).toHaveBeenCalledWith("lisbon-prep-trip", { text: "Call bank before departure" });

    await user.click(screen.getByRole("button", { name: "Destination Guide" }));
    expect(onOpenDestination).toHaveBeenCalledWith("city:PT:lisbon");
    await user.click(screen.getByRole("button", { name: "Currency Converter" }));
    expect(setTab).toHaveBeenCalledWith("currency");
    await user.click(screen.getByRole("button", { name: "Translator" }));
    expect(setTab).toHaveBeenCalledWith("translator");
    await user.click(screen.getByRole("button", { name: "SOS" }));
    expect(setTab).toHaveBeenCalledWith("sos");
  }, 15_000);

  it("renders empty and RTL states safely", () => {
    mockedDrafts = [];
    const { container } = renderWithProviders(
      <TravelPreparationPage tripId={null} onBack={vi.fn()} onOpenDestination={vi.fn()} setTab={vi.fn()} />,
      { language: "ar" }
    );

    expect(container.querySelector(".travel-preparation-page")).toHaveAttribute("dir", "rtl");
    expect(screen.getByRole("heading", { level: 1, name: "لا توجد رحلة محددة" })).toBeInTheDocument();
  });

  it("requests notification permission only after enabling reminders and keeps in-app fallback when denied", async () => {
    const user = userEvent.setup();
    const requestPermission = vi.fn(async () => "denied" as NotificationPermission);
    vi.stubGlobal("Notification", { permission: "default", requestPermission });
    renderWithProviders(<TravelPreparationPage tripId="lisbon-prep-trip" now={new Date("2026-05-25T12:00:00.000Z")} onBack={vi.fn()} onOpenDestination={vi.fn()} setTab={vi.fn()} />);

    expect(requestPermission).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /Enable reminders/i }));
    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(updateTripPreparationReminderSettings).toHaveBeenCalledWith("lisbon-prep-trip", {
      enabled: true,
      phases: ["week_before", "day_before", "departure_day"]
    });
    expect(await screen.findByText("Notifications are blocked. You can keep using in-app reminders.")).toBeInTheDocument();
  });

  it("shows due in-app reminders, dismisses them, and marks granted active-session notifications once", async () => {
    const user = userEvent.setup();
    const notificationConstructor = vi.fn();
    vi.stubGlobal("Notification", Object.assign(notificationConstructor, { permission: "granted", requestPermission: vi.fn() }));
    mockedDrafts = [{
      ...privateTrip,
      preparationReminderSettings: { enabled: true, phases: ["week_before", "day_before", "departure_day"] },
      preparationReminderOccurrences: []
    }];
    renderWithProviders(<TravelPreparationPage tripId="lisbon-prep-trip" now={new Date("2026-05-25T12:00:00.000Z")} onBack={vi.fn()} onOpenDestination={vi.fn()} setTab={vi.fn()} />);

    expect(screen.getByText("Review preparation")).toBeInTheDocument();
    expect(screen.getByText("Your trip is coming up. Review your FanAtlas preparation checklist.")).toBeInTheDocument();
    expect(notificationConstructor).toHaveBeenCalledTimes(1);
    expect(markTripPreparationReminderNotified).toHaveBeenCalledWith("lisbon-prep-trip", { occurrenceId: "prep-reminder:lisbon-prep-trip:2026-06-01:week_before:checklist" });
    await user.click(screen.getByRole("button", { name: "Dismiss reminder" }));
    expect(acknowledgeTripPreparationReminder).toHaveBeenCalledWith("lisbon-prep-trip", { occurrenceId: "prep-reminder:lisbon-prep-trip:2026-06-01:week_before:checklist" });
  });
});
