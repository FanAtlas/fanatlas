import { TripPhotoGrid } from "./TripPhotoGrid";
import { TripPhotoPicker, formatPhotoNumber } from "./TripPhotoPicker";
import type { TripPhotoCallbacks, TripPlannerTranslate } from "./types";

export function TripPlacePhotos({
  callbacks,
  isAdding,
  language,
  photoIds,
  placeName,
  translate
}: {
  callbacks: TripPhotoCallbacks;
  isAdding?: boolean;
  language: string;
  photoIds: readonly string[];
  placeName: string;
  translate: TripPlannerTranslate;
}) {
  const countLabel = photoIds.length === 1
    ? translate("tripDrafts.photos.onePhoto")
    : translate("tripDrafts.photos.manyPhotos").replace("{count}", formatPhotoNumber(photoIds.length, language));

  return (
    <section className="trip-place-photos">
      <div className="trip-place-photos__header">
        <div>
          <h4>{translate("tripDrafts.photos.memories")}</h4>
          <p>{photoIds.length > 0 ? countLabel : translate("tripDrafts.photos.noPhotosYet")}</p>
        </div>
        <TripPhotoPicker
          disabled={isAdding}
          language={language}
          onSelectFiles={(files) => {
            void callbacks.onAddPhotos(files);
          }}
          translate={translate}
        />
      </div>
      {photoIds.length > 0 && (
        <TripPhotoGrid
          onRemovePhoto={callbacks.onRemovePhoto}
          photoIds={photoIds}
          placeName={placeName}
          translate={translate}
        />
      )}
    </section>
  );
}
