import { expect, test, type Page } from "@playwright/test";
import { authenticatedE2ESkipReason, newAuthenticatedContext, shouldRunAuthenticatedE2E } from "./helpers/auth";
import {
  E2E_JOURNAL_BODY,
  E2E_JOURNAL_TITLE,
  E2E_PLANNED_PLACE,
  E2E_TODAY_AFTERNOON_PLACE,
  E2E_TODAY_NEXT_PLACE,
  E2E_TRIP_NAME,
  E2E_VISITED_PLACE,
  seedSyntheticTripDraft,
  seedSyntheticTodayTripDraft,
  writeSyntheticTripDraft
} from "./helpers/tripFixture";

test.describe("authenticated private travel routes", () => {
  test.skip(!shouldRunAuthenticatedE2E(), authenticatedE2ESkipReason());

  test("renders Passport, Journal, Insights, and Explorer from synthetic local trip data", async ({ browser }) => {
    const context = await newAuthenticatedContext(browser);
    const page = await context.newPage();
    await seedSyntheticTripDraft(page);

    await page.goto("/passport");
    await expect(page.getByRole("heading", { level: 1, name: /Travel Passport/i })).toBeVisible();
    await expect(page.getByText("Private to you")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Portugal" })).toBeVisible();
    await expect(page.getByText("Lisbon, Portugal")).toBeVisible();

    await page.goto("/journal");
    await expect(page.getByText("Travel Journal").first()).toBeVisible();
    await expect(page.getByText("Private to you")).toBeVisible();
    await expect(page.getByText(E2E_JOURNAL_TITLE)).toBeVisible();
    await expect(page.getByRole("button", { name: /Complete FanAtlas E2E Lisbon/i })).toBeVisible();

    await page.goto("/insights");
    await expect(page.getByText("Travel Insights").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /Portugal/ })).toBeVisible();
    await expect(page.getByText("Lisbon").first()).toBeVisible();
    await expect(page.getByText(E2E_JOURNAL_BODY)).toHaveCount(0);

    await page.goto("/explorer");
    await expect(page.getByRole("button", { name: /Countries: Portugal/i })).toBeVisible();
    await expect(page.getByText("Lisbon").first()).toBeVisible();
    await page.getByRole("button", { name: /Countries: Portugal/i }).click();
    await expect(page.getByRole("button", { name: /FanAtlas E2E Lisbon Trip Jun 1/i })).toBeVisible();
    await expect(page.getByText(E2E_JOURNAL_BODY)).toHaveCount(0);
    await expect(page.getByText(/fanatlas-e2e-trip|fanatlas-e2e-journal|38\.|9\./i)).toHaveCount(0);

    await context.close();
  });

  test("opens Destination Hub from Explorer, Passport, and Trip Drafts without leaking private content", async ({ browser }) => {
    const context = await newAuthenticatedContext(browser);
    const page = await context.newPage();
    await seedSyntheticTripDraft(page);

    await page.goto("/explorer");
    await page.getByRole("button", { name: /Countries: Portugal/i }).click();
    await page.getByRole("button", { name: "View Destination" }).first().click();
    await expect(page).toHaveURL(/\/destination\/country%3APT/);
    await expect(page.getByRole("heading", { level: 1, name: "Portugal" })).toBeVisible();
    await expect(page.getByText("Entry rules depend on nationality")).toBeVisible();
    await expect(page.getByText(E2E_JOURNAL_BODY)).toHaveCount(0);
    await expect(page.getByText(/country:PT|city:PT|fanatlas-e2e-journal|fanatlas-e2e-photo/i)).toHaveCount(0);

    await page.goto("/passport");
    await page.getByRole("button", { name: "View Destination" }).first().click();
    await expect(page.getByRole("heading", { level: 1, name: "Portugal" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Emergency information" })).toBeVisible();

    await page.goto("/app");
    await page.getByRole("button", { name: /Profile/i }).click();
    await page.getByRole("button", { name: /Trip Drafts/i }).click();
    await page.getByRole("button", { name: "Open" }).first().click();
    await expect(page.getByRole("button", { name: "Destination Guide" })).toBeVisible();
    await page.getByRole("button", { name: "Destination Guide" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Lisbon" })).toBeVisible();
    await expect(page.getByText("Your FanAtlas history")).toBeVisible();
    await expect(page.getByText(E2E_JOURNAL_BODY)).toHaveCount(0);
    await expect(page.getByText(/fanatlas-e2e-trip|fanatlas-e2e-journal|fanatlas-e2e-photo/i)).toHaveCount(0);

    await context.close();
  });

  test("renders direct Destination Hub pages and routes to existing travel tools", async ({ browser }) => {
    const context = await newAuthenticatedContext(browser);
    const page = await context.newPage();
    await seedSyntheticTripDraft(page);

    await page.goto("/destination/city%3APT%3Alisbon");
    await expect(page.getByRole("heading", { level: 1, name: "Lisbon" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Currency" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Power & plugs" })).toBeVisible();
    await expect(page.getByText("+351")).toBeVisible();
    await expect(page.getByText("Europe/Lisbon")).toBeVisible();
    await expect(page.getByText("Portuguese · official")).toBeVisible();
    await expect(page.getByText("230 V")).toBeVisible();
    await expect(page.getByText("50 Hz")).toBeVisible();
    await expect(page.locator(".destination-hub-note", { hasText: "Reviewed: 2026-08-19" })).toBeVisible();
    await expect(page.getByText("No sourced local-customs guidance is available yet.")).toBeVisible();
    await expect(page.getByText(E2E_JOURNAL_BODY)).toHaveCount(0);

    await page.getByRole("button", { name: "Open Translator" }).click();
    await expect(page.getByText("Voice Translator").first()).toBeVisible();

    await page.goto("/destination/country%3APT");
    await page.getByRole("button", { name: "Open Currency Converter" }).first().click();
    await expect(page.getByText("Currency").first()).toBeVisible();

    await page.goto("/destination/country%3APT");
    await page.getByRole("button", { name: "Open SOS" }).first().click();
    await expect(page.getByText("Emergency Numbers").first()).toBeVisible();

    await context.close();
  });

  test("opens Trip Preparation from Trip Drafts and reuses trip-scoped checklist state", async ({ browser }) => {
    test.setTimeout(60_000);
    const context = await newAuthenticatedContext(browser);
    const page = await context.newPage();
    await page.addInitScript(() => {
      Object.defineProperty(window, "Notification", {
        configurable: true,
        value: {
          permission: "denied",
          requestPermission: async () => "denied"
        }
      });
    });
    await seedSyntheticTripDraft(page);

    await page.goto("/app");
    await page.getByRole("button", { name: /Profile/i }).click();
    await page.getByRole("button", { name: /Trip Drafts/i }).click();
    await page.getByRole("button", { name: "Open" }).first().click();
    await page.getByRole("button", { name: "Prepare for this trip" }).click();

    await expect(page).toHaveURL(/\/preparation\/fanatlas-e2e-trip-lisbon/);
    await expect(page.getByRole("heading", { level: 1, name: "Trip Preparation" })).toBeVisible();
    await expect(page.getByText(E2E_TRIP_NAME)).toBeVisible();
    await expect(page.getByText("Lisbon, Portugal")).toBeVisible();
    await setSyntheticTripDates(page, "2026-09-15", "2026-09-19");
    await page.reload();
    await expect(page.getByText("Phase: Early preparation")).toBeVisible();
    await expect(page.getByText("Check passport or travel document validity")).toBeVisible();
    await expect(page.getByText("Review power and plug compatibility")).toBeVisible();
    await expect(page.getByText("Review destination currency (EUR)")).toHaveCount(0);

    await setSyntheticTripDates(page, "2026-09-06", "2026-09-10");
    await page.reload();
    await expect(page.getByText("Phase: Week before")).toBeVisible();
    await expect(page.getByText("Review destination currency (EUR)")).toBeVisible();
    await expect(page.getByText("Open Translator and prepare key phrases")).toBeVisible();
    await page.getByRole("button", { name: "Enable reminders" }).click();
    await expect(page.getByText("Notifications are blocked. You can keep using in-app reminders.")).toBeVisible();
    await expect(page.getByText("Your trip is coming up. Review your FanAtlas preparation checklist.")).toBeVisible();
    await page.getByRole("button", { name: "Dismiss reminder" }).click();
    await page.reload();
    await expect(page.getByText("Your trip is coming up. Review your FanAtlas preparation checklist.")).toHaveCount(0);

    await setSyntheticTripDates(page, "2026-08-31", "2026-09-04");
    await page.reload();
    await expect(page.getByText("Phase: Day before")).toBeVisible();
    await expect(page.getByText("Trip starts tomorrow", { exact: true })).toBeVisible();
    await expect(page.getByLabel("1 day before")).toBeChecked();
    await expect(page.getByText("Pack trip essentials for the planned duration")).toBeVisible();

    const progressBefore = await page.getByRole("progressbar").getAttribute("aria-valuenow");
    await page.getByLabel("Check passport or travel document validity").click();
    await expect.poll(async () => page.getByRole("progressbar").getAttribute("aria-valuenow")).not.toBe(progressBefore);
    await expectPlanningActionPersisted(page, "Check passport or travel document validity", true);
    await page.reload();
    await page.getByRole("button", { name: /Completed/i }).click();
    await expect(page.getByLabel("Check passport or travel document validity")).toBeChecked();
    await page.getByRole("button", { name: /Focus now/i }).click();

    await page.getByRole("button", { name: "Add personal preparation item" }).click();
    await page.getByLabel("Add your own preparation item").fill("Call synthetic test bank");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Call synthetic test bank")).toBeVisible();
    await expectPlanningActionPersisted(page, "Call synthetic test bank", false);
    await expectReminderSettingsPersisted(page, ["week_before", "day_before", "departure_day"]);
    await setSyntheticTripDates(page, "2026-09-15", "2026-09-19");
    await page.reload();
    await expect(page.getByText("Call synthetic test bank")).toBeVisible();
    await expect(page.getByText("Entry information requires current official verification.")).toBeVisible();

    const preparationUrl = page.url();
    const shortcuts = page.getByLabel("Preparation shortcuts");
    await shortcuts.getByRole("button", { name: "Destination Guide" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Lisbon" })).toBeVisible();

    await page.goto(preparationUrl);
    await page.getByLabel("Preparation shortcuts").getByRole("button", { name: "Currency Converter" }).click();
    await expect(page.getByText("Currency").first()).toBeVisible();

    await page.goto(preparationUrl);
    await page.getByLabel("Preparation shortcuts").getByRole("button", { name: "Translator" }).click();
    await expect(page.getByText("Voice Translator").first()).toBeVisible();

    await page.goto(preparationUrl);
    await page.getByLabel("Preparation shortcuts").getByRole("button", { name: "SOS" }).click();
    await expect(page.getByText("Emergency Numbers").first()).toBeVisible();

    await page.goto(preparationUrl);
    await expect(page.getByText(E2E_JOURNAL_BODY)).toHaveCount(0);
    await expect(page.getByText(/fanatlas-e2e-journal|fanatlas-e2e-photo|Synthetic visited place note|Synthetic planned place note/i)).toHaveCount(0);

    await page.setViewportSize({ width: 320, height: 568 });
    await page.reload();
    await expectNoHorizontalOverflow(page);
    await page.evaluate(() => window.localStorage.setItem("fanatlas.language", "ar"));
    await page.reload();
    await expect(page.locator(".travel-preparation-page")).toHaveAttribute("dir", "rtl");

    await context.close();
  });

  test("runs the Trip Day Today experience from deterministic local trip data", async ({ browser }) => {
    const context = await newAuthenticatedContext(browser);
    const page = await context.newPage();
    const blockedRequests: string[] = [];
    const liveContextRequests: Array<{ action: string; currentDate: string; requestId: string }> = [];
    page.on("request", (request) => {
      const url = request.url();
      if (/\/api\/(ai|ai-chat|fanatlas-ai)|weather|exchange|research/i.test(url)) blockedRequests.push(url);
    });
    await page.route("**/api/trip-day-live-context", async (route) => {
      const request = route.request();
      const body = request.postDataJSON();
      liveContextRequests.push({
        action: body.action,
        currentDate: body.currentDate,
        requestId: body.requestId
      });

      const retrievedAt = "2026-08-21T12:00:00.000Z";
      if (body.action === "weather") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            kind: "weather",
            requestId: body.requestId,
            currentDate: body.currentDate,
            identity: body.identity,
            status: "success",
            retrievedAt,
            freshness: { class: "live", retrievedAt, staleAt: "2026-08-21T12:30:00.000Z", expiresAt: "2026-08-21T13:00:00.000Z" },
            source: "Mock Weather Service",
            sourceQuality: "recognized_weather",
            warningCodes: [],
            destination: "Lisbon, Portugal",
            date: "2026-08-21",
            forecastStart: "2026-08-21",
            forecastEnd: "2026-08-21",
            units: "metric",
            daily: [{ date: "2026-08-21", condition: "partly cloudy", temperatureMin: 16, temperatureMax: 24, precipitationChance: 20 }],
            alerts: [],
            citationCount: 1
          })
        });
        return;
      }

      if (body.action === "currency") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            kind: "currency",
            requestId: body.requestId,
            currentDate: body.currentDate,
            identity: body.identity,
            status: "success",
            retrievedAt,
            freshness: { class: "live", retrievedAt, staleAt: "2026-08-21T12:30:00.000Z", expiresAt: "2026-08-21T13:00:00.000Z" },
            source: "Mock Exchange Service",
            sourceQuality: "reputable_secondary",
            warningCodes: [],
            baseCurrency: body.baseCurrency,
            targetCurrency: body.targetCurrency,
            amount: body.amount,
            rate: 1.25,
            convertedAmount: 125,
            rateDate: "2026-08-21",
            citationCount: 1,
            ratesMayChange: true
          })
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          kind: "official_updates",
          requestId: body.requestId,
          currentDate: body.currentDate,
          identity: body.identity,
          status: "success",
          retrievedAt,
          freshness: { class: "recent", retrievedAt, staleAt: "2026-08-21T13:00:00.000Z", expiresAt: "2026-08-21T18:00:00.000Z" },
          source: "Official source",
          sourceQuality: "official_tourism",
          warningCodes: [],
          destination: "Lisbon, Portugal",
          categoryCount: 1,
          findings: [{
            title: "Official notice",
            source: "Official source",
            url: "https://example.test/notice",
            fact: "Review before you go.",
            sourceQuality: "official_tourism",
            retrievedAt,
            category: body.categories?.[0] || "tourism",
            updatedAt: "2026-08-21"
          }],
          citationCount: 1
        })
      });
    });
    await seedSyntheticTodayTripDraft(page);

    await page.goto("/today");
    await expect(page.getByRole("heading", { level: 1, name: "Today" })).toBeVisible();
    await expect(page.getByText(E2E_TRIP_NAME)).toBeVisible();
    await expect(page.getByText("Day 2 of 3")).toBeVisible();
    await expect(page.getByText("Friday, August 21, 2026")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Next in your plan" })).toBeVisible();
    await expect(page.getByText(E2E_TODAY_NEXT_PLACE).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Morning" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Afternoon" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Evening" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Still unscheduled" })).toBeVisible();
    await expect(page.getByText(E2E_PLANNED_PLACE)).toBeVisible();
    await expect(page.getByText("Some preparation items still need attention.")).toBeVisible();
    await expect(page.getByText(E2E_JOURNAL_BODY)).toHaveCount(0);
    await expect(page.getByText(/fanatlas-e2e-journal|fanatlas-e2e-photo/i)).toHaveCount(0);
    await expect(liveContextRequests).toEqual([]);

    await page.getByRole("button", { name: "Check weather" }).click();
    await expect.poll(() => liveContextRequests.length).toBe(1);
    await expect(page.getByText(/Mock Weather Service/i)).toBeVisible();
    await expect(page.getByText(/partly cloudy/i)).toBeVisible();

    const todayNextCard = page.locator(".trip-day-next-card");
    const markVisitedButton = todayNextCard.getByRole("button", { name: new RegExp(`Mark visited: ${E2E_TODAY_NEXT_PLACE}`) });
    await markVisitedButton.scrollIntoViewIfNeeded();
    await markVisitedButton.click({ force: true });
    await expect(page.getByText("Place marked visited.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Next in your plan" })).toBeVisible();
    await expect(todayNextCard.getByRole("heading", { name: E2E_TODAY_AFTERNOON_PLACE, exact: true })).toBeVisible();
    await expect(page.getByText("2 visited")).toBeVisible();
    await page.reload();
    await expect(todayNextCard.getByRole("heading", { name: E2E_TODAY_AFTERNOON_PLACE, exact: true })).toBeVisible();
    await expectTripPlaceStatus(page, E2E_TODAY_NEXT_PLACE, "visited");
    expect(blockedRequests).toEqual([]);
    blockedRequests.length = 0;

    await page.getByRole("button", { name: "Previous day" }).click();
    await expect(page.getByText("Day 1 of 3")).toBeVisible();
    await page.getByRole("button", { name: "Next day" }).click();
    await expect(page.getByText("Day 2 of 3")).toBeVisible();
    await expect(page.getByText(/partly cloudy/i)).toHaveCount(0);

    await page.getByRole("button", { name: "Check current rate" }).click();
    await expect.poll(() => liveContextRequests.length).toBe(2);
    await expect(page.getByText(/Mock Exchange Service/i)).toBeVisible();
    await expect(page.getByText(/1 USD = 1\.2500 EUR/i)).toBeVisible();

    await page.getByRole("button", { name: "Check official updates" }).click();
    await expect.poll(() => liveContextRequests.length).toBe(3);
    await expect(page.getByText("Official notice", { exact: true })).toBeVisible();

    const todayUrl = page.url();
    await page.getByRole("button", { name: "Open Map" }).click();
    await expect(page).toHaveURL(/\/map/);

    await page.goto(todayUrl);
    await page.getByRole("button", { name: "Destination Guide" }).click();
    await expect(page).toHaveURL(/\/destination\/city%3APT%3Alisbon|\/destination\/country%3APT/);
    await expect(page.getByRole("heading", { level: 1, name: /Lisbon|Portugal/ })).toBeVisible();

    await page.goto(todayUrl);
    await page.getByRole("button", { name: "Translator" }).click();
    await expect(page.getByText("Voice Translator").first()).toBeVisible();

    await page.goto(todayUrl);
    await page.getByRole("button", { name: "Currency" }).click();
    await expect(page.getByText("Currency").first()).toBeVisible();

    await page.goto(todayUrl);
    await page.getByRole("button", { name: "SOS" }).click();
    await expect(page.getByText("Emergency Numbers").first()).toBeVisible();

    await page.goto(todayUrl);
    await page.getByRole("button", { name: "Edit itinerary" }).click();
    await expect(page.getByText("Trip Drafts").first()).toBeVisible();

    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto(todayUrl);
    await expectNoHorizontalOverflow(page);
    await page.evaluate(() => window.localStorage.setItem("fanatlas_language", "ar"));
    await page.goto(todayUrl);
    await expect(page.locator(".trip-day-page")).toHaveAttribute("dir", "rtl");

    await context.close();
  });

  test("keeps authenticated private pages usable at a 320px mobile viewport", async ({ browser }) => {
    const context = await newAuthenticatedContext(browser);
    const page = await context.newPage();
    await page.setViewportSize({ width: 320, height: 568 });
    await seedSyntheticTripDraft(page);

    const headingsByPath: Array<[string, string]> = [
      ["/passport", /Travel Passport/],
      ["/journal", /Travel Journal/],
      ["/insights", /Travel Insights/],
      ["/explorer", /Global Travel Explorer/],
      ["/today", /No dated trip/],
      ["/destination/city%3APT%3Alisbon", /Lisbon/],
      ["/preparation/fanatlas-e2e-trip-lisbon", /Trip Preparation/]
    ];

    for (const [path, heading] of headingsByPath) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await expect(page.getByRole("button").first()).toBeVisible();
      const visibleButtonNames = await page.getByRole("button").evaluateAll((buttons) => buttons
        .filter((button) => {
          const element = button as HTMLElement;
          const style = window.getComputedStyle(element);
          return style.visibility !== "hidden" && style.display !== "none" && element.offsetParent !== null;
        })
        .map((button) => (button.textContent || button.getAttribute("aria-label") || "").trim()));
      expect(visibleButtonNames.some(Boolean)).toBe(true);
      const unlabeledInputs = await page.locator("input:not([aria-label]):not([aria-labelledby])").evaluateAll((inputs) => inputs.filter((input) => {
        const element = input as HTMLElement;
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        if (input.getAttribute("type") === "hidden" || input.disabled || rect.width === 0 || rect.height === 0 || style.visibility === "hidden" || style.display === "none") return false;
        if (input.closest("label")) return false;
        const id = input.getAttribute("id");
        return !id || !document.querySelector(`label[for="${id}"]`);
      }).length);
      expect(unlabeledInputs).toBe(0);
    }

    await context.close();
  });
});

