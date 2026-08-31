/** @vitest-environment jsdom */
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SOSPage } from "./SOSPage";
import { renderWithProviders } from "../test/renderWithProviders";

let connectivityMode: "online" | "offline" = "online";

vi.mock("../hooks/useConnectivity", () => ({
  useConnectivity: () => ({
    status: connectivityMode,
    isOnline: connectivityMode === "online",
    isOffline: connectivityMode === "offline",
    isUnknown: false
  })
}));

vi.mock("../LocationContext", () => ({
  useLocation: () => ({
    location: null,
    status: "idle",
    requestLocation: vi.fn()
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
    }
  })
}));

vi.mock("../hooks/useGlobalPlaces", () => ({
  useGlobalPlaces: () => ({
    groups: {
      hospitals: [],
      police: [],
      embassies: [],
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

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  connectivityMode = "online";
});

describe("SOSPage", () => {
  it("keeps verified emergency numbers visible offline without fetching live places", () => {
    connectivityMode = "offline";
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    renderWithProviders(<SOSPage setMapDestination={vi.fn()} setTab={vi.fn()} />);

    expect(screen.getByRole("status")).toHaveTextContent("Verified emergency numbers remain available offline.");
    expect(screen.getAllByText("112").length).toBeGreaterThan(0);
    expect(screen.getByText(/Emergency · Portugal/)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
