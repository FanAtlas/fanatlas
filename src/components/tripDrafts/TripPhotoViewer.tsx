import { useEffect, useRef } from "react";
import { useTripPhotoObjectUrl } from "../../hooks/useTripPhotoObjectUrl";
import type { TripPlannerTranslate } from "./types";

export function TripPhotoViewer({
  currentIndex,
  onClose,
  onNext,
  onPrevious,
  onRemove,
  photoId,
  photoIds,
  placeName,
  translate
}: {
  currentIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onRemove: () => void;
  photoId: string;
  photoIds: readonly string[];
  placeName: string;
  translate: TripPlannerTranslate;
}) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const photo = useTripPhotoObjectUrl(photoId, "original");
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < photoIds.length - 1;
  const positionLabel = translate("tripDrafts.photos.position")
    .replace("{current}", String(currentIndex + 1))
    .replace("{total}", String(photoIds.length))
    .replace("{place}", placeName);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, [photoId]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && hasPrevious) onPrevious();
      if (event.key === "ArrowRight" && hasNext) onNext();
      if (event.key === "Tab") {
        const buttons = dialogRef.current?.querySelectorAll("button:not(:disabled)");
        const focusable = Array.from(buttons || []).filter((node): node is HTMLButtonElement => node instanceof HTMLButtonElement);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasNext, hasPrevious, onClose, onNext, onPrevious]);

  return (
    <div className="trip-photo-viewer" role="presentation">
      <div
        aria-label={translate("tripDrafts.photos.viewerTitle")}
        aria-modal="true"
        className="trip-photo-viewer__dialog"
        ref={dialogRef}
        role="dialog"
      >
        <div className="trip-photo-viewer__header">
          <h3>{positionLabel}</h3>
          <button className="secondary-btn" onClick={onClose} ref={closeButtonRef} type="button">
            {translate("tripDrafts.photos.closeViewer")}
          </button>
        </div>
        <div className="trip-photo-viewer__image-wrap">
          {photo.status === "loaded" ? (
            <img className="trip-photo-viewer__image" src={photo.url} alt={positionLabel} />
          ) : (
            <div className="trip-photo-viewer__placeholder">
              {photo.status === "loading" ? translate("tripDrafts.photos.loading") : translate("tripDrafts.photos.loadFailed")}
            </div>
          )}
        </div>
        <div className="trip-photo-viewer__controls">
          <button className="secondary-btn" disabled={!hasPrevious} onClick={onPrevious} type="button">
            {translate("tripDrafts.photos.previous")}
          </button>
          <button className="secondary-btn" disabled={!hasNext} onClick={onNext} type="button">
            {translate("tripDrafts.photos.next")}
          </button>
          <button className="secondary-btn trip-photo-viewer__remove" onClick={onRemove} type="button">
            {translate("tripDrafts.photos.remove")}
          </button>
        </div>
      </div>
    </div>
  );
}
