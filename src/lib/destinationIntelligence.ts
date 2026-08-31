import { countries as countryOptions } from "../data/countries";
import { destinations } from "../data/destinations";
import {
  curatedCities,
  curatedCityByKey,
  curatedCountries,
  curatedCountryByCode,
  destinationSourceById,
  sourceToDestinationSource
} from "../data/destinationIntelligence/curatedData";
import type { TripDraft } from "./tripDrafts";
import type {
  CityIntelligence,
  CountryIntelligence,
  DestinationCurrency,
  DestinationDataQuality,
  DestinationEmergencyInfo,
  DestinationField,
  DestinationIdentity,
  DestinationInformationClass,
  DestinationIntelligence,
  DestinationLanguage,
  DestinationReferenceInput,
  DestinationSource,
  DestinationTimeInfo,
  DestinationTransportInfo
} from "./destinationIntelligenceTypes";

const GENERATED_AT = "static-local";

const COUNTRY_ALIASES = new Map<string, string>([
  ["united states of america", "US"],
  ["usa", "US"],
  ["u s a", "US"],
  ["america", "US"],
  ["uk", "GB"],
  ["great britain", "GB"],
  ["britain", "GB"],
  ["uae", "AE"],
  ["united arab emirates", "AE"],
  ["south korea", "KR"],
  ["republic of korea", "KR"],
  ["czech republic", "CZ"],
  ["czechia", "CZ"],
  ["morroco", "MA"]
]);

const CITY_ALIASES = new Map<string, string>([
  ["MA:marrakesh", "marrakech"],
  ["PT:lisboa", "lisbon"],
  ["GB:city of london", "london"],
  ["US:new york city", "new-york"],
  ["US:nyc", "new-york"],
  ["US:la", "los-angeles"],
  ["MX:ciudad de mexico", "mexico-city"],
  ["AE:dubayy", "dubai"]
]);

const LANGUAGE_NAMES = new Map<string, { code?: string; displayName: string }>([
  ["arabic", { code: "ar", displayName: "Arabic" }],
  ["english", { code: "en", displayName: "English" }],
  ["french", { code: "fr", displayName: "French" }],
  ["spanish", { code: "es", displayName: "Spanish" }],
  ["portuguese", { code: "pt", displayName: "Portuguese" }],
  ["italian", { code: "it", displayName: "Italian" }],
  ["german", { code: "de", displayName: "German" }],
  ["japanese", { code: "ja", displayName: "Japanese" }]
]);

const CURRENCY_METADATA = new Map<string, { displayName: string; symbol?: string }>([
  ["AED", { displayName: "United Arab Emirates dirham", symbol: "د.إ" }],
  ["CAD", { displayName: "Canadian dollar", symbol: "$" }],
  ["EUR", { displayName: "Euro", symbol: "€" }],
  ["GBP", { displayName: "Pound sterling", symbol: "£" }],
  ["MAD", { displayName: "Moroccan dirham" }],
  ["MXN", { displayName: "Mexican peso", symbol: "$" }],
  ["USD", { displayName: "United States dollar", symbol: "$" }],
  ["JPY", { displayName: "Japanese yen", symbol: "¥" }],
  ["BRL", { displayName: "Brazilian real", symbol: "R$" }]
]);

const countryByCode = new Map(countryOptions.map((country) => [country.code, country]));
const countryNameToCode = new Map(countryOptions.map((country) => [normalizeDestinationKey(country.name), country.code]));
for (const record of curatedCountries) {
  for (const alias of record.aliases) {
    countryNameToCode.set(normalizeDestinationKey(alias), record.code);
  }
}
for (const record of curatedCities) {
  for (const alias of record.aliases || []) {
    CITY_ALIASES.set(`${record.countryCode}:${normalizeDestinationKey(alias)}`, normalizeCitySlug(record.city));
  }
}
const localDestinationByCountryCity = new Map(destinations.map((destination) => [
  `${resolveCountryIdentity({ country: destination.country })?.countryCode || "UNRESOLVED"}:${normalizeCitySlug(destination.city)}`,
  destination
]));

