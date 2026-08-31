import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  CirclePause,
  CirclePlay,
  FastForward,
  Globe2,
  LocateFixed,
  Lock,
  MapPinned,
  RotateCcw,
  Search,
  Square,
  StepBack,
  StepForward
} from "lucide-react";
import { useLanguage } from "../LanguageContext";
import { useTravelExplorer } from "../hooks/useTravelExplorer";
import { destinationHubTranslate } from "../lib/destinationHubI18n";
import type { Tab } from "../main";
import type {
  TravelExplorerCity,
  TravelExplorerCountry,
  TravelExplorerRoute,
  TravelExplorerTrip
} from "../lib/travelExplorerTypes";
import {
  buildTravelReplaySteps,
  filterTravelExplorer,
  getCityTravelDays,
  getCountryTravelDays,
  getFrequencyLevel,
  getTravelYearsForTripIds,
  getTripTravelDays,
  projectExplorerCoordinate,
  sortExplorerCities,
  sortExplorerCountries,
  sortExplorerTrips,
  type ExplorerBrowserTab,
  type ExplorerCountrySort,
  type ExplorerMapMode,
  type ExplorerSelection,
  type ExplorerStatusFilter,
  type ExplorerTripSort,
  type ExplorerCitySort
} from "../lib/travelExplorerView";

type TravelExplorerPageProps = {
  onBack: () => void;
  onOpenDestination: (destinationId: string) => void;
  setTab: (tab: Tab) => void;
};