test.describe("authenticated Trip Draft storage sync", () => {
  test.skip(!shouldRunAuthenticatedE2E(), authenticatedE2ESkipReason());

  test("updates a second tab from the existing storage event behavior", async ({ browser }) => {
    const context = await newAuthenticatedContext(browser);
    const first = await context.newPage();
    const second = await context.newPage();
    await seedSyntheticTripDraft(first);
    await seedSyntheticTripDraft(second);

    await first.goto("/passport");
    await second.goto("/passport");
    await expect(second.getByText(E2E_TRIP_NAME)).toBeVisible();

    const updatedName = "FanAtlas E2E Lisbon Trip Synced";
    await writeSyntheticTripDraft(first, updatedName);
    await expect(second.getByText(updatedName)).toBeVisible();
    await expect(second.getByText(E2E_VISITED_PLACE).or(second.getByText(E2E_PLANNED_PLACE))).toHaveCount(0);

    await context.close();
  });
});

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
}

async function expectPlanningActionPersisted(page: Page, text: string, completed: boolean) {
  await expect.poll(async () => page.evaluate(({ actionText, expectedCompleted }) => {
    const raw = window.localStorage.getItem("fanatlas_trip_drafts_v1");
    if (!raw) return false;
    try {
      const state = JSON.parse(raw) as { drafts?: Array<{ planningActions?: Array<{ text?: string; completed?: boolean }> }> };
      return Boolean(state.drafts?.some((draft) => draft.planningActions?.some((action) => action.text === actionText && action.completed === expectedCompleted)));
    } catch {
      return false;
    }
  }, { actionText: text, expectedCompleted: completed })).toBe(true);
}

