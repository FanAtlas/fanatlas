import { beforeEach, describe, expect, it, vi } from "vitest";
import handler from "../../api/trip-day-live-context";

declare const process: {
  env: Record<string, string | undefined>;
};

const mocks = vi.hoisted(() => ({
  executeWeatherTool: vi.fn(async (_request: any, _context: any) => ({
    version: "1",
    toolId: "weather_lookup",
    status: "completed",
    data: {
      destination: "Lisbon, Portugal",
      forecastStart: "2026-08-21",
      forecastEnd: "2026-08-21",
      units: "metric",
      daily: [{ date: "2026-08-21", condition: "clear", temperatureMin: 18, temperatureMax: 25, precipitationChance: 10 }],
      alerts: []
    },
    citations: [{ id: "weather-1", title: "Mock weather", source: "Mock Weather Service", url: "https://example.test/weather", retrievedAt: "2026-08-21T12:00:00.000Z", category: "recognized_weather" }],
    retrievedAt: "2026-08-21T12:00:00.000Z",
    freshness: { class: "live", retrievedAt: "2026-08-21T12:00:00.000Z", staleAt: "2026-08-21T12:30:00.000Z", expiresAt: "2026-08-21T13:00:00.000Z" },
    warnings: [],
    sourceQuality: "recognized_weather",
    cache: "miss"
  })),
  executeCurrencyTool: vi.fn(async (_request: any, _context: any) => ({
    version: "1",
    toolId: "currency_conversion",
    status: "completed",
    data: {
      baseCurrency: "USD",
      targetCurrency: "EUR",
      amount: 100,
      rate: 0.92,
      convertedAmount: 92,
      rateDate: "2026-08-21"
    },
    citations: [{ id: "currency-1", title: "Mock rate", source: "Mock Exchange Service", url: "https://example.test/currency", retrievedAt: "2026-08-21T12:00:00.000Z", category: "reputable_secondary" }],
    retrievedAt: "2026-08-21T12:00:00.000Z",
    freshness: { class: "live", retrievedAt: "2026-08-21T12:00:00.000Z", staleAt: "2026-08-21T12:30:00.000Z", expiresAt: "2026-08-21T13:00:00.000Z" },
    warnings: [],
    sourceQuality: "reputable_secondary",
    cache: "miss"
  })),
  executeCurrentTravelResearchTool: vi.fn(async (_request: any, _context: any) => ({
    version: "1",
    toolId: "destination_current_information",
    status: "completed",
    data: {
      destination: "Lisbon, Portugal",
      category: "tourism",
      findings: [{
        title: "Official tourism notice",
        source: "official.tourism",
        url: "https://example.test/notice",
        fact: "Review the official notice before traveling.",
        sourceQuality: "official_tourism",
        retrievedAt: "2026-08-21T12:00:00.000Z"
      }]
    },
    citations: [{ id: "research-1", title: "Official tourism notice", source: "official.tourism", url: "https://example.test/notice", retrievedAt: "2026-08-21T12:00:00.000Z", category: "official_tourism" }],
    retrievedAt: "2026-08-21T12:00:00.000Z",
    freshness: { class: "recent", retrievedAt: "2026-08-21T12:00:00.000Z", staleAt: "2026-08-21T13:00:00.000Z", expiresAt: "2026-08-21T18:00:00.000Z" },
    warnings: [],
    sourceQuality: "official_tourism",
    cache: "miss"
  }))
}));

vi.mock("../../src/server/tools/toolExecutor", () => ({
  readToolProviderConfig: vi.fn(() => ({
    weatherEnabled: true,
    weatherProvider: "mock",
    currencyEnabled: true,
    currencyProvider: "mock",
    emergencyInfoEnabled: true,
    currentResearchEnabled: true,
    currentResearchProvider: "configured_allowlist",
    liveDatabaseValidated: true,
    toolTimeoutMs: 5000
  }))
}));

vi.mock("../../src/server/tools/weatherTool", () => ({ executeWeatherTool: mocks.executeWeatherTool }));
vi.mock("../../src/server/tools/currencyTool", () => ({ executeCurrencyTool: mocks.executeCurrencyTool }));
vi.mock("../../src/server/tools/currentTravelResearchTool", () => ({ executeCurrentTravelResearchTool: mocks.executeCurrentTravelResearchTool }));

