/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getTravelPreparationNotificationPermission,
  requestTravelPreparationNotificationPermission,
  showTravelPreparationNotification
} from "./travelPreparationNotifications";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Travel Preparation notification helpers", () => {
  it("fails closed when the Notification API is unsupported", async () => {
    vi.stubGlobal("Notification", undefined);
    expect(getTravelPreparationNotificationPermission()).toBe("unsupported");
    await expect(requestTravelPreparationNotificationPermission()).resolves.toBe("unsupported");
    expect(showTravelPreparationNotification({ title: "Review preparation", body: "Check your list." })).toBe(false);
  });

  it("requests permission only through the explicit request helper", async () => {
    const requestPermission = vi.fn(async () => "denied" as NotificationPermission);
    vi.stubGlobal("Notification", { permission: "default", requestPermission });
    expect(getTravelPreparationNotificationPermission()).toBe("default");
    expect(requestPermission).not.toHaveBeenCalled();
    await expect(requestTravelPreparationNotificationPermission()).resolves.toBe("denied");
    expect(requestPermission).toHaveBeenCalledTimes(1);
  });

  it("shows active-session browser notifications only when permission is granted", () => {
    const notificationConstructor = vi.fn();
    vi.stubGlobal("Notification", Object.assign(notificationConstructor, { permission: "granted", requestPermission: vi.fn() }));
    expect(showTravelPreparationNotification({ title: "Review preparation", body: "Check your list." })).toBe(true);
    expect(notificationConstructor).toHaveBeenCalledWith("Review preparation", { body: "Check your list.", tag: "fanatlas-trip-preparation" });

    vi.stubGlobal("Notification", Object.assign(vi.fn(), { permission: "denied", requestPermission: vi.fn() }));
    expect(showTravelPreparationNotification({ title: "Review preparation", body: "Check your list." })).toBe(false);
  });
});
