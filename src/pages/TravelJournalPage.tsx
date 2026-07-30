import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  BookOpen,
  Camera,
  CheckCircle2,
  Edit3,
  Heart,
  Lock,
  PenLine,
  Search,
  Sparkles,
  Trash2,
  X
} from "lucide-react";
import { BackButton } from "../components/BackButton";
import { TripPhotoPicker } from "../components/tripDrafts/TripPhotoPicker";
import { useTripPhotoObjectUrl } from "../hooks/useTripPhotoObjectUrl";
import { useLanguage } from "../LanguageContext";
import { prepareTripPhotoFile } from "../lib/prepareTripPhoto";
import { saveTripPhoto, PHOTO_MAX_SELECTION_COUNT } from "../lib/tripPhotoStorage";
import {
  deriveTripStory,
  normalizeJournalBody,
  searchTripJournalEntries,
  TRIP_JOURNAL_BODY_MAX_LENGTH,
  TRIP_JOURNAL_PHOTO_LIMIT,
  TRIP_JOURNAL_TITLE_MAX_LENGTH
} from "../lib/tripJournal";
import type { TripJournalEntryStatus, TripJournalMood, TripStory, TripStoryEntry } from "../lib/tripJournalTypes";
import { normalizeTripPlaceVisitStatus, type TripDraft, type TripDraftPlaceReference } from "../lib/tripDrafts";
import { useTripDrafts } from "../hooks/useTripDrafts";

type Props = {
  onBack: () => void;
};

type JournalMode =
  | { type: "home" }
  | { type: "story"; tripDraftId: string };

type EditorState = {
  tripDraftId: string;
  entryId?: string;
  title: string;
  body: string;
  entryDate: string;
  itineraryDayId: string;
  placeReferenceId: string;
  photoIds: string[];
  mood: TripJournalMood | "";
  favorite: boolean;
  status: TripJournalEntryStatus;
  newFiles: File[];
  deleteConfirm: boolean;
};

type JournalFilter = "all" | "favorites" | "draft" | "complete" | "withPhotos" | "withoutPhotos";

type JournalEntryItem = {
  story: TripStory;
  entry: TripStoryEntry;
};

const MOODS: Array<{ id: TripJournalMood; icon: string }> = [
  { id: "joyful", icon: "😊" },
  { id: "peaceful", icon: "🌿" },
  { id: "excited", icon: "✈️" },
  { id: "grateful", icon: "❤️" },
  { id: "reflective", icon: "🌙" },
  { id: "surprised", icon: "✨" },
  { id: "tired", icon: "☕" },
  { id: "challenging", icon: "💪" }
];

