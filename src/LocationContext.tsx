import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

export type UserLocation = {
  latitude: number;
  longitude: number;
  city: string | null;
  country: string | null;
};

export type LocationStatus = "requesting" | "available" | "denied" | "unavailable";

type LocationContextValue = {
  location: UserLocation | null;
  status: LocationStatus;
};

const LocationContext = createContext<LocationContextValue | null>(null);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [status, setStatus] = useState<LocationStatus>("requesting");

  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus("unavailable");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const coordinates: UserLocation = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          city: null,
          country: null
        };

        setLocation(coordinates);
        setStatus("available");

        const params = new URLSearchParams({
          format: "jsonv2",
          lat: String(coords.latitude),
          lon: String(coords.longitude),
          zoom: "10"
        });

        fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`)
          .then((response) => {
            if (!response.ok) throw new Error("Reverse geocoding unavailable");
            return response.json();
          })
          .then((result) => {
            const address = result.address || {};
            setLocation((current) => current ? {
              ...current,
              city: address.city || address.town || address.village || address.municipality || null,
              country: address.country || null
            } : current);
          })
          .catch(() => {
            // Coordinates remain available when optional place-name lookup fails.
          });
      },
      (error) => {
        setStatus(error.code === error.PERMISSION_DENIED ? "denied" : "unavailable");
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  }, []);

  const value = useMemo(() => ({ location, status }), [location, status]);

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) throw new Error("useLocation must be used within LocationProvider");
  return context;
}
