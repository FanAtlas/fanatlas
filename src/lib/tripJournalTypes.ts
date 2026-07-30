export type TripJournalMood =
  | "joyful"
  | "peaceful"
  | "excited"
  | "grateful"
  | "reflective"
  | "surprised"
  | "tired"
  | "challenging";

export type TripJournalEntryStatus = "draft" | "complete";

export type TripJournalEntry = {
  id: string;
  title?: string;
  body: string;
  entryDate?: string;
  itineraryDayId?: string;
  placeReferenceId?: string;
  photoIds?: string[];
  mood?: TripJournalMood;
  favorite: boolean;
  status: TripJournalEntryStatus;
  createdAt: string;
  updatedAt: string;
};

export type CreateTripJournalEntryInput = {
  title?: string;
  body: string;
  entryDate?: string;
  itineraryDayId?: string;
  placeReferenceId?: string;
  photoIds?: readonly string[];
  mood?: TripJournalMood;
  favorite?: boolean;
  status?: TripJournalEntryStatus;
};

export type UpdateTripJournalEntryInput = {
  entryId: string;
  title?: string | null;
  body?: string;
  entryDate?: string | null;
  itineraryDayId?: string | null;
  placeReferenceId?: string | null;
  photoIds?: readonly string[];
  mood?: TripJournalMood | null;
  favorite?: boolean;
  status?: TripJournalEntryStatus;
};

export type TripJournalDataQuality = {
  entriesProcessed: number;
  invalidEntriesRemoved: number;
  invalidDatesRemoved: number;
  staleDayLinksRemoved: number;
  stalePlaceLinksRemoved: number;
  duplicatePhotoIdsRemoved: number;
  invalidMoodValuesRemoved: number;
};

export type TripStoryEntry = TripJournalEntry & {
  itineraryDayLabel?: string;
  itineraryDayDate?: string;
  placeName?: string;
  unavailableDay: boolean;
  unavailablePlace: boolean;
};

export type TripJournalSummary = {
  totalEntries: number;
  draftEntries: number;
  completedEntries: number;
  favoriteEntries: number;
  linkedPlaces: number;
  linkedDays: number;
  totalPhotoReferences: number;
  firstEntryDate?: string;
  mostRecentEntryDate?: string;
};

export type TripStory = {
  tripDraftId: string;
  title: string;
  dateRange?: {
    startDate?: string;
    endDate?: string;
  };
  entries: TripStoryEntry[];
  favoriteEntries: TripStoryEntry[];
  summary: TripJournalSummary;
  totalEntries: number;
  completedEntries: number;
  draftEntries: number;
  totalPhotoReferences: number;
};

export type TripDraftPhotoReferences = {
  placePhotoIds: Set<string>;
  journalPhotoIds: Set<string>;
  allPhotoIds: Set<string>;
};
