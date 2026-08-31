import { createContext, ReactNode, useContext, useMemo, useRef, useState } from "react";

export type UserLocation = {
  latitude: number;
  longitude: number;
  city: string | null;
  country: string | null;
};

export type LocationStatus = "idle" | "requesting" | "available" | "denied" | "unavailable" | "unsupported" | "timeout";

type LocationContextValue = {
  location: UserLocation | null;
  status: LocationStatus;
  requestLocation: () => Promise<UserLocation | null>;
};

const LocationContext = createContext<LocationContextValue | null>(null);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [status, setStatus] = useState<LocationStatus>("idle");
  const requestId = useRef(0);

  async function requestLocation() {
    if (!navigator.geolocation) {
      setStatus("unsupported");
      return null;
    }

    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    setStatus("requesting");

    return await new Promise<UserLocation | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          if (currentRequest !== requestId.current) return resolve(null);

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

          resolve(coordinates);
        },
        (error) => {
          if (currentRequest !== requestId.current) return resolve(null);
          if (error.code === error.PERMISSION_DENIED) setStatus("denied");
          else if (error.code === error.TIMEOUT) setStatus("timeout");
          else setStatus("unavailable");
          resolve(null);
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000
        }
      );
    });
  }

  const value = useMemo(() => ({ location, status, requestLocation }), [location, status]);

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) throw new Error("useLocation must be used within LocationProvider");
  return context;
}
