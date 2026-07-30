import { useMemo, useState, type ReactNode } from "react";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  Camera,
  ChevronDown,
  Clock,
  Globe2,
  Heart,
  Lock,
  MapPin,
  NotebookTabs,
  Route,
  Search,
  Sparkles
} from "lucide-react";
import { BackButton } from "../components/BackButton";
import { useTravelInsights } from "../hooks/useTravelInsights";
import { useLanguage } from "../LanguageContext";
import type { Tab } from "../main";
import type {
  TravelInsights,
  TravelInsightsCity,
  TravelInsightsCountry,
  TravelInsightsTrip
} from "../lib/travelInsightsTypes";

type Props = {
  onBack: () => void;
  setTab: (tab: Tab) => void;
};

type CountrySort = "trips" | "days" | "places" | "photos" | "journals" | "recent" | "name";
type CitySort = "trips" | "places" | "photos" | "journals" | "recent" | "name";
type TripSort = "recent" | "oldest" | "longest" | "places" | "photos" | "journals" | "favorites";

export function TravelInsightsPage({ onBack, setTab }: Props) {
  const { language, t } = useLanguage();
  const { insights } = useTravelInsights();
  const labels = t as Record<string, string>;
  const translate = (key: string) => labels[key] || key;
  const formatNumber = useMemo(() => numberFormatter(language), [language]);
  const formatDecimal = useMemo(() => decimalFormatter(language), [language]);
  const [yearFilter, setYearFilter] = useState("");
  const [countrySort, setCountrySort] = useState<CountrySort>("trips");
  const [citySort, setCitySort] = useState<CitySort>("trips");
  const [tripSort, setTripSort] = useState<TripSort>("recent");
  const [countryQuery, setCountryQuery] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [tripQuery, setTripQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const activeYear = yearFilter ? Number(yearFilter) : undefined;
  const yearOptions = insights.yearlyActivity.map((year) => year.year);
  const filteredTrips = useMemo(
    () => sortTrips(insights.tripInsights.filter((trip) => (!activeYear || trip.year === activeYear) && matchesText(trip.title, tripQuery)), tripSort),
    [activeYear, insights.tripInsights, tripQuery, tripSort]
  );
  const filteredCountries = useMemo(
    () => sortCountries(insights.countryInsights.filter((country) => matchesText(localizedCountryName(country, language), countryQuery)), countrySort, language),
    [countryQuery, countrySort, insights.countryInsights, language]
  );
  const filteredCities = useMemo(
    () => sortCities(insights.cityInsights.filter((city) => matchesText(city.cityName, cityQuery) || matchesText(city.countryName, cityQuery)), citySort),
    [cityQuery, citySort, insights.cityInsights]
  );
  const hasHistory = insights.summary.completedTrips > 0 || insights.summary.visitedPlaces > 0;

  return (
    <main className="travel-insights-page" dir={language === "ar" ? "rtl" : "ltr"}>
      <header className="travel-insights-topbar">
        <BackButton onBack={onBack} />
        <span><BarChart3 size={18} aria-hidden="true" /> {translate("travelInsights.title")}</span>
      </header>
      <section className="travel-insights-hero">
        <div>
          <p className="insights-private-badge"><Lock size={15} aria-hidden="true" /> {translate("travelInsights.private")}</p>
          <h1>{translate("travelInsights.title")}</h1>
          <p>{translate("travelInsights.subtitle")}</p>
          <strong>{heroHighlight(insights, translate, formatNumber, language)}</strong>
        </div>
        <div className="insights-hero-actions">
          <button className="secondary-btn" type="button" onClick={() => setTab("passport")}><NotebookTabs size={16} /> {translate("travelInsights.viewPassport")}</button>
          <button className="secondary-btn" type="button" onClick={() => setTab("journal")}><BookOpen size={16} /> {translate("travelInsights.viewJournal")}</button>
        </div>
      </section>

      {!hasHistory ? (
        <InsightsEmptyState translate={translate} setTab={setTab} />
      ) : (
        <>
          <section className="insights-toolbar" aria-label={translate("travelInsights.filters")}>
            <label>
              {translate("travelInsights.yearFilter")}
              <select value={yearFilter} onChange={(event) => setYearFilter(event.target.value)}>
                <option value="">{translate("travelInsights.allYears")}</option>
                {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </label>
          </section>

          <section className="insights-summary-grid" aria-label={translate("travelInsights.summary")}>
            <MetricCard icon={<Route size={19} />} label={translate("travelInsights.totalTrips")} value={formatNumber(insights.summary.totalTrips)} />
            <MetricCard icon={<Globe2 size={19} />} label={translate("travelInsights.countriesVisited")} value={formatNumber(insights.summary.countriesVisited)} />
            <MetricCard icon={<MapPin size={19} />} label={translate("travelInsights.citiesVisited")} value={formatNumber(insights.summary.citiesVisited)} />
            <MetricCard icon={<CalendarDays size={19} />} label={translate("travelInsights.travelDays")} value={formatNumber(insights.summary.travelDays)} />
            <MetricCard icon={<Sparkles size={19} />} label={translate("travelInsights.visitedPlaces")} value={formatNumber(insights.summary.visitedPlaces)} />
            <MetricCard icon={<Camera size={19} />} label={translate("travelInsights.photos")} value={formatNumber(insights.summary.photos)} />
            <MetricCard icon={<BookOpen size={19} />} label={translate("travelInsights.journalEntries")} value={formatNumber(insights.summary.journalEntries)} />
            <MetricCard icon={<Heart size={19} />} label={translate("travelInsights.favoriteMoments")} value={formatNumber(insights.summary.favoriteMoments)} />
          </section>

          <TravelHighlights insights={insights} translate={translate} formatNumber={formatNumber} formatDecimal={formatDecimal} language={language} />
          <YearlyActivity insights={insights} activeYear={activeYear} translate={translate} formatNumber={formatNumber} />
          <MonthPattern insights={insights} translate={translate} formatNumber={formatNumber} language={language} />
          <SeasonPattern insights={insights} translate={translate} formatNumber={formatNumber} formatDecimal={formatDecimal} />

          <RankingSection
            id="countries"
            title={translate("travelInsights.countriesSection")}
            query={countryQuery}
            onQuery={setCountryQuery}
            sort={countrySort}
            onSort={(value) => setCountrySort(value as CountrySort)}
            sortOptions={["trips", "days", "places", "photos", "journals", "recent", "name"]}
            expanded={expanded.countries === true}
            onExpanded={() => setExpanded((state) => ({ ...state, countries: !state.countries }))}
            translate={translate}
          >
            <ul className="insights-ranking-list">
              {(expanded.countries ? filteredCountries : filteredCountries.slice(0, 5)).map((country) => (
                <li key={country.countryCode}>
                  <article className="insights-ranking-card">
                    <h3>{flagEmoji(country.countryCode)} {localizedCountryName(country, language)}</h3>
                    <p>{formatNumber(country.tripCount)} {translate("travelInsights.trips")} · {formatNumber(country.cityCount)} {translate("travelInsights.cities")} · {formatNumber(country.visitedPlaceCount)} {translate("travelInsights.places")}</p>
                    <small>{translate("travelInsights.returnVisits")}: {formatNumber(country.returnVisits)} · {translate("travelInsights.photos")}: {formatNumber(country.photoCount)} · {translate("travelInsights.journals")}: {formatNumber(country.journalEntryCount)}</small>
                    <small>{formatDateRange(country.firstVisitDate, country.latestVisitDate, language, translate)}</small>
                  </article>
                </li>
              ))}
            </ul>
          </RankingSection>

          <RankingSection
            id="cities"
            title={translate("travelInsights.citiesSection")}
            query={cityQuery}
            onQuery={setCityQuery}
            sort={citySort}
            onSort={(value) => setCitySort(value as CitySort)}
            sortOptions={["trips", "places", "photos", "journals", "recent", "name"]}
            expanded={expanded.cities === true}
            onExpanded={() => setExpanded((state) => ({ ...state, cities: !state.cities }))}
            translate={translate}
          >
            <ul className="insights-ranking-list">
              {(expanded.cities ? filteredCities : filteredCities.slice(0, 5)).map((city) => (
                <li key={city.id}>
                  <article className="insights-ranking-card">
                    <h3 dir="auto">{city.cityName}</h3>
                    <p>{city.countryName || city.countryCode || translate("travelInsights.unknownDestination")}</p>
                    <small>{formatNumber(city.tripCount)} {translate("travelInsights.trips")} · {formatNumber(city.visitedPlaceCount)} {translate("travelInsights.places")} · {formatNumber(city.photoCount)} {translate("travelInsights.photos")}</small>
                    <small>{translate("travelInsights.journals")}: {formatNumber(city.journalEntryCount)} · {formatDateRange(city.firstVisitDate, city.latestVisitDate, language, translate)}</small>
                  </article>
                </li>
              ))}
            </ul>
          </RankingSection>

          <TripInsightsSection
            trips={filteredTrips}
            expanded={expanded.trips === true}
            onExpanded={() => setExpanded((state) => ({ ...state, trips: !state.trips }))}
            sort={tripSort}
            onSort={setTripSort}
            query={tripQuery}
            onQuery={setTripQuery}
            translate={translate}
            formatNumber={formatNumber}
            language={language}
            setTab={setTab}
          />

          <PhotoInsights insights={insights} translate={translate} formatNumber={formatNumber} formatDecimal={formatDecimal} />
          <JournalInsights insights={insights} translate={translate} formatNumber={formatNumber} formatDecimal={formatDecimal} setTab={setTab} />
          <TravelStreaks insights={insights} translate={translate} formatNumber={formatNumber} />
          <TravelTimeline insights={insights} translate={translate} formatNumber={formatNumber} language={language} />
          <DataQualityNotice insights={insights} translate={translate} formatNumber={formatNumber} />
        </>
      )}
    </main>
  );
}

function TravelHighlights({ insights, translate, formatNumber, formatDecimal, language }: {
  insights: TravelInsights;
  translate: (key: string) => string;
  formatNumber: (value: number) => string;
  formatDecimal: (value: number) => string;
  language: string;
}) {
  const cards = [
    insights.timelineInsights.mostActiveYear && { label: translate("travelInsights.mostActiveYear"), value: String(insights.timelineInsights.mostActiveYear.year), meta: `${formatNumber(insights.timelineInsights.mostActiveYear.tripCount)} ${translate("travelInsights.trips")}` },
    insights.countryInsights[0] && { label: translate("travelInsights.mostVisitedCountry"), value: localizedCountryName(insights.countryInsights[0], language), meta: `${formatNumber(insights.countryInsights[0].tripCount)} ${translate("travelInsights.trips")}` },
    insights.cityInsights[0] && { label: translate("travelInsights.mostVisitedCity"), value: insights.cityInsights[0].cityName, meta: `${formatNumber(insights.cityInsights[0].tripCount)} ${translate("travelInsights.trips")}` },
    insights.photoInsights.tripWithMostPhotos && { label: translate("travelInsights.tripWithMostPhotos"), value: insights.photoInsights.tripWithMostPhotos.title, meta: `${formatNumber(insights.photoInsights.tripWithMostPhotos.photoCount)} ${translate("travelInsights.photos")}` },
    insights.journalInsights.tripWithMostEntries && { label: translate("travelInsights.tripWithMostEntries"), value: insights.journalInsights.tripWithMostEntries.tripTitle, meta: `${formatNumber(insights.journalInsights.tripWithMostEntries.entryCount)} ${translate("travelInsights.entries")}` },
    insights.summary.averageTripLength > 0 && { label: translate("travelInsights.averageTripLength"), value: formatDecimal(insights.summary.averageTripLength), meta: translate("travelInsights.days") }
  ].filter(Boolean) as Array<{ label: string; value: string; meta: string }>;
  if (cards.length === 0) return null;
  return (
    <section className="insights-section" aria-labelledby="insights-highlights-title">
      <h2 id="insights-highlights-title">{translate("travelInsights.highlights")}</h2>
      <div className="insights-highlight-grid">
        {cards.map((card) => <article className="insights-highlight-card" key={card.label}><span>{card.label}</span><strong dir="auto">{card.value}</strong><small>{card.meta}</small></article>)}
      </div>
    </section>
  );
}

function YearlyActivity({ insights, activeYear, translate, formatNumber }: { insights: TravelInsights; activeYear?: number; translate: (key: string) => string; formatNumber: (value: number) => string }) {
  const years = activeYear ? insights.yearlyActivity.filter((year) => year.year === activeYear) : insights.yearlyActivity;
  const maxTrips = Math.max(1, ...years.map((year) => year.tripCount));
  return (
    <section className="insights-section" aria-labelledby="insights-yearly-title">
      <h2 id="insights-yearly-title">{translate("travelInsights.travelByYear")}</h2>
      {years.length === 0 ? <p className="insights-empty-inline">{translate("travelInsights.noYearData")}</p> : (
        <ul className="insights-year-list">
          {years.map((year) => (
            <li key={year.year}>
              <article>
                <strong>{year.year}</strong>
                <div className="insights-bar" aria-hidden="true"><span style={{ inlineSize: `${Math.max(4, (year.tripCount / maxTrips) * 100)}%` }} /></div>
                <p>{formatNumber(year.tripCount)} {translate("travelInsights.trips")} · {formatNumber(year.countryCount)} {translate("travelInsights.countries")} · {formatNumber(year.travelDayCount)} {translate("travelInsights.days")}</p>
                <small>{formatNumber(year.photoCount)} {translate("travelInsights.photos")} · {formatNumber(year.journalEntryCount)} {translate("travelInsights.journals")}</small>
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function MonthPattern({ insights, translate, formatNumber, language }: { insights: TravelInsights; translate: (key: string) => string; formatNumber: (value: number) => string; language: string }) {
  const maxTrips = Math.max(1, ...insights.monthInsights.map((month) => month.tripCount));
  return (
    <section className="insights-section" aria-labelledby="insights-month-title">
      <h2 id="insights-month-title">{translate("travelInsights.monthPattern")}</h2>
      <div className="insights-month-grid">
        {insights.monthInsights.map((month) => (
          <article key={month.month} aria-label={`${monthName(month.month, language, "long")}: ${formatNumber(month.tripCount)} ${translate("travelInsights.trips")}`}>
            <span>{monthName(month.month, language, "short")}</span>
            <strong>{formatNumber(month.tripCount)}</strong>
            <div className="insights-bar" aria-hidden="true"><span style={{ inlineSize: `${month.tripCount ? Math.max(8, (month.tripCount / maxTrips) * 100) : 0}%` }} /></div>
          </article>
        ))}
      </div>
      <p className="insights-supporting">{translate("travelInsights.monthRule")}</p>
    </section>
  );
}

function SeasonPattern({ insights, translate, formatNumber, formatDecimal }: { insights: TravelInsights; translate: (key: string) => string; formatNumber: (value: number) => string; formatDecimal: (value: number) => string }) {
  return (
    <section className="insights-section" aria-labelledby="insights-season-title">
      <h2 id="insights-season-title">{translate("travelInsights.seasonPattern")}</h2>
      <div className="insights-season-grid">
        {insights.seasonInsights.map((season) => (
          <article key={season.season}>
            <span>{translate(`travelInsights.seasons.${season.season}`)}</span>
            <strong>{formatNumber(season.tripCount)}</strong>
            <small>{formatNumber(season.travelDayCount)} {translate("travelInsights.days")} · {formatDecimal(season.shareOfTrips * 100)}%</small>
          </article>
        ))}
      </div>
      <p className="insights-supporting">{translate("travelInsights.seasonNote")}</p>
    </section>
  );
}

function RankingSection({ id, title, query, onQuery, sort, onSort, sortOptions, expanded, onExpanded, translate, children }: {
  id: string;
  title: string;
  query: string;
  onQuery: (value: string) => void;
  sort: string;
  onSort: (value: string) => void;
  sortOptions: string[];
  expanded: boolean;
  onExpanded: () => void;
  translate: (key: string) => string;
  children: ReactNode;
}) {
  return (
    <section className="insights-section" aria-labelledby={`${id}-title`}>
      <div className="insights-section-header">
        <h2 id={`${id}-title`}>{title}</h2>
        <button className="text-link-btn" type="button" aria-expanded={expanded} aria-controls={`${id}-content`} onClick={onExpanded}>
          {expanded ? translate("travelInsights.showLess") : translate("travelInsights.viewAll")} <ChevronDown size={16} aria-hidden="true" />
        </button>
      </div>
      <div className="insights-controls">
        <label><Search size={15} aria-hidden="true" /> {translate("travelInsights.search")}<input value={query} onChange={(event) => onQuery(event.target.value)} /></label>
        <label>{translate("travelInsights.sortBy")}<select value={sort} onChange={(event) => onSort(event.target.value)}>{sortOptions.map((option) => <option key={option} value={option}>{translate(`travelInsights.sort.${option}`)}</option>)}</select></label>
      </div>
      <div id={`${id}-content`}>{children}</div>
    </section>
  );
}

function TripInsightsSection({ trips, expanded, onExpanded, sort, onSort, query, onQuery, translate, formatNumber, language, setTab }: {
  trips: TravelInsightsTrip[];
  expanded: boolean;
  onExpanded: () => void;
  sort: TripSort;
  onSort: (value: TripSort) => void;
  query: string;
  onQuery: (value: string) => void;
  translate: (key: string) => string;
  formatNumber: (value: number) => string;
  language: string;
  setTab: (tab: Tab) => void;
}) {
  return (
    <RankingSection id="trips" title={translate("travelInsights.tripComparisons")} query={query} onQuery={onQuery} sort={sort} onSort={(value) => onSort(value as TripSort)} sortOptions={["recent", "oldest", "longest", "places", "photos", "journals", "favorites"]} expanded={expanded} onExpanded={onExpanded} translate={translate}>
      <ul className="insights-trip-list">
        {(expanded ? trips : trips.slice(0, 5)).map((trip) => (
          <li key={trip.tripDraftId}>
            <article className="insights-trip-card">
              <h3 dir="auto">{trip.title}</h3>
              <p>{formatDateRange(trip.startDate, trip.endDate, language, translate)}</p>
              <small>{formatNumber(trip.durationDays)} {translate("travelInsights.days")} · {formatNumber(trip.visitedPlaceCount)} {translate("travelInsights.places")} · {formatNumber(trip.photoCount)} {translate("travelInsights.photos")} · {formatNumber(trip.journalEntryCount)} {translate("travelInsights.journals")}</small>
              <small>{trip.countryNames.join(" · ") || translate("travelInsights.unknownDestination")} · {trip.season ? translate(`travelInsights.seasons.${trip.season}`) : translate("travelInsights.notEnoughData")}</small>
              <button className="secondary-btn" type="button" onClick={() => setTab("tripDrafts")}>{translate("travelInsights.viewTrip")}</button>
            </article>
          </li>
        ))}
      </ul>
    </RankingSection>
  );
}

function PhotoInsights({ insights, translate, formatNumber, formatDecimal }: { insights: TravelInsights; translate: (key: string) => string; formatNumber: (value: number) => string; formatDecimal: (value: number) => string }) {
  return (
    <section className="insights-section" aria-labelledby="photo-insights-title">
      <h2 id="photo-insights-title">{translate("travelInsights.photoMemories")}</h2>
      <div className="insights-summary-grid compact">
        <MetricCard icon={<Camera size={18} />} label={translate("travelInsights.totalPhotos")} value={formatNumber(insights.photoInsights.totalPhotos)} />
        <MetricCard icon={<Route size={18} />} label={translate("travelInsights.tripsWithPhotos")} value={formatNumber(insights.photoInsights.tripsWithPhotos)} />
        <MetricCard icon={<Clock size={18} />} label={translate("travelInsights.avgPhotosTrip")} value={formatDecimal(insights.photoInsights.averagePhotosPerCompletedTrip)} />
        <MetricCard icon={<CalendarDays size={18} />} label={translate("travelInsights.avgPhotosDay")} value={formatDecimal(insights.photoInsights.averagePhotosPerTravelDay)} />
      </div>
      <p className="insights-supporting">{translate("travelInsights.photoDisclosure")}</p>
    </section>
  );
}

function JournalInsights({ insights, translate, formatNumber, formatDecimal, setTab }: { insights: TravelInsights; translate: (key: string) => string; formatNumber: (value: number) => string; formatDecimal: (value: number) => string; setTab: (tab: Tab) => void }) {
  return (
    <section className="insights-section" aria-labelledby="journal-insights-title">
      <div className="insights-section-header">
        <h2 id="journal-insights-title">{translate("travelInsights.journalActivity")}</h2>
        <button className="text-link-btn" type="button" onClick={() => setTab("journal")}>{translate("travelInsights.viewJournal")}</button>
      </div>
      <div className="insights-summary-grid compact">
        <MetricCard icon={<BookOpen size={18} />} label={translate("travelInsights.totalEntries")} value={formatNumber(insights.journalInsights.totalEntries)} />
        <MetricCard icon={<Sparkles size={18} />} label={translate("travelInsights.completedEntries")} value={formatNumber(insights.journalInsights.completedEntries)} />
        <MetricCard icon={<NotebookTabs size={18} />} label={translate("travelInsights.draftEntries")} value={formatNumber(insights.journalInsights.draftEntries)} />
        <MetricCard icon={<Heart size={18} />} label={translate("travelInsights.favoriteEntries")} value={formatNumber(insights.journalInsights.favoriteEntries)} />
        <MetricCard icon={<Route size={18} />} label={translate("travelInsights.tripsWithoutJournals")} value={formatNumber(insights.journalInsights.completedTripsWithoutJournals)} />
        <MetricCard icon={<Clock size={18} />} label={translate("travelInsights.avgEntryLength")} value={formatDecimal(insights.journalInsights.averageEntryLength)} context={translate("travelInsights.characters")} />
      </div>
    </section>
  );
}

function TravelStreaks({ insights, translate, formatNumber }: { insights: TravelInsights; translate: (key: string) => string; formatNumber: (value: number) => string }) {
  return (
    <section className="insights-section" aria-labelledby="streaks-title">
      <h2 id="streaks-title">{translate("travelInsights.travelOverTime")}</h2>
      <div className="insights-summary-grid compact">
        <MetricCard icon={<CalendarDays size={18} />} label={translate("travelInsights.activeYears")} value={formatNumber(insights.travelPatterns.streaks.activeYears.length)} />
        <MetricCard icon={<Route size={18} />} label={translate("travelInsights.consecutiveYears")} value={formatNumber(insights.travelPatterns.streaks.longestConsecutiveYearStreak)} />
        <MetricCard icon={<Globe2 size={18} />} label={translate("travelInsights.countriesRevisited")} value={formatNumber(insights.travelPatterns.streaks.countriesRevisited)} />
        <MetricCard icon={<MapPin size={18} />} label={translate("travelInsights.citiesRevisited")} value={formatNumber(insights.travelPatterns.streaks.citiesRevisited)} />
      </div>
      {insights.timelineInsights.longestGapDays && <p className="insights-supporting">{translate("travelInsights.longestGap").replace("{days}", formatNumber(insights.timelineInsights.longestGapDays))}</p>}
    </section>
  );
}

function TravelTimeline({ insights, translate, formatNumber, language }: { insights: TravelInsights; translate: (key: string) => string; formatNumber: (value: number) => string; language: string }) {
  return (
    <section className="insights-section" aria-labelledby="timeline-title">
      <h2 id="timeline-title">{translate("travelInsights.timeline")}</h2>
      <ol className="insights-timeline">
        {insights.yearlyActivity.map((year) => (
          <li key={year.year}>
            <article>
              <h3>{year.year}</h3>
              <p>{formatNumber(year.tripCount)} {translate("travelInsights.trips")} · {formatNumber(year.countryCount)} {translate("travelInsights.countries")} · {formatNumber(year.travelDayCount)} {translate("travelInsights.days")}</p>
              <ul>
                {insights.tripInsights.filter((trip) => trip.year === year.year).slice(0, 4).map((trip) => (
                  <li key={trip.tripDraftId}><strong dir="auto">{trip.title}</strong><span>{formatDateRange(trip.startDate, trip.endDate, language, translate)} · {formatNumber(trip.visitedPlaceCount)} {translate("travelInsights.places")}</span></li>
                ))}
              </ul>
            </article>
          </li>
        ))}
      </ol>
    </section>
  );
}

function DataQualityNotice({ insights, translate, formatNumber }: { insights: TravelInsights; translate: (key: string) => string; formatNumber: (value: number) => string }) {
  const entries = Object.entries(insights.dataQuality).filter(([, value]) => value > 0);
  if (entries.length === 0) return null;
  return (
    <section className="insights-quality" aria-labelledby="quality-title">
      <details>
        <summary id="quality-title">{translate("travelInsights.qualityTitle")}</summary>
        <p>{translate("travelInsights.qualityDescription")}</p>
        <ul>
          {entries.map(([key, value]) => <li key={key}>{translate(`travelInsights.quality.${key}`)}: {formatNumber(value)}</li>)}
        </ul>
      </details>
    </section>
  );
}

function InsightsEmptyState({ translate, setTab }: { translate: (key: string) => string; setTab: (tab: Tab) => void }) {
  return (
    <section className="insights-empty-state">
      <BarChart3 size={36} aria-hidden="true" />
      <h2>{translate("travelInsights.emptyTitle")}</h2>
      <p>{translate("travelInsights.emptyDescription")}</p>
      <button className="primary-btn" type="button" onClick={() => setTab("tripDrafts")}>{translate("travelInsights.openPlanner")}</button>
    </section>
  );
}

function MetricCard({ icon, label, value, context }: { icon: ReactNode; label: string; value: string; context?: string }) {
  return <article className="insights-metric-card" aria-label={`${label}: ${value}`}>{icon}<strong>{value}</strong><span>{label}</span>{context && <small>{context}</small>}</article>;
}

function heroHighlight(insights: TravelInsights, translate: (key: string) => string, formatNumber: (value: number) => string, language: string) {
  if (insights.travelPatterns.streaks.longestConsecutiveYearStreak > 1) return translate("travelInsights.highlight.streak").replace("{count}", formatNumber(insights.travelPatterns.streaks.longestConsecutiveYearStreak));
  if (insights.timelineInsights.mostActiveYear) return translate("travelInsights.highlight.year").replace("{year}", String(insights.timelineInsights.mostActiveYear.year));
  if (insights.countryInsights[0]) return translate("travelInsights.highlight.country").replace("{country}", localizedCountryName(insights.countryInsights[0], language));
  if (insights.summary.longestTripDays > 0) return translate("travelInsights.highlight.longest").replace("{days}", formatNumber(insights.summary.longestTripDays));
  if (insights.travelPatterns.mostActiveSeason) return translate("travelInsights.highlight.season").replace("{season}", translate(`travelInsights.seasons.${insights.travelPatterns.mostActiveSeason.season}`));
  if (insights.timelineInsights.firstTrip) return translate("travelInsights.highlight.first").replace("{trip}", insights.timelineInsights.firstTrip.title);
  return translate("travelInsights.highlight.empty");
}

function sortCountries(countries: readonly TravelInsightsCountry[], sort: CountrySort, language: string) {
  return [...countries].sort((a, b) => {
    if (sort === "days") return b.travelDayCount - a.travelDayCount || localizedCountryName(a, language).localeCompare(localizedCountryName(b, language));
    if (sort === "places") return b.visitedPlaceCount - a.visitedPlaceCount || localizedCountryName(a, language).localeCompare(localizedCountryName(b, language));
    if (sort === "photos") return b.photoCount - a.photoCount || localizedCountryName(a, language).localeCompare(localizedCountryName(b, language));
    if (sort === "journals") return b.journalEntryCount - a.journalEntryCount || localizedCountryName(a, language).localeCompare(localizedCountryName(b, language));
    if (sort === "recent") return compareDateDesc(a.latestVisitDate, b.latestVisitDate) || localizedCountryName(a, language).localeCompare(localizedCountryName(b, language));
    if (sort === "name") return localizedCountryName(a, language).localeCompare(localizedCountryName(b, language));
    return b.tripCount - a.tripCount || localizedCountryName(a, language).localeCompare(localizedCountryName(b, language));
  });
}

function sortCities(cities: readonly TravelInsightsCity[], sort: CitySort) {
  return [...cities].sort((a, b) => {
    if (sort === "places") return b.visitedPlaceCount - a.visitedPlaceCount || a.cityName.localeCompare(b.cityName);
    if (sort === "photos") return b.photoCount - a.photoCount || a.cityName.localeCompare(b.cityName);
    if (sort === "journals") return b.journalEntryCount - a.journalEntryCount || a.cityName.localeCompare(b.cityName);
    if (sort === "recent") return compareDateDesc(a.latestVisitDate, b.latestVisitDate) || a.cityName.localeCompare(b.cityName);
    if (sort === "name") return a.cityName.localeCompare(b.cityName);
    return b.tripCount - a.tripCount || a.cityName.localeCompare(b.cityName);
  });
}

function sortTrips(trips: readonly TravelInsightsTrip[], sort: TripSort) {
  return [...trips].sort((a, b) => {
    if (sort === "oldest") return compareTripDates(a, b, "asc");
    if (sort === "longest") return b.durationDays - a.durationDays || a.title.localeCompare(b.title);
    if (sort === "places") return b.visitedPlaceCount - a.visitedPlaceCount || a.title.localeCompare(b.title);
    if (sort === "photos") return b.photoCount - a.photoCount || a.title.localeCompare(b.title);
    if (sort === "journals") return b.journalEntryCount - a.journalEntryCount || a.title.localeCompare(b.title);
    if (sort === "favorites") return b.favoriteEntryCount - a.favoriteEntryCount || a.title.localeCompare(b.title);
    return compareTripDates(a, b, "desc");
  });
}

function compareTripDates(a: TravelInsightsTrip, b: TravelInsightsTrip, direction: "asc" | "desc") {
  const left = a.endDate || a.startDate;
  const right = b.endDate || b.startDate;
  if (left && right && left !== right) return direction === "desc" ? right.localeCompare(left) : left.localeCompare(right);
  if (left && !right) return -1;
  if (!left && right) return 1;
  return a.title.localeCompare(b.title);
}

function compareDateDesc(left?: string, right?: string) {
  if (left && right && left !== right) return right.localeCompare(left);
  if (left && !right) return -1;
  if (!left && right) return 1;
  return 0;
}

function localizedCountryName(country: TravelInsightsCountry, language: string) {
  try {
    return new Intl.DisplayNames([localeForLanguage(language)], { type: "region" }).of(country.countryCode) || country.displayName;
  } catch {
    return country.displayName || country.countryCode;
  }
}

function flagEmoji(countryCode: string) {
  return /^[A-Z]{2}$/.test(countryCode)
    ? String.fromCodePoint(...countryCode.split("").map((char) => 127397 + char.charCodeAt(0)))
    : "";
}

function matchesText(value: unknown, query: string) {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return true;
  return typeof value === "string" && value.toLocaleLowerCase().includes(normalized);
}

function numberFormatter(language: string) {
  const formatter = new Intl.NumberFormat(localeForLanguage(language), { maximumFractionDigits: 0 });
  return (value: number) => formatter.format(Math.max(0, Math.floor(Number.isFinite(value) ? value : 0)));
}

function decimalFormatter(language: string) {
  const formatter = new Intl.NumberFormat(localeForLanguage(language), { maximumFractionDigits: 1 });
  return (value: number) => formatter.format(Math.max(0, Number.isFinite(value) ? value : 0));
}

function monthName(month: number, language: string, width: "short" | "long") {
  return new Intl.DateTimeFormat(localeForLanguage(language), { month: width, timeZone: "UTC" }).format(new Date(Date.UTC(2026, month - 1, 1)));
}

function formatDate(value: string, language: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(localeForLanguage(language), { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" }).format(new Date(Date.UTC(year, month - 1, day)));
}

function formatDateRange(startDate: string | undefined, endDate: string | undefined, language: string, translate: (key: string) => string) {
  if (startDate && endDate && startDate !== endDate) return `${formatDate(startDate, language)} - ${formatDate(endDate, language)}`;
  if (startDate || endDate) return formatDate(startDate || endDate || "", language);
  return translate("travelInsights.notEnoughData");
}

function localeForLanguage(language: string) {
  if (language === "es") return "es-ES";
  if (language === "fr") return "fr-FR";
  if (language === "ar") return "ar-MA";
  if (language === "pt") return "pt-PT";
  return "en-US";
}