export function normalizeDestinationKey(value: unknown) {
  return typeof value === "string"
    ? value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim()
    : "";
}

export function normalizeCitySlug(value: unknown) {
  return normalizeDestinationKey(value).replace(/\s+/g, "-");
}

export function resolveCountryIdentity(input: { countryCode?: unknown; country?: unknown; label?: unknown }): DestinationIdentity | null {
  const explicitCode = typeof input.countryCode === "string" ? input.countryCode.trim().toUpperCase() : "";
  const code = /^[A-Z]{2}$/.test(explicitCode)
    ? explicitCode
    : countryCodeFromName(input.country) || countryCodeFromLabel(input.label);
  if (code && countryByCode.has(code)) {
    const countryName = countryByCode.get(code)?.name || code;
    return {
      type: "country",
      id: `country:${code}`,
      countryCode: code,
      countryName,
      normalizedKey: normalizeDestinationKey(countryName)
    };
  }
  const unresolved = clean(input.country) || clean(input.label);
  if (!unresolved) return null;
  return {
    type: "unknown",
    id: `country:unresolved:${normalizeCitySlug(unresolved) || "unknown"}`,
    normalizedKey: normalizeDestinationKey(unresolved),
    unresolvedInput: unresolved
  };
}

export function resolveCityIdentity(input: DestinationReferenceInput): DestinationIdentity | null {
  const country = resolveCountryIdentity(input);
  const cityName = clean(input.city) || parseCityFromLabel(input.label);
  if (!cityName) return null;
  const citySlug = normalizeCanonicalCitySlug(country?.countryCode, cityName);
  const cityKey = `${country?.countryCode || "UNRESOLVED"}:${citySlug}`;
  return {
    type: country?.countryCode ? "city" : "unknown",
    id: `city:${cityKey}`,
    countryCode: country?.countryCode,
    countryName: country?.countryName,
    cityKey,
    cityName: displayCityName(country?.countryCode, cityName),
    normalizedKey: cityKey.toLowerCase(),
    unresolvedInput: country?.type === "unknown" ? country.unresolvedInput : undefined
  };
}

export function classifyDestinationField(field:
  | "country_code"
  | "city_identity"
  | "currency_code"
  | "language"
  | "plug_type"
  | "timezone"
  | "weather"
  | "exchange_rate"
  | "emergency_number"
  | "visa_requirement"
  | "travel_advisory"
  | "local_customs"
): DestinationInformationClass {
  if (field === "country_code" || field === "city_identity") return "STATIC";
  if (field === "currency_code" || field === "language" || field === "plug_type" || field === "timezone" || field === "local_customs") return "SLOW_CHANGING";
  if (field === "weather" || field === "exchange_rate") return "CURRENT_INFORMATION";
  return "HIGH_STAKES_CURRENT_INFORMATION";
}

