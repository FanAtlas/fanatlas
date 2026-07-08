import type { GlobalPlace } from "../services/globalPlaces";

type FallbackInput = {
  destinationCity: string;
  destinationCountry: string;
  latitude?: number;
  longitude?: number;
};

type StarterItem = {
  name: string;
  category: GlobalPlace["category"];
  detail: string;
};

const knownStarterContent: Record<string, StarterItem[]> = {
  "paris_france": [
    { name: "Eiffel Tower area", category: "attraction", detail: "popular attractions" },
    { name: "Louvre and central Paris", category: "attraction", detail: "museum district" },
    { name: "Paris restaurant search", category: "restaurant", detail: "restaurants near your destination" },
    { name: "Paris hotel search", category: "hotel", detail: "hotels near your destination" },
    { name: "Paris Metro stations", category: "transport", detail: "public transport" }
  ],
  "casablanca_morocco": [
    { name: "Hassan II Mosque area", category: "attraction", detail: "popular attractions" },
    { name: "Casablanca restaurant search", category: "restaurant", detail: "restaurants near your destination" },
    { name: "Casablanca hotel search", category: "hotel", detail: "hotels near your destination" },
    { name: "Casa Voyageurs transport", category: "transport", detail: "rail and city transport" },
    { name: "Local emergency help", category: "hospital", detail: "SOS and medical help" }
  ],
  "buenos_aires_argentina": [
    { name: "Plaza de Mayo area", category: "attraction", detail: "popular attractions" },
    { name: "Recoleta and Palermo", category: "attraction", detail: "neighborhoods and parks" },
    { name: "Buenos Aires restaurant search", category: "restaurant", detail: "restaurants near your destination" },
    { name: "Buenos Aires hotel search", category: "hotel", detail: "hotels near your destination" },
    { name: "Buenos Aires transport", category: "transport", detail: "subway, rail, and bus stations" }
  ],
  "berlin_germany": [
    { name: "Brandenburg Gate area", category: "attraction", detail: "popular attractions" },
    { name: "Museum Island area", category: "attraction", detail: "museum district" },
    { name: "Berlin restaurant search", category: "restaurant", detail: "restaurants near your destination" },
    { name: "Berlin hotel search", category: "hotel", detail: "hotels near your destination" },
    { name: "Berlin transit stations", category: "transport", detail: "U-Bahn, S-Bahn, and rail" }
  ],
  "cairo_egypt": [
    { name: "Egyptian Museum area", category: "attraction", detail: "popular attractions" },
    { name: "Cairo restaurant search", category: "restaurant", detail: "restaurants near your destination" },
    { name: "Cairo hotel search", category: "hotel", detail: "hotels near your destination" },
    { name: "Cairo transport", category: "transport", detail: "metro and city transport" },
    { name: "Local emergency help", category: "hospital", detail: "SOS and medical help" }
  ]
};

const genericStarterContent: StarterItem[] = [
  { name: "Popular Attractions", category: "attraction", detail: "Open Map for nearby places" },
  { name: "Restaurants", category: "restaurant", detail: "Find restaurants near this destination" },
  { name: "Hotels", category: "hotel", detail: "Search hotels near this destination" },
  { name: "Transportation", category: "transport", detail: "Find stations and transit options" },
  { name: "SOS", category: "hospital", detail: "Use SOS for local emergency help" },
  { name: "Travel Tips", category: "attraction", detail: "Ask AI Travel Assistant for this trip" }
];

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function offsetCoordinate(value: number, index: number) {
  return value + (index % 3) * 0.006 - Math.floor(index / 3) * 0.004;
}

export function getFallbackPlaces(input: FallbackInput): GlobalPlace[] {
  const latitude = typeof input.latitude === "number" ? input.latitude : 0;
  const longitude = typeof input.longitude === "number" ? input.longitude : 0;
  const key = normalizeKey(`${input.destinationCity}_${input.destinationCountry}`);
  const starterContent = knownStarterContent[key] || genericStarterContent;

  return starterContent.map((item, index) => ({
    id: `fallback-${key}-${normalizeKey(item.name)}`,
    name: item.name.includes(input.destinationCity) || knownStarterContent[key]
      ? item.name
      : `${input.destinationCity} ${item.name}`,
    city: input.destinationCity,
    country: input.destinationCountry,
    lat: offsetCoordinate(latitude, index),
    lng: offsetCoordinate(longitude, index + 1),
    category: item.category,
    detail: item.detail,
    source: "fallback"
  }));
}
