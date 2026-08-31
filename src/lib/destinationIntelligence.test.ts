import { describe, expect, it } from "vitest";
import {
  classifyDestinationField,
  deriveDestinationIntelligence,
  normalizeDestinationKey,
  resolveCityIdentity,
  resolveCountryIdentity
} from "./destinationIntelligence";
import type { TripDraft } from "./tripDrafts";

function tripFixture(destination: TripDraft["destination"]): TripDraft {
  return {
    id: "trip-1",
    name: "Private Journal SECRET_SHOULD_NOT_APPEAR",
    status: "planned",
    destination,
    itineraryDays: [],
    placeReferences: [],
    journalEntries: [{
      id: "journal-1",
      title: "Private",
      body: "Journal body SECRET_SHOULD_NOT_APPEAR",
      entryDate: "2026-08-01",
      status: "complete",
      favorite: false,
      photoIds: ["photo-secret-1"],
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z"
    }],
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z"
  };
}

describe("Destination Intelligence", () => {
  it("normalizes country identity to ISO 3166-1 alpha-2 with aliases", () => {
    expect(resolveCountryIdentity({ country: "United States of America" })).toMatchObject({ type: "country", countryCode: "US", id: "country:US" });
    expect(resolveCountryIdentity({ country: " usa " })).toMatchObject({ countryCode: "US" });
    expect(resolveCountryIdentity({ countryCode: "ma" })).toMatchObject({ countryCode: "MA", countryName: "Morocco" });
    expect(resolveCountryIdentity({ country: "Atlantis" })).toMatchObject({ type: "unknown", unresolvedInput: "Atlantis" });
  });

  it("normalizes city identity with country context, aliases, unicode, and same-name isolation", () => {
    expect(resolveCityIdentity({ countryCode: "MA", city: "Marrakesh" })).toMatchObject({ id: "city:MA:marrakech", cityKey: "MA:marrakech" });
    expect(resolveCityIdentity({ country: "Portugal", city: "Lisboa" })).toMatchObject({ id: "city:PT:lisbon", cityName: "Lisbon" });
    expect(resolveCityIdentity({ country: "Brazil", city: "São Paulo" })).toMatchObject({ id: "city:BR:sao-paulo" });
    expect(resolveCityIdentity({ country: "Costa Rica", city: "San Jose" })?.id).not.toBe(resolveCityIdentity({ country: "United States", city: "San Jose" })?.id);
  });

  it("handles unknown and unresolved destinations without falling back to a real country", () => {
    const intelligence = deriveDestinationIntelligence({ references: [{ label: "Mystery City, Atlantis" }] });
    const city = intelligence.cities.find((candidate) => candidate.identity.cityKey === "UNRESOLVED:mystery-city");
    expect(intelligence.dataQuality.unresolvedDestinations).toBeGreaterThan(0);
    expect(city?.emergency.status).toBe("unknown");
    expect(city?.emergency.value?.general).toBeUndefined();
  });

  it("classifies static, current, and high-stakes current information fields", () => {
    expect(classifyDestinationField("country_code")).toBe("STATIC");
    expect(classifyDestinationField("currency_code")).toBe("SLOW_CHANGING");
    expect(classifyDestinationField("weather")).toBe("CURRENT_INFORMATION");
    expect(classifyDestinationField("exchange_rate")).toBe("CURRENT_INFORMATION");
    expect(classifyDestinationField("visa_requirement")).toBe("HIGH_STAKES_CURRENT_INFORMATION");
    expect(classifyDestinationField("travel_advisory")).toBe("HIGH_STAKES_CURRENT_INFORMATION");
  });

  it("keeps emergency information high-stakes with source and reviewed metadata", () => {
    const intelligence = deriveDestinationIntelligence({ references: [{ countryCode: "MA", city: "Marrakech" }] });
    const morocco = intelligence.countries.find((country) => country.identity.countryCode === "MA");
    expect(morocco?.emergency.informationClass).toBe("HIGH_STAKES_CURRENT_INFORMATION");
    expect(morocco?.emergency.value).toMatchObject({ police: "19", ambulance: "15", verificationState: "locally_reviewed", highStakes: true });
    expect(morocco?.emergency.sources[0]).toMatchObject({ id: "fanatlas-emergency-review-2026-08", reviewedAt: "2026-08-19" });
    const unsupported = intelligence.countries.find((country) => country.identity.countryCode === "AF");
    expect(unsupported?.emergency.value?.verificationState).toBe("unknown");
  });

  it("represents timezone, entry, safety, customs, electrical, and transport as architecture without unsupported claims", () => {
    const intelligence = deriveDestinationIntelligence({ references: [{ country: "Portugal", city: "Lisbon" }] });
    const portugal = intelligence.countries.find((country) => country.identity.countryCode === "PT");
    expect(portugal?.time.value?.timeZones).toContain("Europe/Lisbon");
    expect(portugal?.time.status).toBe("available");
    expect(portugal?.electrical.value).toMatchObject({ plugTypes: ["C", "F"], voltage: 230, frequencyHz: 50 });
    expect(portugal?.transport.value?.bus).toBe("available");
    expect(portugal?.transport.value?.metro).toBe("unknown");
    expect(portugal?.entry.value).toMatchObject({ currentInformationRequired: true, officialSourceRequired: true, nationalitySpecificAdviceAvailable: false });
    expect(portugal?.safety.value).toMatchObject({ currentInformationRequired: true, subjectiveScoreAvailable: false });
    expect(portugal?.customs.value?.contentAvailable).toBe(false);
  });

  it("derives curated currency and language metadata without live rates or translation", () => {
    const intelligence = deriveDestinationIntelligence({ references: [{ country: "Portugal", city: "Lisbon" }] });
    const portugal = intelligence.countries.find((country) => country.identity.countryCode === "PT");
    expect(portugal?.currencies.value).toEqual([expect.objectContaining({ code: "EUR", displayName: "Euro", role: "primary" })]);
    expect(portugal?.languages.value).toEqual([expect.objectContaining({ code: "pt", displayName: "Portuguese", role: "official" })]);
    expect(JSON.stringify(portugal)).not.toMatch(/exchange rate|translated text/i);
  });

  it("derives coordinates only from trusted local structured destination rows", () => {
    const intelligence = deriveDestinationIntelligence({ references: [{ country: "Portugal", city: "Lisbon" }, { country: "Portugal", city: "Coimbra" }] });
    const lisbon = intelligence.cities.find((city) => city.identity.cityKey === "PT:lisbon");
    const coimbra = intelligence.cities.find((city) => city.identity.cityKey === "PT:coimbra");
    expect(lisbon?.coordinates.value).toMatchObject({ latitude: 38.7223, longitude: -9.1393 });
    expect(coimbra?.coordinates.status).toBe("unknown");
    expect(intelligence.dataQuality.missingCoordinates).toBeGreaterThan(0);
  });

  it("is deterministic, pure, and does not mutate input", () => {
    const trip = tripFixture({ label: "Lisbon, Portugal", countryCode: "PT", country: "Portugal", city: "Lisbon" });
    const before = JSON.stringify(trip);
    const first = deriveDestinationIntelligence({ tripDrafts: [trip], generatedAt: "test" });
    const second = deriveDestinationIntelligence({ tripDrafts: [trip], generatedAt: "test" });
    expect(first).toEqual(second);
    expect(JSON.stringify(trip)).toBe(before);
  });

  it("derives data-quality counters without persisting private user data", () => {
    const trip = tripFixture({ label: "Lisbon, Portugal", countryCode: "PT", country: "Portugal", city: "Lisbon" });
    const intelligence = deriveDestinationIntelligence({ tripDrafts: [trip], references: [{ city: "Unknown", country: "Atlantis" }] });
    const serialized = JSON.stringify(intelligence);
    expect(intelligence.dataQuality.resolvedDestinations).toBeGreaterThan(0);
    expect(intelligence.dataQuality.missingCountryMetadata).toBeGreaterThan(0);
    expect(intelligence.dataQuality.missingTimezone).toBeGreaterThan(0);
    expect(intelligence.dataQuality.missingCurrency).toBeGreaterThan(0);
    expect(intelligence.dataQuality.unverifiedEmergencyInformation).toBeGreaterThan(0);
    expect(serialized).not.toContain("SECRET_SHOULD_NOT_APPEAR");
    expect(serialized).not.toContain("photo-secret-1");
  });

  it("normalizes accents, capitalization, and whitespace for keys", () => {
    expect(normalizeDestinationKey("  São   Paulo  ")).toBe("sao paulo");
    expect(resolveCityIdentity({ label: "  Marrakech , Morocco " })).toMatchObject({ cityKey: "MA:marrakech" });
  });

  it("includes expanded curated metadata for the initial Step 57 cohort", () => {
    const intelligence = deriveDestinationIntelligence({ references: [
      { countryCode: "US", city: "New York" },
      { countryCode: "JP", city: "Tokyo" },
      { countryCode: "BR", city: "São Paulo" }
    ] });
    const unitedStates = intelligence.countries.find((country) => country.identity.countryCode === "US");
    const japan = intelligence.countries.find((country) => country.identity.countryCode === "JP");
    const saoPaulo = intelligence.cities.find((city) => city.identity.cityKey === "BR:sao-paulo");

    expect(unitedStates?.callingCode.value).toBe("+1");
    expect(unitedStates?.measurementSystem.value).toBe("customary");
    expect(japan?.electrical.value).toMatchObject({ voltage: 100, frequenciesHz: [50, 60] });
    expect(japan?.emergency.value).toMatchObject({ police: "110", ambulance: "119" });
    expect(saoPaulo?.time.value?.cityTimeZone).toBe("America/Sao_Paulo");
    expect(saoPaulo?.coordinates.status).toBe("unknown");
  });
});
