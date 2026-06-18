export type MapDestinationType =
  | "stadium"
  | "fan-zone"
  | "restaurant"
  | "hotel"
  | "hospital"
  | "police"
  | "embassy"
  | "cafe"
  | "place";

export type MapDestination = {
  name: string;
  city: string;
  lat: number;
  lng: number;
  emoji: string;
  type: MapDestinationType;
};

export const stadiumDestinations: MapDestination[] = [
  { name: "MetLife Stadium", city: "New York/New Jersey", lat: 40.8135, lng: -74.0745, emoji: "🏟", type: "stadium" },
  { name: "Estadio Azteca", city: "Mexico City", lat: 19.3029, lng: -99.1505, emoji: "🏟", type: "stadium" },
  { name: "SoFi Stadium", city: "Los Angeles", lat: 33.9535, lng: -118.3392, emoji: "🏟", type: "stadium" },
  { name: "BMO Field", city: "Toronto", lat: 43.6328, lng: -79.4186, emoji: "🏟", type: "stadium" },
  { name: "AT&T Stadium", city: "Dallas", lat: 32.7473, lng: -97.0945, emoji: "🏟", type: "stadium" },
  { name: "BC Place", city: "Vancouver", lat: 49.2767, lng: -123.1119, emoji: "🏟", type: "stadium" },
  { name: "Lumen Field", city: "Seattle", lat: 47.5952, lng: -122.3316, emoji: "🏟", type: "stadium" },
  { name: "Levi's Stadium", city: "San Francisco Bay Area", lat: 37.4030, lng: -121.9700, emoji: "🏟", type: "stadium" },
  { name: "Rose Bowl", city: "Los Angeles", lat: 34.1613, lng: -118.1676, emoji: "🏟", type: "stadium" },
  { name: "NRG Stadium", city: "Houston", lat: 29.6847, lng: -95.4107, emoji: "🏟", type: "stadium" },
  { name: "Mercedes-Benz Stadium", city: "Atlanta", lat: 33.7554, lng: -84.4008, emoji: "🏟", type: "stadium" },
  { name: "Hard Rock Stadium", city: "Miami", lat: 25.9580, lng: -80.2389, emoji: "🏟", type: "stadium" },
  { name: "Arrowhead Stadium", city: "Kansas City", lat: 39.0489, lng: -94.4839, emoji: "🏟", type: "stadium" },
  { name: "Lincoln Financial Field", city: "Philadelphia", lat: 39.9008, lng: -75.1675, emoji: "🏟", type: "stadium" },
  { name: "Gillette Stadium", city: "Boston", lat: 42.0909, lng: -71.2643, emoji: "🏟", type: "stadium" },
  { name: "Estadio Akron", city: "Guadalajara", lat: 20.6818, lng: -103.4629, emoji: "🏟", type: "stadium" },
  { name: "Estadio BBVA", city: "Monterrey", lat: 25.6689, lng: -100.2440, emoji: "🏟", type: "stadium" }
];

export const fanZoneDestinations: MapDestination[] = [
  { name: "Times Square Fan Park", city: "New York", lat: 40.7580, lng: -73.9855, emoji: "🎉", type: "fan-zone" },
  { name: "SoFi Fan Village", city: "Los Angeles", lat: 33.9535, lng: -118.3392, emoji: "🎉", type: "fan-zone" },
  { name: "Azteca Fan Fest", city: "Mexico City", lat: 19.3029, lng: -99.1505, emoji: "🎉", type: "fan-zone" },
  { name: "Toronto Fan Experience", city: "Toronto", lat: 43.6426, lng: -79.3871, emoji: "🎉", type: "fan-zone" }
];

