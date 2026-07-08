import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { Destination, fallbackDestination, findDestination } from "./data/destinations";
import { useLocation } from "./LocationContext";
import { supabase } from "./lib/supabase";
import { geocodeCity, GeocodingResult } from "./services/geocoding";
import { cleanupLegacyPlacesCache } from "./services/globalPlaces";

export type TravelLocationSource = "manual" | "geolocation" | "fallback";

export type TravelLocation = {
  originCountry: string;
  destinationCountry: string;
  destinationCity: string;
  latitude: number;
  longitude: number;
  locationSource: TravelLocationSource;
};

type TravelLocationInput = {
  originCountry: string;
  destinationCountry: string;
  destinationCity: string;
};

type TravelLocationContextValue = {
  travelLocation: TravelLocation;
  destination: Destination;
  hasManualDestination: boolean;
  saveTravelLocation: (next: TravelLocationInput) => Promise<void>;
};

export const ORIGIN_COUNTRY_KEY = "fanatlas_origin_country";
export const DESTINATION_COUNTRY_KEY = "fanatlas_destination_country";
export const DESTINATION_CITY_KEY = "fanatlas_destination_city";
export const LOCATION_SOURCE_KEY = "fanatlas_location_source";

const TravelLocationContext = createContext<TravelLocationContextValue | null>(null);

function storedValue(key: string) {
  return localStorage.getItem(key)?.trim() || "";
}

function readManualLocation(): TravelLocationInput {
  return {
    originCountry: storedValue(ORIGIN_COUNTRY_KEY),
    destinationCountry: storedValue(DESTINATION_COUNTRY_KEY),
    destinationCity: storedValue(DESTINATION_CITY_KEY)
  };
}

function hasCompleteLocation(value: TravelLocationInput) {
  return Boolean(value.destinationCountry && value.destinationCity);
}

function writeManualLocation(value: TravelLocationInput) {
  localStorage.setItem(ORIGIN_COUNTRY_KEY, value.originCountry);
  localStorage.setItem(DESTINATION_COUNTRY_KEY, value.destinationCountry);
  localStorage.setItem(DESTINATION_CITY_KEY, value.destinationCity);
  localStorage.setItem(LOCATION_SOURCE_KEY, "manual");
}

async function saveProfileLocation(value: TravelLocationInput) {
  if (!supabase) return;

  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return;

  await supabase
    .from("profiles")
    .upsert({
      id: user.id,
      email: user.email,
      username: user.email?.split("@")[0] || "FanAtlas user",
      origin_country: value.originCountry,
      destination_country: value.destinationCountry,
      destination_city: value.destinationCity
    });
}

