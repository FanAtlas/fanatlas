import { Copy, Edit3, Route, Trash2 } from "lucide-react";
import type { HydratedTripDraft, TripDraft } from "../../lib/tripDrafts";
import { getTripContextLines } from "./displayUtils";
import { DeleteTripDraftConfirm, InlineTripDraftNameEditor } from "./TripInlineControls";
import type { TripPlannerTranslate } from "./types";

export function TripDraftCard(props: {
  deleteId: string | null;
  draft: HydratedTripDraft;
  editingId: string | null;
  editingName: string;
  isLoadingPlaces: boolean;
  language: string;
  onCancelDelete: () => void;
  onCancelEdit: () => void;
  onConfirmDelete: (draftId: string) => void;
  onDeleteRequest: (draftId: string) => void;
  onDuplicate: (draft: TripDraft) => void;
  onEditName: (name: string) => void;
  onOpen: (draftId: string) => void;
  onRename: (draftId: string) => void;
  onStartRename: (draft: TripDraft) => void;
  translate: TripPlannerTranslate;
}) {
  const { draft, translate } = props;
  const item = draft.draft;
  const unavailable = props.isLoadingPlaces ? 0 : draft.counts.unavailable;
  const contextLines = getTripContextLines(draft, props.language, translate);

  return (
    <article className="collection-card">
      <div className="collection-card-main">
        <Route size={22} aria-hidden="true" />
        <div>
          {props.editingId === item.id ? (
            <InlineTripDraftNameEditor
              name={props.editingName}
              onCancel={props.onCancelEdit}
              onChange={props.onEditName}
              onSave={() => props.onRename(item.id)}
              translate={translate}
            />
          ) : (
            <>
              <strong>{item.name}</strong>
              <p>{translate("tripDrafts.draftStatus")}</p>
              {contextLines.map((line) => <p key={line}>{line}</p>)}
              {item.source?.collectionNameSnapshot && (
                <p>{translate("tripDrafts.sourceCollection").replace("{name}", item.source.collectionNameSnapshot)}</p>
              )}
            </>
          )}
        </div>
      </div>

      <div className="collection-count-row">
        <span>{draft.counts.total} {translate("tripDrafts.places")}</span>
        <span>{props.isLoadingPlaces ? translate("tripDrafts.loadingPlaces") : `${draft.counts.available} ${translate("tripDrafts.available")}`}</span>
        {unavailable > 0 && <span>{unavailable} {translate("tripDrafts.unavailable")}</span>}
      </div>

      {props.deleteId === item.id && (
        <DeleteTripDraftConfirm draft={item} onCancel={props.onCancelDelete} onConfirm={() => props.onConfirmDelete(item.id)} translate={translate} />
      )}

      <div className="collection-card-actions">
        <button className="secondary-btn" onClick={() => props.onOpen(item.id)} type="button">{translate("tripDrafts.open")}</button>
        <button className="secondary-btn" onClick={() => props.onStartRename(item)} type="button">
          <Edit3 size={14} aria-hidden="true" />
          {translate("tripDrafts.rename")}
        </button>
        <button className="secondary-btn" onClick={() => props.onDuplicate(item)} type="button">
          <Copy size={14} aria-hidden="true" />
          {translate("tripDrafts.duplicate")}
        </button>
        <button className="secondary-btn" onClick={() => props.onDeleteRequest(item.id)} type="button">
          <Trash2 size={14} aria-hidden="true" />
          {translate("tripDrafts.delete")}
        </button>
      </div>
    </article>
  );
}