export function TravelExplorerPage({ onBack, onOpenDestination, setTab }: TravelExplorerPageProps) {
  const { language, t } = useLanguage();
  const { explorer } = useTravelExplorer();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ExplorerStatusFilter>("all");
  const [year, setYear] = useState("all");
  const [mode, setMode] = useState<ExplorerMapMode>("status");
  const [browserTab, setBrowserTab] = useState<ExplorerBrowserTab>("countries");
  const [countrySort, setCountrySort] = useState<ExplorerCountrySort>("mostVisited");
  const [citySort, setCitySort] = useState<ExplorerCitySort>("mostVisited");
  const [tripSort, setTripSort] = useState<ExplorerTripSort>("newest");
  const [selection, setSelection] = useState<ExplorerSelection>(null);
  const [replayState, setReplayState] = useState<"idle" | "playing" | "paused">("idle");
  const [replayIndex, setReplayIndex] = useState(0);
  const numberFormat = useMemo(() => new Intl.NumberFormat(language), [language]);
  const dateFormat = useMemo(() => new Intl.DateTimeFormat(language, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }), [language]);

  const selectedYear = year === "all" ? null : Number(year);
  const filtered = useMemo(() => filterTravelExplorer(explorer, { search, status, year: selectedYear }), [explorer, search, selectedYear, status]);
  const countries = useMemo(() => sortExplorerCountries(filtered.countries, countrySort), [countrySort, filtered.countries]);
  const cities = useMemo(() => sortExplorerCities(filtered.cities, citySort), [citySort, filtered.cities]);
  const trips = useMemo(() => sortExplorerTrips(filtered.trips, tripSort), [filtered.trips, tripSort]);
  const replaySteps = useMemo(() => buildTravelReplaySteps(explorer, selectedYear), [explorer, selectedYear]);
  const replayStep = replayState === "idle" ? null : replaySteps[replayIndex] || null;

  const selectedCountry = selection?.type === "country"
    ? explorer.countries.find((country) => country.id === selection.id) || null
    : replayStep?.countryIds[0]
      ? explorer.countries.find((country) => country.id === replayStep.countryIds[0]) || null
      : null;
  const selectedCity = selection?.type === "city" ? explorer.cities.find((city) => city.id === selection.id) || null : null;
  const selectedTrip = selection?.type === "trip"
    ? explorer.trips.find((trip) => trip.id === selection.id) || null
    : selection?.type === "route"
      ? explorer.trips.find((trip) => explorer.routes.find((route) => route.id === selection.id)?.tripId === trip.id) || null
      : replayStep
        ? explorer.trips.find((trip) => trip.id === replayStep.tripId) || null
        : null;
  const selectedRoute = selection?.type === "route"
    ? explorer.routes.find((route) => route.id === selection.id) || null
    : selectedTrip
      ? explorer.routes.find((route) => route.tripId === selectedTrip.id) || null
      : null;

  const hasTravelData = explorer.summary.totalCountries > 0 || explorer.summary.totalCities > 0 || explorer.trips.length > 0;
  const qualityEntries = Object.entries(explorer.dataQuality) as Array<[string, number]>;
  const hasQualityIssues = qualityEntries.some(([, value]) => value > 0);
  const currentYearEntry = selectedYear ? explorer.years.find((entry) => entry.year === selectedYear) : null;

  useEffect(() => {
    if (selection?.type === "country" && !explorer.countries.some((country) => country.id === selection.id)) setSelection(null);
    if (selection?.type === "city" && !explorer.cities.some((city) => city.id === selection.id)) setSelection(null);
    if (selection?.type === "trip" && !explorer.trips.some((trip) => trip.id === selection.id)) setSelection(null);
    if (selection?.type === "route" && !explorer.routes.some((route) => route.id === selection.id)) setSelection(null);
  }, [explorer.cities, explorer.countries, explorer.routes, explorer.trips, selection]);

  useEffect(() => {
    if (replayIndex >= replaySteps.length) setReplayIndex(0);
  }, [replayIndex, replaySteps.length]);

  useEffect(() => {
    setReplayState("idle");
    setReplayIndex(0);
  }, [search, selectedYear, status]);

  useEffect(() => {
    if (replayState !== "playing" || replaySteps.length === 0) return;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setReplayState("paused");
      return;
    }
    const timer = window.setInterval(() => {
      setReplayIndex((current) => current + 1 >= replaySteps.length ? 0 : current + 1);
    }, 1800);
    return () => window.clearInterval(timer);
  }, [replayState, replaySteps.length]);

  function translate(key: string) {
    if (key.startsWith("destinationHub.")) return destinationHubTranslate(language, key);
    return (t as Record<string, string>)[key] || key;
  }

  function formatDate(value: string | null) {
    if (!value) return translate("travelExplorer.notAvailable");
    return dateFormat.format(new Date(`${value}T00:00:00Z`));
  }

  function resetView() {
    setSearch("");
    setStatus("all");
    setYear("all");
    setMode("status");
    setBrowserTab("countries");
    setSelection(null);
    setReplayState("idle");
    setReplayIndex(0);
  }

  function setPreviousYear() {
    const years = explorer.years.map((entry) => entry.year).sort((a, b) => a - b);
    if (years.length === 0) return;
    if (!selectedYear) setYear(String(years[years.length - 1]));
    else setYear(String(years[Math.max(0, years.indexOf(selectedYear) - 1)] || years[0]));
  }

  function setNextYear() {
    const years = explorer.years.map((entry) => entry.year).sort((a, b) => a - b);
    if (years.length === 0) return;
    if (!selectedYear) setYear(String(years[0]));
    else setYear(String(years[Math.min(years.length - 1, years.indexOf(selectedYear) + 1)] || years[years.length - 1]));
  }

  return (
    <main className="travel-explorer-page" dir={language === "ar" ? "rtl" : "ltr"}>
      <header className="travel-explorer-hero">
        <button type="button" className="icon-btn" onClick={onBack} aria-label={translate("travelExplorer.back")}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <span className="travel-explorer-kicker"><Globe2 size={16} /> {translate("travelExplorer.private")}</span>
          <h1>{translate("travelExplorer.title")}</h1>
          <p>{translate("travelExplorer.subtitle")}</p>
        </div>
        <div className="travel-explorer-privacy">
          <Lock size={16} />
          <span>{translate("travelExplorer.localOnly")}</span>
        </div>
      </header>

      {!hasTravelData ? (
        <section className="travel-explorer-empty">
          <MapPinned size={34} />
          <h2>{translate("travelExplorer.emptyTitle")}</h2>
          <p>{translate("travelExplorer.emptyDescription")}</p>
          <button type="button" className="primary-btn" onClick={() => setTab("tripDrafts")}>
            {translate("travelExplorer.openPlanner")}
          </button>
        </section>
      ) : (
        <>
          <section className="travel-explorer-summary" aria-label={translate("travelExplorer.summary")}>
            <Metric label={translate("travelExplorer.visitedCountries")} value={numberFormat.format(selectedYear ? currentYearEntry?.visitedCountryCount || 0 : explorer.summary.visitedCountries)} />
            <Metric label={translate("travelExplorer.plannedCountries")} value={numberFormat.format(selectedYear ? currentYearEntry?.plannedCountryCount || 0 : explorer.summary.plannedCountries)} />
            <Metric label={translate("travelExplorer.citiesExplored")} value={numberFormat.format(selectedYear ? currentYearEntry?.cityIds.length || 0 : explorer.summary.visitedCities)} />
            <Metric label={translate("travelExplorer.mappedTrips")} value={numberFormat.format(trips.filter((trip) => trip.routeAvailable).length)} />
            <Metric label={translate("travelExplorer.travelYears")} value={selectedYear ? String(selectedYear) : explorer.summary.earliestTravelYear && explorer.summary.latestTravelYear ? `${explorer.summary.earliestTravelYear}-${explorer.summary.latestTravelYear}` : translate("travelExplorer.notAvailable")} />
          </section>

          <section className="travel-explorer-toolbar" aria-label={translate("travelExplorer.toolbar")}>
            <label className="travel-explorer-search">
              <Search size={16} />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={translate("travelExplorer.searchPlaceholder")}
              />
            </label>
            <label>
              <span>{translate("travelExplorer.status")}</span>
              <select value={status} onChange={(event) => setStatus(event.target.value as ExplorerStatusFilter)}>
                <option value="all">{translate("travelExplorer.allStatuses")}</option>
                <option value="visited">{translate("travelExplorer.status.visited")}</option>
                <option value="planned">{translate("travelExplorer.status.planned")}</option>
                <option value="wishlist">{translate("travelExplorer.status.wishlist")}</option>
              </select>
            </label>
            <label>
              <span>{translate("travelExplorer.year")}</span>
              <select value={year} onChange={(event) => setYear(event.target.value)}>
                <option value="all">{translate("travelExplorer.allYears")}</option>
                {explorer.years.map((entry) => (
                  <option value={entry.year} key={entry.year}>{entry.year}</option>
                ))}
              </select>
            </label>
            <label>
              <span>{translate("travelExplorer.mode")}</span>
              <select value={mode} onChange={(event) => setMode(event.target.value as ExplorerMapMode)}>
                <option value="status">{translate("travelExplorer.mode.status")}</option>
                <option value="frequency">{translate("travelExplorer.mode.frequency")}</option>
                <option value="travelDays">{translate("travelExplorer.mode.travelDays")}</option>
                <option value="routes">{translate("travelExplorer.mode.routes")}</option>
              </select>
            </label>
            <button type="button" className="secondary-btn" onClick={resetView}>
              <RotateCcw size={16} /> {translate("travelExplorer.reset")}
            </button>
          </section>

          <section className="travel-explorer-timeline" aria-label={translate("travelExplorer.timeline")}>
            <button type="button" className="icon-btn" onClick={setPreviousYear} aria-label={translate("travelExplorer.previousYear")}>
              <StepBack size={16} />
            </button>
            <div className="travel-explorer-year-strip" role="list">
              <button type="button" className={year === "all" ? "selected" : ""} onClick={() => setYear("all")}>{translate("travelExplorer.allYears")}</button>
              {explorer.years.slice().sort((a, b) => a.year - b.year).map((entry) => (
                <button type="button" key={entry.year} className={selectedYear === entry.year ? "selected" : ""} onClick={() => setYear(String(entry.year))}>
                  <span>{entry.year}</span>
                  <small>{numberFormat.format(entry.completedTripIds.length + entry.plannedTripIds.length)}</small>
                </button>
              ))}
            </div>
            <button type="button" className="icon-btn" onClick={setNextYear} aria-label={translate("travelExplorer.nextYear")}>
              <StepForward size={16} />
            </button>
          </section>

          <section className="travel-explorer-replay" aria-label={translate("travelExplorer.replay")}>
            <div>
              <h2>{translate("travelExplorer.replay")}</h2>
              <p>{replayStep ? `${formatDate(replayStep.date)} · ${replayStep.label}` : translate("travelExplorer.replayDescription")}</p>
            </div>
            <div className="travel-explorer-replay-actions">
              <button type="button" className="secondary-btn" onClick={() => setReplayState(replayState === "playing" ? "paused" : "playing")} disabled={replaySteps.length === 0}>
                {replayState === "playing" ? <CirclePause size={16} /> : <CirclePlay size={16} />}
                {replayState === "playing" ? translate("travelExplorer.pauseReplay") : translate("travelExplorer.startReplay")}
              </button>
              <button type="button" className="secondary-btn" onClick={() => setReplayIndex((current) => current + 1 >= replaySteps.length ? 0 : current + 1)} disabled={replaySteps.length === 0}>
                <FastForward size={16} /> {translate("travelExplorer.nextStep")}
              </button>
              <button type="button" className="secondary-btn" onClick={() => { setReplayState("idle"); setReplayIndex(0); }}>
                <Square size={16} /> {translate("travelExplorer.stopReplay")}
              </button>
            </div>
          </section>

          <section className="travel-explorer-workspace">
            <div className="travel-explorer-map-card">
              <div className="travel-explorer-map-header">
                <div>
                  <h2>{translate("travelExplorer.mapTitle")}</h2>
                  <p>{mode === "routes" ? translate("travelExplorer.routeDisclaimer") : translate("travelExplorer.mapDescription")}</p>
                </div>
                <ExplorerLegend mode={mode} translate={translate} numberFormat={numberFormat} countries={countries} routes={filtered.routes} />
              </div>
              <ExplorerMap
                countries={countries}
                cities={cities}
                routes={filtered.routes}
                selectedCountryId={selectedCountry?.id || null}
                selectedCityId={selectedCity?.id || null}
                selectedRouteId={selectedRoute?.id || null}
                replayStep={replayStep}
                mode={mode}
                explorerTrips={explorer.trips}
                onSelectCountry={(id) => setSelection({ type: "country", id })}
                onSelectCity={(id) => setSelection({ type: "city", id })}
                onSelectRoute={(id) => setSelection({ type: "route", id })}
                translate={translate}
              />
              {explorer.summary.tripsWithCoordinates === 0 && (
                <p className="travel-explorer-map-note">{translate("travelExplorer.partialMapDescription")}</p>
              )}
            </div>

            <aside className="travel-explorer-panel" aria-live="polite">
              {selectedCity ? (
                <CityPanel
                  city={selectedCity}
                  explorerTrips={explorer.trips}
                  trips={explorer.trips.filter((trip) => selectedCity.tripIds.includes(trip.id))}
                  numberFormat={numberFormat}
                  formatDate={formatDate}
                  translate={translate}
                  onSelectTrip={(id) => setSelection({ type: "trip", id })}
                  onSelectCountry={(id) => setSelection({ type: "country", id })}
                  onOpenDestination={onOpenDestination}
                />
              ) : selectedTrip ? (
                <TripPanel
                  trip={selectedTrip}
                  countries={explorer.countries.filter((country) => selectedTrip.countryIds.includes(country.id))}
                  cities={explorer.cities.filter((city) => selectedTrip.cityIds.includes(city.id))}
                  route={selectedRoute}
                  numberFormat={numberFormat}
                  formatDate={formatDate}
                  translate={translate}
                  setTab={setTab}
                />
              ) : selectedCountry ? (
                <CountryPanel
                  country={selectedCountry}
                  cities={explorer.cities.filter((city) => selectedCountry.cityIds.includes(city.id))}
                  trips={explorer.trips.filter((trip) => selectedCountry.tripIds.includes(trip.id))}
                  explorerTrips={explorer.trips}
                  numberFormat={numberFormat}
                  formatDate={formatDate}
                  translate={translate}
                  setTab={setTab}
                  onSelectCity={(id) => setSelection({ type: "city", id })}
                  onSelectTrip={(id) => setSelection({ type: "trip", id })}
                  onOpenDestination={onOpenDestination}
                />
              ) : (
                <div className="travel-explorer-panel-empty">
                  <LocateFixed size={28} />
                  <h2>{translate("travelExplorer.selectCountry")}</h2>
                  <p>{translate("travelExplorer.selectCountryDescription")}</p>
                </div>
              )}
            </aside>
          </section>

          <ExplorerHighlights
            countries={explorer.countries}
            cities={explorer.cities}
            trips={explorer.trips}
            translate={translate}
            numberFormat={numberFormat}
            onSelect={setSelection}
            onOpenDestination={onOpenDestination}
          />

          <DestinationBrowser
            tab={browserTab}
            onTabChange={setBrowserTab}
            countries={countries}
            cities={cities}
            trips={trips}
            countrySort={countrySort}
            citySort={citySort}
            tripSort={tripSort}
            onCountrySort={setCountrySort}
            onCitySort={setCitySort}
            onTripSort={setTripSort}
            selectedCountryId={selectedCountry?.id || null}
            selectedCityId={selectedCity?.id || null}
            selectedTripId={selectedTrip?.id || null}
            onSelect={setSelection}
            translate={translate}
            numberFormat={numberFormat}
          />

          <RouteSection
            routes={filtered.routes}
            trips={explorer.trips}
            selectedRouteId={selectedRoute?.id || null}
            onSelectRoute={(id) => setSelection({ type: "route", id })}
            translate={translate}
            numberFormat={numberFormat}
          />

          {hasQualityIssues && (
            <details className="travel-explorer-quality">
              <summary>{translate("travelExplorer.qualityTitle")}</summary>
              <p>{translate("travelExplorer.qualityDescription")}</p>
              <dl>
                {qualityEntries.filter(([, value]) => value > 0).map(([key, value]) => (
                  <div key={key}>
                    <dt>{translate(`travelExplorer.quality.${key}`)}</dt>
                    <dd>{numberFormat.format(value)}</dd>
                  </div>
                ))}
              </dl>
            </details>
          )}
        </>
      )}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="travel-explorer-metric" aria-label={`${label}: ${value}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function ExplorerLegend({
  mode,
  translate,
  numberFormat,
  countries,
  routes
}: {
  mode: ExplorerMapMode;
  translate: (key: string) => string;
  numberFormat: Intl.NumberFormat;
  countries: readonly TravelExplorerCountry[];
  routes: readonly TravelExplorerRoute[];
}) {
  if (mode === "frequency" || mode === "travelDays") {
    return (
      <div className="travel-explorer-legend" aria-label={translate("travelExplorer.legend")}>
        <span><i className="legend-dot density one" /> {translate("travelExplorer.density.one")}</span>
        <span><i className="legend-dot density some" /> {translate("travelExplorer.density.some")}</span>
        <span><i className="legend-dot density many" /> {translate("travelExplorer.density.many")}</span>
      </div>
    );
  }
  return (
    <div className="travel-explorer-legend" aria-label={translate("travelExplorer.legend")}>
      <span><i className="legend-dot visited" /> {translate("travelExplorer.status.visited")} {numberFormat.format(countries.filter((country) => country.status === "visited").length)}</span>
      <span><i className="legend-dot planned" /> {translate("travelExplorer.status.planned")} {numberFormat.format(countries.filter((country) => country.status === "planned").length)}</span>
      <span><i className="legend-dot wishlist" /> {translate("travelExplorer.status.wishlist")} {numberFormat.format(countries.filter((country) => country.status === "wishlist").length)}</span>
      <span><i className="legend-line" /> {translate("travelExplorer.routes")} {numberFormat.format(routes.length)}</span>
    </div>
  );
}

function ExplorerMap({
  countries,
  cities,
  routes,
  explorerTrips,
  selectedCountryId,
  selectedCityId,
  selectedRouteId,
  replayStep,
  mode,
  onSelectCountry,
  onSelectCity,
  onSelectRoute,
  translate
}: {
  countries: readonly TravelExplorerCountry[];
  cities: readonly TravelExplorerCity[];
  routes: readonly TravelExplorerRoute[];
  explorerTrips: readonly TravelExplorerTrip[];
  selectedCountryId: string | null;
  selectedCityId: string | null;
  selectedRouteId: string | null;
  replayStep: { countryIds: string[]; cityIds: string[]; routeId: string | null } | null;
  mode: ExplorerMapMode;
  onSelectCountry: (countryId: string) => void;
  onSelectCity: (cityId: string) => void;
  onSelectRoute: (routeId: string) => void;
  translate: (key: string) => string;
}) {
  const mappedCountries = countries.filter((country) => country.coordinates);
  const selectedCountryCityIds = selectedCountryId ? new Set(cities.filter((city) => city.countryId === selectedCountryId).map((city) => city.id)) : null;
  const mappedCities = cities.filter((city) => city.coordinates && (selectedCountryCityIds?.has(city.id) || selectedCityId === city.id || replayStep?.cityIds.includes(city.id)));
  const routeVisible = mode === "routes" || Boolean(selectedRouteId) || Boolean(replayStep?.routeId);
  return (
    <div className="travel-explorer-map-wrap">
      <svg className="travel-explorer-map" viewBox="0 0 720 360" role="img" aria-label={translate("travelExplorer.mapAria")}>
        <rect x="0" y="0" width="720" height="360" rx="18" />
        <path className="travel-explorer-map-contour" d="M72 180 C150 90 240 90 324 172 C420 265 512 258 648 154" />
        <path className="travel-explorer-map-contour" d="M88 246 C180 210 282 240 358 282 C452 328 572 300 650 240" />
        {routeVisible && routes.map((route) => (
          <g key={route.id}>
            {route.points.slice(1).map((point, index) => {
              const previous = route.points[index];
              const a = projectExplorerCoordinate(previous.coordinates);
              const b = projectExplorerCoordinate(point.coordinates);
              return (
                <line
                  key={`${route.id}:${point.id}`}
                  className={`travel-explorer-route-line ${route.status} ${selectedRouteId === route.id || replayStep?.routeId === route.id ? "selected" : ""}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                />
              );
            })}
          </g>
        ))}
      </svg>
      <div className="travel-explorer-map-overlay">
        {routeVisible && routes.map((route) => {
          const midpoint = route.points[Math.floor(route.points.length / 2)]?.coordinates;
          if (!midpoint) return null;
          const point = projectExplorerCoordinate(midpoint);
          const trip = explorerTrips.find((candidate) => candidate.id === route.tripId);
          return (
            <button
              type="button"
              key={route.id}
              className={`travel-explorer-route-button ${selectedRouteId === route.id ? "selected" : ""}`}
              style={{ left: `${point.x}px`, top: `${point.y}px` }}
              onClick={() => onSelectRoute(route.id)}
              aria-label={`${translate("travelExplorer.route")}: ${trip?.title || route.id}`}
            >
              {route.segmentCount}
            </button>
          );
        })}
        {mappedCountries.map((country) => {
          const point = projectExplorerCoordinate(country.coordinates!);
          const density = mode === "travelDays"
            ? getFrequencyLevel(getCountryTravelDays(country, explorerTrips))
            : getFrequencyLevel(country.completedTripIds.length);
          const replayActive = replayStep?.countryIds.includes(country.id);
          return (
            <div key={country.id}>
              <button
                type="button"
                className="travel-explorer-map-button"
                style={{ left: `${point.x}px`, top: `${point.y}px` }}
                onClick={() => onSelectCountry(country.id)}
                aria-label={`${country.countryName}, ${country.status}`}
                aria-pressed={selectedCountryId === country.id}
              >
                <span className={`map-marker ${mode === "status" || mode === "routes" ? country.status : `density-${density}`} ${selectedCountryId === country.id ? "selected" : ""} ${replayActive ? "replay" : ""}`} />
              </button>
              <span
                className={`map-label ${country.status} ${selectedCountryId === country.id ? "selected" : ""} ${replayActive ? "replay" : ""}`}
                style={{ left: `${point.x}px`, top: `${point.y}px` }}
                aria-hidden="true"
              >
                {country.countryName}
              </span>
            </div>
          );
        })}
        {mappedCities.map((city) => {
          const point = projectExplorerCoordinate(city.coordinates!);
          return (
            <button
              type="button"
              key={city.id}
              className={`travel-explorer-city-marker ${city.status} ${selectedCityId === city.id ? "selected" : ""} ${replayStep?.cityIds.includes(city.id) ? "replay" : ""}`}
              style={{ left: `${point.x}px`, top: `${point.y}px` }}
              onClick={() => onSelectCity(city.id)}
              aria-label={`${city.cityName}, ${city.countryName || ""}`}
            />
          );
        })}
      </div>
    </div>
  );
}

