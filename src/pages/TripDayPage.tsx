import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, CheckCircle2, Coins, Edit3, Languages, LifeBuoy, Map, Navigation, NotebookPen, RefreshCw, RotateCcw, ShieldAlert, SkipForward } from "lucide-react";
import { TravelIntelligenceProvider, useTravelIntelligence } from "../contexts/TravelIntelligenceContext";
import { useLanguage } from "../LanguageContext";
import { useDestinationIntelligence } from "../hooks/useDestinationIntelligence";
import { useConnectivity } from "../hooks/useConnectivity";
import { useTripDayLiveContext } from "../hooks/useTripDayLiveContext";
import { useTripDrafts } from "../hooks/useTripDrafts";
import type { Tab } from "../main";
import { deriveTravelPreparation } from "../lib/travelPreparation";
import {
  deriveTripDayExperience,
  resolveTripForDay,
  type TripDayExecutionState,
  type TripDayExperience,
  type TripDayPlace,
  type TripDaySection,
  type TripDayTimeBlockId
} from "../lib/tripDay";
import {
  resolveTripDayLiveContextDestination,
  resolveTripDayRouteDestination
} from "../lib/tripDayLiveContext";
import type { MapDestination } from "../mapDestinations";
import type { TripPlaceVisitStatus } from "../lib/tripDrafts";
import { tripDayTranslate } from "../lib/tripDayI18n";

const TRIP_DAY_CURRENT_DATE_OVERRIDE_KEY = "fanatlas.tripDay.currentDate";

type TripDayPageProps = {
  userId?: string | null;
  tripId?: string | null;
  currentDate?: Date;
  onBack: () => void;
  onOpenDestination: (destinationId: string) => void;
  onOpenMapDestination: (destination: MapDestination | null) => void;
  setTab: (tab: Tab) => void;
};

export function TripDayPage(props: TripDayPageProps) {
  return (
    <TravelIntelligenceProvider userId={props.userId}>
      <TripDayContent {...props} />
    </TravelIntelligenceProvider>
  );
}

