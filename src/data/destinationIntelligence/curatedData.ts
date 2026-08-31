import type {
  DestinationCurrency,
  DestinationEmergencyInfo,
  DestinationLanguage,
  DestinationSource,
  DestinationTransportInfo
} from "../../lib/destinationIntelligenceTypes";

export type CuratedSourceAuthority =
  | "official_government"
  | "international_standard"
  | "official_emergency"
  | "recognized_reference"
  | "maintained_internal"
  | "unknown";

export type CuratedDestinationSource = {
  id: string;
  title: string;
  organization: string;
  authority: CuratedSourceAuthority;
  url?: string;
  reviewedAt: string;
  categories: string[];
  notes?: string;
};

export type CuratedCountryRecord = {
  code: string;
  aliases: string[];
  capital?: string;
  currencies?: DestinationCurrency[];
  languages?: DestinationLanguage[];
  callingCode?: string;
  timeZones?: string[];
  drivingSide?: "left" | "right" | "unknown";
  measurementSystem?: "metric" | "customary" | "mixed";
  electrical?: {
    plugTypes: string[];
    voltage?: number;
    voltages?: number[];
    frequencyHz?: number;
    frequenciesHz?: number[];
  };
  transport?: Partial<DestinationTransportInfo>;
  emergency?: Omit<DestinationEmergencyInfo, "highStakes"> & { sourceIds: string[] };
  sourceIds: string[];
};

export type CuratedCityRecord = {
  countryCode: string;
  city: string;
  aliases?: string[];
  timeZone?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  transport?: Partial<DestinationTransportInfo>;
  sourceIds: string[];
};

export const DESTINATION_DATA_REVIEWED_AT = "2026-08-19";

export const destinationSources: CuratedDestinationSource[] = [
  {
    id: "iso-3166",
    title: "ISO 3166 country-code standard",
    organization: "International Organization for Standardization",
    authority: "international_standard",
    url: "https://www.iso.org/iso-3166-country-codes.html",
    reviewedAt: DESTINATION_DATA_REVIEWED_AT,
    categories: ["country_identity"]
  },
  {
    id: "iso-4217",
    title: "ISO 4217 currency-code standard",
    organization: "International Organization for Standardization",
    authority: "international_standard",
    url: "https://www.iso.org/iso-4217-currency-codes.html",
    reviewedAt: DESTINATION_DATA_REVIEWED_AT,
    categories: ["currency"]
  },
  {
    id: "iana-time-zone-db",
    title: "IANA time zone database",
    organization: "Internet Assigned Numbers Authority",
    authority: "international_standard",
    url: "https://www.iana.org/time-zones",
    reviewedAt: DESTINATION_DATA_REVIEWED_AT,
    categories: ["timezone"]
  },
  {
    id: "itu-e164",
    title: "E.164 international numbering plan",
    organization: "International Telecommunication Union",
    authority: "international_standard",
    url: "https://www.itu.int/rec/T-REC-E.164",
    reviewedAt: DESTINATION_DATA_REVIEWED_AT,
    categories: ["calling_code"]
  },
  {
    id: "iec-world-plugs",
    title: "World plugs reference",
    organization: "International Electrotechnical Commission",
    authority: "recognized_reference",
    url: "https://www.iec.ch/world-plugs",
    reviewedAt: DESTINATION_DATA_REVIEWED_AT,
    categories: ["electrical"]
  },
  {
    id: "fanatlas-legacy-city-coordinates",
    title: "FanAtlas reviewed city-coordinate seed",
    organization: "FanAtlas",
    authority: "maintained_internal",
    reviewedAt: DESTINATION_DATA_REVIEWED_AT,
    categories: ["city_identity", "coordinates"],
    notes: "Small existing local city coordinate set carried forward into Destination Intelligence."
  },
  {
    id: "fanatlas-emergency-review-2026-08",
    title: "FanAtlas emergency number review",
    organization: "FanAtlas",
    authority: "maintained_internal",
    reviewedAt: DESTINATION_DATA_REVIEWED_AT,
    categories: ["emergency"],
    notes: "Locally reviewed emergency records; unknown remains unavailable instead of inferred."
  }
];

