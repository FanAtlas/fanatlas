import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Bell, BookOpen, CheckCircle2, Coins, Languages, LifeBuoy, Map, Plus, ShieldAlert, Trash2 } from "lucide-react";
import { useLanguage } from "../LanguageContext";
import type { Tab } from "../main";
import { useDestinationIntelligence } from "../hooks/useDestinationIntelligence";
import { useConnectivity } from "../hooks/useConnectivity";
import { useTripDrafts } from "../hooks/useTripDrafts";
import { PlanningActionEditor } from "../components/tripDrafts/PlanningActionEditor";
import {
  deriveTravelPreparation,
  enabledTravelPreparationReminderSettings,
  reconcileTravelPreparation,
  type TravelPreparationAction,
  type TravelPreparationGroupId
} from "../lib/travelPreparation";
import type { TripDraft, TripPreparationReminderPhase } from "../lib/tripDrafts";
import { travelPreparationTranslate } from "../lib/travelPreparationI18n";
import {
  getTravelPreparationNotificationPermission,
  requestTravelPreparationNotificationPermission,
  showTravelPreparationNotification,
  type TravelPreparationNotificationPermission
} from "../lib/travelPreparationNotifications";

const REMINDER_PHASES: TripPreparationReminderPhase[] = ["week_before", "day_before", "departure_day"];

