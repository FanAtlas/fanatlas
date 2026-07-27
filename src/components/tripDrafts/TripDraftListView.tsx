import { Plus, Route } from "lucide-react";
import type { HydratedTripDraft, TripDraft } from "../../lib/tripDrafts";
import { TripDraftCard } from "./TripDraftCard";
import type { TripPlannerTranslate } from "./types";

export function TripDraftListView({
  deleteId,
  drafts,
  editingId,
  editingName,
  isLoadingPlaces,
  language,
  newDraftName,
  onCancelDelete,
  onCancelEdit,
  onConfirmDelete,
  onCreate,
  onDeleteRequest,
  onDuplicate,
  onEditName,
  onNewNameChange,
  onOpen,
  onRename,
  onStartRename,
  onViewCollections,
  translate
}: {
  deleteId: string | null;
  drafts: HydratedTripDraft[];
  editingId: string | null;
  editingName: string;
  isLoadingPlaces: boolean;
  language: string;
  newDraftName: string;
  onCancelDelete: () => void;
  onCancelEdit: () => void;
  onConfirmDelete: (draftId: string) => void;
  onCreate: () => void;
  onDeleteRequest: (draftId: string) => void;
  onDuplicate: (draft: TripDraft) => void;
  onEditName: (name: string) => void;
  onNewNameChange: (name: string) => void;
  onOpen: (draftId: string) => void;
  onRename: (draftId: string) => void;
  onStartRename: (draft: TripDraft) => void;
  onViewCollections: () => void;
  translate: TripPlannerTranslate;
}) {
  return (
    <>
      <section className="collections-create-card">
        <div>
          <strong>{translate("tripDrafts.new")}</strong>
          <p>{translate("tripDrafts.deviceLocal")}</p>
        </div>
        <label>
          <span>{translate("tripDrafts.name")}</span>
          <input
            maxLength={100}
            onChange={(event) => onNewNameChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onCreate();
            }}
            value={newDraftName}
          />
        </label>
        <button className="primary-btn" onClick={onCreate} type="button">
          <Plus size={15} aria-hidden="true" />
          {translate("tripDrafts.create")}
        </button>
      </section>

      {drafts.length === 0 && (
        <section className="card-dark collections-empty-state">
          <Route size={28} aria-hidden="true" />
          <strong>{translate("tripDrafts.empty.title")}</strong>
          <p className="subtle">{translate("tripDrafts.empty.description")}</p>
          <button className="secondary-btn" onClick={onViewCollections} type="button">
            {translate("tripDrafts.viewCollections")}
          </button>
        </section>
      )}

      <div className="collections-grid">
        {drafts.map((draft) => (
          <div key={draft.draft.id}>
            <TripDraftCard
              deleteId={deleteId}
              draft={draft}
              editingId={editingId}
              editingName={editingName}
              isLoadingPlaces={isLoadingPlaces}
              language={language}
              onCancelDelete={onCancelDelete}
              onCancelEdit={onCancelEdit}
              onConfirmDelete={onConfirmDelete}
              onDeleteRequest={onDeleteRequest}
              onDuplicate={onDuplicate}
              onEditName={onEditName}
              onOpen={onOpen}
              onRename={onRename}
              onStartRename={onStartRename}
              translate={translate}
            />
          </div>
        ))}
      </div>
    </>
  );
}
