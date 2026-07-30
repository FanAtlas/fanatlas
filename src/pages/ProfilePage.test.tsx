/** @vitest-environment jsdom */
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProfilePage } from "./ProfilePage";
import { renderWithProviders } from "../test/renderWithProviders";

vi.mock("../TravelLocationContext", () => ({
  useTravelLocation: () => ({
    travelLocation: {
      originCountry: "Canada",
      destinationCountry: "Morocco",
      destinationCity: "Casablanca",
      latitude: 33.5731,
      longitude: -7.5898,
      locationSource: "manual"
    }
  })
}));

describe("ProfilePage", () => {
  it("shows the private travel feature entries and routes through setTab", async () => {
    const user = userEvent.setup();
    const setTab = vi.fn();

    renderWithProviders(<ProfilePage isAdmin={false} setTab={setTab} />);

    expect(screen.getByRole("button", { name: /Travel Passport/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Travel Journal/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Travel Insights/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Travel Insights/i }));

    expect(setTab).toHaveBeenCalledWith("insights");
  });
});
