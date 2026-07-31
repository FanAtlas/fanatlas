import { useMemo } from "react";
import { useTripDrafts } from "./useTripDrafts";
import { deriveTravelExplorer } from "../lib/travelExplorer";
import { deriveTravelInsights } from "../lib/travelInsights";
import { deriveTravelPassport } from "../lib/travelPassport";

export function useTravelExplorer() {
  const { drafts } = useTripDrafts([]);
  const currentDate = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const passport = useMemo(() => deriveTravelPassport(drafts, { currentDate, generatedAt: "session" }), [currentDate, drafts]);
  const insights = useMemo(() => deriveTravelInsights(drafts, { currentDate, generatedAt: "session" }), [currentDate, drafts]);
  const explorer = useMemo(() => deriveTravelExplorer({ trips: drafts, passport, insights, currentDate }), [currentDate, drafts, insights, passport]);

  return { drafts, passport, insights, explorer };
}
