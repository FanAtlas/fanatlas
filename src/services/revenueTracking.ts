export type RevenueClickType =
  | "hotel"
  | "esim"
  | "merchandise"
  | "vip"
  | "transportation";

export type RevenueClick = {
  id: string;
  type: RevenueClickType;
  product: string;
  stadium?: string;
  city?: string;
  provider?: string;
  amount?: string;
  url?: string;
  source: string;
  createdAt: string;
};

type TrackRevenueClickInput = Omit<RevenueClick, "id" | "createdAt">;

const STORAGE_KEY = "fanatlas.revenueClicks";
const STORAGE_EVENT = "fanatlas:revenue";

function safeParse(value: string | null): RevenueClick[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(clicks: RevenueClick[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clicks));
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export function getRevenueClicks() {
  return safeParse(localStorage.getItem(STORAGE_KEY))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function trackRevenueClick(input: TrackRevenueClickInput) {
  const click: RevenueClick = {
    ...input,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString()
  };

  persist([click, ...getRevenueClicks()].slice(0, 1000));
  return click;
}

export function clearRevenueClicks() {
  persist([]);
}

export function revenueEventName() {
  return STORAGE_EVENT;
}
