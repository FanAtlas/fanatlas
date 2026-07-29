import {
  createTripPhotoId,
  isSupportedTripPhotoMimeType,
  PHOTO_MAX_FILE_SIZE,
  PHOTO_THUMBNAIL_MAX_DIMENSION,
  PHOTO_THUMBNAIL_QUALITY,
  PHOTO_THUMBNAIL_VERSION,
  type StoredTripPhoto,
  type SupportedTripPhotoMimeType
} from "./tripPhotoStorage";

export type TripPhotoPreparationError =
  | "empty_photo_file"
  | "photo_too_large"
  | "unsupported_photo_type"
  | "photo_decode_failed"
  | "photo_preparation_unavailable";

export type TripPhotoPreparationResult =
  | { ok: true; value: StoredTripPhoto }
  | { ok: false; code: TripPhotoPreparationError };

export async function prepareTripPhotoFile(input: {
  file: File;
  tripDraftId: string;
  placeReferenceId: string;
}): Promise<TripPhotoPreparationResult> {
  const file = input.file;
  if (!(file instanceof File)) return { ok: false, code: "photo_preparation_unavailable" };
  if (file.size <= 0) return { ok: false, code: "empty_photo_file" };
  if (file.size > PHOTO_MAX_FILE_SIZE) return { ok: false, code: "photo_too_large" };
  if (!isSupportedTripPhotoMimeType(file.type)) return { ok: false, code: "unsupported_photo_type" };

  const decodeResult = await decodeImageDimensions(file);
  if (decodeResult.ok === false) return { ok: false, code: decodeResult.code };
  const thumbnailBlob = await createThumbnailBlob(file, decodeResult.value);

  return {
    ok: true,
    value: {
      id: createTripPhotoId(),
      tripDraftId: input.tripDraftId,
      placeReferenceId: input.placeReferenceId,
      createdAt: new Date().toISOString(),
      mimeType: file.type as SupportedTripPhotoMimeType,
      width: decodeResult.value.width,
      height: decodeResult.value.height,
      fileSize: file.size,
      originalBlob: file,
      thumbnailBlob: thumbnailBlob || undefined,
      thumbnailVersion: thumbnailBlob ? PHOTO_THUMBNAIL_VERSION : undefined
    }
  };
}

async function decodeImageDimensions(blob: Blob): Promise<
  | { ok: true; value: { width: number; height: number; bitmap?: ImageBitmap } }
  | { ok: false; code: "photo_decode_failed" | "photo_preparation_unavailable" }
> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(blob);
      if (isPositiveDimension(bitmap.width) && isPositiveDimension(bitmap.height)) {
        return { ok: true, value: { width: bitmap.width, height: bitmap.height, bitmap } };
      }
      bitmap.close();
      return { ok: false, code: "photo_decode_failed" };
    } catch {
      return decodeImageDimensionsWithElement(blob);
    }
  }
  return decodeImageDimensionsWithElement(blob);
}

function decodeImageDimensionsWithElement(blob: Blob): Promise<
  | { ok: true; value: { width: number; height: number } }
  | { ok: false; code: "photo_decode_failed" | "photo_preparation_unavailable" }
> {
  if (typeof URL === "undefined" || typeof Image === "undefined") {
    return Promise.resolve({ ok: false, code: "photo_preparation_unavailable" });
  }
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      const width = image.naturalWidth;
      const height = image.naturalHeight;
      image.onload = null;
      image.onerror = null;
      URL.revokeObjectURL(url);
      resolve(isPositiveDimension(width) && isPositiveDimension(height)
        ? { ok: true, value: { width, height } }
        : { ok: false, code: "photo_decode_failed" });
    };
    image.onerror = () => {
      image.onload = null;
      image.onerror = null;
      URL.revokeObjectURL(url);
      resolve({ ok: false, code: "photo_decode_failed" });
    };
    image.src = url;
  });
}

async function createThumbnailBlob(
  source: Blob,
  decoded: { width: number; height: number; bitmap?: ImageBitmap }
): Promise<Blob | null> {
  if (typeof document === "undefined") {
    decoded.bitmap?.close();
    return null;
  }
  const scale = Math.min(1, PHOTO_THUMBNAIL_MAX_DIMENSION / Math.max(decoded.width, decoded.height));
  const width = Math.max(1, Math.round(decoded.width * scale));
  const height = Math.max(1, Math.round(decoded.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    decoded.bitmap?.close();
    return null;
  }

  try {
    if (decoded.bitmap) {
      context.drawImage(decoded.bitmap, 0, 0, width, height);
    } else {
      const image = await loadImageElement(source);
      if (!image) return null;
      context.drawImage(image, 0, 0, width, height);
    }
    return await canvasToBlob(canvas, "image/jpeg", PHOTO_THUMBNAIL_QUALITY);
  } catch {
    return null;
  } finally {
    decoded.bitmap?.close();
  }
}

function loadImageElement(blob: Blob): Promise<HTMLImageElement | null> {
  if (typeof URL === "undefined" || typeof Image === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      image.onload = null;
      image.onerror = null;
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      image.onload = null;
      image.onerror = null;
      URL.revokeObjectURL(url);
      resolve(null);
    };
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  if (typeof canvas.toBlob !== "function") return Promise.resolve(null);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob && blob.size > 0 ? blob : null), type, quality);
  });
}

function isPositiveDimension(value: number) {
  return Number.isFinite(value) && value > 0;
}
