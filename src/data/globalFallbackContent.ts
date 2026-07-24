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

type MinimumFallbackCategory = Extract<GlobalPlace["category"], "hotel" | "restaurant" | "attraction">;

const MINIMUM_CATEGORY_COUNT = 6;

const rabatFallbackContent: Record<MinimumFallbackCategory, StarterItem[]> = {
  hotel: [
    { name: "Search hotels in Rabat", category: "hotel", detail: "destination hotel search" },
    { name: "Hotels near Rabat city center", category: "hotel", detail: "central stay area" },
    { name: "Hotels near Rabat Ville train station", category: "hotel", detail: "rail access stays" },
    { name: "Hotels near Rabat-Sale airport", category: "hotel", detail: "airport area stays" },
    { name: "Family stays in Rabat", category: "hotel", detail: "family-friendly stays" },
    { name: "Budget stays in Rabat", category: "hotel", detail: "budget stay search" }
  ],
  restaurant: [
    { name: "Search restaurants in Rabat", category: "restaurant", detail: "restaurants near your destination" },
    { name: "Moroccan food nearby", category: "restaurant", detail: "local Moroccan food" },
    { name: "Cafes in Rabat", category: "restaurant", detail: "cafes and casual stops" },
    { name: "Seafood restaurants in Rabat", category: "restaurant", detail: "seafood restaurants" },
    { name: "Family restaurants in Rabat", category: "restaurant", detail: "family dining" },
    { name: "Late-night food in Rabat", category: "restaurant", detail: "late-night food" }
  ],
  attraction: [
    { name: "Explore Rabat landmarks", category: "attraction", detail: "local landmarks" },
    { name: "Rabat Medina area", category: "attraction", detail: "medina area" },
    { name: "Kasbah and old town area", category: "attraction", detail: "old town area" },
    { name: "Museums nearby", category: "attraction", detail: "museums nearby" },
    { name: "Parks and waterfront", category: "attraction", detail: "parks and waterfront" },
    { name: "Local markets in Rabat", category: "attraction", detail: "local markets" }
  ]
};

const destinationFallbackContent: Record<string, Record<MinimumFallbackCategory, StarterItem[]>> = {
  "rabat_morocco": rabatFallbackContent
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

function genericCategoryContent(input: FallbackInput, category: MinimumFallbackCategory): StarterItem[] {
  const city = input.destinationCity;

  if (category === "hotel") {
    return [
      { name: `Search hotels in ${city}`, category, detail: "destination hotel search" },
      { name: `Hotels near ${city} city center`, category, detail: "central stay area" },
      { name: `Hotels near train station`, category, detail: "rail access stays" },
      { name: `Hotels near airport area`, category, detail: "airport area stays" },
      { name: `Family stays in ${city}`, category, detail: "family-friendly stays" },
      { name: `Budget stays in ${city}`, category, detail: "budget stay search" }
    ];
  }

  if (category === "restaurant") {
    return [
      { name: `Search restaurants in ${city}`, category, detail: "restaurants near your destination" },
      { name: `Restaurants in ${city}`, category, detail: "local restaurants" },
      { name: `Cafes in ${city}`, category, detail: "cafes and casual stops" },
      { name: `Family restaurants in ${city}`, category, detail: "family dining" },
      { name: `Late-night food in ${city}`, category, detail: "late-night food" },
      { name: `City center food in ${city}`, category, detail: "city center dining" }
    ];
  }

  return [
    { name: `Attractions in ${city}`, category, detail: "top local attractions" },
    { name: `${city} city center`, category, detail: "city center area" },
    { name: `Landmarks in ${city}`, category, detail: "local landmarks" },
    { name: `Museums nearby`, category, detail: "museums nearby" },
    { name: `Parks and waterfront`, category, detail: "parks and outdoor areas" },
    { name: `Family-friendly places in ${city}`, category, detail: "family-friendly places" }
  ];
}

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function offsetCoordinate(value: number, index: number) {
  return value + (index % 3) * 0.006 - Math.floor(index / 3) * 0.004;
}

function categoryFallbackItems(input: FallbackInput, category: MinimumFallbackCategory) {
  const key = normalizeKey(`${input.destinationCity}_${input.destinationCountry}`);
  return destinationFallbackContent[key]?.[category] || genericCategoryContent(input, category);
}

export function getFallbackPlacesForCategory(
  input: FallbackInput,
  category: MinimumFallbackCategory,
  count = MINIMUM_CATEGORY_COUNT
): GlobalPlace[] {
  const latitude = typeof input.latitude === "number" ? input.latitude : 0;
  const longitude = typeof input.longitude === "number" ? input.longitude : 0;
  const key = normalizeKey(`${input.destinationCity}_${input.destinationCountry}`);

  return categoryFallbackItems(input, category).slice(0, count).map((item, index) => ({
    id: `fallback-${key}-${category}-${index}`,
    name: item.name,
    city: input.destinationCity,
    country: input.destinationCountry,
    lat: offsetCoordinate(latitude, index),
    lng: offsetCoordinate(longitude, index + 1),
    category,
    detail: item.detail,
    source: "fallback" as const
  }));
}

export function ensureMinimumPlaces(
  input: FallbackInput,
  places: GlobalPlace[],
  category: MinimumFallbackCategory,
  minimum = MINIMUM_CATEGORY_COUNT
): GlobalPlace[] {
  const categoryPlaces = places.filter((place) => place.category === category);
  if (categoryPlaces.length >= minimum) return categoryPlaces;

  const seen = new Set(categoryPlaces.map((place) => normalizeKey(place.name)));
  const fallbackPlaces = getFallbackPlacesForCategory(input, category, minimum)
    .filter((place) => !seen.has(normalizeKey(place.name)))
    .slice(0, minimum - categoryPlaces.length);

  return [...categoryPlaces, ...fallbackPlaces];
}

export function getFallbackPlaces(input: FallbackInput): GlobalPlace[] {
  const latitude = typeof input.latitude === "number" ? input.latitude : 0;
  const longitude = typeof input.longitude === "number" ? input.longitude : 0;
  const key = normalizeKey(`${input.destinationCity}_${input.destinationCountry}`);
  const starterContent = knownStarterContent[key] || genericStarterContent;
  const categoryFallbacks = (["attraction", "restaurant", "hotel"] as MinimumFallbackCategory[])
    .flatMap((category) => getFallbackPlacesForCategory(input, category));

  const starterPlaces = starterContent.map((item, index) => ({
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
    source: "fallback" as const
  }));

  const seen = new Set<string>();
  return [...categoryFallbacks, ...starterPlaces].filter((place) => {
    const duplicateKey = `${place.category}-${normalizeKey(place.name)}`;
    if (seen.has(duplicateKey)) return false;
    seen.add(duplicateKey);
    return true;
  });
}
