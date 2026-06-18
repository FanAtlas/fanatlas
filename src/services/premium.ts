export type PremiumPlan = "free" | "monthly" | "annual";

export type PremiumSubscription = {
  plan: PremiumPlan;
  status: "free" | "active" | "canceled";
  startedAt: string;
  renewsAt: string;
};

const STORAGE_KEY = "fanatlas.premium";
const EVENT_NAME = "fanatlas:premium";

const freeSubscription: PremiumSubscription = {
  plan: "free",
  status: "free",
  startedAt: "",
  renewsAt: ""
};

function safeParse(value: string | null): PremiumSubscription {
  if (!value) return freeSubscription;

  try {
    const parsed = JSON.parse(value);
    if (parsed?.plan && parsed?.status) return parsed;
    return freeSubscription;
  } catch {
    return freeSubscription;
  }
}

function persist(subscription: PremiumSubscription) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(subscription));
  window.dispatchEvent(new Event(EVENT_NAME));
}

function renewalDate(plan: PremiumPlan) {
  const date = new Date();
  date.setDate(date.getDate() + (plan === "annual" ? 365 : 30));
  return date.toISOString();
}

export function getPremiumSubscription() {
  return safeParse(localStorage.getItem(STORAGE_KEY));
}

export function isPremiumActive(subscription = getPremiumSubscription()) {
  return subscription.status === "active" && subscription.plan !== "free";
}

export function activatePremium(plan: Exclude<PremiumPlan, "free">) {
  const subscription: PremiumSubscription = {
    plan,
    status: "active",
    startedAt: new Date().toISOString(),
    renewsAt: renewalDate(plan)
  };

  persist(subscription);
  return subscription;
}

export function cancelPremium() {
  const current = getPremiumSubscription();
  const subscription: PremiumSubscription = {
    ...current,
    status: current.plan === "free" ? "free" : "canceled"
  };

  persist(subscription);
  return subscription;
}

export function resumePremium() {
  const current = getPremiumSubscription();
  if (current.plan === "free") return current;

  const subscription: PremiumSubscription = {
    ...current,
    status: "active",
    renewsAt: renewalDate(current.plan)
  };

  persist(subscription);
  return subscription;
}

export function premiumEventName() {
  return EVENT_NAME;
}
