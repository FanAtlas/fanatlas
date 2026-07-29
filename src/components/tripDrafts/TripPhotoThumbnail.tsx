import { useTripPhotoObjectUrl } from "../../hooks/useTripPhotoObjectUrl";
import type { TripPlannerTranslate } from "./types";

export function TripPhotoThumbnail({
  index,
  onOpen,
  onRemove,
  photoId,
  placeName,
  translate
}: {
  index: number;
  onOpen: () => void;
  onRemove: () => void;
  photoId: string;
  placeName: string;
  translate: TripPlannerTranslate;
}) {
  const photo = useTripPhotoObjectUrl(photoId, "thumbnail");
  const openLabel = translate("tripDrafts.photos.openPhoto")
    .replace("{index}", String(index + 1))
    .replace("{place}", placeName);
  const removeLabel = translate("tripDrafts.photos.removePhotoFrom")
    .replace("{index}", String(index + 1))
    .replace("{place}", placeName);

  return (
    <div className="trip-photo-thumbnail">
      <button
        aria-label={openLabel}
        className="trip-photo-thumbnail__button"
        disabled={photo.status === "loading"}
        onClick={onOpen}
        type="button"
      >
        {photo.status === "loaded" ? (
          <img className="trip-photo-thumbnail__image" src={photo.url} alt="" />
        ) : (
          <span className="trip-photo-thumbnail__placeholder">
            {photo.status === "loading" ? translate("tripDrafts.photos.loading") : translate("tripDrafts.photos.unavailable")}
          </span>
        )}
      </button>
      <button
        aria-label={removeLabel}
        className="secondary-btn trip-photo-thumbnail__remove"
        onClick={onRemove}
        type="button"
      >
        {translate("tripDrafts.photos.remove")}
      </button>
    </div>
  );
}
