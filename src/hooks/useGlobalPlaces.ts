import { createContext, createElement, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { useTravelLocation } from "../TravelLocationContext";
import { getFallbackPlaces } from "../data/globalFallbackContent";
import { getCachedGlobalPlaces, getGlobalPlaces, GlobalPlace, GlobalPlaceCategory } from "../services/globalPlaces";

type GlobalPlacesState = {
  places: GlobalPlace[];
  loading: boolean;
  error: string | null;
  message: string;
};

type GlobalPlacesContextValue = GlobalPlacesState & {
  refresh: () => void;
};

const GlobalPlacesContext = createContext<GlobalPlacesContextValue | null>(null);

export function GlobalPlacesProvider({ children }: { children: ReactNode }) {
  const { travelLocation } = useTravelLocation();
  const [refreshKey, setRefreshKey] = useState(0);
  const [state, setState] = useState<GlobalPlacesState>({
    places: getFallbackPlaces(travelLocation),
    loading: true,
    error: null,
    message: `Finding live places near ${travelLocation.destinationCity}...`
  });

  useEffect(() => {
    let cancelled = false;
    const fallbackPlaces = getFallbackPlaces(travelLocation);
    const hasDestination = Boolean(travelLocation.destinationCity && travelLocation.destinationCountry);
    const hasValidDestinationCoordinates = hasValidCoordinates(travelLocation.latitude, travelLocation.longitude);

    if (!hasValidDestinationCoordinates) {
      setState((current) => ({
        places: placesBelongToDestination(current.places, travelLocation)
          ? current.places
          : fallbackPlaces,
        loading: hasDestination,
        error: null,
        message: hasDestination ? `Finding live places near ${travelLocation.destinationCity}...` : ""
      }));
      return;
    }

    const cached = getCachedGlobalPlaces(travelLocation);

    if (cached) {
      setState({
        places: cached.places,
        loading: false,
        error: null,
        message: cached.message
      });

      if (refreshKey === 0) return;
    } else {
      setState({
        places: fallbackPlaces,
        loading: true,
        error: null,
        message: `Finding live places near ${travelLocation.destinationCity}...`
      });
    }

    const slowTimer = window.setTimeout(() => {
      if (cancelled) return;
      setState((current) => ({
        ...current,
        loading: false,
        message: ""
      }));
    }, 5000);

    getGlobalPlaces(travelLocation, { ignoreCache: refreshKey > 0 })
      .then((result) => {
        if (cancelled) return;
        if (result.places.length === 0) {
          setState({
            places: cached?.places.length ? cached.places : fallbackPlaces,
            loading: false,
            error: null,
            message: ""
          });
          return;
        }

        setState({
          places: result.places,
          loading: false,
          error: null,
          message: result.source === "live" ? "" : result.message
        });
      })
      .catch(() => {
        if (cancelled) return;
        setState({
          places: cached?.places.length ? cached.places : fallbackPlaces,
          loading: false,
          error: cached ? null : "Unable to load live places.",
          message: cached ? "Showing saved places while live places refresh." : ""
        });
      })
      .finally(() => {
        window.clearTimeout(slowTimer);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(slowTimer);
    };
  }, [
    travelLocation.destinationCity,
    travelLocation.destinationCountry,
    travelLocation.latitude,
    travelLocation.longitude,
    refreshKey
  ]);

  const value = useMemo<GlobalPlacesContextValue>(() => ({
    ...state,
    refresh: () => setRefreshKey((value) => value + 1)
  }), [state]);

  return createElement(GlobalPlacesContext.Provider, { value }, children);
}

export function useGlobalPlaces() {
  const context = useContext(GlobalPlacesContext);
  if (!context) throw new Error("useGlobalPlaces must be used within GlobalPlacesProvider");
  const { travelLocation } = useTravelLocation();

  const groups = useMemo(() => {
    const byCategory = (categories: GlobalPlaceCategory[]) =>
      placesByDistance(context.places.filter((place) => categories.includes(place.category)), travelLocation.latitude, travelLocation.longitude);

    return {
      hotels: byCategory(["hotel"]),
      restaurants: byCategory(["restaurant"]),
      attractions: byCategory(["attraction"]),
      transport: byCategory(["transport"]),
      sos: byCategory(["hospital", "police", "fire_station", "embassy"]),
      hospitals: byCategory(["hospital"]),
      police: byCategory(["police"]),
      embassies: byCategory(["embassy"])
    };
  }, [context.places, travelLocation.latitude, travelLocation.longitude]);

  return {
    ...context,
    groups,
    refreshPlaces: context.refresh
  };
}

function placesByDistance(places: GlobalPlace[], latitude: number, longitude: number) {
  return [...places].sort((a, b) => distance(latitude, longitude, a.lat, a.lng) - distance(latitude, longitude, b.lat, b.lng));
}

function hasValidCoordinates(latitude: number, longitude: number) {
  return Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    (latitude !== 0 || longitude !== 0);
}

function placesBelongToDestination(places: GlobalPlace[], travelLocation: { destinationCity: string; destinationCountry: string }) {
  if (places.length === 0) return false;
  const city = normalizeDestinationPart(travelLocation.destinationCity);
  const country = normalizeDestinationPart(travelLocation.destinationCountry);
  return places.every((place) => (
    normalizeDestinationPart(place.city) === city &&
    normalizeDestinationPart(place.country) === country
  ));
}

function normalizeDestinationPart(value: string) {
  return value.trim().toLowerCase();
}

function distance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const earthRadiusKm = 6371;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
