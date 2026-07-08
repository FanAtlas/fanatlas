import { useEffect, useMemo, useState } from "react";
import { useTravelLocation } from "../TravelLocationContext";
import { getFallbackPlaces } from "../data/globalFallbackContent";
import { getCachedGlobalPlaces, getGlobalPlaces, GlobalPlace, GlobalPlaceCategory } from "../services/globalPlaces";

type GlobalPlacesState = {
  places: GlobalPlace[];
  loading: boolean;
  message: string;
};

export function useGlobalPlaces() {
  const { travelLocation } = useTravelLocation();
  const [refreshKey, setRefreshKey] = useState(0);
  const [state, setState] = useState<GlobalPlacesState>({
    places: getFallbackPlaces(travelLocation),
    loading: true,
    message: `Finding live places near ${travelLocation.destinationCity}...`
  });

  useEffect(() => {
    let cancelled = false;
    const fallbackPlaces = getFallbackPlaces(travelLocation);
    const cached = getCachedGlobalPlaces(travelLocation);

    if (cached) {
      setState({
        places: cached.places,
        loading: true,
        message: "Showing saved travel content while live places refresh."
      });
    } else {
      setState({
        places: fallbackPlaces,
        loading: true,
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

    getGlobalPlaces(travelLocation, { ignoreCache: Boolean(cached) || refreshKey > 0 })
      .then((result) => {
        if (cancelled) return;
        if (result.places.length === 0) {
          setState({
            places: cached?.places.length ? cached.places : fallbackPlaces,
            loading: false,
            message: ""
          });
          return;
        }

        setState({
          places: result.places,
          loading: false,
          message: result.source === "live" ? "" : result.message
        });
      })
      .catch(() => {
        if (cancelled) return;
        setState({
          places: cached?.places.length ? cached.places : fallbackPlaces,
          loading: false,
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

  const groups = useMemo(() => {
    const byCategory = (categories: GlobalPlaceCategory[]) =>
      placesByDistance(state.places.filter((place) => categories.includes(place.category)), travelLocation.latitude, travelLocation.longitude);

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
  }, [state.places, travelLocation.latitude, travelLocation.longitude]);

  return {
    ...state,
    groups,
    refreshPlaces: () => setRefreshKey((value) => value + 1)
  };
}

function placesByDistance(places: GlobalPlace[], latitude: number, longitude: number) {
  return [...places].sort((a, b) => distance(latitude, longitude, a.lat, a.lng) - distance(latitude, longitude, b.lat, b.lng));
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