export const curatedCountries: CuratedCountryRecord[] = [
  country("US", ["United States", "United States of America", "USA"], "Washington, DC", "USD", "United States dollar", "$", [
    language("en", "English", "common")
  ], "+1", ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Anchorage", "Pacific/Honolulu"], "right", "customary", ["A", "B"], { voltage: 120, frequencyHz: 60 }, emergency("911", "911", "911", "911")),
  country("CA", ["Canada"], "Ottawa", "CAD", "Canadian dollar", "$", [
    language("en", "English", "official"),
    language("fr", "French", "official")
  ], "+1", ["America/St_Johns", "America/Halifax", "America/Toronto", "America/Winnipeg", "America/Regina", "America/Edmonton", "America/Vancouver"], "right", "metric", ["A", "B"], { voltage: 120, frequencyHz: 60 }, emergency("911", "911", "911", "911")),
  country("MX", ["Mexico", "México"], "Mexico City", "MXN", "Mexican peso", "$", [
    language("es", "Spanish", "official")
  ], "+52", ["America/Mexico_City", "America/Cancun", "America/Tijuana", "America/Hermosillo", "America/Mazatlan"], "right", "metric", ["A", "B"], { voltage: 127, frequencyHz: 60 }, emergency("911", "911", "911", "911")),
  country("MA", ["Morocco", "Maroc", "Marruecos"], "Rabat", "MAD", "Moroccan dirham", undefined, [
    language("ar", "Arabic", "official"),
    language("zgh", "Amazigh", "official"),
    language("fr", "French", "common")
  ], "+212", ["Africa/Casablanca"], "right", "metric", ["C", "E"], { voltage: 220, frequencyHz: 50 }, emergency("19 / 15", "19", "15", "15")),
  country("FR", ["France"], "Paris", "EUR", "Euro", "€", [
    language("fr", "French", "official")
  ], "+33", ["Europe/Paris"], "right", "metric", ["C", "E"], { voltage: 230, frequencyHz: 50 }, emergency("112", "17", "15", "18")),
  country("ES", ["Spain", "España"], "Madrid", "EUR", "Euro", "€", [
    language("es", "Spanish", "official"),
    language("ca", "Catalan", "regional"),
    language("eu", "Basque", "regional"),
    language("gl", "Galician", "regional")
  ], "+34", ["Europe/Madrid", "Atlantic/Canary"], "right", "metric", ["C", "F"], { voltage: 230, frequencyHz: 50 }, emergency("112", "112", "112", "112")),
  country("PT", ["Portugal"], "Lisbon", "EUR", "Euro", "€", [
    language("pt", "Portuguese", "official")
  ], "+351", ["Europe/Lisbon", "Atlantic/Azores", "Atlantic/Madeira"], "right", "metric", ["C", "F"], { voltage: 230, frequencyHz: 50 }, emergency("112", "112", "112", "112")),
  country("GB", ["United Kingdom", "UK", "Great Britain", "Britain"], "London", "GBP", "Pound sterling", "£", [
    language("en", "English", "common")
  ], "+44", ["Europe/London"], "left", "mixed", ["G"], { voltage: 230, frequencyHz: 50 }, emergency("999 / 112", "999 / 112", "999 / 112", "999 / 112")),
  country("IT", ["Italy", "Italia"], "Rome", "EUR", "Euro", "€", [
    language("it", "Italian", "official")
  ], "+39", ["Europe/Rome"], "right", "metric", ["C", "F", "L"], { voltage: 230, frequencyHz: 50 }, emergency("112", "112", "112", "112")),
  country("DE", ["Germany", "Deutschland"], "Berlin", "EUR", "Euro", "€", [
    language("de", "German", "official")
  ], "+49", ["Europe/Berlin"], "right", "metric", ["C", "F"], { voltage: 230, frequencyHz: 50 }, emergency("112", "110", "112", "112")),
  country("JP", ["Japan", "日本"], "Tokyo", "JPY", "Japanese yen", "¥", [
    language("ja", "Japanese", "official")
  ], "+81", ["Asia/Tokyo"], "left", "metric", ["A", "B"], { voltage: 100, frequenciesHz: [50, 60] }, emergency("110 / 119", "110", "119", "119")),
  country("BR", ["Brazil", "Brasil"], "Brasília", "BRL", "Brazilian real", "R$", [
    language("pt", "Portuguese", "official")
  ], "+55", ["America/Sao_Paulo", "America/Manaus", "America/Rio_Branco", "America/Noronha"], "right", "metric", ["C", "N"], { voltages: [127, 220], frequencyHz: 60 }, emergency("190 / 192 / 193", "190", "192", "193"))
];

export const curatedCities: CuratedCityRecord[] = [
  city("US", "New York", "America/New_York", { latitude: 40.7128, longitude: -74.006 }, ["New York City", "NYC"]),
  city("US", "Los Angeles", "America/Los_Angeles", { latitude: 34.0522, longitude: -118.2437 }, ["LA"]),
  city("US", "Miami", "America/New_York", { latitude: 25.7617, longitude: -80.1918 }),
  city("CA", "Toronto", "America/Toronto", { latitude: 43.6532, longitude: -79.3832 }),
  city("MX", "Mexico City", "America/Mexico_City", { latitude: 19.4326, longitude: -99.1332 }, ["Ciudad de México", "Ciudad de Mexico"]),
  city("MA", "Marrakech", "Africa/Casablanca", { latitude: 31.6295, longitude: -7.9811 }, ["Marrakesh"]),
  city("MA", "Casablanca", "Africa/Casablanca", { latitude: 33.5731, longitude: -7.5898 }),
  city("FR", "Paris", "Europe/Paris", { latitude: 48.8566, longitude: 2.3522 }),
  city("ES", "Madrid", "Europe/Madrid", { latitude: 40.4168, longitude: -3.7038 }),
  city("ES", "Barcelona", "Europe/Madrid", { latitude: 41.3874, longitude: 2.1686 }),
  city("PT", "Lisbon", "Europe/Lisbon", { latitude: 38.7223, longitude: -9.1393 }, ["Lisboa"]),
  city("GB", "London", "Europe/London", { latitude: 51.5072, longitude: -0.1276 }, ["City of London"]),
  city("IT", "Rome", "Europe/Rome", { latitude: 41.9028, longitude: 12.4964 }),
  city("DE", "Berlin", "Europe/Berlin"),
  city("JP", "Tokyo", "Asia/Tokyo"),
  city("BR", "Rio de Janeiro", "America/Sao_Paulo"),
  city("BR", "São Paulo", "America/Sao_Paulo", undefined, ["Sao Paulo"])
];

function country(
  code: string,
  aliases: string[],
  capital: string,
  currencyCode: string,
  currencyName: string,
  currencySymbol: string | undefined,
  languages: DestinationLanguage[],
  callingCode: string,
  timeZones: string[],
  drivingSide: "left" | "right",
  measurementSystem: "metric" | "customary" | "mixed",
  plugTypes: string[],
  electrical: { voltage?: number; voltages?: number[]; frequencyHz?: number; frequenciesHz?: number[] },
  emergencyInfo: Omit<DestinationEmergencyInfo, "highStakes"> & { sourceIds: string[] }
): CuratedCountryRecord {
  return {
    code,
    aliases,
    capital,
    currencies: [{ code: currencyCode, displayName: currencyName, symbol: currencySymbol, role: "primary" }],
    languages,
    callingCode,
    timeZones,
    drivingSide,
    measurementSystem,
    electrical: { plugTypes, ...electrical },
    transport: {
      walking: "available",
      driving: "available",
      bus: "available",
      taxi: "available",
      cycling: "unknown",
      ferry: "unknown",
      metro: "unknown",
      rail: "unknown",
      rideshare: "unknown",
      tram: "unknown"
    },
    emergency: emergencyInfo,
    sourceIds: ["iso-3166", "iso-4217", "iana-time-zone-db", "itu-e164", "iec-world-plugs"]
  };
}

function city(
  countryCode: string,
  cityName: string,
  timeZone: string,
  coordinates?: { latitude: number; longitude: number },
  aliases: string[] = []
): CuratedCityRecord {
  return {
    countryCode,
    city: cityName,
    aliases,
    timeZone,
    coordinates,
    sourceIds: coordinates ? ["fanatlas-legacy-city-coordinates", "iana-time-zone-db"] : ["iana-time-zone-db"]
  };
}

function language(code: string, displayName: string, role: DestinationLanguage["role"]): DestinationLanguage {
  return { code, displayName, role };
}

function emergency(general: string, police: string, ambulance: string, fire: string) {
  return {
    general,
    police,
    ambulance,
    fire,
    verificationState: "locally_reviewed" as const,
    reviewedAt: DESTINATION_DATA_REVIEWED_AT,
    sourceIds: ["fanatlas-emergency-review-2026-08"]
  };
}

export const destinationSourceById = new Map(destinationSources.map((source) => [source.id, source]));
export const curatedCountryByCode = new Map(curatedCountries.map((country) => [country.code, country]));
export const curatedCityByKey = new Map(curatedCities.map((record) => [`${record.countryCode}:${slug(record.city)}`, record]));

export function sourceToDestinationSource(source: CuratedDestinationSource, freshnessClass: DestinationSource["freshnessClass"]): DestinationSource {
  return {
    id: source.id,
    type: source.authority === "official_government" || source.authority === "official_emergency" || source.authority === "international_standard"
      ? "official_reference"
      : "local_dataset",
    authority: source.authority,
    title: source.title,
    reviewedAt: source.reviewedAt,
    url: source.url,
    verificationState: source.authority === "unknown" ? "unknown" : "locally_reviewed",
    freshnessClass
  };
}

function slug(value: string) {
  return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
