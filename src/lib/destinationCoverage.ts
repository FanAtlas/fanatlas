import { destinations } from "../data/destinations";
import { emergencyNumbers } from "../data/emergencyNumbers";
import {
  curatedCities,
  curatedCountries,
  destinationSources
} from "../data/destinationIntelligence/curatedData";

export type DestinationCoverageReport = {
  supportedCountries: number;
  supportedCities: number;
  countriesWithCurrency: number;
  countriesWithCallingCode: number;
  countriesWithTimezone: number;
  countriesWithElectrical: number;
  countriesWithReviewedEmergencyInformation: number;
  citiesWithCoordinates: number;
  citiesWithTimezone: number;
  recordsMissingProvenance: number;
  staleRecords: number;
  conflicts: DestinationDataConflict[];
};

export type DestinationDataConflict = {
  id: string;
  field: string;
  canonicalValue: string;
  legacyValue: string;
};

export type DestinationDataValidationIssue = {
  id: string;
  code:
    | "duplicate_country"
    | "duplicate_city"
    | "invalid_country_code"
    | "invalid_currency_code"
    | "invalid_language_code"
    | "invalid_calling_code"
    | "invalid_timezone"
    | "invalid_plug_type"
    | "invalid_electrical_value"
    | "invalid_emergency_number"
    | "missing_emergency_provenance"
    | "missing_source_reference"
    | "invalid_reviewed_date"
    | "privacy_boundary_violation";
};

const SUPPORTED_PLUG_TYPES = new Set("ABCDEFGHIJKLMNO".split(""));
const REVIEW_STALE_CUTOFF = "2025-01-01";

export function deriveDestinationCoverageReport(): DestinationCoverageReport {
  const conflicts = detectLegacyConflicts();
  return {
    supportedCountries: curatedCountries.length,
    supportedCities: curatedCities.length,
    countriesWithCurrency: curatedCountries.filter((country) => country.currencies?.length).length,
    countriesWithCallingCode: curatedCountries.filter((country) => country.callingCode).length,
    countriesWithTimezone: curatedCountries.filter((country) => country.timeZones?.length).length,
    countriesWithElectrical: curatedCountries.filter((country) => country.electrical?.plugTypes.length).length,
    countriesWithReviewedEmergencyInformation: curatedCountries.filter((country) => country.emergency?.verificationState === "locally_reviewed" || country.emergency?.verificationState === "verified").length,
    citiesWithCoordinates: curatedCities.filter((city) => city.coordinates).length,
    citiesWithTimezone: curatedCities.filter((city) => city.timeZone).length,
    recordsMissingProvenance: [
      ...curatedCountries.filter((country) => !country.sourceIds.length),
      ...curatedCities.filter((city) => !city.sourceIds.length),
      ...destinationSources.filter((source) => !source.reviewedAt)
    ].length,
    staleRecords: destinationSources.filter((source) => source.reviewedAt < REVIEW_STALE_CUTOFF).length,
    conflicts
  };
}

