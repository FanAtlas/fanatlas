import { TripPhotoGrid } from "./TripPhotoGrid";
import type { TripMemoryPhotoGroup, TripPlannerTranslate } from "./types";

export function TripMemoryGallery({
  groups,
  onRemovePhoto,
  translate
}: {
  groups: readonly TripMemoryPhotoGroup[];
  onRemovePhoto: (placeReferenceId: string, photoId: string) => Promise<boolean>;
  translate: TripPlannerTranslate;
}) {
  return (
    <section className="trip-memory-gallery">
      <div className="trip-memory-gallery__header">
        <h2>{translate("tripDrafts.photos.tripMemories")}</h2>
        <p>
          {groups.length === 0
            ? translate("tripDrafts.photos.galleryEmptyDescription")
            : translate("tripDrafts.photos.galleryDescription")}
        </p>
      </div>
      {groups.length === 0 ? (
        <div className="card-dark trip-memory-gallery__empty">
          <strong>{translate("tripDrafts.photos.noTripPhotosYet")}</strong>
          <p>{translate("tripDrafts.photos.galleryEmptyDescription")}</p>
        </div>
      ) : (
        <div className="trip-memory-gallery__groups">
          {groups.map((group) => (
            <section className="trip-memory-gallery__group" key={group.placeReferenceId}>
              <h3>{group.placeName}</h3>
              <TripPhotoGrid
                onRemovePhoto={(photoId) => onRemovePhoto(group.placeReferenceId, photoId)}
                photoIds={group.photoIds}
                placeName={group.placeName}
                translate={translate}
              />
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
