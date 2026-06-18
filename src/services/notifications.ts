export type FanAtlasNotificationType =
  | "match"
  | "hotel"
  | "ticket"
  | "fan-zone"
  | "emergency"
  | "transportation"
  | "sos"
  | "stadium-arrival";

export type FanAtlasNotificationCategory =
  | "match"
  | "hotel"
  | "ticket"
  | "fan-zone"
  | "emergency"
  | "transportation";

export type FanAtlasNotification = {
  id: string;
  type: FanAtlasNotificationType;
  title: string;
  message: string;
  dueAt: string;
  createdAt: string;
  source: string;
  actionTab?: string;
  read: boolean;
  delivered: boolean;
};

type NewNotification = Omit<FanAtlasNotification, "id" | "createdAt" | "read" | "delivered">;

const STORAGE_KEY = "fanatlas.notifications";
const STORAGE_EVENT = "fanatlas:notifications";
const SETTINGS_KEY = "fanatlas.notificationSettings";

export const notificationCategories: Array<{
  id: FanAtlasNotificationCategory;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    id: "match",
    label: "Match Reminder",
    description: "Kickoff, lineup, arrival, and match day planning reminders.",
    icon: "⚽"
  },
  {
    id: "hotel",
    label: "Hotel Check-in Reminder",
    description: "Check-in, booking, cancellation, and route reminders.",
    icon: "🏨"
  },
  {
    id: "ticket",
    label: "Ticket Reminder",
    description: "Ticket QR, seat, gate, and saved document reminders.",
    icon: "🎟"
  },
  {
    id: "fan-zone",
    label: "Fan Zone Reminder",
    description: "Fan zone opening times, crowd checks, and return route reminders.",
    icon: "🎉"
  },
  {
    id: "emergency",
    label: "Emergency Alert",
    description: "SOS, emergency guidance, and safety alert infrastructure.",
    icon: "🚨"
  },
  {
    id: "transportation",
    label: "Transportation Alert",
    description: "Route, shuttle, rideshare, transit, and stadium arrival alerts.",
    icon: "🚆"
  }
];

function safeParse(value: string | null): FanAtlasNotification[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(notifications: FanAtlasNotification[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

function normalizeType(type: FanAtlasNotificationType): FanAtlasNotificationCategory {
  if (type === "sos") return "emergency";
  if (type === "stadium-arrival") return "transportation";
  return type;
}

export function getNotificationSettings(): Record<FanAtlasNotificationCategory, boolean> {
  const defaults = Object.fromEntries(
    notificationCategories.map((category) => [category.id, true])
  ) as Record<FanAtlasNotificationCategory, boolean>;

  try {
    const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    return {
      ...defaults,
      ...Object.fromEntries(
        notificationCategories.map((category) => [category.id, parsed?.[category.id] !== false])
      )
    };
  } catch {
    return defaults;
  }
}

export function setNotificationCategoryEnabled(
  category: FanAtlasNotificationCategory,
  enabled: boolean
) {
  const next = {
    ...getNotificationSettings(),
    [category]: enabled
  };

  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(STORAGE_EVENT));
  return next;
}

export function isNotificationCategoryEnabled(type: FanAtlasNotificationType) {
  return getNotificationSettings()[normalizeType(type)] !== false;
}

export function getNotifications() {
  return safeParse(localStorage.getItem(STORAGE_KEY))
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
}

export async function requestNotificationPermission() {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

export async function scheduleNotification(notification: NewNotification) {
  if (!isNotificationCategoryEnabled(notification.type)) {
    return {
      notification: null,
      permission: "disabled"
    };
  }

  const permission = await requestNotificationPermission();
  const notifications = getNotifications();
  const saved: FanAtlasNotification = {
    ...notification,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
    read: false,
    delivered: false
  };

  persist([saved, ...notifications]);
  return { notification: saved, permission };
}

export function getDueNotifications() {
  const now = Date.now();
  return getNotifications().filter((notification) => (
    isNotificationCategoryEnabled(notification.type) &&
    !notification.delivered &&
    new Date(notification.dueAt).getTime() <= now
  ));
}

export function markNotificationDelivered(id: string) {
  persist(getNotifications().map((notification) => (
    notification.id === id
      ? { ...notification, delivered: true }
      : notification
  )));
}

export function markNotificationRead(id: string) {
  persist(getNotifications().map((notification) => (
    notification.id === id
      ? { ...notification, read: true, delivered: true }
      : notification
  )));
}

export function deleteNotification(id: string) {
  persist(getNotifications().filter((notification) => notification.id !== id));
}

export function clearReadNotifications() {
  persist(getNotifications().filter((notification) => !notification.read));
}

export function notificationEventName() {
  return STORAGE_EVENT;
}

export function reminderDate(minutesFromNow: number) {
  return new Date(Date.now() + minutesFromNow * 60 * 1000).toISOString();
}
