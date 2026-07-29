export const TRIP_PHOTO_DB_NAME = "FanAtlasLocalPhotos";
export const TRIP_PHOTO_DB_VERSION = 1;
export const TRIP_PHOTO_STORE_NAME = "photos";
export const PHOTO_MAX_FILE_SIZE = 20 * 1024 * 1024;
export const PHOTO_MAX_SELECTION_COUNT = 20;
export const PHOTO_THUMBNAIL_MAX_DIMENSION = 480;
export const PHOTO_THUMBNAIL_QUALITY = 0.82;
export const PHOTO_THUMBNAIL_VERSION = 1;

export type SupportedTripPhotoMimeType =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/heic"
  | "image/heif";

export type StoredTripPhoto = {
  id: string;
  tripDraftId: string;
  placeReferenceId: string;
  createdAt: string;
  mimeType: SupportedTripPhotoMimeType;
  width: number;
  height: number;
  fileSize: number;
  originalBlob: Blob;
  thumbnailBlob?: Blob;
  thumbnailVersion?: number;
};

export type TripPhotoStorageError =
  | "storage_unavailable"
  | "quota_exceeded"
  | "photo_not_found"
  | "storage_read_failed"
  | "storage_write_failed"
  | "storage_delete_failed"
  | "invalid_photo_record";

export type TripPhotoStorageResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: TripPhotoStorageError };

export type TripPhotoBatchDeleteResult = {
  requested: number;
  deleted: number;
  missing: number;
  failed: number;
};

export type TripPhotoBatchLoadItem =
  | { id: string; status: "loaded"; photo: StoredTripPhoto }
  | { id: string; status: "unavailable" | "failed" };

let dbPromise: Promise<IDBDatabase> | null = null;