function CountryPanel({
  country,
  cities,
  trips,
  explorerTrips,
  numberFormat,
  formatDate,
  translate,
  setTab,
  onSelectCity,
  onSelectTrip,
  onOpenDestination
}: {
  country: TravelExplorerCountry;
  cities: readonly TravelExplorerCity[];
  trips: readonly TravelExplorerTrip[];
  explorerTrips: readonly TravelExplorerTrip[];
  numberFormat: Intl.NumberFormat;
  formatDate: (value: string | null) => string;
  translate: (key: string) => string;
  setTab: (tab: Tab) => void;
  onSelectCity: (id: string) => void;
  onSelectTrip: (id: string) => void;
  onOpenDestination: (destinationId: string) => void;
}) {
  const travelDays = getCountryTravelDays(country, explorerTrips);
  const years = getTravelYearsForTripIds(country.completedTripIds, explorerTrips);
  return (
    <div className="travel-explorer-country-panel">
      <span className={`travel-explorer-status ${country.status}`}>{statusLabel(country, translate)}</span>
      <h2 dir="auto">{country.countryName}</h2>
      <div className="travel-explorer-badges">
        {country.hasCompletedTrips && <span>{translate("travelExplorer.visitedIndicator")}</span>}
        {country.hasPlannedTrips && <span>{translate("travelExplorer.plannedIndicator")}</span>}
        {country.isReturnDestination && <span>{returnLabel(country.completedTripIds.length, translate, numberFormat)}</span>}
      </div>
      <dl>
        <div><dt>{translate("travelExplorer.completedTrips")}</dt><dd>{numberFormat.format(country.completedTripIds.length)}</dd></div>
        <div><dt>{translate("travelExplorer.plannedTrips")}</dt><dd>{numberFormat.format(country.plannedTripIds.length)}</dd></div>
        <div><dt>{translate("travelExplorer.cities")}</dt><dd>{numberFormat.format(country.cityIds.length)}</dd></div>
        <div><dt>{translate("travelExplorer.travelDays")}</dt><dd>{numberFormat.format(travelDays)}</dd></div>
        <div><dt>{translate("travelExplorer.photos")}</dt><dd>{numberFormat.format(country.photoCount)}</dd></div>
        <div><dt>{translate("travelExplorer.journalEntries")}</dt><dd>{numberFormat.format(country.journalEntryCount)}</dd></div>
        <div><dt>{translate("travelExplorer.favoriteMemories")}</dt><dd>{numberFormat.format(country.favoriteMemoryCount)}</dd></div>
        <div><dt>{translate("travelExplorer.firstVisit")}</dt><dd>{formatDate(country.firstVisitDate)}</dd></div>
        <div><dt>{translate("travelExplorer.latestVisit")}</dt><dd>{formatDate(country.latestVisitDate)}</dd></div>
        <div><dt>{translate("travelExplorer.nextPlanned")}</dt><dd>{formatDate(country.nextPlannedDate)}</dd></div>
        <div><dt>{translate("travelExplorer.travelYears")}</dt><dd>{years.length ? years.join(", ") : translate("travelExplorer.notAvailable")}</dd></div>
      </dl>
      <PanelActions destinationId={country.id} onOpenDestination={onOpenDestination} setTab={setTab} translate={translate} />
      <RelatedList title={translate("travelExplorer.relatedCities")} empty={translate("travelExplorer.noResults")}>
        {cities.slice(0, 6).map((city) => (
          <button type="button" key={city.id} onClick={() => onSelectCity(city.id)}>
            <strong>{city.cityName}</strong>
            <small>{numberFormat.format(city.tripIds.length)} {translate("travelExplorer.trips")}</small>
          </button>
        ))}
      </RelatedList>
      <RelatedList title={translate("travelExplorer.relatedTrips")} empty={translate("travelExplorer.noResults")}>
        {trips.slice(0, 6).map((trip) => (
          <button type="button" key={trip.id} onClick={() => onSelectTrip(trip.id)}>
            <strong dir="auto">{trip.title}</strong>
            <small>{formatDate(trip.startDate)}</small>
          </button>
        ))}
      </RelatedList>
    </div>
  );
}