export function deriveDestinationIntelligence(input: {
  tripDrafts?: readonly TripDraft[];
  references?: readonly DestinationReferenceInput[];
  generatedAt?: string;
} = {}): DestinationIntelligence {
  const countryIds = new Set(countryOptions.map((country) => country.code));
  const cityIdentities = new Map<string, DestinationIdentity>();
  const unresolved: DestinationIdentity[] = [];

  for (const country of countryOptions) {
    country.cities.forEach((city) => {
      const identity = resolveCityIdentity({ countryCode: country.code, city });
      if (identity?.cityKey) cityIdentities.set(identity.cityKey, identity);
    });
  }
  for (const destination of destinations) {
    const country = resolveCountryIdentity({ country: destination.country });
    if (country?.countryCode) countryIds.add(country.countryCode);
    const city = resolveCityIdentity({ countryCode: country?.countryCode, country: destination.country, city: destination.city });
    if (city?.cityKey) cityIdentities.set(city.cityKey, city);
  }
  for (const country of curatedCountries) {
    countryIds.add(country.code);
  }
  for (const cityRecord of curatedCities) {
    const city = resolveCityIdentity({ countryCode: cityRecord.countryCode, city: cityRecord.city });
    if (city?.cityKey) cityIdentities.set(city.cityKey, city);
  }
  for (const reference of collectReferences(input)) {
    const country = resolveCountryIdentity(reference);
    if (country?.countryCode) countryIds.add(country.countryCode);
    else if (country) unresolved.push(country);
    const city = resolveCityIdentity(reference);
    if (city?.cityKey) cityIdentities.set(city.cityKey, city);
    else if (reference.city || reference.label) {
      const unknown = unknownIdentity(reference);
      if (unknown) unresolved.push(unknown);
    }
  }

  const countries = [...countryIds].sort().map((code) => buildCountryIntelligence(code));
  const countryByIdentity = new Map(countries.map((country) => [country.identity.countryCode, country]));
  const cities = [...cityIdentities.values()]
    .sort((a, b) => (a.countryCode || "").localeCompare(b.countryCode || "") || (a.cityName || "").localeCompare(b.cityName || ""))
    .map((identity) => buildCityIntelligence(identity, countryByIdentity.get(identity.countryCode)));
  const quality = deriveDestinationDataQuality(countries, cities, unresolved);

  return {
    generatedAt: input.generatedAt || GENERATED_AT,
    countries,
    cities,
    dataQuality: quality
  };
}

function buildCountryIntelligence(countryCode: string): CountryIntelligence {
  const option = countryByCode.get(countryCode);
  const curated = curatedCountryByCode.get(countryCode);
  const identity: DestinationIdentity = {
    type: "country",
    id: `country:${countryCode}`,
    countryCode,
    countryName: option?.name || countryCode,
    normalizedKey: normalizeDestinationKey(option?.name || countryCode)
  };
  const localRows = destinations.filter((destination) => resolveCountryIdentity({ country: destination.country })?.countryCode === countryCode);
  const currencies = curated?.currencies || unique(localRows.map((destination) => destination.currency)).map(currencyFromCode);
  const languages = curated?.languages || uniqueLanguages(localRows.flatMap((destination) => parseLanguages(destination.language)));
  const countrySources = curatedSources(curated?.sourceIds || [], "SLOW_CHANGING");
  const emergency = curated?.emergency ? emergencyFromCurated(curated.emergency) : unknownEmergency();
  const time = curated?.timeZones?.length
    ? available({ timeZones: curated.timeZones }, "SLOW_CHANGING", sourcesForCategories(curated, ["iana-time-zone-db"]))
    : unknownTime();

  return {
    identity,
    localizedName: available(option?.name || countryCode, "STATIC", [countryPickerSource(), ...sourcesForCategories(curated, ["iso-3166"])]),
    capital: curated?.capital ? available(curated.capital, "SLOW_CHANGING", countrySources) : unknown("SLOW_CHANGING"),
    currencies: currencies.length ? available(currencies, "SLOW_CHANGING", sourcesForCategories(curated, ["iso-4217"], [legacyDestinationSource()])) : unknown("SLOW_CHANGING"),
    languages: languages.length ? available(languages, "SLOW_CHANGING", countrySources.length ? countrySources : [legacyDestinationSource()]) : unknown("SLOW_CHANGING"),
    time,
    callingCode: curated?.callingCode ? available(curated.callingCode, "SLOW_CHANGING", sourcesForCategories(curated, ["itu-e164"])) : unknown("SLOW_CHANGING"),
    measurementSystem: curated?.measurementSystem ? available(curated.measurementSystem, "SLOW_CHANGING", countrySources) : unknown("SLOW_CHANGING"),
    drivingSide: curated?.drivingSide ? available(curated.drivingSide, "SLOW_CHANGING", countrySources) : unknown("SLOW_CHANGING"),
    electrical: curated?.electrical ? available(curated.electrical, "SLOW_CHANGING", sourcesForCategories(curated, ["iec-world-plugs"])) : unknown("SLOW_CHANGING"),
    emergency,
    transport: available({ ...defaultUnknownTransport(), ...(curated?.transport || {}) }, "SLOW_CHANGING", countrySources.length ? countrySources : [derivedUnknownSource("transport-capability-architecture")]),
    entry: available({ currentInformationRequired: true, officialSourceRequired: true, nationalitySpecificAdviceAvailable: false }, "HIGH_STAKES_CURRENT_INFORMATION", [futureCurrentInformationSource("entry-requirements")]),
    safety: available({ officialAdvisoryRequired: true, currentInformationRequired: true, subjectiveScoreAvailable: false }, "HIGH_STAKES_CURRENT_INFORMATION", [futureCurrentInformationSource("safety-advisories")]),
    customs: available({
      categories: ["greetings", "tipping", "dress", "photography", "religious_cultural_etiquette", "dining", "public_behavior"],
      contentAvailable: false
    }, "SLOW_CHANGING", [derivedUnknownSource("customs-guidance-architecture")])
  };
}