const placeDestinations: MapDestination[] = [
  { name: "Katz's Delicatessen", city: "New York", lat: 40.7223, lng: -73.9874, emoji: "🍽", type: "restaurant" },
  { name: "El Huequito", city: "Mexico City", lat: 19.4322, lng: -99.1410, emoji: "🍽", type: "restaurant" },
  { name: "Blue Bottle Coffee", city: "San Francisco", lat: 37.7762, lng: -122.4230, emoji: "☕", type: "cafe" },
  { name: "Hard Rock Cafe", city: "Miami", lat: 25.7783, lng: -80.1869, emoji: "🍽", type: "restaurant" },
  { name: "Ibis Mexico City", city: "Mexico City", lat: 19.4285, lng: -99.1677, emoji: "🏨", type: "hotel" },
  { name: "Holiday Inn", city: "Los Angeles", lat: 33.9466, lng: -118.3852, emoji: "🏨", type: "hotel" },
  { name: "Marriott Times Square", city: "New York", lat: 40.7586, lng: -73.9851, emoji: "🏨", type: "hotel" },
  { name: "Mount Sinai Hospital", city: "New York", lat: 40.7901, lng: -73.9526, emoji: "🏥", type: "hospital" },
  { name: "Cedars-Sinai Medical Center", city: "Los Angeles", lat: 34.0755, lng: -118.3808, emoji: "🏥", type: "hospital" },
  { name: "Toronto General Hospital", city: "Toronto", lat: 43.6596, lng: -79.3888, emoji: "🏥", type: "hospital" },
  { name: "Hospital General de Mexico", city: "Mexico City", lat: 19.4107, lng: -99.1506, emoji: "🏥", type: "hospital" },
  { name: "NYPD Times Square Substation", city: "New York", lat: 40.7587, lng: -73.9851, emoji: "👮", type: "police" },
  { name: "LAPD Hollywood Station", city: "Los Angeles", lat: 34.0954, lng: -118.3301, emoji: "👮", type: "police" },
  { name: "Toronto Police Headquarters", city: "Toronto", lat: 43.6535, lng: -79.3841, emoji: "👮", type: "police" },
  { name: "Mexico City Citizen Security", city: "Mexico City", lat: 19.4326, lng: -99.1332, emoji: "👮", type: "police" },
  { name: "Embassy of Morocco", city: "Washington, DC", lat: 38.9436, lng: -77.0672, emoji: "🏛", type: "embassy" },
  { name: "Embassy of France", city: "Washington, DC", lat: 38.9137, lng: -77.0779, emoji: "🏛", type: "embassy" },
  { name: "U.S. Embassy / Consular Emergency Help", city: "Worldwide", lat: 38.8949, lng: -77.0366, emoji: "🏛", type: "embassy" }
];

export const defaultMapDestinations = [
  ...stadiumDestinations,
  ...fanZoneDestinations,
  ...placeDestinations
];

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function findDestination(
  destinations: MapDestination[],
  name: string,
  city = ""
) {
  const normalizedName = normalize(name);
  const normalizedCity = normalize(city);

  const cityMatches = normalizedCity
    ? destinations.filter((destination) => {
        const destinationCity = normalize(destination.city);
        return destinationCity === normalizedCity ||
          destinationCity.includes(normalizedCity) ||
          normalizedCity.includes(destinationCity);
      })
    : [];

  if (normalizedName) {
    const exactWithCity = cityMatches.find((destination) => normalize(destination.name) === normalizedName);
    if (exactWithCity) return exactWithCity;

    const exactName = destinations.find((destination) => normalize(destination.name) === normalizedName);
    if (exactName) return exactName;

    const strongNameWithCity = cityMatches.find((destination) => {
      const destinationName = normalize(destination.name);
      return destinationName.includes(normalizedName) || normalizedName.includes(destinationName);
    });
    if (strongNameWithCity) return strongNameWithCity;

    const strongNameMatch = destinations.find((destination) => {
      const destinationName = normalize(destination.name);
      return destinationName.includes(normalizedName) ||
        normalizedName.includes(destinationName);
    });
    if (strongNameMatch) return strongNameMatch;
  }

  if (!normalizedCity) return undefined;

  return cityMatches.length === 1 ? cityMatches[0] : undefined;
}

export function getStadiumDestination(stadium: string, city = "") {
  const aliases: Record<string, string> = {
    "boston stadium": "Gillette Stadium",
    "bc place vancouver": "BC Place",
    "estadio guadalajara": "Estadio Akron",
    "los angeles stadium": "SoFi Stadium",
    "mexico city stadium": "Estadio Azteca",
    "new york new jersey stadium": "MetLife Stadium",
    "san francisco bay area stadium": "Levi's Stadium",
    "toronto stadium": "BMO Field"
  };
  const aliased = aliases[normalize(stadium)];
  return findDestination(stadiumDestinations, aliased || stadium, city);
}

export function getFanZoneDestination(name: string) {
  return findDestination(fanZoneDestinations, name);
}

export function getPlaceDestination(name: string, city = "") {
  return findDestination(placeDestinations, name, city);
}