export function TravelJournalPage({ onBack }: Props) {
  const { language, t } = useLanguage();
  const {
    drafts,
    addJournalEntry,
    updateJournalEntry,
    deleteJournalEntry,
    toggleJournalEntryFavorite,
    addPlacePhotoIds,
    attachPhotoToJournalEntry,
    undoLastMutation,
    undoState
  } = useTripDrafts([]);
  const [mode, setMode] = useState<JournalMode>({ type: "home" });
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<JournalFilter>("all");
  const [tripFilter, setTripFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [moodFilter, setMoodFilter] = useState<TripJournalMood | "">("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const labels = t as Record<string, string>;
  const translate = (key: string) => labels[key] || key;
  const formatNumber = useMemo(() => numberFormatter(language), [language]);
  const stories = useMemo(() => drafts.map((draft) => deriveTripStory({ tripDraft: draft, unavailablePlaceLabel: translate("travelJournal.placeUnavailable") })), [drafts, labels]);
  const storiesWithEntries = stories.filter((story) => story.totalEntries > 0);
  const allEntries = stories.flatMap((story) => story.entries.map((entry) => ({ story, entry })));
  const years = useMemo(() => Array.from(new Set<string>(allEntries.flatMap((item) => item.entry.entryDate ? [item.entry.entryDate.slice(0, 4)] : []))).sort((a, b) => b.localeCompare(a)), [allEntries]);
  const searchedEntries = searchEntryItems(allEntries, query);
  const filteredEntries = applyEntryFilters(searchedEntries, filter, tripFilter, yearFilter, moodFilter);
  const selectedStory = mode.type === "story" ? stories.find((story) => story.tripDraftId === mode.tripDraftId) : null;
  const summary = {
    totalEntries: allEntries.length,
    favorites: allEntries.filter((item) => item.entry.favorite).length,
    trips: storiesWithEntries.length,
    photos: allEntries.reduce((sum, item) => sum + item.entry.photoIds.length, 0),
    complete: allEntries.filter((item) => item.entry.status === "complete").length,
    draft: allEntries.filter((item) => item.entry.status === "draft").length
  };

  async function saveEditor(event: FormEvent) {
    event.preventDefault();
    if (!editor) return;
    const body = normalizeJournalBody(editor.body);
    if (!body) {
      setError(translate("travelJournal.errors.bodyRequired"));
      return;
    }
    const input = {
      title: editor.title || undefined,
      body,
      entryDate: editor.entryDate || undefined,
      itineraryDayId: editor.itineraryDayId || undefined,
      placeReferenceId: editor.placeReferenceId || undefined,
      photoIds: editor.photoIds,
      mood: editor.mood || undefined,
      favorite: editor.favorite,
      status: editor.status
    };
    const result = editor.entryId
      ? updateJournalEntry(editor.tripDraftId, { entryId: editor.entryId, ...input })
      : addJournalEntry(editor.tripDraftId, input);
    if (!result.ok || !result.value) {
      setError(translateJournalError(result.error, translate));
      return;
    }
    const entryId = editor.entryId || ("entry" in result.value ? String(result.value.entry.id) : "");
    const uploaded = await attachNewFiles(editor.tripDraftId, entryId, editor.placeReferenceId, editor.newFiles);
    if (!uploaded) return;
    setEditor(null);
    setError("");
    setMessage(translate("travelJournal.saved"));
  }

  async function attachNewFiles(tripDraftId: string, entryId: string, placeReferenceId: string, files: File[]) {
    if (files.length === 0) return true;
    if (!placeReferenceId) {
      setError(translate("travelJournal.errors.newPhotoNeedsPlace"));
      return false;
    }
    const filesToProcess = files.slice(0, Math.min(PHOTO_MAX_SELECTION_COUNT, TRIP_JOURNAL_PHOTO_LIMIT));
    const storedIds: string[] = [];
    for (const file of filesToProcess) {
      const prepared = await prepareTripPhotoFile({ file, tripDraftId, placeReferenceId });
      if (prepared.ok === false) continue;
      const saved = await saveTripPhoto(prepared.value);
      if (saved.ok === true) storedIds.push(prepared.value.id);
    }
    if (storedIds.length === 0) {
      setError(translate("tripDrafts.photos.errors.addFailed"));
      return false;
    }
    const placeResult = addPlacePhotoIds(tripDraftId, { logicalPlaceId: placeReferenceId, photoIds: storedIds });
    if (!placeResult.ok || !placeResult.value) {
      setError(translateJournalError(placeResult.error, translate));
      return false;
    }
    for (const photoId of storedIds) {
      attachPhotoToJournalEntry(tripDraftId, entryId, photoId);
    }
    return true;
  }

  function closeEditor() {
    if (!editor) return;
    if ((editor.title || editor.body || editor.newFiles.length > 0) && !window.confirm(translate("travelJournal.unsavedConfirm"))) return;
    setEditor(null);
  }

  function openNewEditor(tripDraftId?: string) {
    const draft = tripDraftId ? drafts.find((item) => item.id === tripDraftId) : drafts[0];
    if (!draft) return;
    setEditor({
      tripDraftId: draft.id,
      title: "",
      body: "",
      entryDate: "",
      itineraryDayId: "",
      placeReferenceId: "",
      photoIds: [],
      mood: "",
      favorite: false,
      status: "draft",
      newFiles: [],
      deleteConfirm: false
    });
  }

  function openEditEditor(story: TripStory, entry: TripStoryEntry) {
    setEditor({
      tripDraftId: story.tripDraftId,
      entryId: entry.id,
      title: entry.title || "",
      body: entry.body,
      entryDate: entry.entryDate || "",
      itineraryDayId: entry.itineraryDayId || "",
      placeReferenceId: entry.placeReferenceId || "",
      photoIds: entry.photoIds,
      mood: entry.mood || "",
      favorite: entry.favorite,
      status: entry.status,
      newFiles: [],
      deleteConfirm: false
    });
  }

  function confirmDeleteEditor() {
    if (!editor?.entryId) return;
    const result = deleteJournalEntry(editor.tripDraftId, editor.entryId);
    if (!result.ok) {
      setError(translateJournalError(result.error, translate));
      return;
    }
    setEditor(null);
    setMessage(translate("travelJournal.deleted"));
  }

  const pageContent = selectedStory ? (
    <TripStoryView
      story={selectedStory}
      draft={drafts.find((draft) => draft.id === selectedStory.tripDraftId)}
      formatNumber={formatNumber}
      language={language}
      onBack={() => setMode({ type: "home" })}
      onEdit={(entry) => openEditEditor(selectedStory, entry)}
      onNew={() => openNewEditor(selectedStory.tripDraftId)}
      onToggleFavorite={(entryId) => toggleJournalEntryFavorite(selectedStory.tripDraftId, entryId)}
      translate={translate}
    />
  ) : (
    <>
      <section className="travel-journal-hero">
        <div>
          <p className="journal-private-badge"><Lock size={15} aria-hidden="true" /> {translate("travelJournal.private")}</p>
          <h1>{translate("travelJournal.title")}</h1>
          <p>{translate("travelJournal.subtitle")}</p>
        </div>
        <div className="travel-journal-hero__metrics">
          <span><strong>{formatNumber(summary.totalEntries)}</strong>{translate("travelJournal.totalEntries")}</span>
          <span><strong>{formatNumber(summary.favorites)}</strong>{translate("travelJournal.favoriteMoments")}</span>
          <span><strong>{formatNumber(summary.photos)}</strong>{translate("travelJournal.photosAttached")}</span>
        </div>
      </section>
      <section className="journal-summary-grid" aria-label={translate("travelJournal.summary")}>
        <SummaryCard icon={<BookOpen size={19} />} label={translate("travelJournal.totalEntries")} value={summary.totalEntries} formatNumber={formatNumber} />
        <SummaryCard icon={<Heart size={19} />} label={translate("travelJournal.favoriteMoments")} value={summary.favorites} formatNumber={formatNumber} />
        <SummaryCard icon={<PenLine size={19} />} label={translate("travelJournal.tripsWithJournals")} value={summary.trips} formatNumber={formatNumber} />
        <SummaryCard icon={<Camera size={19} />} label={translate("travelJournal.photosAttached")} value={summary.photos} formatNumber={formatNumber} />
        <SummaryCard icon={<CheckCircle2 size={19} />} label={translate("travelJournal.completedEntries")} value={summary.complete} formatNumber={formatNumber} />
        <SummaryCard icon={<Edit3 size={19} />} label={translate("travelJournal.draftEntries")} value={summary.draft} formatNumber={formatNumber} />
      </section>
      <section className="journal-quick-actions">
        <button className="primary-btn" type="button" onClick={() => openNewEditor()} disabled={drafts.length === 0}>{translate("travelJournal.newEntry")}</button>
        <button className="secondary-btn" type="button" onClick={() => setFilter("favorites")}>{translate("travelJournal.favoriteMoments")}</button>
        <button className="secondary-btn" type="button" onClick={() => document.getElementById("journal-search")?.focus()}>{translate("travelJournal.searchJournal")}</button>
      </section>
      {storiesWithEntries.length > 0 && (
        <section className="journal-story-list" aria-labelledby="journal-stories-title">
          <h2 id="journal-stories-title">{translate("travelJournal.tripStories")}</h2>
          <div className="journal-story-grid">
            {storiesWithEntries.map((story) => (
              <button className="journal-story-card" key={story.tripDraftId} type="button" onClick={() => setMode({ type: "story", tripDraftId: story.tripDraftId })}>
                <span><BookOpen size={18} aria-hidden="true" /> {story.summary.completedEntries > 0 ? translate("travelJournal.complete") : translate("travelJournal.draft")}</span>
                <strong>{story.title}</strong>
                <small>{formatDateRange(story.dateRange?.startDate, story.dateRange?.endDate, language, translate)}</small>
                <em>{formatNumber(story.totalEntries)} {translate("travelJournal.entries")} · {formatNumber(story.summary.favoriteEntries)} {translate("travelJournal.favorites")} · {formatNumber(story.totalPhotoReferences)} {translate("travelJournal.photos")}</em>
              </button>
            ))}
          </div>
        </section>
      )}
      <JournalSearchAndFilters
        query={query}
        setQuery={setQuery}
        filter={filter}
        setFilter={setFilter}
        tripFilter={tripFilter}
        setTripFilter={setTripFilter}
        yearFilter={yearFilter}
        setYearFilter={setYearFilter}
        moodFilter={moodFilter}
        setMoodFilter={setMoodFilter}
        stories={storiesWithEntries}
        years={years}
        translate={translate}
      />
      <EntryList
        entries={filteredEntries}
        formatNumber={formatNumber}
        language={language}
        onEdit={(story, entry) => openEditEditor(story, entry)}
        translate={translate}
      />
      {allEntries.length === 0 && <JournalEmptyState draftsExist={drafts.length > 0} onNew={() => openNewEditor()} translate={translate} />}
    </>
  );

  return (
    <div className="travel-journal-page" dir={language === "ar" ? "rtl" : "ltr"}>
      <header className="travel-journal-page__topbar">
        <BackButton onBack={mode.type === "story" ? () => setMode({ type: "home" }) : onBack} />
        <span><BookOpen size={18} aria-hidden="true" /> {translate("travelJournal.title")}</span>
      </header>
      {error && <div className="route-status error">{error}</div>}
      {message && <div className="route-status">{message} {undoState.available && <button className="text-link-btn" type="button" onClick={() => undoLastMutation()}>{translate("tripDrafts.undo.action")}</button>}</div>}
      {pageContent}
      {editor && (
        <JournalEditorModal
          drafts={drafts}
          editor={editor}
          setEditor={setEditor}
          onClose={closeEditor}
          onDelete={confirmDeleteEditor}
          onSave={saveEditor}
          translate={translate}
          language={language}
        />
      )}
    </div>
  );
}

function TripStoryView({ story, draft, formatNumber, language, onBack, onEdit, onNew, onToggleFavorite, translate }: {
  story: TripStory;
  draft?: TripDraft;
  formatNumber: (value: number) => string;
  language: string;
  onBack: () => void;
  onEdit: (entry: TripStoryEntry) => void;
  onNew: () => void;
  onToggleFavorite: (entryId: string) => void;
  translate: (key: string) => string;
}) {
  const favoriteEntries = story.favoriteEntries;
  return (
    <div className="journal-story-view">
      <section className="journal-story-hero">
        <button className="secondary-btn" type="button" onClick={onBack}>{translate("back")}</button>
        <div>
          <h1>{story.title}</h1>
          <p>{formatDateRange(story.dateRange?.startDate, story.dateRange?.endDate, language, translate)}</p>
        </div>
        <button className="primary-btn" type="button" onClick={onNew}>{translate("travelJournal.newEntry")}</button>
      </section>
      <section className="journal-summary-grid" aria-label={translate("travelJournal.storySummary")}>
        <SummaryCard icon={<BookOpen size={19} />} label={translate("travelJournal.totalEntries")} value={story.totalEntries} formatNumber={formatNumber} />
        <SummaryCard icon={<Heart size={19} />} label={translate("travelJournal.favoriteMoments")} value={story.summary.favoriteEntries} formatNumber={formatNumber} />
        <SummaryCard icon={<Camera size={19} />} label={translate("travelJournal.photosAttached")} value={story.totalPhotoReferences} formatNumber={formatNumber} />
      </section>
      {favoriteEntries.length > 0 && (
        <section className="journal-favorites">
          <h2>{translate("travelJournal.favoriteMoments")}</h2>
          <EntryList entries={favoriteEntries.map((entry) => ({ story, entry }))} formatNumber={formatNumber} language={language} onEdit={(_, entry) => onEdit(entry)} translate={translate} compact />
        </section>
      )}
      <section className="journal-timeline" aria-labelledby="journal-timeline-title">
        <h2 id="journal-timeline-title">{translate("travelJournal.timeline")}</h2>
        <ol>
          {story.entries.map((entry) => (
            <li key={entry.id}>
              <article className="journal-entry-card">
                <span className="journal-timeline-marker" aria-hidden="true" />
                <div className="journal-entry-card__body">
                  <EntryHeader entry={entry} language={language} translate={translate} />
                  <p dir="auto" className="journal-entry-text">{entry.body}</p>
                  <EntryMeta entry={entry} formatNumber={formatNumber} translate={translate} />
                  <JournalPhotoStrip photoIds={entry.photoIds} translate={translate} />
                  <div className="journal-entry-actions">
                    <button type="button" className="secondary-btn" onClick={() => onToggleFavorite(entry.id)}><Heart size={16} aria-hidden="true" /> {translate("travelJournal.favoriteMoment")}</button>
                    <button type="button" className="secondary-btn" onClick={() => onEdit(entry)}><Edit3 size={16} aria-hidden="true" /> {translate("travelJournal.edit")}</button>
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ol>
        {story.entries.length === 0 && <JournalEmptyState draftsExist={Boolean(draft)} onNew={onNew} translate={translate} />}
      </section>
    </div>
  );
}

function JournalEditorModal({ drafts, editor, setEditor, onClose, onDelete, onSave, translate, language }: {
  drafts: TripDraft[];
  editor: EditorState;
  setEditor: (editor: EditorState) => void;
  onClose: () => void;
  onDelete: () => void;
  onSave: (event: FormEvent) => void;
  translate: (key: string) => string;
  language: string;
}) {
  const draft = drafts.find((item) => item.id === editor.tripDraftId);
  const visitedPlaces = draft?.placeReferences.filter((reference) => normalizeTripPlaceVisitStatus(reference.visitStatus) === "visited") || [];
  const availablePhotos = collectAvailableMemoryPhotos(draft);
  return (
    <div className="journal-editor-backdrop" role="presentation">
      <form className="journal-editor-dialog" role="dialog" aria-modal="true" aria-labelledby="journal-editor-title" onSubmit={onSave}>
        <div className="journal-editor-header">
          <h2 id="journal-editor-title">{editor.entryId ? translate("travelJournal.editEntry") : translate("travelJournal.newEntry")}</h2>
          <button type="button" className="secondary-btn" onClick={onClose} aria-label={translate("travelJournal.close")}><X size={18} /></button>
        </div>
        <label>
          {translate("travelJournal.trip")}
          <select value={editor.tripDraftId} onChange={(event) => setEditor({ ...editor, tripDraftId: event.target.value, itineraryDayId: "", placeReferenceId: "", photoIds: [] })}>
            {drafts.map((draft) => <option key={draft.id} value={draft.id}>{draft.name}</option>)}
          </select>
        </label>
        <label>
          {translate("travelJournal.titleField")}
          <input value={editor.title} maxLength={TRIP_JOURNAL_TITLE_MAX_LENGTH} onChange={(event) => setEditor({ ...editor, title: event.target.value })} />
        </label>
        <label>
          {translate("travelJournal.bodyField")}
          <textarea dir="auto" value={editor.body} maxLength={TRIP_JOURNAL_BODY_MAX_LENGTH} rows={8} onChange={(event) => setEditor({ ...editor, body: event.target.value })} />
          <small>{editor.body.length} / {TRIP_JOURNAL_BODY_MAX_LENGTH}</small>
        </label>
        <div className="journal-editor-grid">
          <label>
            {translate("travelJournal.travelDate")}
            <input type="date" value={editor.entryDate} onChange={(event) => setEditor({ ...editor, entryDate: event.target.value })} />
          </label>
          <label>
            {translate("travelJournal.linkedDay")}
            <select value={editor.itineraryDayId} onChange={(event) => setEditor({ ...editor, itineraryDayId: event.target.value })}>
              <option value="">{translate("travelJournal.none")}</option>
              {(draft?.itineraryDays || []).map((day) => <option key={day.id} value={day.id}>{translate("travelJournal.dayNumber").replace("{number}", String(day.order + 1))}: {day.title}</option>)}
            </select>
          </label>
          <label>
            {translate("travelJournal.linkedPlace")}
            <select value={editor.placeReferenceId} onChange={(event) => setEditor({ ...editor, placeReferenceId: event.target.value })}>
              <option value="">{translate("travelJournal.none")}</option>
              {visitedPlaces.map((reference) => <option key={reference.logicalPlaceId} value={reference.logicalPlaceId}>{placeLabel(reference, translate)}</option>)}
            </select>
          </label>
          <label>
            {translate("travelJournal.status")}
            <select value={editor.status} onChange={(event) => setEditor({ ...editor, status: event.target.value as TripJournalEntryStatus })}>
              <option value="draft">{translate("travelJournal.draft")}</option>
              <option value="complete">{translate("travelJournal.complete")}</option>
            </select>
          </label>
        </div>
        <fieldset className="journal-mood-picker">
          <legend>{translate("travelJournal.mood")}</legend>
          <button type="button" className={!editor.mood ? "active" : ""} onClick={() => setEditor({ ...editor, mood: "" })}>{translate("travelJournal.none")}</button>
          {MOODS.map((mood) => (
            <button key={mood.id} type="button" className={editor.mood === mood.id ? "active" : ""} onClick={() => setEditor({ ...editor, mood: mood.id })}>
              <span aria-hidden="true">{mood.icon}</span> {translate(`travelJournal.moods.${mood.id}`)}
            </button>
          ))}
        </fieldset>
        <label className="journal-favorite-toggle">
          <input type="checkbox" checked={editor.favorite} onChange={(event) => setEditor({ ...editor, favorite: event.target.checked })} />
          {translate("travelJournal.favoriteMoment")}
        </label>
        <section className="journal-photo-picker" aria-labelledby="journal-photo-picker-title">
          <h3 id="journal-photo-picker-title">{translate("travelJournal.photos")}</h3>
          {availablePhotos.length > 0 && (
            <div className="journal-memory-picker">
              {availablePhotos.map((photo) => {
                const selected = editor.photoIds.includes(photo.photoId);
                return (
                  <button key={photo.photoId} type="button" className={selected ? "selected" : ""} onClick={() => setEditor({ ...editor, photoIds: togglePhotoId(editor.photoIds, photo.photoId) })}>
                    <JournalPhotoThumb photoId={photo.photoId} label={photo.placeLabel} />
                    <span>{photo.placeLabel}</span>
                  </button>
                );
              })}
            </div>
          )}
          <TripPhotoPicker
            disabled={!editor.placeReferenceId}
            language={language}
            onSelectFiles={(files) => setEditor({ ...editor, newFiles: [...editor.newFiles, ...files].slice(0, TRIP_JOURNAL_PHOTO_LIMIT) })}
            translate={translate}
          />
          {!editor.placeReferenceId && <small>{translate("travelJournal.newPhotoNeedsPlace")}</small>}
        </section>
        <div className="journal-editor-actions">
          {editor.entryId && (
            editor.deleteConfirm ? (
              <span className="journal-delete-confirm">
                {translate("travelJournal.deleteConfirm")}
                <button type="button" className="secondary-btn danger" onClick={onDelete}>{translate("travelJournal.delete")}</button>
              </span>
            ) : (
              <button type="button" className="secondary-btn danger" onClick={() => setEditor({ ...editor, deleteConfirm: true })}><Trash2 size={16} /> {translate("travelJournal.delete")}</button>
            )
          )}
          <button type="button" className="secondary-btn" onClick={onClose}>{translate("tripDrafts.cancel")}</button>
          <button type="submit" className="primary-btn">{translate("travelJournal.save")}</button>
        </div>
      </form>
    </div>
  );
}

function SummaryCard({ icon, label, value, formatNumber }: { icon: ReactNode; label: string; value: number; formatNumber: (value: number) => string }) {
  return <article className="journal-summary-card">{icon}<strong>{formatNumber(value)}</strong><span>{label}</span></article>;
}

function JournalSearchAndFilters({
  query,
  setQuery,
  filter,
  setFilter,
  tripFilter,
  setTripFilter,
  yearFilter,
  setYearFilter,
  moodFilter,
  setMoodFilter,
  stories,
  years,
  translate
}: {
  query: string;
  setQuery: (value: string) => void;
  filter: JournalFilter;
  setFilter: (value: JournalFilter) => void;
  tripFilter: string;
  setTripFilter: (value: string) => void;
  yearFilter: string;
  setYearFilter: (value: string) => void;
  moodFilter: TripJournalMood | "";
  setMoodFilter: (value: TripJournalMood | "") => void;
  stories: TripStory[];
  years: string[];
  translate: (key: string) => string;
}) {
  const filters: JournalFilter[] = ["all", "favorites", "draft", "complete", "withPhotos", "withoutPhotos"];
  return (
    <section className="journal-search-panel" aria-label={translate("travelJournal.searchJournal")}>
      <label>
        <Search size={16} aria-hidden="true" /> {translate("travelJournal.searchJournal")}
        <input id="journal-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={translate("travelJournal.searchPlaceholder")} />
      </label>
      <div className="journal-filter-row">
        {filters.map((item) => <button key={item} type="button" className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{translate(`travelJournal.filters.${item}`)}</button>)}
      </div>
      <div className="journal-filter-selects">
        <label>
          {translate("travelJournal.tripFilter")}
          <select value={tripFilter} onChange={(event) => setTripFilter(event.target.value)}>
            <option value="">{translate("travelJournal.allTrips")}</option>
            {stories.map((story) => <option key={story.tripDraftId} value={story.tripDraftId}>{story.title}</option>)}
          </select>
        </label>
        <label>
          {translate("travelJournal.yearFilter")}
          <select value={yearFilter} onChange={(event) => setYearFilter(event.target.value)}>
            <option value="">{translate("travelJournal.allYears")}</option>
            {years.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </label>
        <label>
          {translate("travelJournal.moodFilter")}
          <select value={moodFilter} onChange={(event) => setMoodFilter(event.target.value as TripJournalMood | "")}>
            <option value="">{translate("travelJournal.allMoods")}</option>
            {MOODS.map((mood) => <option key={mood.id} value={mood.id}>{translate(`travelJournal.moods.${mood.id}`)}</option>)}
          </select>
        </label>
      </div>
    </section>
  );
}

function EntryList({ entries, formatNumber, language, onEdit, translate, compact = false }: { entries: JournalEntryItem[]; formatNumber: (value: number) => string; language: string; onEdit: (story: TripStory, entry: TripStoryEntry) => void; translate: (key: string) => string; compact?: boolean }) {
  if (entries.length === 0) return <p className="journal-empty-inline">{translate("travelJournal.noSearchResults")}</p>;
  return (
    <section className={compact ? "journal-entry-list compact" : "journal-entry-list"} aria-labelledby={compact ? undefined : "journal-recent-title"}>
      {!compact && <h2 id="journal-recent-title">{translate("travelJournal.recentEntries")}</h2>}
      <ul>
        {entries.slice(0, compact ? 4 : 12).map(({ story, entry }) => {
          return (
            <li key={`${story.tripDraftId}:${entry.id}`}>
              <article className="journal-entry-card">
                <div className="journal-entry-card__body">
                  <EntryHeader entry={entry} language={language} translate={translate} />
                  <small>{story.title}</small>
                  <p dir="auto" className="journal-entry-text">{entry.body}</p>
                  <EntryMeta entry={entry} formatNumber={formatNumber} translate={translate} />
                  <JournalPhotoStrip photoIds={entry.photoIds} translate={translate} />
                  <button type="button" className="secondary-btn" onClick={() => onEdit(story, entry)}><Edit3 size={16} aria-hidden="true" /> {translate("travelJournal.edit")}</button>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function EntryHeader({ entry, language, translate }: { entry: TripStoryEntry; language: string; translate: (key: string) => string }) {
  return (
    <header className="journal-entry-header">
      <div>
        <h3 dir="auto">{entry.title || translate("travelJournal.entryFallback")}</h3>
        <p>{entry.entryDate ? formatDate(entry.entryDate, language) : translate("travelJournal.unscheduled")}</p>
      </div>
      <span>{entry.favorite ? <Heart size={16} aria-label={translate("travelJournal.favoriteMoment")} /> : null}</span>
    </header>
  );
}

function EntryMeta({ entry, formatNumber, translate }: { entry: TripStoryEntry; formatNumber: (value: number) => string; translate: (key: string) => string }) {
  return (
    <div className="journal-entry-meta">
      {entry.mood && <span>{translate(`travelJournal.moods.${entry.mood}`)}</span>}
      <span>{translate(`travelJournal.${entry.status}`)}</span>
      {entry.itineraryDayLabel && <span>{entry.itineraryDayLabel}</span>}
      {entry.placeName && <span>{entry.placeName}</span>}
      {entry.photoIds.length > 0 && <span>{formatNumber(entry.photoIds.length)} {translate("travelJournal.photos")}</span>}
    </div>
  );
}

function JournalPhotoStrip({ photoIds, translate }: { photoIds: readonly string[]; translate: (key: string) => string }) {
  if (photoIds.length === 0) return null;
  return <div className="journal-photo-strip">{photoIds.slice(0, 6).map((photoId) => <span key={photoId}><JournalPhotoThumb photoId={photoId} label={translate("travelJournal.photoMemory")} /></span>)}</div>;
}

function JournalPhotoThumb({ photoId, label }: { photoId: string; label: string }) {
  const photo = useTripPhotoObjectUrl(photoId, "thumbnail");
  return photo.status === "loaded" ? <img src={photo.url} alt={label} /> : <span>{label}</span>;
}

function JournalEmptyState({ draftsExist, onNew, translate }: { draftsExist: boolean; onNew: () => void; translate: (key: string) => string }) {
  return (
    <section className="journal-empty-state">
      <Sparkles size={34} aria-hidden="true" />
      <h2>{translate("travelJournal.emptyTitle")}</h2>
      <p>{translate("travelJournal.emptyDescription")}</p>
      {draftsExist && <button className="primary-btn" type="button" onClick={onNew}>{translate("travelJournal.newEntry")}</button>}
      <small>{translate("travelJournal.privacyNote")}</small>
    </section>
  );
}

function searchEntryItems(items: JournalEntryItem[], query: string) {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return items;
  return items.filter((item) => {
    if (item.story.title.toLocaleLowerCase().includes(normalized)) return true;
    return searchTripJournalEntries([item.entry], query).length > 0;
  });
}

function applyEntryFilters(entries: JournalEntryItem[], filter: JournalFilter, tripFilter: string, yearFilter: string, moodFilter: TripJournalMood | "") {
  return entries.filter((item) => {
    if (filter === "favorites" && !item.entry.favorite) return false;
    if (filter === "draft" && item.entry.status !== "draft") return false;
    if (filter === "complete" && item.entry.status !== "complete") return false;
    if (filter === "withPhotos" && item.entry.photoIds.length === 0) return false;
    if (filter === "withoutPhotos" && item.entry.photoIds.length > 0) return false;
    if (tripFilter && item.story.tripDraftId !== tripFilter) return false;
    if (yearFilter && item.entry.entryDate?.slice(0, 4) !== yearFilter) return false;
    if (moodFilter && item.entry.mood !== moodFilter) return false;
    return true;
  });
}

function collectAvailableMemoryPhotos(draft: TripDraft | undefined) {
  const seen = new Set<string>();
  return (draft?.placeReferences || []).flatMap((reference) => normalizeTripPlaceVisitStatus(reference.visitStatus) === "visited"
    ? (reference.photoIds || []).flatMap((photoId) => {
        if (seen.has(photoId)) return [];
        seen.add(photoId);
        return [{ photoId, placeLabel: placeLabel(reference, (key) => key) }];
      })
    : []);
}

function togglePhotoId(photoIds: string[], photoId: string) {
  if (photoIds.includes(photoId)) return photoIds.filter((id) => id !== photoId);
  return [...photoIds, photoId].slice(0, TRIP_JOURNAL_PHOTO_LIMIT);
}

function placeLabel(reference: TripDraftPlaceReference, translate: (key: string) => string) {
  return reference.persistedReferences[0]?.itemType || translate("travelJournal.placeUnavailable");
}

function translateJournalError(error: string | undefined, translate: (key: string) => string) {
  if (error === "journal_photo_limit") return translate("travelJournal.errors.photoLimit");
  if (error === "journal_entry_not_found") return translate("travelJournal.errors.entryNotFound");
  if (error === "storage_write_failed") return translate("travelJournal.errors.saveFailed");
  return translate("travelJournal.errors.invalidEntry");
}

function numberFormatter(language: string) {
  try {
    const formatter = new Intl.NumberFormat(localeForLanguage(language));
    return (value: number) => formatter.format(Math.max(0, Math.floor(value)));
  } catch {
    return (value: number) => String(Math.max(0, Math.floor(value)));
  }
}

function formatDate(value: string, language: string) {
  try {
    const [year, month, day] = value.split("-").map(Number);
    return new Intl.DateTimeFormat(localeForLanguage(language), { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" }).format(new Date(Date.UTC(year, month - 1, day)));
  } catch {
    return "";
  }
}

function formatDateRange(startDate: string | undefined, endDate: string | undefined, language: string, translate: (key: string) => string) {
  if (startDate && endDate) return `${formatDate(startDate, language)} - ${formatDate(endDate, language)}`;
  if (startDate) return formatDate(startDate, language);
  if (endDate) return formatDate(endDate, language);
  return translate("travelJournal.dateUnavailable");
}

function localeForLanguage(language: string) {
  if (language === "es") return "es-ES";
  if (language === "fr") return "fr-FR";
  if (language === "ar") return "ar-MA";
  if (language === "pt") return "pt-PT";
  return "en-US";
}