function createResponse() {
  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    }
  };
  return res;
}

async function callHandler(body: any, token = "test-token") {
  const req: any = {
    method: "POST",
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body
  };
  const res = createResponse();
  await handler(req, res);
  return res;
}

beforeEach(() => {
  process.env.FANATLAS_TRIP_DAY_LIVE_CONTEXT_MOCK = "true";
  vi.clearAllMocks();
});

describe("trip-day-live-context api", () => {
  it("rejects missing auth and unsupported versions", async () => {
    const unauthorized = await callHandler({ version: "1", action: "weather" }, "");
    expect(unauthorized.statusCode).toBe(401);

    const invalidVersion = await callHandler({ version: "0", action: "weather", identity: {}, currentDate: "2026-08-21", destination: { label: "Lisbon", latitude: 1, longitude: 1 } });
    expect(invalidVersion.statusCode).toBe(400);
    expect(mocks.executeWeatherTool).not.toHaveBeenCalled();
  });

  it("returns weather, currency, and official update results for valid requests", async () => {
    const weather = await callHandler({
      version: "1",
      action: "weather",
      requestId: "weather-1",
      locale: "en",
      currentDate: "2026-08-21",
      identity: { tripId: "trip", dayId: "day", selectedDate: "2026-08-21", nextPlaceId: "next" },
      destination: { label: "Lisbon, Portugal", latitude: 38.7223, longitude: -9.1393 },
      units: "metric"
    });
    expect(weather.statusCode).toBe(200);
    expect(weather.body.kind).toBe("weather");
    expect(weather.body.status).toBe("success");

    const currency = await callHandler({
      version: "1",
      action: "currency",
      requestId: "currency-1",
      locale: "en",
      currentDate: "2026-08-21",
      identity: { tripId: "trip", dayId: "day", selectedDate: "2026-08-21", nextPlaceId: "next" },
      baseCurrency: "USD",
      targetCurrency: "EUR",
      amount: 100
    });
    expect(currency.statusCode).toBe(200);
    expect(currency.body.kind).toBe("currency");
    expect(currency.body.status).toBe("success");

    const updates = await callHandler({
      version: "1",
      action: "official_updates",
      requestId: "updates-1",
      locale: "en",
      currentDate: "2026-08-21",
      identity: { tripId: "trip", dayId: "day", selectedDate: "2026-08-21", nextPlaceId: "next" },
      destination: { label: "Lisbon, Portugal", latitude: 38.7223, longitude: -9.1393 },
      categories: ["tourism"]
    });
    expect(updates.statusCode).toBe(200);
    expect(updates.body.kind).toBe("official_updates");
    expect(updates.body.status).toBe("success");
  });

  it("rejects malformed coordinates, disallowed updates, and arbitrary urls", async () => {
    const malformedWeather = await callHandler({
      version: "1",
      action: "weather",
      requestId: "weather-2",
      locale: "en",
      currentDate: "2026-08-21",
      identity: { tripId: "trip", dayId: "day", selectedDate: "2026-08-21", nextPlaceId: "next" },
      destination: { label: "Lisbon, Portugal", latitude: 200, longitude: -9.1393 },
      units: "metric"
    });
    expect(malformedWeather.statusCode).toBe(400);

    const rejectedResearch = await callHandler({
      version: "1",
      action: "official_updates",
      requestId: "updates-2",
      locale: "en",
      currentDate: "2026-08-21",
      identity: { tripId: "trip", dayId: "day", selectedDate: "2026-08-21", nextPlaceId: "next" },
      destination: { label: "https://example.test", latitude: 38.7, longitude: -9.1 },
      categories: ["tourism"]
    });
    expect(rejectedResearch.statusCode).toBe(400);

    const invalidAction = await callHandler({
      version: "1",
      action: "route",
      requestId: "route-1",
      locale: "en",
      currentDate: "2026-08-21",
      identity: { tripId: "trip", dayId: "day", selectedDate: "2026-08-21", nextPlaceId: "next" }
    });
    expect(invalidAction.statusCode).toBe(400);
  });
});