export function TravelPreparationPage({
  tripId,
  now,
  onBack,
  setTab,
  onOpenDestination
}: {
  tripId: string | null;
  now?: Date;
  onBack: () => void;
  setTab: (tab: Tab) => void;
  onOpenDestination: (destinationId: string) => void;
}) {
  const { language } = useLanguage();
  const connectivity = useConnectivity();
  const tr = useCallback((key: string) => travelPreparationTranslate(language, key), [language]);
  const editorTr = useCallback((key: string) => travelPreparationEditorTranslate(language, key), [language]);
  const intelligence = useDestinationIntelligence();
  const {
    drafts,
    addTripPlanningAction,
    updateTripPlanningAction,
    toggleTripPlanningAction,
    removeTripPlanningAction,
    updateTripPreparationReminderSettings,
    acknowledgeTripPreparationReminder,
    markTripPreparationReminderNotified
  } = useTripDrafts([]);
  const selectedTrip = useMemo(() => selectTrip(drafts, tripId), [drafts, tripId]);
  const preparation = useMemo(
    () => deriveTravelPreparation({ trip: selectedTrip, intelligence, now }),
    [intelligence, now, selectedTrip]
  );
  const reconciliation = useMemo(
    () => reconcileTravelPreparation({ existingActions: selectedTrip?.planningActions || [], suggestions: preparation.suggestions }),
    [preparation.suggestions, selectedTrip?.planningActions]
  );
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [addingCustom, setAddingCustom] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState<TravelPreparationGroupId>("focus_now");
  const [notificationPermission, setNotificationPermission] = useState<TravelPreparationNotificationPermission>(() => getTravelPreparationNotificationPermission());

  useEffect(() => {
    if (!selectedTrip || reconciliation.actionsToAdd.length === 0) return;
    for (const item of reconciliation.actionsToAdd) {
      addTripPlanningAction(selectedTrip.id, { text: item.text });
    }
  }, [addTripPlanningAction, reconciliation.actionsToAdd, selectedTrip]);

  useEffect(() => {
    setNotificationPermission(getTravelPreparationNotificationPermission());
  }, []);

  useEffect(() => {
    if (!selectedTrip || notificationPermission !== "granted") return;
    for (const reminder of preparation.reminders.due) {
      if (reminder.notified) continue;
      const shown = showTravelPreparationNotification({
        title: tr(reminder.titleKey),
        body: tr(reminder.bodyKey)
      });
      if (shown) markTripPreparationReminderNotified(selectedTrip.id, { occurrenceId: reminder.id });
    }
  }, [markTripPreparationReminderNotified, notificationPermission, preparation.reminders.due, selectedTrip, tr]);

  if (!selectedTrip) {
    return (
      <main className="travel-preparation-page" dir={language === "ar" ? "rtl" : "ltr"}>
        <PreparationTopbar backLabel={tr("travelPreparation.back")} title={tr("travelPreparation.title")} onBack={onBack} />
        <section className="travel-preparation-empty">
          <h1>{tr("travelPreparation.emptyTitle")}</h1>
          <p>{tr("travelPreparation.emptyBody")}</p>
        </section>
      </main>
    );
  }

  const destinationLabel = selectedTrip.destination?.label || selectedTrip.destination?.country || selectedTrip.destination?.city || "";

  return (
    <main className="travel-preparation-page" dir={language === "ar" ? "rtl" : "ltr"}>
      <PreparationTopbar backLabel={tr("travelPreparation.back")} title={tr("travelPreparation.title")} onBack={onBack} />
      <header className="travel-preparation-header">
        <div>
          <p className="destination-hub-private">{tr("travelPreparation.private")}</p>
          <h1 dir="auto">{tr("travelPreparation.title")}</h1>
          <p dir="auto">{selectedTrip.name}{destinationLabel ? ` · ${destinationLabel}` : ""}</p>
          <p>{dateSummary(selectedTrip, preparation.dates, tr)}</p>
        </div>
        <div className="travel-preparation-progress-card">
          <span>{tr("travelPreparation.phaseLabel")}: {tr(`travelPreparation.phase.${preparation.phase}`)}</span>
          <strong>{readinessText(preparation.readiness.summaryKey, tr)}</strong>
          <strong>{preparation.progress.completionPercent}%</strong>
          <span>{tr("travelPreparation.progress").replace("{completed}", String(preparation.progress.completed)).replace("{total}", String(preparation.progress.total))}</span>
          <div className="travel-preparation-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={preparation.progress.completionPercent}>
            <i style={{ inlineSize: `${preparation.progress.completionPercent}%` }} />
          </div>
          <span>{tr("travelPreparation.attention").replace("{count}", String(preparation.readiness.requiredAttentionCount))} · {tr("travelPreparation.unresolved").replace("{count}", String(preparation.readiness.unresolvedInformationCount))}</span>
        </div>
      </header>

      {connectivity.isOffline && (
        <section className="travel-preparation-network-note" role="status">
          <strong>{tr("travelPreparation.offlineTitle")}</strong>
          <p>{tr("travelPreparation.offlineBody")}</p>
        </section>
      )}

      {(preparation.dataQuality.highStakesWarning || preparation.notices.length > 0) && (
        <section className="travel-preparation-notice" role="status">
          <ShieldAlert size={18} aria-hidden="true" />
          <div>
            <p>{tr("travelPreparation.warning")}</p>
            {preparation.notices.length > 0 && (
              <ul>
                {preparation.notices.map((notice) => <li key={notice.id}>{tr(notice.textKey)}</li>)}
              </ul>
            )}
          </div>
        </section>
      )}

      <section className="travel-preparation-actions" aria-label={tr("travelPreparation.shortcuts")}>
        {preparation.destinationId && (
          <button type="button" className="secondary-btn" onClick={() => onOpenDestination(preparation.destinationId!)}>
            <BookOpen size={16} aria-hidden="true" /> {tr("travelPreparation.destinationGuide")}
          </button>
        )}
        <button type="button" className="secondary-btn" onClick={() => setTab("currency")}><Coins size={16} aria-hidden="true" /> {tr("travelPreparation.currency")}</button>
        <button type="button" className="secondary-btn" onClick={() => setTab("translator")}><Languages size={16} aria-hidden="true" /> {tr("travelPreparation.translator")}</button>
        <button type="button" className="secondary-btn" onClick={() => setTab("sos")}><LifeBuoy size={16} aria-hidden="true" /> {tr("travelPreparation.sos")}</button>
        <button type="button" className="secondary-btn" onClick={() => setTab("explorer")}><Map size={16} aria-hidden="true" /> {tr("travelPreparation.explorer")}</button>
      </section>

      <p className="travel-preparation-network-note">{tr("travelPreparation.noNetwork")}</p>

      <section className="travel-preparation-reminders" aria-labelledby="travel-preparation-reminders-title">
        <div className="section-row">
          <h2 id="travel-preparation-reminders-title">{tr("travelPreparation.reminders.title")}</h2>
          <span>{reminderPermissionText(notificationPermission, tr)}</span>
        </div>
        <p>{tr("travelPreparation.reminders.description")}</p>
        <div className="travel-preparation-reminder-controls">
          <button
            className={preparation.reminders.settings.enabled ? "secondary-btn" : "primary-btn"}
            type="button"
            onClick={async () => {
              if (!preparation.reminders.settings.enabled) {
                updateTripPreparationReminderSettings(selectedTrip.id, enabledTravelPreparationReminderSettings());
                const permission = await requestTravelPreparationNotificationPermission();
                setNotificationPermission(permission);
              } else {
                updateTripPreparationReminderSettings(selectedTrip.id, { ...preparation.reminders.settings, enabled: false });
              }
            }}
          >
            <Bell size={16} aria-hidden="true" /> {preparation.reminders.settings.enabled ? tr("travelPreparation.reminders.disable") : tr("travelPreparation.reminders.enable")}
          </button>
          {REMINDER_PHASES.map((phase) => (
            <label key={phase}>
              <input
                checked={preparation.reminders.settings.enabled && preparation.reminders.settings.phases.includes(phase)}
                disabled={!preparation.reminders.settings.enabled}
                onChange={(event) => {
                  const current = preparation.reminders.settings.phases;
                  const phases = event.target.checked
                    ? [...current, phase]
                    : current.filter((item) => item !== phase);
                  updateTripPreparationReminderSettings(selectedTrip.id, {
                    ...preparation.reminders.settings,
                    phases: phases.length ? phases : current
                  });
                }}
                type="checkbox"
              />
              {tr(`travelPreparation.reminders.phase.${phase}`)}
            </label>
          ))}
        </div>
        {notificationPermission === "unsupported" && <p className="travel-preparation-reminder-note">{tr("travelPreparation.reminders.unavailable")}</p>}
        {notificationPermission === "denied" && <p className="travel-preparation-reminder-note">{tr("travelPreparation.reminders.blocked")}</p>}
        {notificationPermission !== "granted" && <p className="travel-preparation-reminder-note">{tr("travelPreparation.reminders.inAppAvailable")}</p>}
        {preparation.reminders.due.length > 0 && (
          <div className="travel-preparation-due-reminders" role="status">
            {preparation.reminders.due.map((reminder) => (
              <article className="travel-preparation-due-reminder" key={reminder.id}>
                <div>
                  <strong>{tr(reminder.titleKey)}</strong>
                  <p>{tr(reminder.bodyKey)}</p>
                </div>
                <button type="button" className="secondary-btn" onClick={() => acknowledgeTripPreparationReminder(selectedTrip.id, { occurrenceId: reminder.id })}>
                  {tr("travelPreparation.reminders.dismiss")}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="travel-preparation-phase-tabs" aria-label={tr("travelPreparation.phaseLabel")}>
        {preparation.groups.map((group) => (
          <button
            aria-pressed={activeGroupId === group.id}
            className={activeGroupId === group.id ? "active" : ""}
            key={group.id}
            onClick={() => setActiveGroupId(group.id)}
            type="button"
          >
            {tr(group.titleKey)}
            <span>{group.actions.length}</span>
          </button>
        ))}
      </section>

      <section className="travel-preparation-grid">
        {preparation.groups.filter((group) => group.id === activeGroupId).map((group) => (
          <section className="travel-preparation-section" key={group.id} aria-labelledby={`prep-${group.id}`}>
            <div className="section-row">
              <h2 id={`prep-${group.id}`}>{tr(group.titleKey)}</h2>
              <span>{group.actions.length}</span>
            </div>
            <div className="travel-preparation-items">
              {group.actions.length === 0 && <p className="travel-preparation-empty-group">{tr("travelPreparation.emptyGroup")}</p>}
              {group.actions.map((item) => (
                <PreparationItem
                  editing={editingActionId === item.action.id}
                  item={item}
                  key={item.action.id}
                  language={language}
                  editorTr={editorTr}
                  onCancelEdit={() => setEditingActionId(null)}
                  onEdit={() => setEditingActionId(item.action.id)}
                  onRemove={() => removeTripPlanningAction(selectedTrip.id, { actionId: item.action.id })}
                  onSave={(text) => {
                    const ok = updateTripPlanningAction(selectedTrip.id, { actionId: item.action.id, expectedCurrentText: item.action.text, text }).ok;
                    if (ok) setEditingActionId(null);
                    return ok;
                  }}
                  onToggle={() => toggleTripPlanningAction(selectedTrip.id, { actionId: item.action.id })}
                  tr={tr}
                />
              ))}
            </div>
          </section>
        ))}
      </section>

      <section className="travel-preparation-custom">
        <h2>{tr("travelPreparation.addCustom")}</h2>
        {addingCustom ? (
          <PlanningActionEditor
            initialText=""
            language={language}
            onCancel={() => setAddingCustom(false)}
            onSave={(text) => {
              const ok = addTripPlanningAction(selectedTrip.id, { text }).ok;
              if (ok) setAddingCustom(false);
              return ok;
            }}
            translate={editorTr}
          />
        ) : (
          <button type="button" className="primary-btn" onClick={() => setAddingCustom(true)}>
            <Plus size={16} aria-hidden="true" /> {tr("travelPreparation.addCustom")}
          </button>
        )}
      </section>
    </main>
  );
}

function PreparationItem({
  editing,
  item,
  language,
  editorTr,
  onCancelEdit,
  onEdit,
  onRemove,
  onSave,
  onToggle,
  tr
}: {
  editing: boolean;
  item: TravelPreparationAction;
  key?: string;
  language: string;
  editorTr: (key: string) => string;
  onCancelEdit: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onSave: (text: string) => boolean;
  onToggle: () => void;
  tr: (key: string) => string;
}) {
  if (editing) {
    return <PlanningActionEditor initialText={item.action.text} language={language} onCancel={onCancelEdit} onSave={onSave} translate={editorTr} />;
  }
  return (
    <div className={`travel-preparation-item ${item.action.completed ? "checked" : ""}`}>
      <label>
        <input type="checkbox" checked={item.action.completed} onChange={onToggle} />
        <span dir="auto">{item.action.text}</span>
      </label>
      <span className="travel-preparation-item-source">{item.source === "fanatlas_suggested" ? tr("travelPreparation.generated") : tr("travelPreparation.custom")}</span>
      <span className="travel-preparation-item-source">{tr(`travelPreparation.sections.${item.sectionId}`)} · {tr(`travelPreparation.phase.${item.recommendedPhase}`)}</span>
      <div className="travel-preparation-item-actions">
        <button type="button" className="icon-btn" onClick={onToggle} aria-label={item.action.completed ? tr("travelPreparation.markIncomplete") : tr("travelPreparation.markComplete")}>
          <CheckCircle2 size={16} aria-hidden="true" />
        </button>
        {item.source === "user_created" && (
          <>
            <button type="button" className="secondary-btn" onClick={onEdit}>{tr("travelPreparation.edit")}</button>
            <button type="button" className="icon-btn" onClick={onRemove} aria-label={tr("travelPreparation.remove")}>
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function PreparationTopbar({ backLabel, title, onBack }: { backLabel: string; title: string; onBack: () => void }) {
  return (
    <div className="topbar">
      <button type="button" className="icon-btn" onClick={onBack} aria-label={backLabel}>
        <ArrowLeft size={18} aria-hidden="true" />
      </button>
      <div className="brand">{title}</div>
    </div>
  );
}

function travelPreparationEditorTranslate(language: string, key: string) {
  const tr = (translationKey: string) => travelPreparationTranslate(language, translationKey);
  if (key === "tripDrafts.planningActions.action") return tr("travelPreparation.customPlaceholder");
  if (key === "tripDrafts.planningActions.characterCount") return "{current} / {maximum}";
  if (key === "tripDrafts.planningActions.save") return tr("travelPreparation.save");
  if (key === "tripDrafts.cancel") return tr("travelPreparation.cancel");
  return tr(key);
}

function reminderPermissionText(permission: TravelPreparationNotificationPermission, tr: (key: string) => string) {
  if (permission === "granted") return tr("travelPreparation.reminders.permissionGranted");
  if (permission === "denied") return tr("travelPreparation.reminders.permissionDenied");
  if (permission === "unsupported") return tr("travelPreparation.reminders.permissionUnsupported");
  return tr("travelPreparation.reminders.permissionDefault");
}

function selectTrip(drafts: readonly TripDraft[], tripId: string | null) {
  if (tripId) return drafts.find((draft) => draft.id === tripId) || null;
  return drafts.find((draft) => draft.status !== "archived" && draft.completionStatus !== "completed") || drafts[0] || null;
}

function dateSummary(trip: TripDraft, dates: ReturnType<typeof deriveTravelPreparation>["dates"], tr: (key: string) => string) {
  const parts = [trip.travelDates?.startDate, trip.travelDates?.endDate].filter(Boolean).join(" to ");
  const until = dates.proximity === "unknown"
    ? tr("travelPreparation.noDates")
    : dates.proximity === "today"
      ? tr("travelPreparation.today")
      : dates.proximity === "past"
        ? tr("travelPreparation.past")
        : tr("travelPreparation.daysUntil").replace("{count}", String(dates.daysUntilTrip));
  const duration = dates.durationDays ? tr("travelPreparation.duration").replace("{count}", String(dates.durationDays)) : "";
  return [parts, until, duration].filter(Boolean).join(" · ");
}

function readinessText(summaryKey: string, tr: (key: string) => string) {
  return tr(summaryKey);
}
