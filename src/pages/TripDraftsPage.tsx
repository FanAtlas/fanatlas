import { TravelIntelligenceProvider } from "../contexts/TravelIntelligenceContext";
import { TripDraftPlanner, type TripDraftPlannerProps } from "../components/tripDrafts";

type Props = TripDraftPlannerProps & {
  userId: string;
};

export function TripDraftsPage({
  userId,
  ...props
}: Props) {
  return (
    <TravelIntelligenceProvider userId={userId}>
      <TripDraftPlanner {...props} />
    </TravelIntelligenceProvider>
  );
}
