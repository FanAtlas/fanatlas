import { describe, expect, it } from "vitest";
import { deriveDestinationIntelligence } from "./destinationIntelligence";
import {
  derivePreparationDates,
  deriveTravelPreparationDueReminders,
  deriveTravelPreparation,
  deriveTravelPreparationPhase,
  createTravelPreparationReminderId,
  groupTravelPreparationActions,
  deriveTravelPreparationTemplate,
  reconcileTravelPreparation
} from "./travelPreparation";
import {
  acknowledgeTripPreparationReminder,
  duplicateTripDraft,
  markTripPreparationReminderNotified,
  updateTripPreparationReminderSettings,
  type PlanningAction
} from "./tripDrafts";
import { createTripDraftFixture } from "../test/fixtures/tripDraftFixtures";

const now = new Date("2026-05-20T12:00:00.000Z");

describe("Travel Preparation", () => {
  it("derives an international rich-destination template from Trip Draft and Destination Intelligence", () => {
    const trip = createTripDraftFixture({
      destination: { label: "Lisbon, Portugal", countryCode: "PT", country: "Portugal", city: "Lisbon" },
      travelDates: { startDate: "2026-06-01", endDate: "2026-06-05" },
      planningActions: []
    });
    const intelligence = deriveDestinationIntelligence({ tripDrafts: [trip] });
    const preparation = deriveTravelPreparation({ trip, intelligence, now });
    const texts = preparation.suggestions.map((item) => item.text);

    expect(texts).toContain("Check passport or travel document validity");
    expect(texts).toContain("Review official entry requirements before travel");
    expect(texts).toContain("Review destination currency (EUR)");
    expect(texts).toContain("Open Translator and prepare key phrases");
    expect(texts).toContain("Review power and plug compatibility");
    expect(texts).toContain("Review emergency information in SOS");
    expectNoUnsafeVisaClaim(texts);
    expect(preparation.dates).toMatchObject({ daysUntilTrip: 12, durationDays: 5, proximity: "upcoming" });
    expect(preparation.dataQuality.hasVerifiedEmergency).toBe(true);
  });

  it("keeps unknown destinations generic and high-stakes-safe", () => {
    const trip = createTripDraftFixture({
      destination: { label: "Mystery City, Atlantis", country: "Atlantis", city: "Mystery City" },
      planningActions: []
    });
    const intelligence = deriveDestinationIntelligence({ tripDrafts: [trip] });
    const preparation = deriveTravelPreparation({ trip, intelligence, now });
    const texts = preparation.suggestions.map((item) => item.text);

    expect(texts).toContain("Confirm trip dates and arrival details");
    expect(texts).toContain("Review official emergency information before travel");
    expect(texts).not.toContain("Review power and plug compatibility");
    expectNoUnsafeVisaClaim(texts);
    expect(preparation.dataQuality.destinationResolved).toBe(false);
  });

  it("uses domestic/static metadata without live exchange rates or AI packing", () => {
    const trip = createTripDraftFixture({
      destination: { label: "New York, United States", countryCode: "US", country: "United States", city: "New York" },
      planningActions: []
    });
    const intelligence = deriveDestinationIntelligence({ tripDrafts: [trip] });
    const template = deriveTravelPreparationTemplate({
      trip,
      country: intelligence.countries.find((country) => country.identity.countryCode === "US") || null,
      originCountryCode: "US"
    });
    const serialized = JSON.stringify(template);

    expect(serialized).toContain("Keep required ID and confirmations available");
    expect(serialized).toContain("Review destination currency (USD)");
    expect(serialized).toContain("Review power and plug compatibility");
    expect(serialized).not.toContain("Check passport or travel document validity");
    expect(serialized).not.toContain("Review official entry requirements before travel");
    expect(serialized).not.toMatch(/exchange rate|weather|visa required|visa-free|openai|ai generated/i);
  });

  it("preserves user items, completion, and avoids duplicate suggested actions", () => {
    const trip = createTripDraftFixture({ planningActions: [] });
    const intelligence = deriveDestinationIntelligence({ tripDrafts: [trip] });
    const suggestions = deriveTravelPreparation({ trip, intelligence, now }).suggestions;
    const existing: PlanningAction[] = [
      { id: "suggested-1", text: suggestions[0].text, completed: true, createdAt: "2026-01-01T00:00:00.000Z" },
      { id: "custom-1", text: "Buy allergy-safe snacks", completed: false, createdAt: "2026-01-01T00:00:00.000Z" }
    ];
    const reconciliation = reconcileTravelPreparation({ existingActions: existing, suggestions });
    const preparation = deriveTravelPreparation({ trip: { ...trip, planningActions: existing }, intelligence, now });

    expect(reconciliation.actionsToAdd.some((item) => item.text === suggestions[0].text)).toBe(false);
    expect(reconciliation.actionsToAdd.length).toBeGreaterThan(0);
    expect(preparation.progress.completed).toBe(1);
    expect(JSON.stringify(preparation)).toContain("Buy allergy-safe snacks");
  });

  it("identifies obsolete generated suggestions without deleting user-created items", () => {
    const trip = createTripDraftFixture({ planningActions: [] });
    const intelligence = deriveDestinationIntelligence({ tripDrafts: [trip] });
    const suggestions = deriveTravelPreparation({ trip, intelligence, now }).suggestions;
    const existing: PlanningAction[] = [
      { id: "obsolete", text: "Review destination currency (JPY)", completed: true, createdAt: "2026-01-01T00:00:00.000Z" },
      { id: "custom", text: "Review destination currency plan with family", completed: false, createdAt: "2026-01-01T00:00:00.000Z" }
    ];
    const reconciliation = reconcileTravelPreparation({ existingActions: existing, suggestions });
    expect(reconciliation.obsoleteSuggestions.map((item) => item.id)).toEqual(["obsolete"]);
    expect(reconciliation.obsoleteSuggestions.map((item) => item.id)).not.toContain("custom");
  });

  it("derives date proximity without reminders or scheduling", () => {
    expect(derivePreparationDates({ startDate: "2026-05-20" }, now).proximity).toBe("today");
    expect(derivePreparationDates({ startDate: "2026-05-23" }, now).proximity).toBe("soon");
    expect(derivePreparationDates({ startDate: "2026-08-01" }, now).proximity).toBe("later");
    expect(derivePreparationDates(undefined, now)).toMatchObject({ daysUntilTrip: null, proximity: "unknown" });
  });

  it("derives exact preparation phase boundaries with date-only semantics", () => {
    expect(deriveTravelPreparationPhase(undefined, now)).toBe("anytime");
    expect(deriveTravelPreparationPhase({ startDate: "2026-06-01" }, now)).toBe("early");
    expect(deriveTravelPreparationPhase({ startDate: "2026-05-27" }, now)).toBe("week_before");
    expect(deriveTravelPreparationPhase({ startDate: "2026-05-22" }, now)).toBe("week_before");
    expect(deriveTravelPreparationPhase({ startDate: "2026-05-21" }, now)).toBe("day_before");
    expect(deriveTravelPreparationPhase({ startDate: "2026-05-20" }, now)).toBe("departure_day");
    expect(deriveTravelPreparationPhase({ startDate: "2026-05-19", endDate: "2026-05-21" }, now)).toBe("trip_started");
    expect(deriveTravelPreparationPhase({ startDate: "2026-05-01", endDate: "2026-05-10" }, now)).toBe("trip_ended");
  });

  it("assigns stable suggestion identities and timing metadata independent from localized text", () => {
    const trip = createTripDraftFixture({
      destination: { label: "Lisbon, Portugal", countryCode: "PT", country: "Portugal", city: "Lisbon" },
      planningActions: []
    });
    const intelligence = deriveDestinationIntelligence({ tripDrafts: [trip] });
    const template = deriveTravelPreparationTemplate({ trip, country: intelligence.countries.find((country) => country.identity.countryCode === "PT") || null });

    expect(template.map((item) => item.id)).toContain("prep.documents.review-entry-info");
    expect(template.find((item) => item.id === "prep.money.review-currency.EUR")).toMatchObject({ recommendedPhase: "week_before" });
    expect(template.find((item) => item.id === "prep.packing.basic-review")).toMatchObject({ recommendedPhase: "day_before" });
  });

  it("groups current, future, completed, and custom anytime items without mutating actions", () => {
    const trip = createTripDraftFixture({ planningActions: [] });
    const intelligence = deriveDestinationIntelligence({ tripDrafts: [trip] });
    const suggestions = deriveTravelPreparation({ trip, intelligence, now }).suggestions;
    const existing: PlanningAction[] = [
      { id: "early", text: "Check passport or travel document validity", completed: false, createdAt: "2026-01-01T00:00:00.000Z" },
      { id: "future", text: "Pack trip essentials for the planned duration", completed: false, createdAt: "2026-01-01T00:00:00.000Z" },
      { id: "done", text: "Review destination currency (MAD)", completed: true, createdAt: "2026-01-01T00:00:00.000Z" },
      { id: "custom", text: "Buy allergy-safe snacks", completed: false, createdAt: "2026-01-01T00:00:00.000Z" }
    ];
    const before = JSON.stringify(existing);
    const preparation = deriveTravelPreparation({ trip: { ...trip, planningActions: existing }, intelligence, now: new Date("2026-01-03T12:00:00.000Z") });
    const grouped = groupTravelPreparationActions({ actions: preparation.groups.flatMap((group) => group.actions), currentPhase: "week_before" });

    expect(grouped.find((group) => group.id === "focus_now")?.actions.map((item) => item.action.id)).toEqual(expect.arrayContaining(["early", "custom"]));
    expect(grouped.find((group) => group.id === "coming_up")?.actions.map((item) => item.action.id)).toContain("future");
    expect(grouped.find((group) => group.id === "completed")?.actions.map((item) => item.action.id)).toContain("done");
    expect(preparation.groups.flatMap((group) => group.actions).find((item) => item.action.id === "custom")?.recommendedPhase).toBe("anytime");
    expect(JSON.stringify(existing)).toBe(before);
    expect(suggestions.length).toBeGreaterThan(0);
  });

  it("keeps readiness notices separate from 100% checklist completion", () => {
    const trip = createTripDraftFixture({
      destination: { label: "Mystery City, Atlantis", country: "Atlantis", city: "Mystery City" },
      planningActions: []
    });
    const intelligence = deriveDestinationIntelligence({ tripDrafts: [trip] });
    const initial = deriveTravelPreparation({ trip, intelligence, now });
    const completedActions = initial.suggestions.map((item, index): PlanningAction => ({
      id: `completed-${index}`,
      text: item.text,
      completed: true,
      createdAt: "2026-01-01T00:00:00.000Z"
    }));
    const complete = deriveTravelPreparation({ trip: { ...trip, planningActions: completedActions }, intelligence, now });

    expect(complete.progress.completionPercent).toBe(100);
    expect(complete.readiness.readyState).toBe("ready_with_notices");
    expect(complete.notices.map((notice) => notice.id)).toEqual(expect.arrayContaining(["destination_unresolved", "emergency_unverified"]));
  });

  it("is deterministic and does not mutate input trip drafts", () => {
    const trip = createTripDraftFixture();
    const before = JSON.stringify(trip);
    const intelligence = deriveDestinationIntelligence({ tripDrafts: [trip] });
    expect(deriveTravelPreparation({ trip, intelligence, now })).toEqual(deriveTravelPreparation({ trip, intelligence, now }));
    expect(JSON.stringify(trip)).toBe(before);
  });

  it("derives opt-in due reminders without scheduling when enabled phases match", () => {
    const trip = createTripDraftFixture({
      id: "trip-reminder",
      travelDates: { startDate: "2026-05-27", endDate: "2026-05-31" },
      preparationReminderSettings: { enabled: true, phases: ["week_before", "day_before", "departure_day"] },
      planningActions: [{ id: "a", text: "Check passport or travel document validity", completed: false, createdAt: "2026-01-01T00:00:00.000Z" }]
    });
    const intelligence = deriveDestinationIntelligence({ tripDrafts: [trip] });
    const preparation = deriveTravelPreparation({ trip, intelligence, now });

    expect(preparation.reminders.due).toHaveLength(1);
    expect(preparation.reminders.due[0]).toMatchObject({
      id: "prep-reminder:trip-reminder:2026-05-27:week_before:checklist",
      phase: "week_before",
      kind: "checklist"
    });
    expect(createTravelPreparationReminderId({ tripId: "trip-reminder", startDate: "2026-05-27", phase: "week_before" })).toBe("prep-reminder:trip-reminder:2026-05-27:week_before:checklist");
  });

  it("keeps reminders quiet when disabled, dates are missing, trip started, trip ended, or checklist is complete", () => {
    const base = createTripDraftFixture({
      travelDates: { startDate: "2026-05-27", endDate: "2026-05-31" },
      planningActions: [{ id: "a", text: "Check passport or travel document validity", completed: false, createdAt: "2026-01-01T00:00:00.000Z" }]
    });
    const progress = { total: 1, completed: 0, remaining: 1, completionPercent: 0, status: "not_started" as const };
    expect(deriveTravelPreparationDueReminders({ trip: base, progress, notices: [], now }).due).toHaveLength(0);
    expect(deriveTravelPreparationDueReminders({ trip: { ...base, travelDates: undefined, preparationReminderSettings: { enabled: true, phases: ["week_before"] } }, progress, notices: [], now }).due).toHaveLength(0);
    expect(deriveTravelPreparationDueReminders({ trip: { ...base, travelDates: { startDate: "2026-05-19", endDate: "2026-05-21" }, preparationReminderSettings: { enabled: true, phases: ["week_before", "day_before", "departure_day"] } }, progress, notices: [], now }).due).toHaveLength(0);
    expect(deriveTravelPreparationDueReminders({ trip: { ...base, travelDates: { startDate: "2026-05-01", endDate: "2026-05-10" }, preparationReminderSettings: { enabled: true, phases: ["week_before", "day_before", "departure_day"] } }, progress, notices: [], now }).due).toHaveLength(0);
    expect(deriveTravelPreparationDueReminders({
      trip: { ...base, preparationReminderSettings: { enabled: true, phases: ["week_before"] } },
      progress: { total: 1, completed: 1, remaining: 0, completionPercent: 100, status: "ready" },
      notices: [],
      now
    }).due).toHaveLength(0);
  });

  it("derives day-before, departure-day, acknowledgement, notification, date-change, and high-stakes reminder behavior", () => {
    const trip = createTripDraftFixture({
      id: "trip-reminder",
      destination: { label: "Mystery City, Atlantis", country: "Atlantis", city: "Mystery City" },
      travelDates: { startDate: "2026-05-21", endDate: "2026-05-24" },
      preparationReminderSettings: { enabled: true, phases: ["week_before", "day_before", "departure_day"] },
      planningActions: []
    });
    const intelligence = deriveDestinationIntelligence({ tripDrafts: [trip] });
    const initial = deriveTravelPreparation({ trip, intelligence, now });
    const completeActions = initial.suggestions.map((suggestion, index): PlanningAction => ({
      id: `a-${index}`,
      text: suggestion.text,
      completed: true,
      createdAt: "2026-01-01T00:00:00.000Z"
    }));
    const complete = deriveTravelPreparation({ trip: { ...trip, planningActions: completeActions }, intelligence, now });
    expect(complete.reminders.due[0]).toMatchObject({ phase: "day_before", kind: "current_information" });

    const occurrenceId = complete.reminders.due[0].id;
    const acknowledged = acknowledgeTripPreparationReminder({ version: 1, drafts: [trip] }, "trip-reminder", { occurrenceId }, "2026-05-20T13:00:00.000Z");
    expect(acknowledged.ok).toBe(true);
    const acknowledgedTrip = acknowledged.value?.drafts[0];
    expect(deriveTravelPreparation({ trip: { ...(acknowledgedTrip || trip), planningActions: completeActions }, intelligence, now }).reminders.due).toHaveLength(0);

    const notified = markTripPreparationReminderNotified({ version: 1, drafts: [trip] }, "trip-reminder", { occurrenceId }, "2026-05-20T13:00:00.000Z");
    expect(notified.value?.drafts[0].preparationReminderOccurrences?.[0]).toMatchObject({ notifiedAt: "2026-05-20T13:00:00.000Z" });

    const shifted = deriveTravelPreparation({
      trip: { ...acknowledgedTrip!, travelDates: { startDate: "2026-05-27", endDate: "2026-05-31" }, planningActions: completeActions },
      intelligence,
      now
    });
    expect(shifted.reminders.due[0]?.id).toContain("2026-05-27");
  });

  it("preserves reminder settings and resets occurrence history when duplicating trips", () => {
    const trip = createTripDraftFixture({
      id: "source-trip",
      preparationReminderSettings: { enabled: true, phases: ["week_before", "day_before"] },
      preparationReminderOccurrences: [{ occurrenceId: "prep-reminder:source-trip:2026-05-27:week_before:checklist", acknowledgedAt: "2026-05-20T13:00:00.000Z" }]
    });
    const duplicated = duplicateTripDraft({ version: 1, drafts: [trip] }, "source-trip", { name: "Copy" });
    expect(duplicated.ok).toBe(true);
    expect(duplicated.value?.draft.preparationReminderSettings).toEqual({ enabled: true, phases: ["week_before", "day_before"] });
    expect(duplicated.value?.draft.preparationReminderOccurrences).toEqual([]);

    const disabled = updateTripPreparationReminderSettings({ version: 1, drafts: [trip] }, "source-trip", { enabled: false, phases: ["week_before"] });
    expect(disabled.value?.drafts[0].preparationReminderSettings).toMatchObject({ enabled: false, phases: ["week_before"] });
  });
});

function expectNoUnsafeVisaClaim(values: readonly string[]) {
  expect(values.join(" ")).not.toMatch(/visa required|visa-free|do not need a visa|need a visa/i);
}
