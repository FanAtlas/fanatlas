export type Destination = {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  currency: string;
  language: string;
  emergencyNumber: string;
  policeNumber: string;
  ambulanceNumber: string;
  fireNumber: string;
};

export const destinations: Destination[] = [
  { city: "New York", country: "United States", latitude: 40.7128, longitude: -74.006, currency: "USD", language: "English", emergencyNumber: "911", policeNumber: "911", ambulanceNumber: "911", fireNumber: "911" },
  { city: "Los Angeles", country: "United States", latitude: 34.0522, longitude: -118.2437, currency: "USD", language: "English", emergencyNumber: "911", policeNumber: "911", ambulanceNumber: "911", fireNumber: "911" },
  { city: "Miami", country: "United States", latitude: 25.7617, longitude: -80.1918, currency: "USD", language: "English", emergencyNumber: "911", policeNumber: "911", ambulanceNumber: "911", fireNumber: "911" },
  { city: "Toronto", country: "Canada", latitude: 43.6532, longitude: -79.3832, currency: "CAD", language: "English", emergencyNumber: "911", policeNumber: "911", ambulanceNumber: "911", fireNumber: "911" },
  { city: "Vancouver", country: "Canada", latitude: 49.2827, longitude: -123.1207, currency: "CAD", language: "English", emergencyNumber: "911", policeNumber: "911", ambulanceNumber: "911", fireNumber: "911" },
  { city: "Mexico City", country: "Mexico", latitude: 19.4326, longitude: -99.1332, currency: "MXN", language: "Spanish", emergencyNumber: "911", policeNumber: "911", ambulanceNumber: "911", fireNumber: "911" },
  { city: "Guadalajara", country: "Mexico", latitude: 20.6597, longitude: -103.3496, currency: "MXN", language: "Spanish", emergencyNumber: "911", policeNumber: "911", ambulanceNumber: "911", fireNumber: "911" },
  { city: "Monterrey", country: "Mexico", latitude: 25.6866, longitude: -100.3161, currency: "MXN", language: "Spanish", emergencyNumber: "911", policeNumber: "911", ambulanceNumber: "911", fireNumber: "911" },
  { city: "Paris", country: "France", latitude: 48.8566, longitude: 2.3522, currency: "EUR", language: "French", emergencyNumber: "112", policeNumber: "17", ambulanceNumber: "15", fireNumber: "18" },
  { city: "Madrid", country: "Spain", latitude: 40.4168, longitude: -3.7038, currency: "EUR", language: "Spanish", emergencyNumber: "112", policeNumber: "112", ambulanceNumber: "112", fireNumber: "112" },
  { city: "Barcelona", country: "Spain", latitude: 41.3874, longitude: 2.1686, currency: "EUR", language: "Spanish", emergencyNumber: "112", policeNumber: "112", ambulanceNumber: "112", fireNumber: "112" },
  { city: "Casablanca", country: "Morocco", latitude: 33.5731, longitude: -7.5898, currency: "MAD", language: "Arabic / French", emergencyNumber: "19 / 15", policeNumber: "19", ambulanceNumber: "15", fireNumber: "15" },
  { city: "Marrakech", country: "Morocco", latitude: 31.6295, longitude: -7.9811, currency: "MAD", language: "Arabic / French", emergencyNumber: "19 / 15", policeNumber: "19", ambulanceNumber: "15", fireNumber: "15" },
  { city: "Rabat", country: "Morocco", latitude: 34.0209, longitude: -6.8416, currency: "MAD", language: "Arabic / French", emergencyNumber: "19 / 15", policeNumber: "19", ambulanceNumber: "15", fireNumber: "15" },
  { city: "London", country: "United Kingdom", latitude: 51.5072, longitude: -0.1276, currency: "GBP", language: "English", emergencyNumber: "999 / 112", policeNumber: "999 / 112", ambulanceNumber: "999 / 112", fireNumber: "999 / 112" },
  { city: "Rome", country: "Italy", latitude: 41.9028, longitude: 12.4964, currency: "EUR", language: "Italian", emergencyNumber: "112", policeNumber: "112", ambulanceNumber: "112", fireNumber: "112" },
  { city: "Dubai", country: "United Arab Emirates", latitude: 25.2048, longitude: 55.2708, currency: "AED", language: "Arabic / English", emergencyNumber: "999 / 998", policeNumber: "999", ambulanceNumber: "998", fireNumber: "997" }
];

export const fallbackDestination = destinations[0];

export const countryNames = Array.from(new Set(destinations.map((destination) => destination.country))).sort();

export function citiesForCountry(country: string) {
  return destinations
    .filter((destination) => destination.country === country)
    .map((destination) => destination.city)
    .sort();
}

export function findDestination(city: string, country: string) {
  const normalize = (value: string) => value.trim().toLowerCase();
  return destinations.find((destination) =>
    normalize(destination.city) === normalize(city) &&
    normalize(destination.country) === normalize(country)
  );
}

export function countryEmergency(country: string) {
  return destinations.find((destination) => destination.country === country) || fallbackDestination;
}
