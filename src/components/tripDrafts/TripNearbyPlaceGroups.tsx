import { useId, useState } from "react";
import { TripNearbyGroupPlanner } from "./TripNearbyGroupPlanner";
import type { TripDayDestinationOption, TripNearbyGroupMoveRequest, TripNearbyPlaceGroupItem, TripPlannerTranslate } from "./types";

export function TripNearbyPlaceGroups({
  items,
  moveOptions,
  onMoveGroup,
  translate,
  title
}: {
  items: readonly TripNearbyPlaceGroupItem[];
  moveOptions: TripDayDestinationOption[];
  onMoveGroup: (request: TripNearbyGroupMoveRequest) => boolean;
  translate: TripPlannerTranslate;
  title: string;
}) {
  const baseId = useId();
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  if (items.length === 0) return null;

  return (
    <section className="trip-nearby-groups" aria-label={title}>
      <h4 className="trip-nearby-groups__title">{title}</h4>
      <ol className="trip-nearby-groups__list">
        {items.map((item, index) => {
          const panelId = `${baseId}-nearby-group-planner-${index}`;
          return (
            <li className="trip-nearby-group" key={item.id}>
              <strong className="trip-nearby-group__heading">{item.heading}</strong>
              <ul className="trip-nearby-group__places">
                {item.placeNames.map((placeName, index) => (
                  <li className="trip-nearby-group__place" key={`${item.id}-${index}`}>
                    {placeName}
                  </li>
                ))}
              </ul>
              <div className="trip-nearby-group__metrics">
                <span className="trip-nearby-group__distance">{item.closestDistanceLabel}</span>
                {item.spanDistanceLabel && (
                  <span className="trip-nearby-group__distance">{item.spanDistanceLabel}</span>
                )}
              </div>
              <div className="trip-nearby-group__actions">
                <button
                  aria-controls={panelId}
                  aria-expanded={openGroupId === item.id}
                  className="secondary-btn"
                  onClick={() => setOpenGroupId(openGroupId === item.id ? null : item.id)}
                  type="button"
                >
                  {translate("tripDrafts.nearbyGroups.planGroup")}
                </button>
              </div>
              {openGroupId === item.id && (
                <div id={panelId}>
                  <TripNearbyGroupPlanner
                    group={item}
                    moveOptions={moveOptions}
                    onCancel={() => setOpenGroupId(null)}
                    onMoveGroup={onMoveGroup}
                    translate={translate}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
