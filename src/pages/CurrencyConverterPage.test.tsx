/** @vitest-environment jsdom */
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CurrencyConverterPage } from "./CurrencyConverterPage";
import { renderWithProviders } from "../test/renderWithProviders";

let connectivityMode: "online" | "offline" = "online";

const getExchangeRates = vi.hoisted(() => vi.fn());

vi.mock("../hooks/useConnectivity", () => ({
  useConnectivity: () => ({
    status: connectivityMode,
    isOnline: connectivityMode === "online",
    isOffline: connectivityMode === "offline",
    isUnknown: false
  })
}));

vi.mock("../services/exchangeRates", () => ({
  getExchangeRates
}));

beforeEach(() => {
  connectivityMode = "online";
  getExchangeRates.mockReset();
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("CurrencyConverterPage", () => {
  it("shows offline current-rate unavailable state without auto-fetching", async () => {
    connectivityMode = "offline";

    renderWithProviders(<CurrencyConverterPage onBack={vi.fn()} />);

    expect(screen.getAllByRole("status")[0]).toHaveTextContent("Current exchange rates are unavailable offline.");
    expect(getExchangeRates).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(getExchangeRates).not.toHaveBeenCalled();
  });

  it("loads once when online and does not poll in the background", async () => {
    getExchangeRates.mockResolvedValue({
      rates: {
        USD: 1,
        EUR: 0.9,
        MXN: 18.2
      },
      provider: "mock-provider",
      timeLastUpdate: "2026-08-30T12:00:00Z"
    });

    renderWithProviders(<CurrencyConverterPage onBack={vi.fn()} />);

    await vi.advanceTimersByTimeAsync(0);
    await Promise.resolve();
    expect(getExchangeRates).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    expect(getExchangeRates).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Live rates from mock-provider/)).toBeInTheDocument();
  });
});
