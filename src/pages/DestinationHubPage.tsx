import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  BadgeInfo,
  BookOpen,
  Bus,
  CircleAlert,
  Coins,
  Languages,
  Lock,
  MapPin,
  Plug,
  Search,
  Shield,
  TrainFront,
  UserRound,
  Zap
} from "lucide-react";
import { useLanguage } from "../LanguageContext";
import { useConnectivity } from "../hooks/useConnectivity";
import { useDestinationIntelligence } from "../hooks/useDestinationIntelligence";
import { useTravelExplorer } from "../hooks/useTravelExplorer";
import type { Tab } from "../main";
import { destinationHubTranslate } from "../lib/destinationHubI18n";
import {
  deriveDestinationHubView,
  fieldDisplayState,
  searchDestinations,
  type DestinationHubPersonalContext,
  type DestinationHubSearchResult
} from "../lib/destinationHub";
import type {
  CountryIntelligence,
  DestinationEmergencyInfo,
  DestinationField,
  DestinationSource,
  DestinationTransportInfo
} from "../lib/destinationIntelligenceTypes";

type Props = {
  destinationId: string | null;
  onBack: () => void;
  onOpenDestination: (destinationId: string) => void;
  setTab: (tab: Tab) => void;
};

export function DestinationHubPage({ destinationId, onBack, onOpenDestination, setTab }: Props) {
  const { language } = useLanguage();
  const connectivity = useConnectivity();
  const intelligence = useDestinationIntelligence();
  const { drafts, passport, explorer } = useTravelExplorer();
  const [query, setQuery] = useState("");
  const tr = (key: string) => destinationHubTranslate(language, key);
  const view = useMemo(
    () => deriveDestinationHubView({ destinationId, intelligence, passport, explorer, drafts, searchQuery: query }),
    [destinationId, drafts, explorer, intelligence, passport, query]
  );
  const searchResults = useMemo(() => searchDestinations(intelligence, query), [intelligence, query]);

  if (!destinationId || view.type === "unknown") {
    return (
      <main className="destination-hub-page" dir={language === "ar" ? "rtl" : "ltr"}>
        <HubHeader title={tr("destinationHub.title")} subtitle={tr("destinationHub.unknownTitle")} onBack={onBack} tr={tr} />
        <DestinationSearch query={query} onQuery={setQuery} results={searchResults} onOpenDestination={onOpenDestination} tr={tr} />
        <section className="destination-hub-empty">
          <MapPin size={32} aria-hidden="true" />
          <h1>{tr("destinationHub.unknownTitle")}</h1>
          <p>{tr("destinationHub.unknownBody")}</p>
        </section>
      </main>
    );
  }

  const country = view.country;
  const city = view.city;
  const title = city ? view.title : localizedCountryName(view.countryCode, language, view.title);
  const subtitle = city ? `${view.subtitle} · ${tr("destinationHub.city")}` : `${view.countryCode || ""} · ${tr("destinationHub.country")}`;
  const emergencyField = city?.emergency || country?.emergency || null;
  const transportField = city?.transport || country?.transport || null;

  return (
    <main className="destination-hub-page" dir={language === "ar" ? "rtl" : "ltr"}>
      <HubHeader
        title={title}
        subtitle={subtitle}
        onBack={onBack}
        tr={tr}
        code={view.countryCode}
        type={city ? tr("destinationHub.city") : tr("destinationHub.country")}
        quality={view.qualityStatus}
        coordinatesAvailable={Boolean(city?.coordinates.value)}
      />

      <DestinationSearch query={query} onQuery={setQuery} results={searchResults} onOpenDestination={onOpenDestination} tr={tr} />

      {connectivity.isOffline && (
        <section className="destination-hub-offline fa-inline-message" role="status">
          <strong>{tr("destinationHub.offlineTitle")}</strong>
          <span>{tr("destinationHub.offlineBody")}</span>
        </section>
      )}

      <section className="destination-hub-grid" aria-label={tr("destinationHub.title")}>
        <OverviewSection country={country} tr={tr} />
        <LanguagesSection country={country} tr={tr} onTranslator={() => setTab("translator")} />
        <CurrencySection country={country} tr={tr} onCurrency={() => setTab("currency")} />
        <TimeSection country={country} cityTime={city?.time || null} tr={tr} />
        <EmergencySection field={emergencyField} tr={tr} onSOS={() => setTab("sos")} />
        <TransportSection field={transportField} tr={tr} onTransport={() => setTab("transport")} />
        <ElectricalSection country={country} tr={tr} />
        <EntrySection country={country} tr={tr} />
        <OfficialInfoSection country={country} tr={tr} />
        <CustomsSection country={country} tr={tr} />
        <PersonalSection personal={view.personal} tr={tr} />
        <CurrentActions tr={tr} setTab={setTab} />
      </section>
    </main>
  );
}

