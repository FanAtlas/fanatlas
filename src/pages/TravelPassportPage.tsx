import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  Award,
  Building2,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Globe2,
  Lock,
  MapPin,
  NotebookTabs,
  Plane,
  RotateCcw,
  Stamp
} from "lucide-react";
import { BackButton } from "../components/BackButton";
import { useLanguage } from "../LanguageContext";
import { useTripDrafts } from "../hooks/useTripDrafts";
import { deriveTravelPassport, getPassportStampRotation } from "../lib/travelPassport";
import type {
  TravelPassportAchievement,
  TravelPassportCityEntry,
  TravelPassportCountryEntry,
  TravelPassportTimelineEntry
} from "../lib/travelPassportTypes";
import type { Tab } from "../main";

type Props = {
  onBack: () => void;
  setTab: (tab: Tab) => void;
  displayName?: string;
};

export function TravelPassportPage({ onBack, setTab, displayName }: Props) {
  const { language, t } = useLanguage();
  const { drafts, refreshDrafts } = useTripDrafts([]);
  const [showAllCities, setShowAllCities] = useState(false);
  const [showQualityDetails, setShowQualityDetails] = useState(false);
  const currentDate = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const passport = useMemo(() => deriveTravelPassport(drafts, { currentDate }), [currentDate, drafts]);
  const formatNumber = useMemo(() => numberFormatter(language), [language]);
  const hasHistory = passport.summary.totalTripsCompleted > 0 || passport.summary.totalVisitedPlaces > 0;
  const title = displayName
    ? translate(t, "travelPassport.namedTitle").replace("{displayName}", displayName)
    : translate(t, "travelPassport.yourTitle");
  const visibleCities = showAllCities ? passport.cities : passport.cities.slice(0, 8);
  const qualityIssueCount = Object.entries(passport.dataQuality)
    .filter(([key]) => key !== "visitedReferencesProcessed")
    .reduce((sum, [, value]) => sum + Number(value || 0), 0);

  return (
    <div className="travel-passport-page" dir={language === "ar" ? "rtl" : "ltr"}>
      <header className="travel-passport-page__header">
        <BackButton onBack={onBack} />
        <div>
          <p className="passport-private-indicator"><Lock size={15} aria-hidden="true" /> {translate(t, "travelPassport.private")}</p>
          <h1>{title}</h1>
          <p>{translate(t, "travelPassport.subtitle")}</p>
        </div>
      </header>

      <main className="travel-passport-page__main" id="passport-main">
        {!hasHistory ? (
          <>
            <PassportEmptyState setTab={setTab} />
            <PassportAchievements achievements={passport.achievements.slice(0, 3)} formatNumber={formatNumber} />
          </>
        ) : (
          <>
            <section className="travel-passport-hero" aria-label={translate(t, "travelPassport.title")}>
              <div className="travel-passport-hero__identity">
                <NotebookTabs size={32} aria-hidden="true" />
                <div>
                  <span>FanAtlas</span>
                  <h2>{translate(t, "travelPassport.title")}</h2>
                  {passport.summary.firstTravelDate && (
                    <p>{translate(t, "travelPassport.exploringSince").replace("{date}", formatMonthYear(passport.summary.firstTravelDate, language))}</p>
                  )}
                </div>
              </div>
              <div className="travel-passport-hero__metrics">
                <HeroMetric value={passport.summary.totalCountriesVisited} label={translate(t, "travelPassport.countriesVisited")} formatNumber={formatNumber} />
                <HeroMetric value={passport.summary.totalTripsCompleted} label={translate(t, "travelPassport.completedTrips")} formatNumber={formatNumber} />
                <HeroMetric value={passport.summary.totalMemories} label={translate(t, "travelPassport.memories")} formatNumber={formatNumber} />
              </div>
            </section>

            <PassportSummaryGrid summary={passport.summary} formatNumber={formatNumber} />
            {passport.countries.length > 0 ? (
              <PassportStampCollection countries={passport.countries} language={language} formatNumber={formatNumber} />
            ) : (
              <PartialNotice icon={<Stamp size={18} />} title={translate(t, "travelPassport.noStamps")} />
            )}
            <PassportTimeline timeline={passport.timeline} language={language} formatNumber={formatNumber} setTab={setTab} />
            <PassportAchievements achievements={passport.achievements} formatNumber={formatNumber} />
            {passport.cities.length > 0 && (
              <PassportCityList
                cities={visibleCities}
                totalCount={passport.cities.length}
                expanded={showAllCities}
                onToggle={() => setShowAllCities((value) => !value)}
                language={language}
                formatNumber={formatNumber}
              />
            )}
            {passport.yearlySummaries.length > 0 && (
              <section className="passport-yearly-summary" aria-labelledby="passport-years-title">
                <h2 id="passport-years-title">{translate(t, "travelPassport.travelByYear")}</h2>
                <div className="passport-year-grid">
                  {passport.yearlySummaries.map((year) => (
                    <article className="passport-year-card" key={year.year}>
                      <h3>{formatNumber(year.year)}</h3>
                      <p>{formatNumber(year.completedTripCount)} {unit(t, "trip", year.completedTripCount)}</p>
                      <p>{formatNumber(year.countryCount)} {unit(t, "country", year.countryCount)} · {formatNumber(year.cityCount)} {unit(t, "city", year.cityCount)}</p>
                      <p>{formatNumber(year.visitedPlaceCount)} {unit(t, "place", year.visitedPlaceCount)} · {formatNumber(year.memoryCount)} {unit(t, "memory", year.memoryCount)}</p>
                    </article>
                  ))}
                </div>
              </section>
            )}
            {qualityIssueCount > 0 && (
              <section className="passport-data-quality" aria-labelledby="passport-quality-title">
                <div>
                  <h2 id="passport-quality-title">{translate(t, "travelPassport.incompleteTitle")}</h2>
                  <p>{translate(t, "travelPassport.incompleteDescription")}</p>
                </div>
                <button type="button" className="mini-btn" onClick={() => setShowQualityDetails((value) => !value)} aria-expanded={showQualityDetails}>
                  {showQualityDetails ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
                  {showQualityDetails ? translate(t, "travelPassport.hideDetails") : translate(t, "travelPassport.showDetails")}
                </button>
                {showQualityDetails && (
                  <ul>
                    {passport.dataQuality.unresolvedCountryCount > 0 && <li>{formatNumber(passport.dataQuality.unresolvedCountryCount)} {translate(t, "travelPassport.missingCountryDetails")}</li>}
                    {passport.dataQuality.unresolvedCityCount > 0 && <li>{formatNumber(passport.dataQuality.unresolvedCityCount)} {translate(t, "travelPassport.missingCityDetails")}</li>}
                    {passport.dataQuality.invalidDateCount > 0 && <li>{formatNumber(passport.dataQuality.invalidDateCount)} {translate(t, "travelPassport.incompleteDates")}</li>}
                    {passport.dataQuality.unavailableReferenceCount > 0 && <li>{formatNumber(passport.dataQuality.unavailableReferenceCount)} {translate(t, "travelPassport.unavailablePlaces")}</li>}
                  </ul>
                )}
              </section>
            )}
          </>
        )}

        <button type="button" className="passport-refresh" onClick={refreshDrafts}>
          <RotateCcw size={16} aria-hidden="true" /> {translate(t, "refresh")}
        </button>
      </main>
    </div>
  );
}

function PassportSummaryGrid({ summary, formatNumber }: { summary: any; formatNumber: (value: number) => string }) {
  const { t } = useLanguage();
  const cards = [
    { label: translate(t, "travelPassport.countriesVisited"), value: summary.totalCountriesVisited, icon: Globe2 },
    { label: translate(t, "travelPassport.citiesExplored"), value: summary.totalCitiesVisited, icon: Building2 },
    { label: translate(t, "travelPassport.completedTrips"), value: summary.totalTripsCompleted, icon: Plane },
    { label: translate(t, "travelPassport.placesVisited"), value: summary.totalVisitedPlaces, icon: MapPin },
    { label: translate(t, "travelPassport.travelDays"), value: summary.totalTravelDays, icon: CalendarDays },
    { label: translate(t, "travelPassport.memories"), value: summary.totalMemories, icon: Camera }
  ];
  return (
    <section className="passport-summary-grid" aria-label={translate(t, "travelPassport.summary")}>
      {cards.map(({ label, value, icon: Icon }) => (
        <article className="passport-summary-card" key={label}>
          <Icon size={19} aria-hidden="true" />
          <strong>{formatNumber(value)}</strong>
          <span>{label}</span>
        </article>
      ))}
    </section>
  );
}

function PassportStampCollection({ countries, language, formatNumber }: { countries: TravelPassportCountryEntry[]; language: string; formatNumber: (value: number) => string }) {
  const { t } = useLanguage();
  return (
    <section className="passport-stamp-collection" aria-labelledby="passport-stamps-title">
      <div className="passport-section-heading">
        <h2 id="passport-stamps-title">{translate(t, "travelPassport.stamps")}</h2>
        <p>{translate(t, "travelPassport.stampsDescription")}</p>
      </div>
      <ul className="passport-stamp-grid">
        {countries.map((country) => (
          <li key={country.countryCode}>
            <article
              className="passport-stamp"
              style={{ "--stamp-rotation": `${getPassportStampRotation(country.countryCode)}deg` } as CSSProperties}
              aria-label={`${localizedCountryName(country.countryCode, language, country.displayName)}. ${formatNumber(country.tripCount)} ${unit(t, "trip", country.tripCount)}, ${formatNumber(country.cityCount)} ${unit(t, "city", country.cityCount)}, ${formatNumber(country.visitedPlaceCount)} ${unit(t, "place", country.visitedPlaceCount)}, ${formatNumber(country.memoryCount)} ${unit(t, "memory", country.memoryCount)}.`}
            >
              <div className="passport-stamp__header">
                <span aria-hidden="true">{flagFromCountryCode(country.countryCode)}</span>
                <strong>{country.countryCode}</strong>
              </div>
              <h3>{localizedCountryName(country.countryCode, language, country.displayName)}</h3>
              <p>FanAtlas {translate(t, "travelPassport.stamp")}</p>
              <dl>
                <div><dt>{translate(t, "travelPassport.firstVisited")}</dt><dd>{formatMonthYear(country.firstVisitDate, language) || translate(t, "travelPassport.dateUnavailable")}</dd></div>
                <div><dt>{translate(t, "travelPassport.trips")}</dt><dd>{formatNumber(country.tripCount)}</dd></div>
                <div><dt>{translate(t, "travelPassport.places")}</dt><dd>{formatNumber(country.visitedPlaceCount)}</dd></div>
              </dl>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PassportTimeline({ timeline, language, formatNumber, setTab }: { timeline: TravelPassportTimelineEntry[]; language: string; formatNumber: (value: number) => string; setTab: (tab: Tab) => void }) {
  const { t } = useLanguage();
  const groups = groupTimelineByYear(timeline);
  return (
    <section className="passport-timeline" aria-labelledby="passport-timeline-title">
      <div className="passport-section-heading">
        <h2 id="passport-timeline-title">{translate(t, "travelPassport.timeline")}</h2>
        {timeline.length === 0 && <p>{translate(t, "travelPassport.noJourneys")}</p>}
      </div>
      {groups.map((group) => (
        <div className="passport-timeline__year" key={group.label}>
          <h3>{group.label}</h3>
          <ul>
            {group.items.map((trip) => (
              <li key={trip.tripDraftId}>
                <article className="passport-timeline__entry">
                  <span className="passport-timeline__marker" aria-hidden="true" />
                  <div>
                    <h4>{trip.title}</h4>
                    <p>{formatDateRange(trip.startDate, trip.endDate, language, t)}</p>
                    <p>{trip.countryNames.length ? trip.countryNames.map((name, index) => localizedCountryName(trip.countryCodes[index], language, name)).join(" · ") : translate(t, "travelPassport.locationUnavailable")}</p>
                    <small>{translate(t, "travelPassport.completed")} · {formatNumber(trip.visitedPlaceCount)} {unit(t, "place", trip.visitedPlaceCount)} · {formatNumber(trip.memoryCount)} {unit(t, "memory", trip.memoryCount)} · {formatNumber(trip.travelDayCount)} {unit(t, "day", trip.travelDayCount)}</small>
                    <button type="button" className="text-link-btn" onClick={() => setTab("tripDrafts")}>{translate(t, "travelPassport.viewTripDrafts")}</button>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function PassportAchievements({ achievements, formatNumber }: { achievements: TravelPassportAchievement[]; formatNumber: (value: number) => string }) {
  const { t } = useLanguage();
  return (
    <section className="passport-achievements" aria-labelledby="passport-achievements-title">
      <div className="passport-section-heading">
        <h2 id="passport-achievements-title">{translate(t, "travelPassport.milestones")}</h2>
        <p>{translate(t, "travelPassport.milestonesDescription")}</p>
      </div>
      <ul className="passport-achievement-grid">
        {achievements.map((achievement) => (
          <li key={achievement.id}>
            <article className={`passport-achievement-card ${achievement.completed ? "passport-achievement-card--completed" : ""}`}>
              <Award size={20} aria-hidden="true" />
              <h3>{translate(t, achievement.titleKey)}</h3>
              <p>{translate(t, achievement.descriptionKey)}</p>
              <strong>{translate(t, "travelPassport.ofProgress").replace("{current}", formatNumber(achievement.current)).replace("{target}", formatNumber(achievement.target))}</strong>
              <div
                className="passport-achievement-progress"
                role="progressbar"
                aria-label={`${translate(t, achievement.titleKey)} ${translate(t, "travelPassport.progress")}`}
                aria-valuemin={0}
                aria-valuemax={achievement.target}
                aria-valuenow={Math.min(achievement.current, achievement.target)}
              >
                <span style={{ inlineSize: `${achievement.progressPercent}%` }} />
              </div>
              <small>{achievement.completed ? <><CheckCircle2 size={14} aria-hidden="true" /> {translate(t, "travelPassport.milestoneReached")}</> : translate(t, "travelPassport.inProgress")}</small>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PassportCityList({ cities, totalCount, expanded, onToggle, language, formatNumber }: { cities: TravelPassportCityEntry[]; totalCount: number; expanded: boolean; onToggle: () => void; language: string; formatNumber: (value: number) => string }) {
  const { t } = useLanguage();
  return (
    <section className="passport-city-list" aria-labelledby="passport-cities-title">
      <div className="passport-section-heading">
        <h2 id="passport-cities-title">{translate(t, "travelPassport.citiesExplored")}</h2>
      </div>
      <ul>
        {cities.map((city) => (
          <li className="passport-city-row" key={city.id}>
            <Building2 size={18} aria-hidden="true" />
            <span><strong>{city.cityName}{city.countryCode ? `, ${localizedCountryName(city.countryCode, language, city.countryName)}` : ""}</strong><small>{formatNumber(city.tripCount)} {unit(t, "trip", city.tripCount)} · {formatNumber(city.visitedPlaceCount)} {unit(t, "place", city.visitedPlaceCount)} · {formatNumber(city.memoryCount)} {unit(t, "memory", city.memoryCount)}</small></span>
            <em>{formatMonthYear(city.latestVisitDate, language)}</em>
          </li>
        ))}
      </ul>
      {totalCount > 8 && (
        <button type="button" className="mini-btn" onClick={onToggle} aria-expanded={expanded}>
          {expanded ? translate(t, "travelPassport.hideDetails") : translate(t, "travelPassport.viewAllCities")}
        </button>
      )}
    </section>
  );
}

function PassportEmptyState({ setTab }: { setTab: (tab: Tab) => void }) {
  const { t } = useLanguage();
  return (
    <section className="passport-empty-state">
      <Globe2 size={42} aria-hidden="true" />
      <h2>{translate(t, "travelPassport.emptyTitle")}</h2>
      <p>{translate(t, "travelPassport.emptyDescription")}</p>
      <button type="button" className="primary-btn" onClick={() => setTab("tripDrafts")}>
        {translate(t, "travelPassport.viewTripDrafts")}
      </button>
      <small>{translate(t, "travelPassport.emptyPrivacy")}</small>
    </section>
  );
}

function HeroMetric({ value, label, formatNumber }: { value: number; label: string; formatNumber: (value: number) => string }) {
  return <span><strong>{formatNumber(value)}</strong>{label}</span>;
}

function PartialNotice({ icon, title }: { icon: ReactNode; title: string }) {
  return <section className="passport-partial-notice">{icon}<p>{title}</p></section>;
}

function translate(t: Record<string, string>, key: string) {
  return t[key] || key;
}

function numberFormatter(language: string) {
  try {
    const formatter = new Intl.NumberFormat(localeForLanguage(language));
    return (value: number) => formatter.format(Math.max(0, Math.floor(value)));
  } catch {
    return (value: number) => String(Math.max(0, Math.floor(value)));
  }
}

function localizedCountryName(code: string | undefined, language: string, fallback?: string) {
  if (!code) return fallback || "";
  try {
    const displayNames = new Intl.DisplayNames([localeForLanguage(language)], { type: "region" });
    return displayNames.of(code) || fallback || code;
  } catch {
    return fallback || code;
  }
}

function formatMonthYear(value: string | undefined, language: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  try {
    const [year, month, day] = value.split("-").map(Number);
    return new Intl.DateTimeFormat(localeForLanguage(language), { timeZone: "UTC", month: "short", year: "numeric", day: "numeric" }).format(new Date(Date.UTC(year, month - 1, day)));
  } catch {
    return "";
  }
}

function formatDateRange(startDate: string | undefined, endDate: string | undefined, language: string, t: Record<string, string>) {
  const start = formatMonthYear(startDate, language);
  const end = formatMonthYear(endDate, language);
  if (start && end && start !== end) return `${start} - ${end}`;
  if (start) return start;
  if (end) return end;
  return translate(t, "travelPassport.dateUnavailable");
}

function groupTimelineByYear(timeline: TravelPassportTimelineEntry[]) {
  const groups = new Map<string, TravelPassportTimelineEntry[]>();
  timeline.forEach((entry) => {
    const label = entry.year ? String(entry.year) : "Date unavailable";
    groups.set(label, [...(groups.get(label) || []), entry]);
  });
  return [...groups.entries()].map(([label, items]) => ({ label, items }));
}

function flagFromCountryCode(code: string) {
  return /^[A-Z]{2}$/.test(code)
    ? code.replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    : "";
}

function unit(t: Record<string, string>, key: "trip" | "country" | "city" | "place" | "memory" | "day", count: number) {
  const suffix = count === 1 ? "One" : "Many";
  return translate(t, `travelPassport.units.${key}${suffix}`);
}

function localeForLanguage(language: string) {
  if (language === "ar") return "ar-MA";
  if (language === "fr") return "fr-FR";
  if (language === "es") return "es-ES";
  if (language === "pt") return "pt-PT";
  return "en-US";
}
