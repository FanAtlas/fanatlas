import { useMemo } from "react";
import { deriveTravelExplorer } from "../lib/travelExplorer";
import { deriveTravelInsights } from "../lib/travelInsights";
import { deriveTravelPassport } from "../lib/travelPassport";
import { orchestrateTravelIntelligence } from "../lib/aiOrchestrator";
import { createTravelIntelligenceRequest } from "../lib/travelContext";
import type { TravelContextPermissions, TravelContextScope, TravelTask } from "../lib/travelIntelligenceTypes";
import { useTripDrafts } from "./useTripDrafts";

type UseTravelIntelligencePreviewOptions = {
  task: TravelTask;
  tripId?: string;
  destinationIds?: string[];
  scope?: TravelContextScope[];
  permissions?: Partial<TravelContextPermissions>;
};

export function useTravelIntelligencePreview(options: UseTravelIntelligencePreviewOptions) {
  const { drafts } = useTripDrafts([]);
  const currentDate = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const passport = useMemo(() => deriveTravelPassport(drafts, { currentDate, generatedAt: "session" }), [currentDate, drafts]);
  const insights = useMemo(() => deriveTravelInsights(drafts, { currentDate, generatedAt: "session" }), [currentDate, drafts]);
  const explorer = useMemo(() => deriveTravelExplorer({ trips: drafts, passport, insights, currentDate }), [currentDate, drafts, insights, passport]);

  const request = useMemo(() => createTravelIntelligenceRequest({
    id: "session-preview",
    task: options.task,
    scope: options.scope || ["selected_trip", "travel_insights"],
    userIntent: {
      normalizedIntent: options.task,
      task: options.task,
      urgency: "normal",
      destinationIds: options.destinationIds || [],
      tripIds: options.tripId ? [options.tripId] : [],
      requestedOutput: "plain_text",
      requiresCurrentInformation: false,
      requiresUserPrivateContext: true,
      requiresExternalTools: false
    },
    permissions: options.permissions
  }), [options.destinationIds, options.permissions, options.scope, options.task, options.tripId]);

  const preview = useMemo(
    () => orchestrateTravelIntelligence({ request, trips: drafts, passport, insights, explorer }),
    [drafts, explorer, insights, passport, request]
  );

  return { request, preview };
}
