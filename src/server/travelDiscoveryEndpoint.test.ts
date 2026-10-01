import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import handler from "../../api/travel-discovery";

declare const process: { env: Record<string, string | undefined> };

function response() {
  const result: { statusCode?: number; body?: unknown } = {};
  return { result, res: { status(code: number) { result.statusCode = code; return this; }, json(body: unknown) { result.body = body; return body; } } };
}

describe("travel discovery endpoint", () => {
  beforeEach(() => { process.env.FANATLAS_TRAVEL_DISCOVERY_MOCK = "true"; });
  afterEach(() => { delete process.env.FANATLAS_TRAVEL_DISCOVERY_MOCK; delete process.env.GEOAPIFY_API_KEY; });

  it("rejects unsupported methods and malformed requests safely", async () => {
    const method = response();
    await handler({ method: "GET", headers: { authorization: "Bearer test-token" } }, method.res);
    expect(method.result.statusCode).toBe(405);
    const malformed = response();
    await handler({ method: "POST", headers: { authorization: "Bearer test-token" }, body: { query: "x" } }, malformed.res);
    expect(malformed.result.statusCode).toBe(400);
    expect(JSON.stringify(malformed.result.body)).not.toContain("GEOAPIFY");
  });

  it("fails closed when the server-only key is absent", async () => {
    const result = response();
    await handler({ method: "POST", headers: { authorization: "Bearer test-token" }, body: { destination: { countryCode: "PT", city: "Lisbon" }, category: "museum" } }, result.res);
    expect(result.result.statusCode).toBe(503);
    expect(result.result.body).toMatchObject({ errors: [{ code: "PROVIDER_UNAVAILABLE" }] });
    expect(JSON.stringify(result.result.body)).not.toContain("PRIVATE-GEOAPIFY-KEY-CHECKPOINT-C");
  });

  it("requires authentication before discovery configuration is considered", async () => {
    process.env.GEOAPIFY_API_KEY = "PRIVATE-GEOAPIFY-KEY-CHECKPOINT-C";
    const result = response();
    await handler({ method: "POST", headers: {}, body: { destination: { countryCode: "PT", city: "Lisbon" } } }, result.res);
    expect(result.result.statusCode).toBe(401);
    expect(JSON.stringify(result.result.body)).not.toContain("PRIVATE-GEOAPIFY-KEY-CHECKPOINT-C");
  });

  it("returns three normalized Lisbon museums from a realistic Geoapify FeatureCollection", async () => {
    process.env.GEOAPIFY_API_KEY = "PRIVATE-GEOAPIFY-REQUEST-KEY";
    const features = ["Museum One", "Museum Two", "Museum Three"].map((name, index) => ({ type: "Feature", properties: { place_id: `geo-lisbon-${index}`, name, categories: ["entertainment", "entertainment.museum"], formatted: `${index + 1} Museum Street, Lisbon, Portugal` }, geometry: { type: "Point", coordinates: [-9.14 - index / 1000, 38.72 + index / 1000] } }));
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ type: "FeatureCollection", features }), { status: 200, headers: { "content-type": "application/json" } })));
    const result = response();
    await handler({ method: "POST", headers: { authorization: "Bearer test-token" }, body: { destination: { countryCode: "PT", city: "Lisbon" }, category: "museum", limit: 3 } }, result.res);
    const body = result.result.body as any;
    expect(result.result.statusCode).toBe(200);
    expect(body.places).toHaveLength(3);
    expect(body.places).toEqual(expect.arrayContaining([expect.objectContaining({ category: "museum", destination: expect.objectContaining({ id: "city:PT:lisbon" }), source: expect.objectContaining({ provider: "geoapify", attributionRequired: true, attributionText: "Geoapify" }) })]));
    expect(body.places.every((place: any) => Number.isFinite(place.location?.coordinates?.latitude) && Number.isFinite(place.location?.coordinates?.longitude))).toBe(true);
    expect(JSON.stringify(body)).not.toContain("PRIVATE-GEOAPIFY-REQUEST-KEY");
    expect(JSON.stringify(body)).not.toContain("FeatureCollection");
    vi.unstubAllGlobals();
  });
});