export function createTripPhotoId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `trip-photo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function isSupportedTripPhotoMimeType(value: unknown): value is SupportedTripPhotoMimeType {
  return value === "image/jpeg" || value === "image/png" || value === "image/webp" || value === "image/heic" || value === "image/heif";
}

export async function saveTripPhoto(photo: StoredTripPhoto): Promise<TripPhotoStorageResult<StoredTripPhoto>> {
  if (!isValidStoredTripPhoto(photo)) return { ok: false, code: "invalid_photo_record" };
  const dbResult = await openTripPhotoDatabase();
  if (dbResult.ok === false) return { ok: false, code: dbResult.code };
  return runPhotoTransaction(dbResult.value, "readwrite", (store) => {
    const request = store.add(photo);
    return requestResult(request).then(() => photo);
  }, () => photo, "storage_write_failed");
}

export async function loadTripPhoto(photoId: string): Promise<TripPhotoStorageResult<StoredTripPhoto>> {
  const id = normalizePhotoId(photoId);
  if (!id) return { ok: false, code: "photo_not_found" };
  const dbResult = await openTripPhotoDatabase();
  if (dbResult.ok === false) return { ok: false, code: dbResult.code };
  return runPhotoTransaction(dbResult.value, "readonly", async (store) => {
    const value = await requestResult(store.get(id));
    const photo = normalizeStoredTripPhoto(value);
    if (!photo) throw new TripPhotoStorageFailure("invalid_photo_record");
    return photo;
  }, (photo) => photo, "storage_read_failed");
}

export async function loadTripPhotosByIds(photoIds: readonly string[]): Promise<TripPhotoStorageResult<TripPhotoBatchLoadItem[]>> {
  const ids = normalizePhotoIds(photoIds);
  if (ids.length === 0) return { ok: true, value: [] };
  const dbResult = await openTripPhotoDatabase();
  if (dbResult.ok === false) return { ok: false, code: dbResult.code };
  return runPhotoTransaction(dbResult.value, "readonly", async (store) => {
    const items: TripPhotoBatchLoadItem[] = [];
    for (const id of ids) {
      try {
        const value = await requestResult(store.get(id));
        if (value === undefined) {
          items.push({ id, status: "unavailable" });
          continue;
        }
        const photo = normalizeStoredTripPhoto(value);
        items.push(photo ? { id, status: "loaded", photo } : { id, status: "failed" });
      } catch {
        items.push({ id, status: "failed" });
      }
    }
    return items;
  }, (items) => items, "storage_read_failed");
}

export async function deleteTripPhotoOwnedBy(input: {
  photoId: string;
  tripDraftId: string;
  placeReferenceId?: string;
}): Promise<TripPhotoStorageResult<boolean>> {
  const id = normalizePhotoId(input.photoId);
  if (!id) return { ok: false, code: "photo_not_found" };
  const dbResult = await openTripPhotoDatabase();
  if (dbResult.ok === false) return { ok: false, code: dbResult.code };
  return runPhotoTransaction(dbResult.value, "readwrite", async (store) => {
    const existing = normalizeStoredTripPhoto(await requestResult(store.get(id)));
    if (!existing) return false;
    if (existing.tripDraftId !== input.tripDraftId) return false;
    if (input.placeReferenceId && existing.placeReferenceId !== input.placeReferenceId) return false;
    await requestResult(store.delete(id));
    return true;
  }, (deleted) => deleted, "storage_delete_failed");
}

export async function deleteTripPhotosByIds(
  photoIds: readonly string[],
  owner?: { tripDraftId: string; placeReferenceId?: string }
): Promise<TripPhotoStorageResult<TripPhotoBatchDeleteResult>> {
  const ids = normalizePhotoIds(photoIds);
  const result: TripPhotoBatchDeleteResult = { requested: ids.length, deleted: 0, missing: 0, failed: 0 };
  if (ids.length === 0) return { ok: true, value: result };
  const dbResult = await openTripPhotoDatabase();
  if (dbResult.ok === false) return { ok: false, code: dbResult.code };
  return runPhotoTransaction(dbResult.value, "readwrite", async (store) => {
    for (const id of ids) {
      try {
        const existing = normalizeStoredTripPhoto(await requestResult(store.get(id)));
        if (!existing) {
          result.missing += 1;
          continue;
        }
        if (owner && (existing.tripDraftId !== owner.tripDraftId || (owner.placeReferenceId && existing.placeReferenceId !== owner.placeReferenceId))) {
          result.failed += 1;
          continue;
        }
        await requestResult(store.delete(id));
        result.deleted += 1;
      } catch {
        result.failed += 1;
      }
    }
    return result;
  }, (value) => value, "storage_delete_failed");
}

export async function listTripPhotosByTripDraftId(tripDraftId: string): Promise<TripPhotoStorageResult<StoredTripPhoto[]>> {
  const dbResult = await openTripPhotoDatabase();
  if (dbResult.ok === false) return { ok: false, code: dbResult.code };
  return runPhotoTransaction(dbResult.value, "readonly", async (store) => {
    const index = store.index("tripDraftId");
    const values = await requestResult(index.getAll(tripDraftId));
    return values.flatMap((value) => {
      const photo = normalizeStoredTripPhoto(value);
      return photo && photo.tripDraftId === tripDraftId ? [photo] : [];
    });
  }, (photos) => photos, "storage_read_failed");
}

export async function listTripPhotosByPlaceReferenceId(input: {
  tripDraftId: string;
  placeReferenceId: string;
}): Promise<TripPhotoStorageResult<StoredTripPhoto[]>> {
  const records = await listTripPhotosByTripDraftId(input.tripDraftId);
  if (records.ok === false) return { ok: false, code: records.code };
  return {
    ok: true,
    value: records.value.filter((photo) => photo.placeReferenceId === input.placeReferenceId)
  };
}

export async function cleanupOrphanedTripPhotos(input: {
  tripDraftId: string;
  referencedPhotoIds: ReadonlySet<string>;
}): Promise<TripPhotoStorageResult<TripPhotoBatchDeleteResult>> {
  const records = await listTripPhotosByTripDraftId(input.tripDraftId);
  if (records.ok === false) return { ok: false, code: records.code };
  const orphanIds = records.value
    .filter((photo) => !input.referencedPhotoIds.has(photo.id))
    .map((photo) => photo.id);
  return deleteTripPhotosByIds(orphanIds, { tripDraftId: input.tripDraftId });
}

export function getTripPhotoDisplayBlob(photo: StoredTripPhoto, variant: "thumbnail" | "original") {
  return variant === "thumbnail" ? photo.thumbnailBlob || photo.originalBlob : photo.originalBlob;
}

function openTripPhotoDatabase(): Promise<TripPhotoStorageResult<IDBDatabase>> {
  if (typeof indexedDB === "undefined") return Promise.resolve({ ok: false, code: "storage_unavailable" });
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(TRIP_PHOTO_DB_NAME, TRIP_PHOTO_DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(TRIP_PHOTO_STORE_NAME)) {
          const store = db.createObjectStore(TRIP_PHOTO_STORE_NAME, { keyPath: "id" });
          store.createIndex("tripDraftId", "tripDraftId", { unique: false });
          store.createIndex("placeReferenceId", "placeReferenceId", { unique: false });
          store.createIndex("createdAt", "createdAt", { unique: false });
        }
      };
      request.onblocked = () => reject(new TripPhotoStorageFailure("storage_unavailable"));
      request.onerror = () => reject(mapStorageException(request.error));
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          if (dbPromise) dbPromise = null;
        };
        resolve(db);
      };
    });
  }
  return dbPromise
    .then((db) => ({ ok: true as const, value: db }))
    .catch((error: unknown) => {
      dbPromise = null;
      return { ok: false as const, code: storageFailureCode(error, "storage_unavailable") };
    });
}

function runPhotoTransaction<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => Promise<T>,
  mapValue: (value: T) => T,
  fallbackCode: TripPhotoStorageError
): Promise<TripPhotoStorageResult<T>> {
  return new Promise((resolve) => {
    let settled = false;
    let actionValue: T | null = null;
    const transaction = db.transaction(TRIP_PHOTO_STORE_NAME, mode);
    const store = transaction.objectStore(TRIP_PHOTO_STORE_NAME);
    transaction.oncomplete = () => {
      if (!settled && actionValue !== null) {
        settled = true;
        resolve({ ok: true, value: mapValue(actionValue) });
      }
    };
    transaction.onerror = () => {
      if (!settled) {
        settled = true;
        resolve({ ok: false, code: storageFailureCode(transaction.error, fallbackCode) });
      }
    };
    transaction.onabort = () => {
      if (!settled) {
        settled = true;
        resolve({ ok: false, code: storageFailureCode(transaction.error, fallbackCode) });
      }
    };
    action(store)
      .then((value) => {
        actionValue = value;
      })
      .catch((error: unknown) => {
        if (!settled) {
          settled = true;
          try {
            transaction.abort();
          } catch {
            // The transaction may already be closed.
          }
          resolve({ ok: false, code: storageFailureCode(error, fallbackCode) });
        }
      });
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(mapStorageException(request.error));
  });
}

function normalizeStoredTripPhoto(value: unknown): StoredTripPhoto | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const photo: StoredTripPhoto = {
    id: normalizePhotoId(record.id),
    tripDraftId: normalizePhotoId(record.tripDraftId),
    placeReferenceId: normalizePhotoId(record.placeReferenceId),
    createdAt: typeof record.createdAt === "string" && Number.isFinite(Date.parse(record.createdAt))
      ? new Date(record.createdAt).toISOString()
      : "",
    mimeType: isSupportedTripPhotoMimeType(record.mimeType) ? record.mimeType : "image/jpeg",
    width: normalizePositiveInteger(record.width),
    height: normalizePositiveInteger(record.height),
    fileSize: normalizePositiveInteger(record.fileSize),
    originalBlob: record.originalBlob instanceof Blob ? record.originalBlob : new Blob(),
    thumbnailBlob: record.thumbnailBlob instanceof Blob ? record.thumbnailBlob : undefined,
    thumbnailVersion: normalizePositiveInteger(record.thumbnailVersion) || undefined
  };
  return isValidStoredTripPhoto(photo) ? photo : null;
}

function isValidStoredTripPhoto(photo: StoredTripPhoto) {
  return Boolean(
    normalizePhotoId(photo.id) &&
    normalizePhotoId(photo.tripDraftId) &&
    normalizePhotoId(photo.placeReferenceId) &&
    Number.isFinite(Date.parse(photo.createdAt)) &&
    isSupportedTripPhotoMimeType(photo.mimeType) &&
    Number.isInteger(photo.width) &&
    photo.width > 0 &&
    Number.isInteger(photo.height) &&
    photo.height > 0 &&
    Number.isInteger(photo.fileSize) &&
    photo.fileSize > 0 &&
    photo.fileSize <= PHOTO_MAX_FILE_SIZE &&
    photo.originalBlob instanceof Blob &&
    photo.originalBlob.size > 0 &&
    photo.originalBlob.size <= PHOTO_MAX_FILE_SIZE
  );
}

function normalizePhotoIds(value: readonly string[]) {
  const seen = new Set<string>();
  return value.flatMap((item) => {
    const id = normalizePhotoId(item);
    if (!id || seen.has(id)) return [];
    seen.add(id);
    return [id];
  });
}

function normalizePhotoId(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePositiveInteger(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function mapStorageException(error: unknown) {
  return new TripPhotoStorageFailure(storageFailureCode(error, "storage_write_failed"));
}

function storageFailureCode(error: unknown, fallback: TripPhotoStorageError): TripPhotoStorageError {
  if (error instanceof TripPhotoStorageFailure) return error.code;
  if (error instanceof DOMException && (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED")) {
    return "quota_exceeded";
  }
  return fallback;
}

class TripPhotoStorageFailure extends Error {
  code: TripPhotoStorageError;

  constructor(code: TripPhotoStorageError) {
    super(code);
    this.code = code;
  }
}