function HubHeader({
  title,
  subtitle,
  onBack,
  tr,
  code,
  type,
  quality,
  coordinatesAvailable
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
  tr: (key: string) => string;
  code?: string | null;
  type?: string;
  quality?: "verified" | "partial" | "unknown";
  coordinatesAvailable?: boolean;
}) {
  return (
    <header className="destination-hub-header">
      <button type="button" className="icon-btn" onClick={onBack} aria-label={tr("destinationHub.back")}>
        <ArrowLeft size={18} aria-hidden="true" />
      </button>
      <div>
        <p className="destination-hub-private"><Lock size={15} aria-hidden="true" /> {tr("destinationHub.private")}</p>
        <h1 dir="auto">{title}</h1>
        <p dir="auto">{subtitle}</p>
        <div className="destination-hub-badges">
          {type && <span>{type}</span>}
          {code && <span>{tr("destinationHub.countryCode")}: {code}</span>}
          {quality && <span>{quality === "verified" ? tr("destinationHub.dataVerified") : tr("destinationHub.dataPartial")}</span>}
          {coordinatesAvailable && <span>{tr("destinationHub.coordinatesInternal")}</span>}
        </div>
      </div>
    </header>
  );
}

function DestinationSearch({
  query,
  onQuery,
  results,
  onOpenDestination,
  tr
}: {
  query: string;
  onQuery: (value: string) => void;
  results: readonly DestinationHubSearchResult[];
  onOpenDestination: (destinationId: string) => void;
  tr: (key: string) => string;
}) {
  return (
    <section className="destination-hub-search" aria-labelledby="destination-hub-search-title">
      <h2 id="destination-hub-search-title">{tr("destinationHub.searchTitle")}</h2>
      <label>
        <Search size={16} aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder={tr("destinationHub.searchPlaceholder")}
          aria-label={tr("destinationHub.searchPlaceholder")}
        />
      </label>
      {query.trim() && (
        <div className="destination-hub-search-results">
          {results.length ? results.map((result) => (
            <button type="button" key={result.id} onClick={() => onOpenDestination(result.id)}>
              <strong dir="auto">{result.label}</strong>
              <span>{result.description}</span>
            </button>
          )) : <p>{tr("destinationHub.searchEmpty")}</p>}
        </div>
      )}
    </section>
  );
}

function OverviewSection({ country, tr }: { country: CountryIntelligence | null; tr: (key: string) => string }) {
  return (
    <HubCard icon={<BadgeInfo size={20} />} title={tr("destinationHub.overview")}>
      <FieldList
        rows={[
          [tr("destinationHub.capital"), fieldText(country?.capital, tr)],
          [tr("destinationHub.currency"), currenciesText(country, tr)],
          [tr("destinationHub.languages"), languagesText(country, tr)],
          [tr("destinationHub.callingCode"), fieldText(country?.callingCode, tr)],
          [tr("destinationHub.drivingSide"), fieldText(country?.drivingSide, tr)],
          [tr("destinationHub.measurementSystem"), fieldText(country?.measurementSystem, tr)]
        ]}
      />
      <SourceDetails sources={collectSources([country?.localizedName, country?.currencies, country?.languages])} tr={tr} />
    </HubCard>
  );
}

