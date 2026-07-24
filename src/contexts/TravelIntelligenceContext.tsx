import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "../LanguageContext";
import { useLocation } from "../LocationContext";
import { useTravelLocation } from "../TravelLocationContext";
import { buildExploreCandidates, type ExploreCandidate } from "../lib/exploreCandidates";
import { getCoordinates } from "../lib/placeUtils";
import {
  mergeSavedPlaces,
  readExploreSavedIds,
  resolveExploreSavedPlaces,
  type SavedPlace
} from "../lib/savedPlaces";
import { listFavorites } from "../services/favorites";
import { getPremiumSubscription, isPremiumActive, premiumEventName } from "../services/premium";
import { useGlobalPlaces } from "../hooks/useGlobalPlaces";

export type TravelIntelligenceStatus =
  | "idle"
  | "destination_ready"
  | "location_ready"
  | "ready"
  | "limited";

export type TravelIntelligence = {
  destination: {
    name?: string;
    city?: string;
    country?: string;
    lat?: number;
    lng?: number;
    hasCoordinates: boolean;
  } | null;
  currentLocation: {
    lat: number;
    lng: number;
    accuracy?: number;
  } | null;
  language?: string;
  originCountry?: string;
  isPremium: boolean;
  verifiedPlaces: ExploreCandidate[];
  suggestionPlaces: ExploreCandidate[];
  savedPlaces: SavedPlace[];
  routableSavedPlaces: SavedPlace[];
  counts: {
    verifiedPlaces: number;
    suggestions: number;
    savedPlaces: number;
    routableSavedPlaces: number;
    restaurants: number;
    hotels: number;
    attractions: number;
  };
  hasDestination: boolean;
  hasPhysicalLocation: boolean;
  hasVerifiedPlaces: boolean;
  hasSavedPlaces: boolean;
  status: TravelIntelligenceStatus;
  isLoading: boolean;
  hasLimitedData: boolean;
  destinationSummary: {
    destinationName?: string;
    verifiedPlaceCount: number;
    savedPlaceCount: number;
    routableSavedPlaceCount: number;
  };
  limitations: {
    savedPlacesDestinationScoped: boolean;
    hasUnresolvedExploreSaves: boolean;
    physicalLocationUnavailable: boolean;
    placeDataUnavailable: boolean;
    favoritesUnavailable: boolean;
    destinationCoordinatesUnavailable: boolean;
  };
  refreshSavedPlaces: () => Promise<void>;
};

type TravelIntelligenceProviderProps = {
  children: ReactNode;
  userId?: string | null;
};

const TravelIntelligenceContext = createContext<TravelIntelligence | null>(null);

