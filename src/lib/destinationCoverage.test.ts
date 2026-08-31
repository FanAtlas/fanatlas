import { describe, expect, it } from "vitest";
import { curatedCountries, curatedCities, destinationSources } from "../data/destinationIntelligence/curatedData";
import { SUPPORTED_CURRENCY_CODES } from "../server/tools/currencyTool";
import {
  deriveDestinationCoverageReport,
  detectLegacyConflicts,
  validateCuratedDestinationData
} from "./destinationCoverage";

describe("destination curated data coverage", () => {
  it("validates curated country, city, source, timezone, emergency, and electrical records", () => {
    expect(validateCuratedDestinationData()).toEqual([]);
  });

  it("covers the initial supported country and city cohorts", () => {
    expect(curatedCountries.map((country) => country.code).sort()).toEqual([
      "BR",
      "CA",
      "DE",
      "ES",
      "FR",
      "GB",
      "IT",
      "JP",
      "MA",
      "MX",
      "PT",
      "US"
    ]);
    expect(curatedCities.map((city) => `${city.countryCode}:${city.city}`)).toEqual(expect.arrayContaining([
      "PT:Lisbon",
      "MA:Marrakech",
      "US:New York",
      "JP:Tokyo",
      "BR:São Paulo"
    ]));
  });

  it("keeps static destination currency codes compatible with the existing converter allowlist", () => {
    const currencyCodes = curatedCountries.flatMap((country) => country.currencies?.map((currency) => currency.code) || []);
    expect(currencyCodes.length).toBeGreaterThan(0);
    expect(currencyCodes.filter((code) => !SUPPORTED_CURRENCY_CODES.has(code))).toEqual([]);
  });

  it("requires source registry references and reviewed metadata", () => {
    const sourceIds = new Set(destinationSources.map((source) => source.id));
    for (const country of curatedCountries) {
      expect(country.sourceIds.every((sourceId) => sourceIds.has(sourceId))).toBe(true);
      expect(country.emergency?.sourceIds.every((sourceId) => sourceIds.has(sourceId))).toBe(true);
      expect(country.emergency?.reviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("derives a pure coverage report with no legacy conflicts", () => {
    const report = deriveDestinationCoverageReport();
    expect(report).toMatchObject({
      supportedCountries: 12,
      supportedCities: 17,
      countriesWithCurrency: 12,
      countriesWithCallingCode: 12,
      countriesWithTimezone: 12,
      countriesWithElectrical: 12,
      countriesWithReviewedEmergencyInformation: 12
    });
    expect(report.citiesWithCoordinates).toBeGreaterThan(0);
    expect(report.recordsMissingProvenance).toBe(0);
    expect(report.conflicts).toEqual([]);
    expect(detectLegacyConflicts()).toEqual([]);
  });

  it("keeps current and high-stakes mutable topics out of static records", () => {
    const serialized = JSON.stringify({ curatedCountries, curatedCities }).toLowerCase();
    expect(serialized).not.toMatch(/visa required|visa-free|travel advisory|exchange rate|weather alert|airport closure|health alert/);
  });
});
