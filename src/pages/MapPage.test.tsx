/** @vitest-environment jsdom */
import { cleanup, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../test/renderWithProviders";
import { buildNavigationRequestFromMapDestination } from "../lib/navigation";
import { MapPage } from "./MapPage";

const requestLocation = vi.fn();
let connectivityMode: "online" | "offline" = "online";

vi.mock("../LocationContext", () => ({
  useLocation: () => ({
    location: null,
    status: "idle",
    requestLocation
  })
}));

vi.mock("../hooks/useConnectivity", () => ({
  useConnectivity: () => ({
    isOffline: connectivityMode === "offline",
    isOnline: connectivityMode === "online",
    status: connectivityMode
  })
}));

vi.mock("../TravelLocationContext", () => ({
  useTravelLocation: () => ({
    travelLocation: {
      originCountry: "Portugal",
      destinationCountry: "Portugal",
      destinationCity: "Lisbon",
      latitude: 38.7223,
      longitude: -9.1393,
      locationSource: "manual"
    },
    destination: {
      city: "Lisbon",
      country: "Portugal",
      latitude: 38.7223,
      longitude: -9.1393
    },
    hasManualDestination: true,
    saveTravelLocation: vi.fn()
  })
}));

vi.mock("../hooks/useGlobalPlaces", () => ({
  useGlobalPlaces: () => ({
    groups: {
      hotels: [],
      restaurants: [],
      attractions: [],
      transport: [],
      sos: []
    },
    loading: false,
    message: "",
    refreshPlaces: vi.fn()
  })
}));

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: ReactNode }) => <div data-testid="map-container">{children}</div>,
  Marker: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Polyline: () => null,
  Popup: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  TileLayer: () => null,
  useMap: () => ({
    fitBounds: vi.fn(),
    setView: vi.fn()
  })
}));

vi.mock("leaflet", () => ({
  default: {
    divIcon: vi.fn(() => ({})),
    latLngBounds: vi.fn(() => ({}))
  },
  divIcon: vi.fn(() => ({})),
  latLngBounds: vi.fn(() => ({}))
}));

describe("MapPage", () => {
  beforeEach(() => {
    requestLocation.mockReset();
    connectivityMode = "online";
    requestLocation.mockResolvedValue({
      latitude: 38.7167,
      longitude: -9.1399,
      city: null,
      country: null
    });
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({
        routes: [
          {
            distance: 2400,
            duration: 1860,
            geometry: {
              coordinates: [
                [-9.1399, 38.7167],
                [-9.1393, 38.7223]
              ]
            }
          }
        ]
      })
    })));
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("keeps geolocation explicit, renders destination state, and shows route results after the user chooses location", async () => {
    const user = userEvent.setup();
    const request = buildNavigationRequestFromMapDestination({
      name: "Rossio Square",
      city: "Lisbon",
      lat: 38.7148,
      lng: -9.1392,
      emoji: "📍",
      type: "place"
    }, "trip_day", { mode: "walking" });

    renderWithProviders(
      <MapPage
        initialNavigationRequest={request}
        setSelectedStadium={vi.fn()}
        setTab={vi.fn()}
      />
    );

    await waitFor(() => expect(screen.getByText("Rossio Square", { selector: "strong" })).toBeInTheDocument());
    expect(requestLocation).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Use my location" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Transit" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Use my location" }));
    expect(requestLocation).toHaveBeenCalledTimes(1);

    await waitFor(() => expect(screen.getByText(/2\.4 km/)).toBeInTheDocument());
    expect(screen.getByText(/31 min/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Walking" })).toBeInTheDocument();
  });

  it("shows an offline route state and never requests location or route data automatically", async () => {
    connectivityMode = "offline";
    const user = userEvent.setup();
    const request = buildNavigationRequestFromMapDestination({
      name: "Rossio Square",
      city: "Lisbon",
      lat: 38.7148,
      lng: -9.1392,
      emoji: "📍",
      type: "place"
    }, "trip_day", { mode: "walking" });

    renderWithProviders(
      <MapPage
        initialNavigationRequest={request}
        setSelectedStadium={vi.fn()}
        setTab={vi.fn()}
      />
    );

    await waitFor(() => expect(screen.getByText("Offline")).toBeInTheDocument());
    expect(screen.getByText(/Routing requires a connection\./)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Use my location" }));
    expect(requestLocation).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

});
