import type { GlobalPlace, GlobalPlaceCategory, GlobalPlacesInput } from "./globalPlaces";

type GooglePlacesCategory = Extract<GlobalPlaceCategory, "restaurant" | "hotel" | "attraction">;

type GooglePlaceResponse = {
  places?: GooglePlaceResult[];
};

type GooglePlaceResult = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  types?: string[];
  photos?: Array<{ name?: string }>;
};

export type GooglePlacesFetchResult = {
  places: GlobalPlace[];
  latitude: number;
  longitude: number;
};

const GOOGLE_PLACES_ENDPOINT = "https://places.googleapis.com/v1/places:searchNearby";
const PHOTO_MAX_WIDTH = 900;

const includedTypes: Record<GooglePlacesCategory, string[]> = {
  restaurant: ["restaurant", "cafe"],
  hotel: ["hotel", "lodging"],
  attraction: ["tourist_attraction", "museum", "park"]
};

export function hasGooglePlacesKey() {
  return Boolean(import.meta.env.VITE_GOOGLE_PLACES_API_KEY);
}

export async function fetchGooglePlaces(input: GlobalPlacesInput): Promise<GooglePlacesFetchResult | null> {
  const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
  if (!apiKey || typeof input.latitude !== "number" || typeof input.longitude !== "number") return null;

  const results = await Promise.all(
    (Object.keys(includedTypes) as GooglePlacesCategory[]).map((category) =>
      fetchGooglePlacesCategory(category, input.latitude!, input.longitude!, input, apiKey)
    )
  );

  return {
    places: dedupePlaces(results.flat()),
    latitude: input.latitude,
    longitude: input.longitude
  };
}

async function fetchGooglePlacesCategory(
  category: GooglePlacesCategory,
  latitude: number,
  longitude: number,
  input: GlobalPlacesInput,
  apiKey: string
) {
  const response = await fetch(GOOGLE_PLACES_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.location",
        "places.nationalPhoneNumber",
        "places.internationalPhoneNumber",
        "places.websiteUri",
        "places.types",
        "places.photos"
      ].join(",")
    },
    body: JSON.stringify({
      includedTypes: includedTypes[category],
      maxResultCount: 8,
      rankPreference: "POPULARITY",
      locationRestriction: {
        circle: {
          center: { latitude, longitude },
          radius: 12000
        }
      }
    })
  });

  if (!response.ok) throw new Error("google_places_unavailable");

  const data = await response.json() as GooglePlaceResponse;
  return (data.places || []).flatMap((place, index) => mapGooglePlace(place, category, input, apiKey, index));
}

function mapGooglePlace(
  place: GooglePlaceResult,
  fallbackCategory: GooglePlacesCategory,
  input: GlobalPlacesInput,
  apiKey: string,
  index: number
): GlobalPlace[] {
  const name = place.displayName?.text;
  const lat = place.location?.latitude;
  const lng = place.location?.longitude;
  if (!name || typeof lat !== "number" || typeof lng !== "number") return [];

  const category = categoryFromTypes(place.types || []) || fallbackCategory;

  return [{
    id: place.id || `google-${fallbackCategory}-${index}-${name}`,
    name,
    city: input.destinationCity,
    country: input.destinationCountry,
    lat,
    lng,
    category,
    detail: detailForCategory(category),
    address: place.formattedAddress,
    phone: place.nationalPhoneNumber || place.internationalPhoneNumber,
    website: place.websiteUri,
    image: photoUrl(place.photos?.[0]?.name, apiKey),
    source: "google_places"
  }];
}

function categoryFromTypes(types: string[]): GooglePlacesCategory | null {
  if (types.some((type) => ["restaurant", "cafe", "meal_takeaway"].includes(type))) return "restaurant";
  if (types.some((type) => ["hotel", "lodging"].includes(type))) return "hotel";
  if (types.some((type) => ["tourist_attraction", "museum", "park", "amusement_park"].includes(type))) return "attraction";
  return null;
}

function detailForCategory(category: GooglePlacesCategory) {
  if (category === "restaurant") return "restaurant";
  if (category === "hotel") return "hotel";
  return "attraction";
}

function photoUrl(photoName: string | undefined, apiKey: string) {
  if (!photoName) return undefined;
  const params = new URLSearchParams({
    maxWidthPx: String(PHOTO_MAX_WIDTH),
    key: apiKey
  });
  return `https://places.googleapis.com/v1/${photoName}/media?${params.toString()}`;
}

function dedupePlaces(places: GlobalPlace[]) {
  const seen = new Set<string>();
  return places.filter((place) => {
    const key = `${place.category}-${place.name.toLowerCase()}-${place.lat.toFixed(4)}-${place.lng.toFixed(4)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