async function expectReminderSettingsPersisted(page: Page, phases: string[]) {
  await expect.poll(async () => page.evaluate((expectedPhases) => {
    const raw = window.localStorage.getItem("fanatlas_trip_drafts_v1");
    if (!raw) return false;
    try {
      const state = JSON.parse(raw) as { drafts?: Array<{ id?: string; preparationReminderSettings?: { enabled?: boolean; phases?: string[] } }> };
      const trip = state.drafts?.find((draft) => draft.id === "fanatlas-e2e-trip-lisbon");
      return Boolean(
        trip?.preparationReminderSettings?.enabled &&
        expectedPhases.every((phase) => trip.preparationReminderSettings?.phases?.includes(phase))
      );
    } catch {
      return false;
    }
  }, phases)).toBe(true);
}

async function expectTripPlaceStatus(page: Page, logicalPlaceId: string, status: string) {
  await expect.poll(async () => page.evaluate(({ placeId, expectedStatus }) => {
    const raw = window.localStorage.getItem("fanatlas_trip_drafts_v1");
    if (!raw) return false;
    try {
      const state = JSON.parse(raw) as { drafts?: Array<{ placeReferences?: Array<{ logicalPlaceId?: string; visitStatus?: string }> }> };
      return Boolean(state.drafts?.some((draft) => draft.placeReferences?.some((place) => place.logicalPlaceId === placeId && place.visitStatus === expectedStatus)));
    } catch {
      return false;
    }
  }, { placeId: logicalPlaceId, expectedStatus: status })).toBe(true);
}

async function setSyntheticTripDates(page: Page, startDate: string, endDate: string) {
  await page.evaluate(({ start, end }) => {
    const raw = window.localStorage.getItem("fanatlas_trip_drafts_v1");
    if (!raw) return;
    const state = JSON.parse(raw) as { drafts?: Array<{ id?: string; travelDates?: { startDate?: string; endDate?: string } }> };
    const trip = state.drafts?.find((draft) => draft.id === "fanatlas-e2e-trip-lisbon");
    if (!trip) return;
    trip.travelDates = { startDate: start, endDate: end };
    window.localStorage.setItem("fanatlas_trip_drafts_v1", JSON.stringify(state));
  }, { start: startDate, end: endDate });
}