function CityPanel({
  city,
  trips,
  explorerTrips,
  numberFormat,
  formatDate,
  translate,
  onSelectTrip,
  onSelectCountry,
  onOpenDestination
}: {
  city: TravelExplorerCity;
  trips: readonly TravelExplorerTrip[];
  explorerTrips: readonly TravelExplorerTrip[];
  numberFormat: Intl.NumberFormat;
  formatDate: (value: string | null) => string;
  translate: (key: string) => string;
  onSelectTrip: (id: string) => void;
  onSelectCountry: (id: string) => void;
  onOpenDestination: (destinationId: string) => void;
}) {
  const travelDays = getCityTravelDays(city, explorerTrips);
  const years = getTravelYearsForTripIds(city.completedTripIds, explorerTrips);
  return (
    <div className="travel-explorer-country-panel">
      <span className={`travel-explorer-status ${city.status}`}>{translate(`travelExplorer.status.${city.status}`)}</span>
      <h2 dir="auto">{city.cityName}</h2>
      <p>{city.countryName || translate("travelExplorer.notAvailable")}</p>
      <div className="travel-explorer-badges">
        {city.isReturnDestination && <span>{returnLabel(city.completedTripIds.length, translate, numberFormat)}</span>}
      </div>
      <dl>
        <div><dt>{translate("travelExplorer.trips")}</dt><dd>{numberFormat.format(city.tripIds.length)}</dd></div>
        <div><dt>{translate("travelExplorer.travelDays")}</dt><dd>{numberFormat.format(travelDays)}</dd></div>
        <div><dt>{translate("travelExplorer.photos")}</dt><dd>{numberFormat.format(city.photoCount)}</dd></div>
        <div><dt>{translate("travelExplorer.journalEntries")}</dt><dd>{numberFormat.format(city.journalEntryCount)}</dd></div>
        <div><dt>{translate("travelExplorer.favoriteMemories")}</dt><dd>{numberFormat.format(city.favoriteMemoryCount)}</dd></div>
        <div><dt>{translate("travelExplorer.visitedPlaces")}</dt><dd>{numberFormat.format(city.placeIds.length)}</dd></div>
        <div><dt>{translate("travelExplorer.firstVisit")}</dt><dd>{formatDate(city.firstVisitDate)}</dd></div>
        <div><dt>{translate("travelExplorer.latestVisit")}</dt><dd>{formatDate(city.latestVisitDate)}</dd></div>
        <div><dt>{translate("travelExplorer.nextPlanned")}</dt><dd>{formatDate(city.nextPlannedDate)}</dd></div>
        <div><dt>{translate("travelExplorer.travelYears")}</dt><dd>{years.length ? years.join(", ") : translate("travelExplorer.notAvailable")}</dd></div>
      </dl>
      {city.countryId && (
        <button type="button" className="secondary-btn" onClick={() => onSelectCountry(city.countryId!)}>
          {translate("travelExplorer.returnToCountry")}
        </button>
      )}
      <button type="button" className="secondary-btn" onClick={() => onOpenDestination(city.id)}>
        {translate("destinationHub.viewDestination")}
      </button>
      <RelatedList title={translate("travelExplorer.relatedTrips")} empty={translate("travelExplorer.noResults")}>
        {trips.slice(0, 6).map((trip) => (
          <button type="button" key={trip.id} onClick={() => onSelectTrip(trip.id)}>
            <strong dir="auto">{trip.title}</strong>
            <small>{formatDate(trip.startDate)}</small>
          </button>
        ))}
      </RelatedList>
    </div>
  );
}

