import { expect, test } from "@playwright/test";
import { authenticatedE2ESkipReason, newAuthenticatedContext, shouldRunAuthenticatedE2E } from "./helpers/auth";
import { E2E_TRIP_NAME, seedSyntheticTripDraft } from "./helpers/tripFixture";

type CapturedAIRequestBody = {
  clientRequestId: string;
  conversationId?: string;
  contextSnapshot?: {
    activeTrip?: {
      title?: string;
    };
  };
  message: string;
  taskHint?: string;
  version: string;
};

test.describe("authenticated FanAtlas AI", () => {
  test.skip(!shouldRunAuthenticatedE2E(), authenticatedE2ESkipReason());

  test("validates the authenticated AI browser boundary without provider calls", async ({ browser }) => {
    const context = await newAuthenticatedContext(browser);
    const page = await context.newPage();
    await seedSyntheticTripDraft(page);
    const errors: string[] = [];
    const apiCalls: Array<{ url: string; hasBearer: boolean; body: CapturedAIRequestBody }> = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => {
      const url = request.url();
      if (/openai|anthropic|gemini|googleapis|generativelanguage/i.test(url)) errors.push(`provider request leaked to browser: ${url}`);
    });
    await page.route("**/api/fanatlas-ai", async (route) => {
      const request = route.request();
      const body = request.postDataJSON();
      if (body?.version !== "1" || typeof body?.message !== "string" || typeof body?.clientRequestId !== "string") {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ errorCode: "invalid_request" })
        });
        return;
      }
      apiCalls.push({
        url: new URL(request.url()).pathname,
        hasBearer: /^Bearer\s+\S+/.test(request.headers().authorization || ""),
        body: body as CapturedAIRequestBody
      });
      if (body?.taskHint === "visa_rule_research") {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ errorCode: "current_information_unavailable" })
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          version: "1",
          requestId: body.clientRequestId,
          conversationId: body.conversationId,
          status: "completed",
          message: {
            id: `assistant-${body.clientRequestId}`,
            role: "assistant",
            content: "Synthetic E2E response from the FanAtlas API boundary.",
            createdAt: "2026-08-19T12:00:00.000Z",
            status: "complete"
          },
          citations: [],
          toolActivity: [{ id: "context", label: "fanAtlasAI.loading.context", status: "completed" }],
          warnings: [],
          usage: { contextSizeClass: "small", toolCallCount: 0, modelCallCount: 0, responseLengthClass: "short" }
        })
      });
    });

    await page.goto("/ai");
    await expect(page.getByRole("heading", { name: "FanAtlas AI", exact: true })).toBeVisible();
    await expect(page.getByRole("combobox")).toHaveValue("fanatlas-e2e-trip-lisbon");
    await expect(page.getByRole("heading", { name: "Private by design" })).toBeVisible();
    await expect(page.getByText(/OpenAI|GPT|Gemini|Claude|service_role|coordination|provider_profile/i)).toHaveCount(0);
    await page.getByText(/Privacy controls/i).click();
    await expect(page.getByLabel(/Use active trip/i)).toBeVisible();

    const malformed = await page.evaluate(async () => {
      const response = await fetch("/api/fanatlas-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      return {
        status: response.status,
        errorCode: await response.json().then((body) => body.errorCode).catch(() => null)
      };
    });
    expect(malformed).toEqual({ status: 400, errorCode: "invalid_request" });

    await page.getByLabel(/Message FanAtlas AI/i).fill("Summarize my Lisbon trip.");
    await page.getByRole("button", { name: /Send/i }).click();
    await expect(page.getByText("Synthetic E2E response from the FanAtlas API boundary.")).toBeVisible();
    expect(apiCalls).toHaveLength(1);
    expect(apiCalls[0]).toMatchObject({ url: "/api/fanatlas-ai", hasBearer: true });
    expect(apiCalls[0].body.contextSnapshot.activeTrip.title).toBe(E2E_TRIP_NAME);

    await page.getByRole("button", { name: /Clear/i }).click();
    await expect(page.getByText("Synthetic E2E response from the FanAtlas API boundary.")).toHaveCount(0);

    await page.getByRole("button", { name: /Entry requirements/i }).click();
    await expect(page.getByText(/Current information could not be checked/i)).toBeVisible();

    await context.close();
    expect(errors).toEqual([]);
  });

  test("keeps cancellation and visible conversation persistence local", async ({ browser }) => {
    const context = await newAuthenticatedContext(browser);
    const page = await context.newPage();
    await seedSyntheticTripDraft(page);
    await page.route("**/api/fanatlas-ai", async (route) => {
      const body = route.request().postDataJSON();
      if (body?.message === "Persist this synthetic stop.") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            version: "1",
            requestId: body.clientRequestId,
            conversationId: body.conversationId,
            status: "completed",
            message: {
              id: `assistant-${body.clientRequestId}`,
              role: "assistant",
              content: "Persisted synthetic E2E response.",
              createdAt: "2026-08-19T12:00:00.000Z",
              status: "complete"
            },
            citations: [],
            toolActivity: [],
            warnings: [],
            usage: { contextSizeClass: "small", toolCallCount: 0, modelCallCount: 0, responseLengthClass: "short" }
          })
        });
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 5_000));
      await route.fulfill({ status: 499, contentType: "application/json", body: JSON.stringify({ errorCode: "request_cancelled" }) }).catch(() => undefined);
    });

    await page.goto("/ai");
    await page.getByLabel(/Message FanAtlas AI/i).fill("Plan a synthetic stop.");
    await page.getByRole("button", { name: /Send/i }).click();
    await expect(page.getByRole("button", { name: /Stop/i })).toBeVisible();
    await page.getByRole("button", { name: /Stop/i }).click();
    await expect(page.getByText(/stopped/i)).toBeVisible();

    await page.getByLabel(/Message FanAtlas AI/i).fill("Persist this synthetic stop.");
    await page.getByRole("button", { name: /Send/i }).click();
    await expect(page.getByText("Persisted synthetic E2E response.")).toBeVisible();

    await page.reload();
    await expect(page.getByText("Persist this synthetic stop.")).toBeVisible();
    await expect(page.getByText("Persisted synthetic E2E response.")).toBeVisible();

    await context.close();
  });
});

test("unauthenticated users remain blocked from FanAtlas AI", async ({ page }) => {
  await page.goto("/ai");
  await expect(page.getByRole("heading", { name: "FanAtlas" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Login" })).toBeVisible();
});
