import type { PlanningAction } from "../../lib/tripDrafts";
import { PlanningActionList } from "./PlanningActionList";
import type { PlanningActionCallbacks, TripPlannerTranslate } from "./types";

export function PlacePlanningActions({
  actions,
  callbacks,
  language,
  translate
}: {
  actions: readonly PlanningAction[];
  callbacks: PlanningActionCallbacks;
  language: string;
  translate: TripPlannerTranslate;
}) {
  return (
    <div className="place-planning-actions">
      <PlanningActionList
        actions={actions}
        heading={translate("tripDrafts.planningActions.placeTitle")}
        language={language}
        onAdd={callbacks.onAdd}
        onRemove={callbacks.onRemove}
        onToggle={callbacks.onToggle}
        onUpdate={callbacks.onUpdate}
        translate={translate}
      />
    </div>
  );
}