function TripPanel({
  trip,
  countries,
  cities,
  route,
  numberFormat,
  formatDate,
  translate,
  setTab
}: {
  trip: TravelExplorerTrip;
  countries: readonly TravelExplorerCountry[];
  cities: readonly TravelExplorerCity[];
  route: TravelExplorerRoute | null;
  numberFormat: Intl.NumberFormat;
  formatDate: (value: string | null) => string;
  translate: (key: string) => string;
  setTab: (tab: Tab) => void;
}) {
  return (
    <div className="travel-explorer-country-panel">
      <span className={`travel-explorer-status ${trip.status === "completed" ? "visited" : "planned"}`}>
        {trip.status === "completed" ? translate("travelExplorer.status.visited") : translate("travelExplorer.status.planned")}
      </span>
      <h2 dir="auto">{trip.title}</h2>
      <dl>
        <div><dt>{translate("travelExplorer.firstVisit")}</dt><dd>{formatDate(trip.startDate)}</dd></div>
        <div><dt>{translate("travelExplorer.latestVisit")}</dt><dd>{formatDate(trip.endDate)}</dd></div>
        <div><dt>{translate("travelExplorer.travelDays")}</dt><dd>{numberFormat.format(getTripTravelDays(trip))}</dd></div>
        <div><dt>{translate("travelExplorer.countries")}</dt><dd>{numberFormat.format(countries.length)}</dd></div>
        <div><dt>{translate("travelExplorer.cities")}</dt><dd>{numberFormat.format(cities.length)}</dd></div>
        <div><dt>{translate("travelExplorer.routePoints")}</dt><dd>{numberFormat.format(route?.points.length || 0)}</dd></div>
        <div><dt>{translate("travelExplorer.routeStatus")}</dt><dd>{route?.isComplete ? translate("travelExplorer.routeComplete") : translate("travelExplorer.routePartial")}</dd></div>
      </dl>
      <PanelActions setTab={setTab} translate={translate} />
      {route && (
        <ol className="travel-explorer-route-points">
          {route.points.map((point) => (
            <li key={point.id}>
              <span>{point.order + 1}</span>
              <strong>{point.label}</strong>
              <small>{formatDate(point.date)}</small>
            </li>
          ))}
        </ol>
      )}
      <p className="travel-explorer-map-note">{translate("travelExplorer.routeDisclaimer")}</p>
    </div>
  );
}