export function TravelLocationProvider({ children }: { children: ReactNode }) {
  const { location } = useLocation();
  const [manualLocation, setManualLocation] = useState<TravelLocationInput>(() => readManualLocation());
  const [manualGeocode, setManualGeocode] = useState<GeocodingResult | null>(null);

  useEffect(() => {
    cleanupLegacyPlacesCache();
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadProfileLocation() {
      if (!supabase || hasCompleteLocation(readManualLocation())) return;

      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("origin_country, destination_country, destination_city")
        .eq("id", user.id)
        .maybeSingle();

      if (!mounted || !data?.destination_country || !data?.destination_city) return;

      const next = {
        originCountry: data.origin_country || "",
        destinationCountry: data.destination_country,
        destinationCity: data.destination_city
      };

      writeManualLocation(next);
      setManualLocation(next);
    }

    loadProfileLocation().catch(() => {
      // Older profile schemas may not include travel-location columns yet.
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function resolveManualCoordinates() {
      if (!hasCompleteLocation(manualLocation)) {
        setManualGeocode(null);
        return;
      }

      if (findDestination(manualLocation.destinationCity, manualLocation.destinationCountry)) {
        setManualGeocode(null);
        return;
      }

      const result = await geocodeCity(manualLocation.destinationCity, manualLocation.destinationCountry).catch(() => null);
      if (!cancelled) setManualGeocode(result);
    }

    resolveManualCoordinates();

    return () => {
      cancelled = true;
    };
  }, [manualLocation.destinationCity, manualLocation.destinationCountry]);

  const value = useMemo<TravelLocationContextValue>(() => {
    const manualDestination = hasCompleteLocation(manualLocation)
      ? findDestination(manualLocation.destinationCity, manualLocation.destinationCountry)
      : null;

    if (manualDestination) {
      return {
        travelLocation: {
          originCountry: manualLocation.originCountry,
          destinationCountry: manualDestination.country,
          destinationCity: manualDestination.city,
          latitude: manualDestination.latitude,
          longitude: manualDestination.longitude,
          locationSource: "manual"
        },
        destination: manualDestination,
        hasManualDestination: true,
        saveTravelLocation
      };
    }

    if (hasCompleteLocation(manualLocation) && manualGeocode) {
      return {
        travelLocation: {
          originCountry: manualLocation.originCountry,
          destinationCountry: manualLocation.destinationCountry,
          destinationCity: manualLocation.destinationCity,
          latitude: manualGeocode.latitude,
          longitude: manualGeocode.longitude,
          locationSource: "manual"
        },
        destination: {
          city: manualLocation.destinationCity,
          country: manualLocation.destinationCountry,
          latitude: manualGeocode.latitude,
          longitude: manualGeocode.longitude,
          currency: "",
          language: "",
          emergencyNumber: "112 / local emergency services",
          policeNumber: "112 / local emergency services",
          ambulanceNumber: "112 / local emergency services",
          fireNumber: "112 / local emergency services"
        },
        hasManualDestination: true,
        saveTravelLocation
      };
    }

    if (hasCompleteLocation(manualLocation)) {
      return {
        travelLocation: {
          originCountry: manualLocation.originCountry,
          destinationCountry: manualLocation.destinationCountry,
          destinationCity: manualLocation.destinationCity,
          latitude: 0,
          longitude: 0,
          locationSource: "manual"
        },
        destination: fallbackDestination,
        hasManualDestination: true,
        saveTravelLocation
      };
    }

    if (location) {
      const geolocationDestination = location.city && location.country
        ? findDestination(location.city, location.country)
        : null;

      if (geolocationDestination) {
        return {
          travelLocation: {
            originCountry: manualLocation.originCountry,
            destinationCountry: geolocationDestination.country,
            destinationCity: geolocationDestination.city,
            latitude: geolocationDestination.latitude,
            longitude: geolocationDestination.longitude,
            locationSource: "geolocation"
          },
          destination: geolocationDestination,
          hasManualDestination: false,
          saveTravelLocation
        };
      }

      return {
        travelLocation: {
          originCountry: manualLocation.originCountry,
          destinationCountry: location.country || "",
          destinationCity: location.city || "Current location",
          latitude: location.latitude,
          longitude: location.longitude,
          locationSource: "geolocation"
        },
        destination: fallbackDestination,
        hasManualDestination: false,
        saveTravelLocation
      };
    }

    return {
      travelLocation: {
        originCountry: manualLocation.originCountry,
        destinationCountry: fallbackDestination.country,
        destinationCity: fallbackDestination.city,
        latitude: fallbackDestination.latitude,
        longitude: fallbackDestination.longitude,
        locationSource: "fallback"
      },
      destination: fallbackDestination,
      hasManualDestination: false,
      saveTravelLocation
    };

    async function saveTravelLocation(next: TravelLocationInput) {
      writeManualLocation(next);
      setManualLocation(next);
      await saveProfileLocation(next).catch(() => {
        // Profile table may not have optional travel-location columns yet.
      });
    }
  }, [location, manualGeocode, manualLocation]);

  return <TravelLocationContext.Provider value={value}>{children}</TravelLocationContext.Provider>;
}

export function useTravelLocation() {
  const context = useContext(TravelLocationContext);
  if (!context) throw new Error("useTravelLocation must be used within TravelLocationProvider");
  return context;
}
