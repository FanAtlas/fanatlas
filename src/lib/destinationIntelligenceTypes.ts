export type DestinationInformationClass =
  | "STATIC"
  | "SLOW_CHANGING"
  | "CURRENT_INFORMATION"
  | "HIGH_STAKES_CURRENT_INFORMATION";

export type DestinationVerificationState = "verified" | "locally_reviewed" | "unverified" | "unknown";
export type DestinationSourceAuthority =
  | "official"
  | "maintained_dataset"
  | "structured_local_data"
  | "derived_local_data"
  | "official_government"
  | "international_standard"
  | "official_emergency"
  | "recognized_reference"
  | "maintained_internal"
  | "unknown";
export type DestinationDataQualityLevel = "trusted" | "partial" | "unknown" | "conflicting" | "stale";

export type DestinationSource = {
  id: string;
  type: "local_dataset" | "official_reference" | "derived" | "future_current_information";
  authority: DestinationSourceAuthority;
  title: string;
  retrievedAt?: string;
  reviewedAt?: string;
  url?: string;
  verificationState: DestinationVerificationState;
  freshnessClass: DestinationInformationClass;
};

export type DestinationField<T> = {
  value: T | null;
  status: "available" | "unknown" | "unavailable";
  informationClass: DestinationInformationClass;
  quality: DestinationDataQualityLevel;
  sources: DestinationSource[];
};

export type DestinationIdentity = {
  type: "country" | "city" | "unknown";
  id: string;
  countryCode?: string;
  countryName?: string;
  cityKey?: string;
  cityName?: string;
  normalizedKey: string;
  unresolvedInput?: string;
};

export type DestinationLanguage = {
  code?: string;
  displayName: string;
  role: "official" | "common" | "regional" | "unknown";
};

export type DestinationCurrency = {
  code: string;
  displayName?: string;
  symbol?: string;
  role: "primary" | "secondary" | "unknown";
};

export type DestinationEmergencyInfo = {
  general?: string;
  police?: string;
  ambulance?: string;
  fire?: string;
  touristPolice?: string;
  verificationState: DestinationVerificationState;
  reviewedAt?: string;
  highStakes: true;
};

export type DestinationTransportInfo = {
  walking: "available" | "limited" | "not_applicable" | "unknown";
  driving: "available" | "limited" | "not_applicable" | "unknown";
  metro: "available" | "limited" | "not_applicable" | "unknown";
  rail: "available" | "limited" | "not_applicable" | "unknown";
  bus: "available" | "limited" | "not_applicable" | "unknown";
  tram: "available" | "limited" | "not_applicable" | "unknown";
  ferry: "available" | "limited" | "not_applicable" | "unknown";
  taxi: "available" | "limited" | "not_applicable" | "unknown";
  rideshare: "available" | "limited" | "not_applicable" | "unknown";
  cycling: "available" | "limited" | "not_applicable" | "unknown";
};

export type DestinationElectricalInfo = {
  voltage?: number;
  voltages?: number[];
  frequencyHz?: number;
  frequenciesHz?: number[];
  plugTypes: string[];
};

export type DestinationTimeInfo = {
  timeZones: string[];
  cityTimeZone?: string;
};

export type DestinationCustomsInfo = {
  categories: Array<"greetings" | "tipping" | "dress" | "photography" | "religious_cultural_etiquette" | "dining" | "public_behavior">;
  contentAvailable: false;
};

export type DestinationEntryInfo = {
  currentInformationRequired: true;
  officialSourceRequired: true;
  nationalitySpecificAdviceAvailable: false;
};

export type DestinationSafetyInfo = {
  officialAdvisoryRequired: true;
  currentInformationRequired: true;
  subjectiveScoreAvailable: false;
};

export type DestinationCoordinates = {
  latitude: number;
  longitude: number;
};

export type CountryIntelligence = {
  identity: DestinationIdentity;
  localizedName: DestinationField<string>;
  capital: DestinationField<string>;
  currencies: DestinationField<DestinationCurrency[]>;
  languages: DestinationField<DestinationLanguage[]>;
  time: DestinationField<DestinationTimeInfo>;
  callingCode: DestinationField<string>;
  measurementSystem: DestinationField<"metric" | "customary" | "imperial" | "mixed">;
  drivingSide: DestinationField<"left" | "right" | "unknown">;
  electrical: DestinationField<DestinationElectricalInfo>;
  emergency: DestinationField<DestinationEmergencyInfo>;
  transport: DestinationField<DestinationTransportInfo>;
  entry: DestinationField<DestinationEntryInfo>;
  safety: DestinationField<DestinationSafetyInfo>;
  customs: DestinationField<DestinationCustomsInfo>;
};

export type CityIntelligence = {
  identity: DestinationIdentity;
  displayName: DestinationField<string>;
  country: DestinationIdentity;
  coordinates: DestinationField<DestinationCoordinates>;
  time: DestinationField<DestinationTimeInfo>;
  transport: DestinationField<DestinationTransportInfo>;
  emergency: DestinationField<DestinationEmergencyInfo>;
  sources: DestinationSource[];
};

export type DestinationDataQuality = {
  resolvedDestinations: number;
  unresolvedDestinations: number;
  missingCountryMetadata: number;
  missingCoordinates: number;
  missingTimezone: number;
  missingCurrency: number;
  unverifiedEmergencyInformation: number;
  staleRecords: number;
  conflictingRecords: number;
};

export type DestinationIntelligence = {
  generatedAt: string;
  countries: CountryIntelligence[];
  cities: CityIntelligence[];
  dataQuality: DestinationDataQuality;
};

export type DestinationReferenceInput = {
  label?: string;
  countryCode?: string;
  country?: string;
  city?: string;
};
