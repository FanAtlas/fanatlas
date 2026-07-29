import { useId, useState } from "react";
import {
  calculatePlanningActionProgress,
  type PlanningAction
} from "../../lib/tripDrafts";
import { PlanningActionEditor, formatPlanningActionNumber } from "./PlanningActionEditor";
import type { TripPlannerTranslate } from "./types";

type EditorState =
  | { mode: "none" }
  | { mode: "add" }
  | { mode: "edit"; actionId: string; expectedText: string };

export function PlanningActionList({
  actions,
  heading,
  language,
  onAdd,
  onRemove,
  onToggle,
  onUpdate,
  translate
}: {
  actions: readonly PlanningAction[];
  heading: string;
  language: string;
  onAdd: (text: string) => boolean;
  onRemove: (actionId: string) => boolean;
  onToggle: (actionId: string) => boolean;
  onUpdate: (actionId: string, expectedCurrentText: string, text: string) => boolean;
  translate: TripPlannerTranslate;
}) {
  const sectionId = useId();
  const [editor, setEditor] = useState<EditorState>({ mode: "none" });
  const progress = calculatePlanningActionProgress(actions);
  const summary = progress.total === 0
    ? translate("tripDrafts.planningActions.empty")
    : translate("tripDrafts.planningActions.progress")
        .replace("{completed}", formatPlanningActionNumber(progress.completed, language))
        .replace("{total}", formatPlanningActionNumber(progress.total, language));

  return (
    <section className="planning-actions" aria-labelledby={sectionId}>
      <div className="planning-actions__header">
        <div>
          <h3 id={sectionId}>{heading}</h3>
          <p className="planning-actions__summary">{summary}</p>
        </div>
        {editor.mode !== "add" && (
          <button className="secondary-btn planning-actions__add" onClick={() => setEditor({ mode: "add" })} type="button">
            {translate("tripDrafts.planningActions.add")}
          </button>
        )}
      </div>

      {editor.mode === "add" && (
        <PlanningActionEditor
          initialText=""
          language={language}
          onCancel={() => setEditor({ mode: "none" })}
          onSave={(text) => {
            const saved = onAdd(text);
            if (saved) setEditor({ mode: "none" });
            return saved;
          }}
          translate={translate}
        />
      )}

      {actions.length > 0 && (
        <ul className="planning-actions__list">
          {actions.map((action, index) => {
            const checkboxId = `${sectionId}-action-${index}`;
            const textId = `${checkboxId}-text`;
            const isEditing = editor.mode === "edit" && editor.actionId === action.id;
            return (
              <li className="planning-actions__item" key={action.id}>
                {isEditing ? (
                  <PlanningActionEditor
                    initialText={action.text}
                    language={language}
                    onCancel={() => setEditor({ mode: "none" })}
                    onSave={(text) => {
                      const saved = onUpdate(action.id, editor.expectedText, text);
                      if (saved) setEditor({ mode: "none" });
                      return saved;
                    }}
                    translate={translate}
                  />
                ) : (
                  <>
                    <div className="planning-actions__main">
                      <input
                        checked={action.completed}
                        className="planning-actions__checkbox"
                        id={checkboxId}
                        onChange={() => onToggle(action.id)}
                        type="checkbox"
                      />
                      <label
                        className={action.completed ? "planning-actions__text planning-actions__text--completed" : "planning-actions__text"}
                        htmlFor={checkboxId}
                        id={textId}
                      >
                        {action.text}
                      </label>
                    </div>
                    <div className="planning-actions__item-controls">
                      <button
                        aria-describedby={textId}
                        className="secondary-btn"
                        onClick={() => setEditor({ mode: "edit", actionId: action.id, expectedText: action.text })}
                        type="button"
                      >
                        {translate("tripDrafts.planningActions.edit")}
                      </button>
                      <button
                        aria-describedby={textId}
                        className="secondary-btn planning-actions__remove"
                        onClick={() => {
                          if (onRemove(action.id)) setEditor({ mode: "none" });
                        }}
                        type="button"
                      >
                        {translate("tripDrafts.planningActions.remove")}
                      </button>
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