function PanelActions({ destinationId, onOpenDestination, setTab, translate }: { destinationId?: string; onOpenDestination?: (destinationId: string) => void; setTab: (tab: Tab) => void; translate: (key: string) => string }) {
  return (
    <div className="travel-explorer-panel-actions">
      {destinationId && onOpenDestination && <button type="button" className="secondary-btn" onClick={() => onOpenDestination(destinationId)}>{translate("destinationHub.viewDestination")}</button>}
      <button type="button" className="secondary-btn" onClick={() => setTab("passport")}>{translate("travelExplorer.openPassport")}</button>
      <button type="button" className="secondary-btn" onClick={() => setTab("journal")}>{translate("travelExplorer.openJournal")}</button>
      <button type="button" className="secondary-btn" onClick={() => setTab("tripDrafts")}>{translate("travelExplorer.openPlanner")}</button>
    </div>
  );
}

function RelatedList({ title, empty, children }: { title: string; empty: string; children: ReactNode }) {
  return (
    <section className="travel-explorer-related">
      <h3>{title}</h3>
      <div>{children || <p>{empty}</p>}</div>
    </section>
  );
}

function ExplorerHighlights({
  countries,
  cities,
  trips,
  translate,
  numberFormat,
  onSelect,
  onOpenDestination
}: {
  countries: readonly TravelExplorerCountry[];
  cities: readonly TravelExplorerCity[];
  trips: readonly TravelExplorerTrip[];
  translate: (key: string) => string;
  numberFormat: Intl.NumberFormat;
  onSelect: (selection: ExplorerSelection) => void;
  onOpenDestination: (destinationId: string) => void;
}) {
  const mostVisitedCountry = sortExplorerCountries(countries.filter((country) => country.completedTripIds.length > 0), "mostVisited")[0];
  const mostVisitedCity = sortExplorerCities(cities.filter((city) => city.completedTripIds.length > 0), "mostVisited")[0];
  const longestTrip = sortExplorerTrips(trips.filter((trip) => getTripTravelDays(trip) > 0), "longest")[0];
  if (!mostVisitedCountry && !mostVisitedCity && !longestTrip) return null;
  return (
    <section className="travel-explorer-highlights" aria-label={translate("travelExplorer.highlights")}>
      <h2>{translate("travelExplorer.highlights")}</h2>
      <div>
        {mostVisitedCountry && (
          <button type="button" onClick={() => { onSelect({ type: "country", id: mostVisitedCountry.id }); onOpenDestination(mostVisitedCountry.id); }}>
            <span>{translate("travelExplorer.mostVisitedCountry")}</span>
            <strong>{mostVisitedCountry.countryName}</strong>
            <small>{numberFormat.format(mostVisitedCountry.completedTripIds.length)} {translate("travelExplorer.trips")} · {translate("destinationHub.viewDestination")}</small>
          </button>
        )}
        {mostVisitedCity && (
          <button type="button" onClick={() => { onSelect({ type: "city", id: mostVisitedCity.id }); onOpenDestination(mostVisitedCity.id); }}>
            <span>{translate("travelExplorer.mostVisitedCity")}</span>
            <strong>{mostVisitedCity.cityName}</strong>
            <small>{numberFormat.format(mostVisitedCity.completedTripIds.length)} {translate("travelExplorer.trips")} · {translate("destinationHub.viewDestination")}</small>
          </button>
        )}
        {longestTrip && (
          <button type="button" onClick={() => onSelect({ type: "trip", id: longestTrip.id })}>
            <span>{translate("travelExplorer.longestTrip")}</span>
            <strong dir="auto">{longestTrip.title}</strong>
            <small>{numberFormat.format(getTripTravelDays(longestTrip))} {translate("travelExplorer.travelDays")}</small>
          </button>
        )}
      </div>
    </section>
  );
}

