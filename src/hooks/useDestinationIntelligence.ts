import { useMemo } from "react";
import { deriveDestinationIntelligence } from "../lib/destinationIntelligence";
import { useTripDrafts } from "./useTripDrafts";

export function useDestinationIntelligence() {
  const { drafts } = useTripDrafts([]);
  return useMemo(() => deriveDestinationIntelligence({ tripDrafts: drafts, generatedAt: "session" }), [drafts]);
}
