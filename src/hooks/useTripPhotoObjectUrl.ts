import { useEffect, useState } from "react";
import { getTripPhotoDisplayBlob, loadTripPhoto, type TripPhotoStorageError } from "../lib/tripPhotoStorage";

export type TripPhotoObjectUrlState =
  | { status: "idle"; url: null; error: null }
  | { status: "loading"; url: null; error: null }
  | { status: "loaded"; url: string; error: null }
  | { status: "failed"; url: null; error: TripPhotoStorageError };

export function useTripPhotoObjectUrl(photoId: string | null, variant: "thumbnail" | "original"): TripPhotoObjectUrlState {
  const [state, setState] = useState<TripPhotoObjectUrlState>({ status: "idle", url: null, error: null });

  useEffect(() => {
    if (!photoId) {
      setState({ status: "idle", url: null, error: null });
      return undefined;
    }

    let active = true;
    let objectUrl: string | null = null;
    setState({ status: "loading", url: null, error: null });

    loadTripPhoto(photoId).then((result) => {
      if (!active) return;
      if (result.ok === false) {
        setState({ status: "failed", url: null, error: result.code });
        return;
      }
      objectUrl = URL.createObjectURL(getTripPhotoDisplayBlob(result.value, variant));
      setState({ status: "loaded", url: objectUrl, error: null });
    });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photoId, variant]);

  return state;
}
