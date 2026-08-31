import { countries } from "./countries";
import { curatedCountries } from "./destinationIntelligence/curatedData";

export type EmergencyNumbers = {
  country: string;
  emergency: string;
  police: string;
  ambulance: string;
  fire: string;
  reviewedAt?: string;
  verificationState?: "verified" | "locally_reviewed" | "unverified" | "unknown";
  sourceId?: string;
};

const countryNameByCode = new Map(countries.map((country) => [country.code, country.name]));

export const emergencyNumbers: EmergencyNumbers[] = curatedCountries
  .filter((country) => country.emergency)
  .map((country) => ({
    country: countryNameByCode.get(country.code) || country.aliases[0] || country.code,
    emergency: country.emergency?.general || "",
    police: country.emergency?.police || "",
    ambulance: country.emergency?.ambulance || "",
    fire: country.emergency?.fire || "",
    reviewedAt: country.emergency?.reviewedAt,
    verificationState: country.emergency?.verificationState,
    sourceId: country.emergency?.sourceIds[0]
  }));

export function findEmergencyNumbers(country: string): EmergencyNumbers | null {
  const key = normalize(country);
  if (!key) return null;
  const byDisplayName = emergencyNumbers.find((item) => normalize(item.country) === key);
  if (byDisplayName) return byDisplayName;
  const record = curatedCountries.find((candidate) => [candidate.code, ...candidate.aliases].map(normalize).includes(key));
  if (!record?.emergency) return null;
  return emergencyNumbers.find((item) => item.country === (countryNameByCode.get(record.code) || record.aliases[0] || record.code)) || null;
}

export function getEmergencyNumbers(country: string): EmergencyNumbers {
  return findEmergencyNumbers(country) || {
    country,
    emergency: "Not available yet",
    police: "Not available yet",
    ambulance: "Not available yet",
    fire: "Not available yet",
    verificationState: "unknown"
  };
}

function normalize(value: string) {
  return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}
