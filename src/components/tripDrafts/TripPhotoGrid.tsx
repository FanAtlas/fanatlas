import { useEffect, useState } from "react";
import { TripPhotoThumbnail } from "./TripPhotoThumbnail";
import { TripPhotoViewer } from "./TripPhotoViewer";
import type { TripPlannerTranslate } from "./types";

export function TripPhotoGrid({
  onRemovePhoto,
  photoIds,
  placeName,
  translate
}: {
  onRemovePhoto: (photoId: string) => Promise<boolean>;
  photoIds: readonly string[];
  placeName: string;
  translate: TripPlannerTranslate;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const activePhotoId = activeIndex === null ? null : photoIds[activeIndex] || null;

  useEffect(() => {
    if (activePhotoId && !photoIds.includes(activePhotoId)) setActiveIndex(null);
  }, [activePhotoId, photoIds]);

  async function confirmRemove() {
    if (!pendingRemoveId) return;
    const removedIndex = photoIds.indexOf(pendingRemoveId);
    const removed = await onRemovePhoto(pendingRemoveId);
    if (!removed) return;
    setPendingRemoveId(null);
    if (activePhotoId === pendingRemoveId) {
      const nextLength = photoIds.length - 1;
      if (nextLength <= 0) {
        setActiveIndex(null);
      } else {
        setActiveIndex(Math.min(removedIndex, nextLength - 1));
      }
    }
  }

  return (
    <div className="trip-photo-grid-wrap">
      <div className="trip-photo-grid">
        {photoIds.map((photoId, index) => (
          <div key={photoId}>
            <TripPhotoThumbnail
              index={index}
              onOpen={() => setActiveIndex(index)}
              onRemove={() => setPendingRemoveId(photoId)}
              photoId={photoId}
              placeName={placeName}
              translate={translate}
            />
          </div>
        ))}
      </div>

      {pendingRemoveId && (
        <div className="collection-delete-confirm trip-photo-remove-confirm" role="group" aria-label={translate("tripDrafts.photos.removeConfirmTitle")}>
          <strong>{translate("tripDrafts.photos.removeConfirmTitle")}</strong>
          <p>{translate("tripDrafts.photos.removeConfirmDescription")}</p>
          <div>
            <button className="secondary-btn trip-photo-thumbnail__remove" onClick={confirmRemove} type="button">
              {translate("tripDrafts.photos.remove")}
            </button>
            <button className="secondary-btn" onClick={() => setPendingRemoveId(null)} type="button">
              {translate("tripDrafts.cancel")}
            </button>
          </div>
        </div>
      )}

      {activePhotoId && activeIndex !== null && (
        <TripPhotoViewer
          currentIndex={activeIndex}
          onClose={() => setActiveIndex(null)}
          onNext={() => setActiveIndex((index) => Math.min((index ?? 0) + 1, photoIds.length - 1))}
          onPrevious={() => setActiveIndex((index) => Math.max((index ?? 0) - 1, 0))}
          onRemove={() => setPendingRemoveId(activePhotoId)}
          photoId={activePhotoId}
          photoIds={photoIds}
          placeName={placeName}
          translate={translate}
        />
      )}
    </div>
  );
}