function buildCityIntelligence(identity: DestinationIdentity, country?: CountryIntelligence): CityIntelligence {
  const curated = identity.cityKey ? curatedCityByKey.get(identity.cityKey) : undefined;
  const destination = identity.countryCode && identity.cityName
    ? localDestinationByCountryCity.get(`${identity.countryCode}:${normalizeCitySlug(identity.cityName)}`)
    : undefined;
  const sources = [countryPickerSource()];
  const citySources = curatedSources(curated?.sourceIds || [], "SLOW_CHANGING");
  if (destination) sources.push(legacyDestinationSource());
  sources.push(...citySources);
  return {
    identity,
    displayName: available(identity.cityName || "Unknown city", "STATIC", sources),
    country: country?.identity || {
      type: "unknown",
      id: "country:unresolved",
      normalizedKey: "unresolved",
      unresolvedInput: identity.countryName
    },
    coordinates: curated?.coordinates
      ? available(curated.coordinates, "SLOW_CHANGING", citySources.length ? citySources : [legacyDestinationSource()])
      : destination
        ? available({ latitude: destination.latitude, longitude: destination.longitude }, "SLOW_CHANGING", [legacyDestinationSource()])
        : unknown("SLOW_CHANGING"),
    time: curated?.timeZone
      ? available({ timeZones: country?.time.value?.timeZones || [], cityTimeZone: curated.timeZone }, "SLOW_CHANGING", sourcesForCategories(undefined, [], citySources))
      : unknown("SLOW_CHANGING"),
    transport: available({ ...defaultUnknownTransport(), ...(curated?.transport || {}) }, "SLOW_CHANGING", citySources.length ? citySources : [derivedUnknownSource("city-transport-capability-architecture")]),
    emergency: country?.emergency || unknownEmergency(),
    sources
  };
}

function deriveDestinationDataQuality(countries: readonly CountryIntelligence[], cities: readonly CityIntelligence[], unresolved: readonly DestinationIdentity[]): DestinationDataQuality {
  return {
    resolvedDestinations: countries.length + cities.length,
    unresolvedDestinations: unresolved.length,
    missingCountryMetadata: countries.filter((country) => country.capital.status !== "available" || country.callingCode.status !== "available").length,
    missingCoordinates: cities.filter((city) => city.coordinates.status !== "available").length,
    missingTimezone: countries.filter((country) => country.time.status !== "available").length + cities.filter((city) => city.time.status !== "available").length,
    missingCurrency: countries.filter((country) => country.currencies.status !== "available").length,
    unverifiedEmergencyInformation: countries.filter((country) => country.emergency.value?.verificationState !== "locally_reviewed" && country.emergency.value?.verificationState !== "verified").length,
    staleRecords: countStale(countries, cities),
    conflictingRecords: 0
  };
}