function TripDayContent({
  tripId,
  currentDate,
  onBack,
  onOpenDestination,
  onOpenMapDestination,
  setTab
}: TripDayPageProps) {
  const { language } = useLanguage();
  const tr = useCallback((key: string) => tripDayTranslate(language, key), [language]);
  const connectivity = useConnectivity();
  const intelligence = useDestinationIntelligence();
  const { savedPlaces, currentLocation } = useTravelIntelligence();
  const { drafts, updatePlaceVisitStatus } = useTripDrafts(savedPlaces);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(tripId || null);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [currencyBase, setCurrencyBase] = useState("USD");
  const [currencyAmount, setCurrencyAmount] = useState(100);
  const effectiveCurrentDate = useMemo(() => currentDate || readCurrentDateOverride() || new Date(), [currentDate]);
  const resolvedTrip = useMemo(
    () => resolveTripForDay(drafts, effectiveCurrentDate.toISOString().slice(0, 10), selectedTripId || tripId || null).trip,
    [drafts, effectiveCurrentDate, selectedTripId, tripId]
  );
  const preparation = useMemo(
    () => deriveTravelPreparation({ trip: resolvedTrip, intelligence, now: effectiveCurrentDate }),
    [effectiveCurrentDate, intelligence, resolvedTrip]
  );
  const experience = useMemo(
    () => deriveTripDayExperience({
      trips: drafts,
      savedPlaces,
      currentDate: effectiveCurrentDate,
      selectedTripId: selectedTripId || tripId || null,
      selectedDayId,
      preparation
    }),
    [drafts, effectiveCurrentDate, preparation, savedPlaces, selectedDayId, selectedTripId, tripId]
  );
  const liveDestination = useMemo(
    () => resolveTripDayLiveContextDestination({ experience, intelligence }),
    [experience, intelligence]
  );
  const routeDestination = useMemo(
    () => resolveTripDayRouteDestination({ experience, selectedMapDestination: null }),
    [experience]
  );
  const liveContext = useTripDayLiveContext({
    experience,
    destination: liveDestination,
    language,
    routeDestination,
    baseCurrency: currencyBase,
    amount: currencyAmount,
    onOpenMapDestination,
    onSetTab: setTab
  });

  useEffect(() => {
    setSelectedTripId(tripId || null);
    setSelectedDayId(null);
  }, [tripId]);

  function selectCandidate(candidateId: string) {
    setSelectedTripId(candidateId);
    setSelectedDayId(null);
  }

  function updateStatus(tripDraftId: string, logicalPlaceId: string, status: TripPlaceVisitStatus) {
    const result = updatePlaceVisitStatus(tripDraftId, { logicalPlaceId, status });
    const ok = typeof result === "object" && result !== null && "ok" in result ? Boolean(result.ok) : true;
    setStatusMessage(ok ? statusSuccess(status, tr) : tr("tripDay.statusUpdateFailed"));
  }

  return (
    <main className="trip-day-page" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="topbar">
        <button type="button" className="icon-btn" onClick={onBack} aria-label={tr("tripDay.back")}>
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
        <div className="brand">{tr("tripDay.title")}</div>
      </div>

      {experience.selectionState === "multiple_active" && (
        <section className="trip-day-empty">
          <h1>{tr("tripDay.chooseTrip")}</h1>
          <p>{tr("tripDay.multipleActive")}</p>
          <div className="trip-day-candidate-list">
            {experience.candidates.map((candidate) => (
              <button className="secondary-btn" key={candidate.id} type="button" onClick={() => selectCandidate(candidate.id)}>
                <span dir="auto">{candidate.name}</span>
                <small>{[candidate.destinationLabel, candidate.startDate].filter(Boolean).join(" · ")}</small>
              </button>
            ))}
          </div>
        </section>
      )}

      {experience.selectionState !== "multiple_active" && !experience.trip && (
        <section className="trip-day-empty">
          <h1>{tr("tripDay.noTrip")}</h1>
          <p>{tr("tripDay.noTripBody")}</p>
          {experience.candidates.length > 0 && (
            <div className="trip-day-candidate-list" aria-label={tr("tripDay.chooseTrip")}>
              {experience.candidates.map((candidate) => (
                <button className="secondary-btn" key={candidate.id} type="button" onClick={() => selectCandidate(candidate.id)}>
                  <span dir="auto">{candidate.name}</span>
                  <small>{[candidate.destinationLabel, candidate.startDate].filter(Boolean).join(" · ")}</small>
                </button>
              ))}
            </div>
          )}
          <button type="button" className="primary-btn" onClick={() => setTab("tripDrafts")}>{tr("tripDay.editItinerary")}</button>
        </section>
      )}

      {experience.trip && (
        <>
          <TripDayHeader experience={experience} language={language} tr={tr} />
          {connectivity.isOffline && (
            <section className="trip-day-offline-note fa-inline-message" role="status">
              <strong>{tr("tripDay.currentInformationUnavailable")}</strong>
              <span>{tr("tripDay.noNetwork")}</span>
            </section>
          )}
          <div className="sr-only" role="status" aria-live="polite">{statusMessage}</div>

          <section className="trip-day-actions" aria-label={tr("tripDay.quickActions")}>
            <button type="button" className="secondary-btn" onClick={() => setTab("map")}><Map size={16} aria-hidden="true" /> {tr("tripDay.map")}</button>
            {experience.destinationId && (
              <button type="button" className="secondary-btn" onClick={() => onOpenDestination(experience.destinationId!)}>
                <BookOpen size={16} aria-hidden="true" /> {tr("tripDay.destinationGuide")}
              </button>
            )}
            <button type="button" className="secondary-btn" onClick={() => setTab("translator")}><Languages size={16} aria-hidden="true" /> {tr("tripDay.translator")}</button>
            <button type="button" className="secondary-btn" onClick={() => setTab("currency")}><Coins size={16} aria-hidden="true" /> {tr("tripDay.currency")}</button>
            <button type="button" className="secondary-btn" onClick={() => setTab("sos")}><LifeBuoy size={16} aria-hidden="true" /> {tr("tripDay.sos")}</button>
            <button type="button" className="secondary-btn" onClick={() => setTab("journal")}><NotebookPen size={16} aria-hidden="true" /> {tr("tripDay.journal")}</button>
            <button type="button" className="secondary-btn" onClick={() => setTab("tripDrafts")}><Edit3 size={16} aria-hidden="true" /> {tr("tripDay.editItinerary")}</button>
          </section>

          <LiveContextPanel
            experience={experience}
            language={language}
            tr={tr}
            currentLocation={currentLocation}
            currencyBase={currencyBase}
            setCurrencyBase={setCurrencyBase}
            currencyAmount={currencyAmount}
            setCurrencyAmount={setCurrencyAmount}
            liveDestination={liveDestination}
            routeDestination={routeDestination}
            liveContext={liveContext}
          />

          {experience.notices.length > 0 && (
            <section className="trip-day-notices" aria-labelledby="trip-day-notices-title">
              <h2 id="trip-day-notices-title">{tr("tripDay.notices")}</h2>
              <ul>
                {experience.notices.filter((notice) => notice.id !== "trip_started").map((notice) => (
                  <li key={notice.id}>{tr(`tripDay.notice.${notice.id}`)}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="trip-day-next-card" aria-labelledby="trip-day-next-title">
            <span>{tr("tripDay.whatsNext")}</span>
            {experience.execution.dayComplete ? (
              <>
                <h2 id="trip-day-next-title">{tr("tripDay.dayComplete")}</h2>
                <p>{tr("tripDay.dayComplete")}</p>
                <div className="trip-day-place-actions">
                  <button type="button" className="secondary-btn" onClick={() => setTab("journal")}><NotebookPen size={16} aria-hidden="true" /> {tr("tripDay.journal")}</button>
                  <button type="button" className="secondary-btn" onClick={() => setTab("tripDrafts")}><Edit3 size={16} aria-hidden="true" /> {tr("tripDay.editItinerary")}</button>
                </div>
              </>
            ) : experience.nextItem ? (
              <>
                <h2 id="trip-day-next-title">{tr("tripDay.nextInPlan")}</h2>
                <PlaceCard
                  compact
                  place={experience.nextItem.place}
                  sectionId={experience.nextItem.sectionId}
                  tr={tr}
                  onStatus={(status) => updateStatus(experience.trip!.id, experience.nextItem!.place.logicalPlaceId, status)}
                />
                <TripDayExecutionSummary experience={experience.execution} tr={tr} />
              </>
            ) : (
              <p>{tr("tripDay.noNext")}</p>
            )}
          </section>

          <DayNavigation experience={experience} tr={tr} onSelectDay={setSelectedDayId} />

          <section className="trip-day-blocks">
            {experience.sections.filter((section) => section.id !== "unassigned").map((section) => (
              <TripDayBlock
                key={section.id}
                section={section}
                tripId={experience.trip!.id}
                tr={tr}
                updatePlaceVisitStatus={updateStatus}
              />
            ))}
          </section>

          <TripDayBlock
            section={experience.sections.find((section) => section.id === "unassigned")!}
            tripId={experience.trip.id}
            tr={tr}
            updatePlaceVisitStatus={updateStatus}
          />

          {experience.unscheduled.length > 0 && (
            <section className="trip-day-section" aria-labelledby="trip-day-unscheduled">
              <div className="section-row">
                <h2 id="trip-day-unscheduled">{tr("tripDay.unscheduled")}</h2>
                <span>{tr("tripDay.places").replace("{count}", String(experience.unscheduled.length))}</span>
              </div>
              {experience.unscheduled.map((place) => (
                <PlaceCard
                  key={place.logicalPlaceId}
                  place={place}
                  sectionId="unassigned"
                  tr={tr}
                  onStatus={(status) => updateStatus(experience.trip!.id, place.logicalPlaceId, status)}
                />
              ))}
            </section>
          )}

          {experience.nearbyGroups.length > 0 && (
            <section className="trip-day-nearby" aria-labelledby="trip-day-nearby-title">
              <h2 id="trip-day-nearby-title">{tr("tripDay.nearbyGroups")}</h2>
              {experience.nearbyGroups.map((group) => (
                <p key={`${group.sectionId}-${group.id}`}>{tr("tripDay.nearbyGroup").replace("{places}", group.placeNames.join(", "))}</p>
              ))}
            </section>
          )}

          <DestinationEssentials experience={experience} tr={tr} />
          <p className="trip-day-network-note">{tr("tripDay.noNetwork")}</p>
        </>
      )}
    </main>
  );
}

function TripDayHeader({ experience, language, tr }: { experience: TripDayExperience; language: string; tr: (key: string) => string }) {
  const trip = experience.trip!;
  const date = experience.selectedDate ? formatDate(experience.selectedDate, language) : tr("tripDay.noDate");
  const dayLine = experience.dayIndex !== null
    ? tr("tripDay.dayOf").replace("{day}", String(experience.dayIndex + 1)).replace("{total}", String(experience.dayCount))
    : tr("tripDay.pageTitle");
  return (
    <header className="trip-day-header">
      <div>
        <p className="destination-hub-private">{tr("tripDay.private")}</p>
        <h1 dir="auto">{tr("tripDay.title")}</h1>
        <p dir="auto">{trip.name}{trip.destination?.label ? ` · ${trip.destination.label}` : ""}</p>
        <p>{dayLine} · {date}</p>
      </div>
      <div className="trip-day-progress-card">
        <span>{stateText(experience.state, tr)}</span>
        <strong>{experience.progress.completionPercent}%</strong>
        <span>{tr("tripDay.progress")
          .replace("{visited}", String(experience.progress.visited))
          .replace("{remaining}", String(experience.progress.remaining))
          .replace("{skipped}", String(experience.progress.skipped))}</span>
        <div className="travel-preparation-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={experience.progress.completionPercent}>
          <i style={{ inlineSize: `${experience.progress.completionPercent}%` }} />
        </div>
      </div>
    </header>
  );
}

function DayNavigation({ experience, tr, onSelectDay }: { experience: TripDayExperience; tr: (key: string) => string; onSelectDay: (dayId: string | null) => void }) {
  return (
    <section className="trip-day-navigation" aria-label={tr("tripDay.pageTitle")}>
      <button type="button" className="secondary-btn" disabled={!experience.previousDayId} onClick={() => onSelectDay(experience.previousDayId)}>
        {tr("tripDay.previousDay")}
      </button>
      <button type="button" className="secondary-btn" onClick={() => onSelectDay(null)}>
        {tr("tripDay.todayButton")}
      </button>
      <button type="button" className="secondary-btn" disabled={!experience.nextDayId} onClick={() => onSelectDay(experience.nextDayId)}>
        {tr("tripDay.nextDay")}
      </button>
    </section>
  );
}

function TripDayBlock({
  section,
  tripId,
  tr,
  updatePlaceVisitStatus
}: {
  key?: unknown;
  section: TripDaySection;
  tripId: string;
  tr: (key: string) => string;
  updatePlaceVisitStatus: (draftId: string, logicalPlaceId: string, status: TripPlaceVisitStatus) => unknown;
}) {
  return (
    <section className="trip-day-section" aria-labelledby={`trip-day-${section.id}`}>
      <div className="section-row">
        <h2 id={`trip-day-${section.id}`}>{sectionTitle(section.id, tr)}</h2>
        <span>{tr("tripDay.places").replace("{count}", String(section.total))}</span>
      </div>
      {section.places.length === 0 && <p className="trip-day-empty-block">{tr("tripDay.emptyBlock")}</p>}
      {section.places.map((place) => (
        <PlaceCard
          key={place.logicalPlaceId}
          place={place}
          sectionId={section.id}
          tr={tr}
          onStatus={(status) => updatePlaceVisitStatus(tripId, place.logicalPlaceId, status)}
        />
      ))}
    </section>
  );
}

function PlaceCard({
  compact = false,
  place,
  sectionId,
  tr,
  onStatus
}: {
  key?: unknown;
  compact?: boolean;
  place: TripDayPlace;
  sectionId: TripDayTimeBlockId;
  tr: (key: string) => string;
  onStatus: (status: TripPlaceVisitStatus) => unknown;
}) {
  return (
    <article className={`trip-day-place-card ${compact ? "compact" : ""}`}>
      <div>
        <span>{sectionTitle(sectionId, tr)} · {statusLabel(place.visitStatus, tr)}</span>
        <h3 dir="auto">{place.name || tr("tripDay.unavailablePlace")}</h3>
        {place.planningNote && (
          <p dir="auto"><strong>{tr("tripDay.note")}:</strong> {place.planningNote}</p>
        )}
        {place.photoCount > 0 && <small>{tr("tripDay.photos").replace("{count}", String(place.photoCount))}</small>}
      </div>
      <div className="trip-day-place-actions">
        {place.visitStatus !== "visited" && (
          <button type="button" className="secondary-btn" onClick={() => onStatus("visited")} aria-label={`${tr("tripDay.markVisited")}: ${place.name}`}><CheckCircle2 size={16} aria-hidden="true" /> {tr("tripDay.markVisited")}</button>
        )}
        {place.visitStatus !== "skipped" && (
          <button type="button" className="secondary-btn" onClick={() => onStatus("skipped")} aria-label={`${tr("tripDay.markSkipped")}: ${place.name}`}><SkipForward size={16} aria-hidden="true" /> {tr("tripDay.markSkipped")}</button>
        )}
        {place.visitStatus !== "planned" && (
          <button type="button" className="secondary-btn" onClick={() => onStatus("planned")} aria-label={`${tr("tripDay.markPlanned")}: ${place.name}`}><RotateCcw size={16} aria-hidden="true" /> {tr("tripDay.markPlanned")}</button>
        )}
      </div>
    </article>
  );
}

function statusSuccess(status: TripPlaceVisitStatus, tr: (key: string) => string) {
  if (status === "visited") return tr("tripDay.statusVisited");
  if (status === "skipped") return tr("tripDay.statusSkipped");
  return tr("tripDay.statusPlanned");
}

function DestinationEssentials({ experience, tr }: { experience: TripDayExperience; tr: (key: string) => string }) {
  const destination = experience.trip?.destination;
  return (
    <section className="trip-day-destination" aria-labelledby="trip-day-destination-title">
      <h2 id="trip-day-destination-title">{tr("tripDay.destinationEssentials")}</h2>
      {destination ? (
        <div className="trip-day-destination-grid">
          {destination.country && <span>{destination.country}</span>}
          {destination.countryCode && <span>{destination.countryCode}</span>}
          {destination.city && <span>{destination.city}</span>}
        </div>
      ) : (
        <p>{tr("tripDay.destinationUnavailable")}</p>
      )}
    </section>
  );
}

function LiveContextPanel({
  experience,
  language,
  tr,
  currentLocation,
  currencyBase,
  setCurrencyBase,
  currencyAmount,
  setCurrencyAmount,
  liveDestination,
  routeDestination,
  liveContext,
}: {
  experience: TripDayExperience;
  language: string;
  tr: (key: string) => string;
  currentLocation: { latitude: number; longitude: number } | null;
  currencyBase: string;
  setCurrencyBase: (value: string) => void;
  currencyAmount: number;
  setCurrencyAmount: (value: number) => void;
  liveDestination: ReturnType<typeof resolveTripDayLiveContextDestination>;
  routeDestination: MapDestination | null;
  liveContext: ReturnType<typeof useTripDayLiveContext>;
}) {
  const destinationCurrency = liveDestination?.currency || "EUR";
  const routeLabel = routeDestination ? routeDestination.name : tr("tripDay.routeUnavailable");
  const routeDetails = experience.nextItem
    ? [sectionTitle(experience.nextItem.sectionId, tr), statusLabel(experience.nextItem.place.visitStatus, tr)].join(" · ")
    : tr("tripDay.routeUnavailable");

  return (
    <section className="trip-day-live-context" aria-labelledby="trip-day-live-context-title">
      <div className="section-row">
        <h2 id="trip-day-live-context-title">{tr("tripDay.liveContext")}</h2>
        <span>{liveDestination?.label || tr("tripDay.destinationUnavailable")}</span>
      </div>

      <div className="trip-day-live-grid">
        <WeatherLiveCard
          tr={tr}
          language={language}
          destination={liveDestination}
          state={liveContext.weather}
          onCheck={liveContext.checkWeather}
        />

        <CurrencyLiveCard
          tr={tr}
          state={liveContext.currency}
          baseCurrency={currencyBase}
          destinationCurrency={destinationCurrency}
          amount={currencyAmount}
          onBaseCurrencyChange={setCurrencyBase}
          onAmountChange={setCurrencyAmount}
          onCheck={liveContext.checkCurrency}
        />

        <OfficialUpdatesLiveCard
          tr={tr}
          state={liveContext.officialUpdates}
          onCheck={() => liveContext.checkOfficialUpdates()}
        />

        <RouteLiveCard
          tr={tr}
          currentLocation={currentLocation}
          route={liveContext.route}
          routeLabel={routeLabel}
          routeDetails={routeDetails}
          onOpenMap={() => liveContext.openMap()}
          onUseLocation={() => liveContext.openMap()}
        />
      </div>
    </section>
  );
}

function WeatherLiveCard({
  tr,
  language,
  destination,
  state,
  onCheck
}: {
  tr: (key: string) => string;
  language: string;
  destination: ReturnType<typeof resolveTripDayLiveContextDestination>;
  state: ReturnType<typeof useTripDayLiveContext>["weather"];
  onCheck: () => void;
}) {
  const result = state.result;
  const forecastDay = result?.daily.find((item) => item.date === result.date) || result?.daily[0] || null;
  const freshness = freshnessLabel(result?.freshness?.class || null, tr);
  const actionLabel = state.status === "error" ? tr("tripDay.tryAgain") : tr("tripDay.checkWeather");
  return (
    <article className="trip-day-live-card">
      <div className="trip-day-live-card-header">
        <div>
          <h3>{tr("tripDay.checkWeather")}</h3>
          <p>{destination?.label || tr("tripDay.destinationUnavailable")}</p>
        </div>
        <button type="button" className="secondary-btn" onClick={onCheck} disabled={state.status === "loading"}>
          <RefreshCw size={16} aria-hidden="true" /> {actionLabel}
        </button>
      </div>

      {state.status === "loading" && <p className="trip-day-live-status" role="status">{tr("tripDay.loadingLiveContext")}</p>}
      {state.status === "error" && <p className="trip-day-live-status error" role="alert">{tr("tripDay.currentInformationUnavailable")}</p>}
      {state.status === "unavailable" && <p className="trip-day-live-status">{state.result?.unavailableReason === "outside_forecast_horizon" ? tr("tripDay.forecastNotAvailableYet") : tr("tripDay.weatherUnavailable")}</p>}

      {result && state.status !== "loading" && (
        <div className="trip-day-live-result">
          <div className="trip-day-live-result-line">
            <strong dir="auto">{result.destination || destination?.label || tr("tripDay.destinationUnavailable")}</strong>
            <span>{formatDate(result.date || result.currentDate, language)}</span>
          </div>
          {forecastDay && (
            <p>{forecastDay.condition} · {temperatureRangeText(forecastDay, result.units || "metric")} · {precipitationText(forecastDay)}</p>
          )}
          {result.alerts.length > 0 && (
            <div className="trip-day-live-alert" role="alert">
              <ShieldAlert size={16} aria-hidden="true" />
              <div>
                <strong>{tr("tripDay.severeWeatherAlert")}</strong>
                <p dir="auto">{result.alerts[0].title}</p>
                <small>{alertTimingText(result.alerts[0], language)}</small>
              </div>
            </div>
          )}
          <p className="trip-day-live-meta">{sourceFreshnessText(result.source, freshness, result.retrievedAt, tr)} · {result.citationCount} {result.citationCount === 1 ? tr("tripDay.source") : tr("tripDay.sources")}</p>
        </div>
      )}

      {!result && state.status === "idle" && <p className="trip-day-live-status">{tr("tripDay.weatherUnavailable")}</p>}
      {result && <p className="trip-day-live-status">{freshness}</p>}
    </article>
  );
}

function CurrencyLiveCard({
  tr,
  state,
  baseCurrency,
  destinationCurrency,
  amount,
  onBaseCurrencyChange,
  onAmountChange,
  onCheck
}: {
  tr: (key: string) => string;
  state: ReturnType<typeof useTripDayLiveContext>["currency"];
  baseCurrency: string;
  destinationCurrency: string;
  amount: number;
  onBaseCurrencyChange: (value: string) => void;
  onAmountChange: (value: number) => void;
  onCheck: () => void;
}) {
  const result = state.result;
  const codes = buildCurrencyCodes(destinationCurrency, baseCurrency);
  const actionLabel = state.status === "error" ? tr("tripDay.tryAgain") : tr("tripDay.checkCurrentRate");
  return (
    <article className="trip-day-live-card">
      <div className="trip-day-live-card-header">
        <div>
          <h3>{tr("tripDay.checkCurrentRate")}</h3>
          <p>{tr("tripDay.destinationCurrency")}: {destinationCurrency}</p>
        </div>
        <button type="button" className="secondary-btn" onClick={onCheck} disabled={state.status === "loading"}>
          <Coins size={16} aria-hidden="true" /> {actionLabel}
        </button>
      </div>

      <div className="trip-day-live-form">
        <label>
          <span>{tr("tripDay.amount")}</span>
          <input type="number" min="0" step="0.01" value={amount} onChange={(event) => onAmountChange(Number(event.target.value))} />
        </label>
        <label>
          <span>{tr("tripDay.baseCurrency")}</span>
          <select value={baseCurrency} onChange={(event) => onBaseCurrencyChange(event.target.value)}>
            {codes.map((code) => <option key={code} value={code}>{code}</option>)}
          </select>
        </label>
      </div>

      {state.status === "loading" && <p className="trip-day-live-status" role="status">{tr("tripDay.loadingLiveContext")}</p>}
      {state.status === "error" && <p className="trip-day-live-status error" role="alert">{tr("tripDay.currentInformationUnavailable")}</p>}
      {state.status === "unavailable" && <p className="trip-day-live-status">{tr("tripDay.currencyUnavailable")}</p>}

      {result && state.status !== "loading" && (
        <div className="trip-day-live-result">
          <div className="trip-day-live-result-line">
            <strong>{result.amount?.toLocaleString() || amount.toLocaleString()} {result.baseCurrency || baseCurrency}</strong>
            <span>{result.rate ? `1 ${result.baseCurrency || baseCurrency} = ${result.rate.toFixed(4)} ${result.targetCurrency || destinationCurrency}` : tr("tripDay.currencyUnavailable")}</span>
          </div>
          {result.convertedAmount !== null && result.convertedAmount !== undefined && (
            <p>{result.convertedAmount.toLocaleString()} {result.targetCurrency || destinationCurrency}</p>
          )}
          <p className="trip-day-live-meta">{sourceFreshnessText(result.source, freshnessLabel(result.freshness?.class || null, tr), result.retrievedAt, tr)} · {tr("tripDay.ratesMayChange")}</p>
        </div>
      )}
    </article>
  );
}

function OfficialUpdatesLiveCard({
  tr,
  state,
  onCheck
}: {
  tr: (key: string) => string;
  state: ReturnType<typeof useTripDayLiveContext>["officialUpdates"];
  onCheck: () => void;
}) {
  const result = state.result;
  const actionLabel = state.status === "error" ? tr("tripDay.tryAgain") : tr("tripDay.checkOfficialUpdates");
  return (
    <article className="trip-day-live-card">
      <div className="trip-day-live-card-header">
        <div>
          <h3>{tr("tripDay.checkOfficialUpdates")}</h3>
          <p>{tr("tripDay.officialUpdatesIntro")}</p>
        </div>
        <button type="button" className="secondary-btn" onClick={onCheck} disabled={state.status === "loading"}>
          <ShieldAlert size={16} aria-hidden="true" /> {actionLabel}
        </button>
      </div>

      {state.status === "loading" && <p className="trip-day-live-status" role="status">{tr("tripDay.loadingLiveContext")}</p>}
      {state.status === "error" && <p className="trip-day-live-status error" role="alert">{tr("tripDay.officialUpdatesUnavailable")}</p>}
      {state.status === "unavailable" && <p className="trip-day-live-status">{tr("tripDay.officialUpdatesUnavailable")}</p>}

      {result && state.status !== "loading" && (
        <div className="trip-day-live-result">
          {result.findings.length > 0 ? result.findings.map((finding) => (
            <article key={`${finding.category}:${finding.url}:${finding.title}`} className="trip-day-live-finding">
              <strong dir="auto">{finding.title}</strong>
              <p dir="auto">{finding.fact}</p>
              <p className="trip-day-live-meta">
                {finding.source} · {formatTimestamp(finding.retrievedAt)} · {freshnessLabel(result.freshness?.class || null, tr)}
              </p>
              <a href={finding.url} target="_blank" rel="noopener noreferrer">{tr("tripDay.openSource")}</a>
            </article>
          )) : <p className="trip-day-live-status">{tr("tripDay.officialUpdatesUnavailable")}</p>}
          <p className="trip-day-live-meta">{sourceFreshnessText(result.source, freshnessLabel(result.freshness?.class || null, tr), result.retrievedAt, tr)}</p>
        </div>
      )}
    </article>
  );
}

function RouteLiveCard({
  tr,
  currentLocation,
  route,
  routeLabel,
  routeDetails,
  onOpenMap,
  onUseLocation
}: {
  tr: (key: string) => string;
  currentLocation: { latitude: number; longitude: number } | null;
  route: ReturnType<typeof useTripDayLiveContext>["route"];
  routeLabel: string;
  routeDetails: string;
  onOpenMap: () => void;
  onUseLocation: () => void;
}) {
  return (
    <article className="trip-day-live-card">
      <div className="trip-day-live-card-header">
        <div>
          <h3>{tr("tripDay.routeToNextPlace")}</h3>
          <p dir="auto">{routeLabel}</p>
        </div>
        <button type="button" className="secondary-btn" onClick={onOpenMap}>
          <Map size={16} aria-hidden="true" /> {tr("tripDay.openMap")}
        </button>
      </div>

      <p className="trip-day-live-status">{routeDetails}</p>
      {route.status === "success" && currentLocation && (
        <button type="button" className="secondary-btn" onClick={onUseLocation}>
          <Navigation size={16} aria-hidden="true" /> {tr("tripDay.useMyLocation")}
        </button>
      )}
      {route.status === "success" && route.destination && (
        <p className="trip-day-live-meta">
          {route.destination.city} · {formatCoordinate(route.destination.lat)}, {formatCoordinate(route.destination.lng)}
        </p>
      )}
      {route.status !== "success" && <p className="trip-day-live-status">{tr("tripDay.routeUnavailable")}</p>}
    </article>
  );
}

function TripDayExecutionSummary({ experience, tr }: { experience: TripDayExecutionState; tr: (key: string) => string }) {
  return (
    <div className="trip-day-execution-summary" aria-label={tr("tripDay.executionSummary")}>
      <span>{tr("tripDay.remaining")}: {experience.progress.remaining}</span>
      <span>{tr("tripDay.visited")}: {experience.completedPlaces.length}</span>
      <span>{tr("tripDay.skipped")}: {experience.skippedPlaces.length}</span>
      {experience.laterPlaces.length > 0 && <span>{tr("tripDay.laterToday")}: {experience.laterPlaces.length}</span>}
      {experience.unscheduledPlaces.length > 0 && <span>{tr("tripDay.unscheduled")}: {experience.unscheduledPlaces.length}</span>}
    </div>
  );
}

function buildCurrencyCodes(destinationCurrency: string, baseCurrency: string) {
  return Array.from(new Set([
    baseCurrency,
    destinationCurrency,
    "USD",
    "EUR",
    "GBP",
    "CAD",
    "MXN",
    "MAD",
    "JPY",
    "BRL"
  ])).filter(Boolean);
}

function freshnessLabel(value: string | null, tr: (key: string) => string) {
  if (value === "live" || value === "recent") return tr("tripDay.current");
  if (value === "dated" || value === "expired") return tr("tripDay.stale");
  return tr("tripDay.current");
}

function sourceFreshnessText(source: string | null, freshness: string, retrievedAt: string | null, tr: (key: string) => string) {
  const parts = [source || tr("tripDay.sourceUnavailable"), freshness];
  if (retrievedAt) parts.push(`${tr("tripDay.lastChecked")} ${formatTimestamp(retrievedAt)}`);
  return parts.filter(Boolean).join(" · ");
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  try {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "UTC"
    }).format(date);
  } catch {
    return value;
  }
}

function temperatureRangeText(day: { temperatureMin: number | null; temperatureMax: number | null }, units: "metric" | "imperial") {
  if (day.temperatureMin === null && day.temperatureMax === null) return "";
  const suffix = units === "imperial" ? "F" : "C";
  if (day.temperatureMin === null) return `${day.temperatureMax}°${suffix}`;
  if (day.temperatureMax === null) return `${day.temperatureMin}°${suffix}`;
  return `${day.temperatureMin}°${suffix} / ${day.temperatureMax}°${suffix}`;
}

function precipitationText(day: { precipitationChance: number | null }) {
  return day.precipitationChance === null ? "" : `${day.precipitationChance}% precip`;
}

function alertTimingText(alert: { effectiveAt?: string; expiresAt?: string }, language: string) {
  const pieces: string[] = [];
  if (alert.effectiveAt) pieces.push(formatDate(alert.effectiveAt.slice(0, 10), language));
  if (alert.expiresAt) pieces.push(formatDate(alert.expiresAt.slice(0, 10), language));
  return pieces.join(" - ");
}

function formatCoordinate(value: number) {
  return Number.isFinite(value) ? value.toFixed(3) : "";
}

function sectionTitle(sectionId: TripDayTimeBlockId, tr: (key: string) => string) {
  if (sectionId === "morning") return tr("tripDay.morning");
  if (sectionId === "afternoon") return tr("tripDay.afternoon");
  if (sectionId === "evening") return tr("tripDay.evening");
  return tr("tripDay.unassigned");
}

function statusLabel(status: TripPlaceVisitStatus, tr: (key: string) => string) {
  if (status === "visited") return tr("tripDay.visited");
  if (status === "skipped") return tr("tripDay.skipped");
  return tr("tripDay.planned");
}

function stateText(state: TripDayExperience["state"], tr: (key: string) => string) {
  if (state === "before_trip") return tr("tripDay.beforeTrip");
  if (state === "today") return tr("tripDay.started");
  if (state === "trip_ended") return tr("tripDay.ended");
  if (state === "undated") return tr("tripDay.undated");
  return tr("tripDay.pageTitle");
}

function formatDate(value: string, language: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  try {
    return new Intl.DateTimeFormat(language, { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(date);
  } catch {
    return value;
  }
}

function readCurrentDateOverride() {
  try {
    const value = window.sessionStorage.getItem(TRIP_DAY_CURRENT_DATE_OVERRIDE_KEY);
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
    const date = new Date(`${value}T12:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? undefined : date;
  } catch {
    return undefined;
  }
}