export function validateCuratedDestinationData(): DestinationDataValidationIssue[] {
  const issues: DestinationDataValidationIssue[] = [];
  const countryCodes = new Set<string>();
  const cityIds = new Set<string>();
  const sourceIds = new Set(destinationSources.map((source) => source.id));

  for (const source of destinationSources) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(source.reviewedAt)) issues.push({ id: source.id, code: "invalid_reviewed_date" });
    if (containsPrivateMarker(JSON.stringify(source))) issues.push({ id: source.id, code: "privacy_boundary_violation" });
  }

  for (const country of curatedCountries) {
    if (!/^[A-Z]{2}$/.test(country.code)) issues.push({ id: country.code, code: "invalid_country_code" });
    if (countryCodes.has(country.code)) issues.push({ id: country.code, code: "duplicate_country" });
    countryCodes.add(country.code);
    country.sourceIds.forEach((sourceId) => {
      if (!sourceIds.has(sourceId)) issues.push({ id: `${country.code}:${sourceId}`, code: "missing_source_reference" });
    });
    country.currencies?.forEach((currency) => {
      if (!/^[A-Z]{3}$/.test(currency.code)) issues.push({ id: `${country.code}:${currency.code}`, code: "invalid_currency_code" });
    });
    country.languages?.forEach((language) => {
      if (language.code && !/^[a-z]{2,3}(-[A-Z]{2})?$/.test(language.code)) issues.push({ id: `${country.code}:${language.code}`, code: "invalid_language_code" });
    });
    if (country.callingCode && !/^\+\d{1,4}$/.test(country.callingCode)) issues.push({ id: country.code, code: "invalid_calling_code" });
    country.timeZones?.forEach((timeZone) => {
      if (!isValidTimeZone(timeZone)) issues.push({ id: `${country.code}:${timeZone}`, code: "invalid_timezone" });
    });
    country.electrical?.plugTypes.forEach((plugType) => {
      if (!SUPPORTED_PLUG_TYPES.has(plugType)) issues.push({ id: `${country.code}:${plugType}`, code: "invalid_plug_type" });
    });
    [...(country.electrical?.voltages || []), country.electrical?.voltage]
      .filter((value): value is number => typeof value === "number")
      .forEach((value) => {
        if (!Number.isFinite(value) || value <= 0) issues.push({ id: `${country.code}:voltage`, code: "invalid_electrical_value" });
      });
    [...(country.electrical?.frequenciesHz || []), country.electrical?.frequencyHz]
      .filter((value): value is number => typeof value === "number")
      .forEach((value) => {
        if (!Number.isFinite(value) || value <= 0) issues.push({ id: `${country.code}:frequency`, code: "invalid_electrical_value" });
      });
    const emergency = country.emergency;
    if (emergency) {
      if (!emergency.sourceIds.length || !emergency.reviewedAt) issues.push({ id: country.code, code: "missing_emergency_provenance" });
      emergency.sourceIds.forEach((sourceId) => {
        if (!sourceIds.has(sourceId)) issues.push({ id: `${country.code}:${sourceId}`, code: "missing_source_reference" });
      });
      [emergency.general, emergency.police, emergency.ambulance, emergency.fire, emergency.touristPolice]
        .filter((value): value is string => Boolean(value))
        .forEach((value) => {
          if (!/^[0-9 +/()-]+$/.test(value)) issues.push({ id: `${country.code}:${value}`, code: "invalid_emergency_number" });
        });
    }
    if (containsPrivateMarker(JSON.stringify(country))) issues.push({ id: country.code, code: "privacy_boundary_violation" });
  }

  for (const city of curatedCities) {
    const id = `${city.countryCode}:${slug(city.city)}`;
    if (cityIds.has(id)) issues.push({ id, code: "duplicate_city" });
    cityIds.add(id);
    if (!countryCodes.has(city.countryCode)) issues.push({ id, code: "invalid_country_code" });
    if (city.timeZone && !isValidTimeZone(city.timeZone)) issues.push({ id, code: "invalid_timezone" });
    city.sourceIds.forEach((sourceId) => {
      if (!sourceIds.has(sourceId)) issues.push({ id: `${id}:${sourceId}`, code: "missing_source_reference" });
    });
    if (containsPrivateMarker(JSON.stringify(city))) issues.push({ id, code: "privacy_boundary_violation" });
  }

  return issues;
}

export function detectLegacyConflicts(): DestinationDataConflict[] {
  const conflicts: DestinationDataConflict[] = [];
  for (const country of curatedCountries) {
    const legacyEmergency = emergencyNumbers.find((item) => normalize(item.country) === normalize(country.aliases[0] || country.code));
    if (legacyEmergency && country.emergency) {
      compare(conflicts, country.code, "emergency", country.emergency.general, legacyEmergency.emergency);
      compare(conflicts, country.code, "police", country.emergency.police, legacyEmergency.police);
      compare(conflicts, country.code, "ambulance", country.emergency.ambulance, legacyEmergency.ambulance);
      compare(conflicts, country.code, "fire", country.emergency.fire, legacyEmergency.fire);
    }
    const currency = country.currencies?.[0]?.code;
    const legacyCurrencies = new Set(destinations.filter((destination) => normalize(destination.country) === normalize(country.aliases[0] || country.code)).map((destination) => destination.currency));
    legacyCurrencies.forEach((legacyCurrency) => compare(conflicts, country.code, "currency", currency, legacyCurrency));
  }
  return conflicts;
}

function compare(conflicts: DestinationDataConflict[], id: string, field: string, canonicalValue: string | undefined, legacyValue: string | undefined) {
  if (canonicalValue && legacyValue && canonicalValue !== legacyValue) {
    conflicts.push({ id, field, canonicalValue, legacyValue });
  }
}

function isValidTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date("2026-08-19T12:00:00Z"));
    return true;
  } catch {
    return false;
  }
}

function normalize(value: string) {
  return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function slug(value: string) {
  return normalize(value).replace(/\s+/g, "-");
}

function containsPrivateMarker(value: string) {
  return /journal|photo-id|auth token|service_role|supabase_service_role|password|private_/i.test(value);
}