function collectReferences(input: { tripDrafts?: readonly TripDraft[]; references?: readonly DestinationReferenceInput[] }) {
  const references: DestinationReferenceInput[] = [...(input.references || [])];
  for (const draft of input.tripDrafts || []) {
    if (draft.destination) references.push({
      label: draft.destination.label,
      countryCode: draft.destination.countryCode,
      country: draft.destination.country,
      city: draft.destination.city
    });
  }
  return references;
}

function countryCodeFromName(value: unknown) {
  const key = normalizeDestinationKey(value);
  if (!key) return undefined;
  return COUNTRY_ALIASES.get(key) || countryNameToCode.get(key);
}

function countryCodeFromLabel(value: unknown) {
  if (typeof value !== "string") return undefined;
  const parts = value.split(",").map((part) => part.trim()).filter(Boolean);
  return countryCodeFromName(parts[parts.length - 1]);
}

function parseCityFromLabel(value: unknown) {
  if (typeof value !== "string") return undefined;
  const parts = value.split(",").map((part) => part.trim()).filter(Boolean);
  return parts.length > 1 ? parts[0] : undefined;
}

function normalizeCanonicalCitySlug(countryCode: string | undefined, city: string) {
  const raw = normalizeCitySlug(city);
  return CITY_ALIASES.get(`${countryCode || "UNRESOLVED"}:${normalizeDestinationKey(city)}`) || raw;
}

function displayCityName(countryCode: string | undefined, city: string) {
  const slug = normalizeCanonicalCitySlug(countryCode, city);
  const curated = countryCode ? curatedCityByKey.get(`${countryCode}:${slug}`) : undefined;
  if (curated) return curated.city;
  const local = destinations.find((destination) =>
    resolveCountryIdentity({ country: destination.country })?.countryCode === countryCode &&
    normalizeCitySlug(destination.city) === slug
  );
  return local?.city || clean(city) || slug;
}

function emergencyFromCurated(numbers: NonNullable<typeof curatedCountries[number]["emergency"]>): DestinationField<DestinationEmergencyInfo> {
  return available({
    general: numbers.general,
    police: numbers.police,
    ambulance: numbers.ambulance,
    fire: numbers.fire,
    touristPolice: numbers.touristPolice,
    verificationState: numbers.verificationState,
    reviewedAt: numbers.reviewedAt,
    highStakes: true
  }, "HIGH_STAKES_CURRENT_INFORMATION", curatedSources(numbers.sourceIds, "HIGH_STAKES_CURRENT_INFORMATION"));
}

function unknownEmergency(): DestinationField<DestinationEmergencyInfo> {
  return {
    value: {
      verificationState: "unknown",
      highStakes: true
    },
    status: "unknown",
    informationClass: "HIGH_STAKES_CURRENT_INFORMATION",
    quality: "unknown",
    sources: [futureCurrentInformationSource("emergency-information")]
  };
}

function unknownTime(): DestinationField<DestinationTimeInfo> {
  return unknown("SLOW_CHANGING", { timeZones: [] });
}

function defaultUnknownTransport(): DestinationTransportInfo {
  return {
    walking: "unknown",
    driving: "unknown",
    metro: "unknown",
    rail: "unknown",
    bus: "unknown",
    tram: "unknown",
    ferry: "unknown",
    taxi: "unknown",
    rideshare: "unknown",
    cycling: "unknown"
  };
}

function parseLanguages(value: string): DestinationLanguage[] {
  return value.split("/")
    .map((item) => normalizeDestinationKey(item))
    .filter(Boolean)
    .map((key): DestinationLanguage => {
      const language = LANGUAGE_NAMES.get(key);
      return language
        ? { ...language, role: "common" }
        : { displayName: titleCase(key), role: "unknown" };
    });
}