function DestinationBrowser({
  tab,
  onTabChange,
  countries,
  cities,
  trips,
  countrySort,
  citySort,
  tripSort,
  onCountrySort,
  onCitySort,
  onTripSort,
  selectedCountryId,
  selectedCityId,
  selectedTripId,
  onSelect,
  translate,
  numberFormat
}: {
  tab: ExplorerBrowserTab;
  onTabChange: (tab: ExplorerBrowserTab) => void;
  countries: readonly TravelExplorerCountry[];
  cities: readonly TravelExplorerCity[];
  trips: readonly TravelExplorerTrip[];
  countrySort: ExplorerCountrySort;
  citySort: ExplorerCitySort;
  tripSort: ExplorerTripSort;
  onCountrySort: (sort: ExplorerCountrySort) => void;
  onCitySort: (sort: ExplorerCitySort) => void;
  onTripSort: (sort: ExplorerTripSort) => void;
  selectedCountryId: string | null;
  selectedCityId: string | null;
  selectedTripId: string | null;
  onSelect: (selection: ExplorerSelection) => void;
  translate: (key: string) => string;
  numberFormat: Intl.NumberFormat;
}) {
  const count = tab === "countries" ? countries.length : tab === "cities" ? cities.length : trips.length;
  return (
    <section className="travel-explorer-list-section" aria-label={translate("travelExplorer.destinationList")}>
      <div className="section-heading-row">
        <div>
          <h2>{translate("travelExplorer.destinationList")}</h2>
          <p>{translate("travelExplorer.destinationListDescription")}</p>
        </div>
        <span>{numberFormat.format(count)} {translate("travelExplorer.results")}</span>
      </div>
      <div className="travel-explorer-browser-controls">
        <div className="segmented-control" role="tablist">
          {(["countries", "cities", "trips"] as ExplorerBrowserTab[]).map((candidate) => (
            <button type="button" role="tab" aria-selected={tab === candidate} className={tab === candidate ? "active" : ""} key={candidate} onClick={() => onTabChange(candidate)}>
              {translate(`travelExplorer.tab.${candidate}`)}
            </button>
          ))}
        </div>
        {tab === "countries" && (
          <select value={countrySort} onChange={(event) => onCountrySort(event.target.value as ExplorerCountrySort)} aria-label={translate("travelExplorer.sort")}>
            <option value="mostVisited">{translate("travelExplorer.sort.mostVisited")}</option>
            <option value="mostRecent">{translate("travelExplorer.sort.mostRecent")}</option>
            <option value="alphabetical">{translate("travelExplorer.sort.alphabetical")}</option>
            <option value="mostMemories">{translate("travelExplorer.sort.mostMemories")}</option>
          </select>
        )}
        {tab === "cities" && (
          <select value={citySort} onChange={(event) => onCitySort(event.target.value as ExplorerCitySort)} aria-label={translate("travelExplorer.sort")}>
            <option value="mostVisited">{translate("travelExplorer.sort.mostVisited")}</option>
            <option value="mostRecent">{translate("travelExplorer.sort.mostRecent")}</option>
            <option value="alphabetical">{translate("travelExplorer.sort.alphabetical")}</option>
          </select>
        )}
        {tab === "trips" && (
          <select value={tripSort} onChange={(event) => onTripSort(event.target.value as ExplorerTripSort)} aria-label={translate("travelExplorer.sort")}>
            <option value="newest">{translate("travelExplorer.sort.newest")}</option>
            <option value="oldest">{translate("travelExplorer.sort.oldest")}</option>
            <option value="longest">{translate("travelExplorer.sort.longest")}</option>
            <option value="shortest">{translate("travelExplorer.sort.shortest")}</option>
          </select>
        )}
      </div>
      {count === 0 ? (
        <div className="travel-explorer-empty-inline">{translate("travelExplorer.noResults")}</div>
      ) : (
        <div className="travel-explorer-country-list">
          {tab === "countries" && countries.map((country) => (
            <button type="button" className={`travel-explorer-country-row ${selectedCountryId === country.id ? "selected" : ""}`} key={country.id} onClick={() => onSelect({ type: "country", id: country.id })} aria-pressed={selectedCountryId === country.id} aria-label={`${translate("travelExplorer.tab.countries")}: ${country.countryName}`}>
              <span><strong>{country.countryName}</strong><small>{statusLabel(country, translate)} · {numberFormat.format(country.cityIds.length)} {translate("travelExplorer.cities")}</small></span>
              <span>{numberFormat.format(country.completedTripIds.length)} {translate("travelExplorer.trips")}</span>
            </button>
          ))}
          {tab === "cities" && cities.map((city) => (
            <button type="button" className={`travel-explorer-country-row ${selectedCityId === city.id ? "selected" : ""}`} key={city.id} onClick={() => onSelect({ type: "city", id: city.id })} aria-pressed={selectedCityId === city.id} aria-label={`${translate("travelExplorer.tab.cities")}: ${city.cityName}`}>
              <span><strong>{city.cityName}</strong><small>{city.countryName || translate("travelExplorer.notAvailable")}</small></span>
              <span>{numberFormat.format(city.tripIds.length)} {translate("travelExplorer.trips")}</span>
            </button>
          ))}
          {tab === "trips" && trips.map((trip) => (
            <button type="button" className={`travel-explorer-country-row ${selectedTripId === trip.id ? "selected" : ""}`} key={trip.id} onClick={() => onSelect({ type: "trip", id: trip.id })} aria-pressed={selectedTripId === trip.id} aria-label={`${translate("travelExplorer.tab.trips")}: ${trip.title}`}>
              <span><strong dir="auto">{trip.title}</strong><small>{trip.year || translate("travelExplorer.notAvailable")}</small></span>
              <span>{numberFormat.format(getTripTravelDays(trip))} {translate("travelExplorer.travelDays")}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function RouteSection({
  routes,
  trips,
  selectedRouteId,
  onSelectRoute,
  translate,
  numberFormat
}: {
  routes: readonly TravelExplorerRoute[];
  trips: readonly TravelExplorerTrip[];
  selectedRouteId: string | null;
  onSelectRoute: (id: string) => void;
  translate: (key: string) => string;
  numberFormat: Intl.NumberFormat;
}) {
  if (routes.length === 0) return null;
  return (
    <section className="travel-explorer-route-section" aria-label={translate("travelExplorer.routes")}>
      <div className="section-heading-row">
        <div>
          <h2>{translate("travelExplorer.routes")}</h2>
          <p>{translate("travelExplorer.routeDisclaimer")}</p>
        </div>
        <span>{numberFormat.format(routes.length)} {translate("travelExplorer.results")}</span>
      </div>
      <div className="travel-explorer-route-list">
        {routes.map((route) => {
          const trip = trips.find((candidate) => candidate.id === route.tripId);
          return (
            <button type="button" key={route.id} className={selectedRouteId === route.id ? "selected" : ""} onClick={() => onSelectRoute(route.id)}>
              <span>
                <strong dir="auto">{trip?.title || route.id}</strong>
                <small>{route.status === "completed" ? translate("travelExplorer.status.visited") : translate("travelExplorer.status.planned")} · {route.isComplete ? translate("travelExplorer.routeComplete") : translate("travelExplorer.routePartial")}</small>
              </span>
              <span>{numberFormat.format(route.segmentCount)} {translate("travelExplorer.segments")}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function statusLabel(country: TravelExplorerCountry, translate: (key: string) => string) {
  if (country.status === "visited" && country.hasPlannedTrips) return translate("travelExplorer.status.returning");
  return translate(`travelExplorer.status.${country.status}`);
}

function returnLabel(count: number, translate: (key: string) => string, numberFormat: Intl.NumberFormat) {
  if (count <= 1) return translate("travelExplorer.visitedOnce");
  if (count === 2) return translate("travelExplorer.visitedTwice");
  return translate("travelExplorer.visitedMany").replace("{count}", numberFormat.format(count));
}