function LanguagesSection({ country, tr, onTranslator }: { country: CountryIntelligence | null; tr: (key: string) => string; onTranslator: () => void }) {
  const languages = country?.languages.value || [];
  return (
    <HubCard icon={<Languages size={20} />} title={tr("destinationHub.languages")}>
      {languages.length ? (
        <ul className="destination-chip-list">
          {languages.map((language) => <li key={`${language.code || language.displayName}:${language.role}`}>{language.displayName} · {language.role}</li>)}
        </ul>
      ) : <p>{fieldText(country?.languages, tr)}</p>}
      <button type="button" className="secondary-btn" onClick={onTranslator}>{tr("destinationHub.openTranslator")}</button>
    </HubCard>
  );
}

function CurrencySection({ country, tr, onCurrency }: { country: CountryIntelligence | null; tr: (key: string) => string; onCurrency: () => void }) {
  const currencies = country?.currencies.value || [];
  return (
    <HubCard icon={<Coins size={20} />} title={tr("destinationHub.currency")}>
      {currencies.length ? (
        <ul className="destination-chip-list">
          {currencies.map((currency) => <li key={currency.code}>{currency.displayName || currency.code} · {currency.code}{currency.symbol ? ` · ${currency.symbol}` : ""}</li>)}
        </ul>
      ) : <p>{fieldText(country?.currencies, tr)}</p>}
      <p className="destination-hub-note">{tr("destinationHub.currentRequired")}</p>
      <button type="button" className="secondary-btn" onClick={onCurrency}>{tr("destinationHub.openCurrency")}</button>
    </HubCard>
  );
}

function TimeSection({ country, cityTime, tr }: { country: CountryIntelligence | null; cityTime: CountryIntelligence["time"] | null; tr: (key: string) => string }) {
  const field = cityTime?.value?.cityTimeZone ? cityTime : country?.time || null;
  const zones = field?.value?.cityTimeZone ? [field.value.cityTimeZone] : field?.value?.timeZones || [];
  return (
    <HubCard icon={<MapPin size={20} />} title={zones.length > 1 ? tr("destinationHub.timezones") : tr("destinationHub.timezone")}>
      {zones.length ? <ul className="destination-chip-list">{zones.map((zone) => <li key={zone}>{zone}</li>)}</ul> : <p>{fieldText(field, tr)}</p>}
    </HubCard>
  );
}

function EmergencySection({ field, tr, onSOS }: { field: DestinationField<DestinationEmergencyInfo> | null; tr: (key: string) => string; onSOS: () => void }) {
  const info = field?.quality === "trusted" || field?.quality === "partial" ? field.value : null;
  const rows = info ? [
    [tr("destinationHub.generalEmergency"), info.general],
    [tr("destinationHub.police"), info.police],
    [tr("destinationHub.ambulance"), info.ambulance],
    [tr("destinationHub.fire"), info.fire],
    [tr("destinationHub.touristPolice"), info.touristPolice]
  ].filter(([, value]) => Boolean(value)) as Array<[string, string]> : [];
  return (
    <HubCard icon={<Shield size={20} />} title={tr("destinationHub.emergency")} tone="warning">
      {rows.length ? <FieldList rows={rows} /> : <p>{tr("destinationHub.emergencyUnavailable")}</p>}
      {info?.reviewedAt && <p className="destination-hub-note">{tr("destinationHub.reviewed")}: {info.reviewedAt}</p>}
      <SourceDetails sources={field?.sources || []} tr={tr} forceOpen={rows.length > 0} />
      <button type="button" className="primary-btn" onClick={onSOS}>{tr("destinationHub.openSOS")}</button>
    </HubCard>
  );
}

function TransportSection({ field, tr, onTransport }: { field: DestinationField<DestinationTransportInfo> | null; tr: (key: string) => string; onTransport: () => void }) {
  const info = field?.value;
  const items = [
    ["walking", tr("destinationHub.walking")],
    ["driving", tr("destinationHub.driving")],
    ["metro", tr("destinationHub.metro")],
    ["rail", tr("destinationHub.rail")],
    ["bus", tr("destinationHub.bus")],
    ["tram", tr("destinationHub.tram")],
    ["ferry", tr("destinationHub.ferry")],
    ["taxi", tr("destinationHub.taxi")],
    ["rideshare", tr("destinationHub.rideshare")],
    ["cycling", tr("destinationHub.cycling")]
  ] as const;
  return (
    <HubCard icon={<Bus size={20} />} title={tr("destinationHub.transport")}>
      <div className="destination-status-grid">
        {items.map(([key, label]) => <span key={key}><strong>{label}</strong>{statusText(info?.[key], tr)}</span>)}
      </div>
      <p className="destination-hub-note">{tr("destinationHub.transportNotice")}</p>
      <button type="button" className="secondary-btn" onClick={onTransport}><TrainFront size={16} aria-hidden="true" /> {tr("destinationHub.transport")}</button>
    </HubCard>
  );
}