function currencyFromCode(code: string): DestinationCurrency {
  const metadata = CURRENCY_METADATA.get(code);
  return {
    code,
    displayName: metadata?.displayName,
    symbol: metadata?.symbol,
    role: "primary"
  };
}

function available<T>(value: T, informationClass: DestinationInformationClass, sources: DestinationSource[]): DestinationField<T> {
  return {
    value,
    status: "available",
    informationClass,
    quality: sources.some((source) => source.verificationState === "unverified" || source.verificationState === "unknown") ? "partial" : "trusted",
    sources
  };
}

function curatedSources(sourceIds: readonly string[], informationClass: DestinationInformationClass): DestinationSource[] {
  return sourceIds
    .map((id) => destinationSourceById.get(id))
    .filter((source): source is NonNullable<typeof source> => Boolean(source))
    .map((source) => sourceToDestinationSource(source, informationClass));
}

function sourcesForCategories(
  record: { sourceIds: string[] } | undefined,
  ids: readonly string[],
  fallback: DestinationSource[] = []
): DestinationSource[] {
  const sourceIds = ids.length ? ids : record?.sourceIds || [];
  const sources = curatedSources(sourceIds, "SLOW_CHANGING");
  return sources.length ? sources : fallback;
}

function unknown<T>(informationClass: DestinationInformationClass, value: T | null = null): DestinationField<T> {
  return {
    value,
    status: "unknown",
    informationClass,
    quality: "unknown",
    sources: [derivedUnknownSource("unknown-field")]
  };
}

function countryPickerSource(): DestinationSource {
  return {
    id: "fanatlas-country-picker",
    type: "local_dataset",
    authority: "structured_local_data",
    title: "FanAtlas country picker dataset",
    verificationState: "unverified",
    freshnessClass: "STATIC"
  };
}

function legacyDestinationSource(): DestinationSource {
  return {
    id: "fanatlas-legacy-destinations",
    type: "local_dataset",
    authority: "structured_local_data",
    title: "FanAtlas destination metadata",
    verificationState: "unverified",
    freshnessClass: "SLOW_CHANGING"
  };
}

function futureCurrentInformationSource(id: string): DestinationSource {
  return {
    id: `future-${id}`,
    type: "future_current_information",
    authority: "official",
    title: "Future official current-information integration required",
    verificationState: "unknown",
    freshnessClass: "HIGH_STAKES_CURRENT_INFORMATION"
  };
}

function derivedUnknownSource(id: string): DestinationSource {
  return {
    id,
    type: "derived",
    authority: "derived_local_data",
    title: "Destination Intelligence architecture placeholder",
    verificationState: "unknown",
    freshnessClass: "SLOW_CHANGING"
  };
}

function unknownIdentity(reference: DestinationReferenceInput): DestinationIdentity | null {
  const input = clean(reference.label) || clean(reference.city) || clean(reference.country);
  if (!input) return null;
  return {
    type: "unknown",
    id: `destination:unresolved:${normalizeCitySlug(input) || "unknown"}`,
    normalizedKey: normalizeDestinationKey(input),
    unresolvedInput: input
  };
}

function countStale(countries: readonly CountryIntelligence[], cities: readonly CityIntelligence[]) {
  const sources = [
    ...countries.flatMap((country) => [
      ...country.localizedName.sources,
      ...country.currencies.sources,
      ...country.languages.sources,
      ...country.emergency.sources
    ]),
    ...cities.flatMap((city) => city.sources)
  ];
  return sources.filter((source) => source.retrievedAt && Date.parse(source.retrievedAt) < Date.parse("2020-01-01T00:00:00Z")).length;
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() || undefined : undefined;
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort();
}

function uniqueLanguages(values: DestinationLanguage[]) {
  const byKey = new Map<string, DestinationLanguage>();
  values.forEach((language) => byKey.set(language.code || normalizeDestinationKey(language.displayName), language));
  return [...byKey.values()].sort((a, b) => a.displayName.localeCompare(b.displayName));
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}
