import type { HydratedTripDraftPlace, TripPlaceVisitStatus, TripTimeBlock } from "../../lib/tripDrafts";
import type { SavedPlace } from "../../lib/savedPlaces";
import type { SavedPlaceAction } from "../../lib/savedPlaceActions";

export type TripPlannerTranslate = (key: string) => string;

export type TripDayDestinationOption = {
  id: string;
  label: string;
};

export type TripPlaceOrderPosition = {
  index: number;
  total: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
};

export type TripPlaceActionRow = {
  reference: HydratedTripDraftPlace["reference"];
  place: SavedPlace;
  actions: {
    primary?: SavedPlaceAction;
    secondary: SavedPlaceAction[];
  };
  position: TripPlaceOrderPosition;
};

export type TripPlacePlanningActions = {
  onMoveToDay: (dayId: string) => void;
  onSetTimeBlock?: (timeBlock: TripTimeBlock | null) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onUpdateNote?: (note: string | null, expectedCurrentNote: string | null) => boolean;
  onUpdateVisitStatus?: (status: TripPlaceVisitStatus) => boolean;
};

export type PlanningActionCallbacks = {
  onAdd: (text: string) => boolean;
  onUpdate: (actionId: string, expectedCurrentText: string, text: string) => boolean;
  onToggle: (actionId: string) => boolean;
  onRemove: (actionId: string) => boolean;
};

export type TripPhotoCallbacks = {
  onAddPhotos: (files: File[]) => Promise<boolean>;
  onRemovePhoto: (photoId: string) => Promise<boolean>;
};

export type TripMemoryPhotoGroup = {
  placeReferenceId: string;
  placeName: string;
  photoIds: readonly string[];
};

export type TripNearbyPlaceGroupItem = {
  id: string;
  memberIds: readonly string[];
  sourceDayId: string;
  sourceTimeBlock: TripTimeBlock | null;
  heading: string;
  placeNames: readonly string[];
  closestDistanceLabel: string;
  spanDistanceLabel?: string;
};

export type TripNearbyGroupMoveRequest = {
  memberIds: readonly string[];
  expectedSourceDayId: string;
  expectedSourceTimeBlock: TripTimeBlock | null;
  destinationDayId: string;
  destinationTimeBlock: TripTimeBlock | null;
  destinationLabel: string;
};