function ElectricalSection({ country, tr }: { country: CountryIntelligence | null; tr: (key: string) => string }) {
  const electrical = country?.electrical.value;
  return (
    <HubCard icon={<Plug size={20} />} title={tr("destinationHub.power")}>
      <FieldList
        rows={[
          [tr("destinationHub.plugTypes"), electrical?.plugTypes.length ? electrical.plugTypes.join(", ") : fieldText(country?.electrical, tr)],
          [tr("destinationHub.voltage"), electrical ? electricalValuesText(electrical.voltages || (electrical.voltage ? [electrical.voltage] : []), "V", tr) : fieldText(country?.electrical, tr)],
          [tr("destinationHub.frequency"), electrical ? electricalValuesText(electrical.frequenciesHz || (electrical.frequencyHz ? [electrical.frequencyHz] : []), "Hz", tr) : fieldText(country?.electrical, tr)]
        ]}
      />
    </HubCard>
  );
}

function EntrySection({ country, tr }: { country: CountryIntelligence | null; tr: (key: string) => string }) {
  return (
    <HubCard icon={<CircleAlert size={20} />} title={tr("destinationHub.entryInfo")} tone="warning">
      <p>{tr("destinationHub.entryBoundary")}</p>
      <p className="destination-hub-note">{fieldText(country?.entry, tr)}</p>
      <SourceDetails sources={country?.entry.sources || []} tr={tr} />
    </HubCard>
  );
}

function OfficialInfoSection({ country, tr }: { country: CountryIntelligence | null; tr: (key: string) => string }) {
  return (
    <HubCard icon={<BookOpen size={20} />} title={tr("destinationHub.officialInfo")}>
      <p>{tr("destinationHub.safetyBoundary")}</p>
      <p className="destination-hub-note">{fieldText(country?.safety, tr)}</p>
      <SourceDetails sources={country?.safety.sources || []} tr={tr} />
    </HubCard>
  );
}

function CustomsSection({ country, tr }: { country: CountryIntelligence | null; tr: (key: string) => string }) {
  return (
    <HubCard icon={<UserRound size={20} />} title={tr("destinationHub.customs")}>
      <p>{country?.customs.value?.contentAvailable ? "" : tr("destinationHub.customsEmpty")}</p>
      <SourceDetails sources={country?.customs.sources || []} tr={tr} />
    </HubCard>
  );
}

function PersonalSection({ personal, tr }: { personal: DestinationHubPersonalContext; tr: (key: string) => string }) {
  const hasHistory = personal.tripCount > 0 || personal.visitedPlaces > 0 || personal.plannedTripCount > 0;
  return (
    <HubCard icon={<Lock size={20} />} title={tr("destinationHub.personal")}>
      <p><strong>{tr("destinationHub.status")}:</strong> {personal.status === "visited" ? tr("destinationHub.visited") : personal.status === "planned" ? tr("destinationHub.planned") : tr("destinationHub.notVisited")}</p>
      {hasHistory ? (
        <FieldList rows={[
          [tr("destinationHub.trips"), String(personal.tripCount)],
          [tr("destinationHub.plannedTrips"), String(personal.plannedTripCount)],
          [tr("destinationHub.citiesVisited"), String(personal.citiesVisited)],
          [tr("destinationHub.visitedPlaces"), String(personal.visitedPlaces)],
          [tr("destinationHub.memories"), String(personal.memoryCount)],
          [tr("destinationHub.journalEntries"), String(personal.journalEntryCount)]
        ]} />
      ) : <p>{tr("destinationHub.noPersonalHistory")}</p>}
    </HubCard>
  );
}

