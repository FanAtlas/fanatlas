import { useMemo } from "react";
import { useTripDrafts } from "./useTripDrafts";
import { deriveTravelInsights } from "../lib/travelInsights";

export function useTravelInsights() {
  const { drafts } = useTripDrafts([]);
  const currentDate = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const insights = useMemo(() => deriveTravelInsights(drafts, { currentDate, generatedAt: "session" }), [currentDate, drafts]);
  return { drafts, insights };
}