export function TravelIntelligenceProvider({ children, userId }: TravelIntelligenceProviderProps) {
  const { language } = useLanguage();
  const { location, status: locationStatus } = useLocation();
  const { travelLocation } = useTravelLocation();
  const { groups, loading: placesLoading, error: placesError } = useGlobalPlaces();
  const [favorites, setFavorites] = useState<unknown[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [favoritesUnavailable, setFavoritesUnavailable] = useState(false);
  const [exploreSavedIds, setExploreSavedIds] = useState<string[]>(() => readExploreSavedIds());
  const [premiumActive, setPremiumActive] = useState(() => isPremiumActive(getPremiumSubscription()));
  const requestIdRef = useRef(0);

  const refreshSavedPlaces = useCallback(async () => {
    setExploreSavedIds(readExploreSavedIds());

    if (!userId) {
      requestIdRef.current += 1;
      setFavorites([]);
      setFavoritesLoading(false);
      setFavoritesUnavailable(false);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setFavoritesLoading(true);
    setFavoritesUnavailable(false);

    try {
      const nextFavorites = await listFavorites();
      if (requestIdRef.current !== requestId) return;
      setFavorites(nextFavorites);
    } catch {
      if (requestIdRef.current !== requestId) return;
      setFavorites([]);
      setFavoritesUnavailable(true);
    } finally {
      if (requestIdRef.current === requestId) setFavoritesLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refreshSavedPlaces();
  }, [refreshSavedPlaces]);

  useEffect(() => {
    function refreshExploreSavedIds(event: StorageEvent) {
      if (event.key === "fanatlas_saved_explore_cards") {
        setExploreSavedIds(readExploreSavedIds());
      }
    }

    window.addEventListener("storage", refreshExploreSavedIds);
    return () => window.removeEventListener("storage", refreshExploreSavedIds);
  }, []);

  useEffect(() => {
    function refreshPremium() {
      setPremiumActive(isPremiumActive(getPremiumSubscription()));
    }

    window.addEventListener(premiumEventName(), refreshPremium);
    window.addEventListener("storage", refreshPremium);
    return () => {
      window.removeEventListener(premiumEventName(), refreshPremium);
      window.removeEventListener("storage", refreshPremium);
    };
  }, []);

  const destinationCoordinates = useMemo(
    () => getCoordinates({ lat: travelLocation.latitude, lng: travelLocation.longitude }),
    [travelLocation.latitude, travelLocation.longitude]
  );
  const destination = useMemo(() => {
    const city = travelLocation.destinationCity || undefined;
    const country = travelLocation.destinationCountry || undefined;
    if (!city && !country) return null;

    return {
      name: city && country ? `${city}, ${country}` : city || country,
      city,
      country,
      lat: destinationCoordinates?.lat,
      lng: destinationCoordinates?.lng,
      hasCoordinates: destinationCoordinates !== null
    };
  }, [destinationCoordinates, travelLocation.destinationCity, travelLocation.destinationCountry]);
  const currentCoordinates = useMemo(
    () => location ? getCoordinates({ lat: location.latitude, lng: location.longitude }) : null,
    [location]
  );
  const currentLocation = useMemo(
    () => currentCoordinates ? { lat: currentCoordinates.lat, lng: currentCoordinates.lng } : null,
    [currentCoordinates]
  );
  const exploreCandidates = useMemo(
    () => buildExploreCandidates({
      attractions: groups.attractions,
      restaurants: groups.restaurants,
      hotels: groups.hotels
    }),
    [groups.attractions, groups.hotels, groups.restaurants]
  );
  const resolvedExplore = useMemo(
    () => resolveExploreSavedPlaces({ savedIds: exploreSavedIds, candidates: exploreCandidates.candidates }),
    [exploreCandidates.candidates, exploreSavedIds]
  );
  const savedPlaces = useMemo(
    () => mergeSavedPlaces({
      supabaseFavorites: favorites,
      exploreSavedPlaces: resolvedExplore.places
    }),
    [favorites, resolvedExplore.places]
  );
  const routableSavedPlaces = useMemo(
    () => savedPlaces.filter((place) => place.isRoutable),
    [savedPlaces]
  );
  const counts = useMemo(() => ({
    verifiedPlaces: exploreCandidates.verified.length,
    suggestions: exploreCandidates.suggestions.length,
    savedPlaces: savedPlaces.length,
    routableSavedPlaces: routableSavedPlaces.length,
    restaurants: exploreCandidates.verified.filter((place) => place.type === "restaurant" || place.type === "cafe").length,
    hotels: exploreCandidates.verified.filter((place) => place.type === "hotel").length,
    attractions: exploreCandidates.verified.filter((place) => place.type === "attraction" || place.type === "museum" || place.type === "park" || place.type === "family").length
  }), [exploreCandidates.suggestions.length, exploreCandidates.verified, routableSavedPlaces.length, savedPlaces.length]);
  const limitations = useMemo(() => ({
    savedPlacesDestinationScoped: true,
    hasUnresolvedExploreSaves: resolvedExplore.unresolvedIds.length > 0,
    physicalLocationUnavailable: locationStatus !== "available" || !currentLocation,
    placeDataUnavailable: Boolean(placesError),
    favoritesUnavailable,
    destinationCoordinatesUnavailable: Boolean(destination && !destination.hasCoordinates)
  }), [currentLocation, destination, favoritesUnavailable, locationStatus, placesError, resolvedExplore.unresolvedIds.length]);
  const hasDestination = destination !== null;
  const hasPhysicalLocation = currentLocation !== null;
  const isLoading = placesLoading || favoritesLoading || locationStatus === "requesting";
  const hasLimitedData = limitations.placeDataUnavailable ||
    limitations.favoritesUnavailable ||
    limitations.destinationCoordinatesUnavailable ||
    limitations.hasUnresolvedExploreSaves ||
    !exploreCandidates.verified.length;
  const status = useMemo<TravelIntelligenceStatus>(() => {
    if (hasLimitedData && hasDestination) return "limited";
    if (hasDestination && !isLoading) return "ready";
    if (hasDestination) return "destination_ready";
    if (hasPhysicalLocation) return "location_ready";
    return "idle";
  }, [hasDestination, hasLimitedData, hasPhysicalLocation, isLoading]);
  const destinationSummary = useMemo(() => ({
    destinationName: destination?.name,
    verifiedPlaceCount: counts.verifiedPlaces,
    savedPlaceCount: counts.savedPlaces,
    routableSavedPlaceCount: counts.routableSavedPlaces
  }), [counts.routableSavedPlaces, counts.savedPlaces, counts.verifiedPlaces, destination?.name]);

  const value = useMemo<TravelIntelligence>(() => ({
    destination,
    currentLocation,
    language,
    originCountry: travelLocation.originCountry || undefined,
    isPremium: premiumActive,
    verifiedPlaces: exploreCandidates.verified,
    suggestionPlaces: exploreCandidates.suggestions,
    savedPlaces,
    routableSavedPlaces,
    counts,
    hasDestination,
    hasPhysicalLocation,
    hasVerifiedPlaces: counts.verifiedPlaces > 0,
    hasSavedPlaces: counts.savedPlaces > 0,
    status,
    isLoading,
    hasLimitedData,
    destinationSummary,
    limitations,
    refreshSavedPlaces
  }), [
    counts,
    currentLocation,
    destination,
    destinationSummary,
    exploreCandidates.suggestions,
    exploreCandidates.verified,
    hasDestination,
    hasLimitedData,
    hasPhysicalLocation,
    isLoading,
    language,
    limitations,
    premiumActive,
    refreshSavedPlaces,
    routableSavedPlaces,
    savedPlaces,
    status,
    travelLocation.originCountry
  ]);

  return (
    <TravelIntelligenceContext.Provider value={value}>
      {children}
    </TravelIntelligenceContext.Provider>
  );
}

export function useTravelIntelligence() {
  const context = useContext(TravelIntelligenceContext);
  if (!context) throw new Error("useTravelIntelligence must be used within TravelIntelligenceProvider");
  return context;
}