function CurrentActions({ tr, setTab }: { tr: (key: string) => string; setTab: (tab: Tab) => void }) {
  return (
    <HubCard icon={<Zap size={20} />} title={tr("destinationHub.currentInfoActions")}>
      <div className="destination-action-row">
        <button type="button" className="secondary-btn" onClick={() => setTab("traveltools")}>{tr("destinationHub.checkWeather")}</button>
        <button type="button" className="secondary-btn" onClick={() => setTab("currency")}>{tr("destinationHub.openCurrency")}</button>
        <button type="button" className="secondary-btn" onClick={() => setTab("sos")}>{tr("destinationHub.openSOS")}</button>
      </div>
    </HubCard>
  );
}

function HubCard({ icon, title, children, tone }: { icon: ReactNode; title: string; children: ReactNode; tone?: "warning" }) {
  return (
    <section className={`destination-hub-card ${tone === "warning" ? "destination-hub-card--warning" : ""}`} aria-labelledby={`destination-${slug(title)}`}>
      <h2 id={`destination-${slug(title)}`}>{icon}<span>{title}</span></h2>
      {children}
    </section>
  );
}

function FieldList({ rows }: { rows: Array<[string, string | undefined]> }) {
  return (
    <dl className="destination-field-list">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd dir="auto">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function SourceDetails({ sources, tr, forceOpen }: { sources: readonly DestinationSource[]; tr: (key: string) => string; forceOpen?: boolean }) {
  if (sources.length === 0) return null;
  return (
    <details className="destination-source-details" open={forceOpen}>
      <summary>{tr("destinationHub.aboutInfo")}</summary>
      <ul>
        {sources.map((source) => (
          <li key={source.id}>
            <strong>{source.title}</strong>
            <span>{tr("destinationHub.source")}: {source.authority}</span>
            {source.reviewedAt && <span>{tr("destinationHub.reviewed")}: {source.reviewedAt}</span>}
          </li>
        ))}
      </ul>
    </details>
  );
}

function fieldText(field: DestinationField<unknown> | null | undefined, tr: (key: string) => string) {
  if (!field) return tr("destinationHub.notAvailable");
  const state = fieldDisplayState(field);
  if (state === "current_required") return tr("destinationHub.currentRequired");
  if (state === "not_verified") return tr("destinationHub.notVerified");
  if (state === "not_available") return tr("destinationHub.notAvailable");
  if (Array.isArray(field.value)) return field.value.length ? String(field.value.length) : tr("destinationHub.notAvailable");
  return field.value ? String(field.value) : tr("destinationHub.notAvailable");
}

function currenciesText(country: CountryIntelligence | null, tr: (key: string) => string) {
  const currencies = country?.currencies.value || [];
  return currencies.length ? currencies.map((currency) => currency.code).join(", ") : fieldText(country?.currencies, tr);
}

function languagesText(country: CountryIntelligence | null, tr: (key: string) => string) {
  const languages = country?.languages.value || [];
  return languages.length ? languages.map((language) => language.displayName).join(", ") : fieldText(country?.languages, tr);
}

function collectSources(fields: Array<DestinationField<unknown> | null | undefined>) {
  const sources = new Map<string, DestinationSource>();
  fields.forEach((field) => field?.sources.forEach((source) => sources.set(source.id, source)));
  return [...sources.values()];
}

function statusText(status: DestinationTransportInfo[keyof DestinationTransportInfo] | undefined, tr: (key: string) => string) {
  if (status === "available") return tr("destinationHub.available");
  if (status === "limited") return tr("destinationHub.limited");
  if (status === "not_applicable") return tr("destinationHub.notApplicable");
  return tr("destinationHub.notKnown");
}

function electricalValuesText(values: readonly number[], unit: "V" | "Hz", tr: (key: string) => string) {
  return values.length ? `${values.join(" / ")} ${unit}` : tr("destinationHub.notAvailable");
}

function localizedCountryName(code: string | null, language: string, fallback: string) {
  if (!code) return fallback;
  try {
    const locale = language === "ar" ? "ar-MA" : language === "fr" ? "fr-FR" : language === "es" ? "es-ES" : language === "pt" ? "pt-PT" : "en-US";
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) || fallback;
  } catch {
    return fallback;
  }
}

function slug(value: string) {
  const ascii = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (ascii) return ascii;
  return `section-${[...value].map((char) => char.codePointAt(0)?.toString(36) || "0").join("-")}`;
}
