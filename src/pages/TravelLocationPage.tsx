import { ReactNode, useMemo, useState } from "react";
import { BackButton } from "../components/BackButton";
import { countries, cityOptionsForCountry, countryFlag } from "../data/countries";
import { Language, languages } from "../i18n";
import { useLanguage } from "../LanguageContext";
import { useTravelLocation } from "../TravelLocationContext";

type SupportedLanguage = Language | "de" | "it";

const languageOptions: Array<{ value: SupportedLanguage; label: string }> = [
  { value: "en", label: "🇬🇧 English" },
  { value: "fr", label: "🇫🇷 French" },
  { value: "es", label: "🇪🇸 Spanish" },
  { value: "ar", label: "🇸🇦 Arabic" },
  { value: "pt", label: "🇵🇹 Portuguese" },
  { value: "de", label: "🇩🇪 German" },
  { value: "it", label: "🇮🇹 Italian" }
];

const appSupportedLanguages = new Set(["en", "fr", "es", "ar", "pt"]);

export function TravelLocationPage({ onBack, onSaved }: { onBack: () => void; onSaved: () => void }) {
  const { language, setLanguage } = useLanguage();
  const { travelLocation, saveTravelLocation } = useTravelLocation();
  const [originCountry, setOriginCountry] = useState(travelLocation.originCountry || "");
  const [destinationCountry, setDestinationCountry] = useState(travelLocation.destinationCountry);
  const [destinationCity, setDestinationCity] = useState(travelLocation.destinationCity);
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(language);
  const initialCityOptions = cityOptionsForCountry(travelLocation.destinationCountry);
  const [manualCity, setManualCity] = useState(initialCityOptions.includes(travelLocation.destinationCity) ? "" : travelLocation.destinationCity);
  const [cityMode, setCityMode] = useState(initialCityOptions.includes(travelLocation.destinationCity) ? "select" : "other");
  const [status, setStatus] = useState("");

  const countryDropdownOptions = useMemo(() => countries.map((country) => ({
    value: country.name,
    label: `${country.flag} ${country.name}`,
    search: country.name
  })), []);
  const destinationCities = useMemo(() => cityOptionsForCountry(destinationCountry), [destinationCountry]);
  const cityDropdownOptions = useMemo(() => destinationCities.map((city) => ({
    value: city,
    label: city,
    search: city
  })), [destinationCities]);
  const languageDropdownOptions = languageOptions.map((option) => ({
    value: option.value,
    label: option.label,
    search: option.label
  }));
  const finalDestinationCity = cityMode === "other" ? manualCity.trim() : destinationCity;
  const languageLabel = languageOptions.find((option) => option.value === selectedLanguage)?.label.replace(/^.. /, "") || languages[language];

  async function save() {
    if (!originCountry || !destinationCountry || !finalDestinationCity) {
      setStatus("Choose your home country, destination country, and city.");
      return;
    }

    if (appSupportedLanguages.has(selectedLanguage)) {
      await setLanguage(selectedLanguage as Language);
    }
    localStorage.setItem("fanatlas_preferred_language", selectedLanguage);
    await saveTravelLocation({
      originCountry,
      destinationCountry,
      destinationCity: finalDestinationCity
    });
    sessionStorage.setItem("fanatlas_travel_toast", "Travel destination updated successfully.");
    onSaved();
  }

  return (
    <div className="travel-location-page">
      <div className="topbar">
        <BackButton onBack={onBack} />
        <div>
          <div className="brand">FanAtlas <span>Trip</span></div>
          <div className="subtle">Set your travel destination for better recommendations.</div>
        </div>
      </div>

      <section className="card-dark travel-location-card">
        <div className="travel-location-hero">
          <span>Trip Setup</span>
          <h1>Travel Location</h1>
          <p>Set the trip FanAtlas should use for maps, places, SOS, tools, and AI context.</p>
        </div>

        <div className="travel-location-section">
          <span className="form-section-label">Where are you from?</span>
          <SearchableDropdown
            label="From country"
            placeholder="Search country"
            options={countryDropdownOptions}
            value={originCountry}
            onChange={setOriginCountry}
          />
        </div>

        <div className="travel-location-section">
          <span className="form-section-label">Where are you traveling?</span>
          <SearchableDropdown
            label="Traveling to country"
            placeholder="Search destination country"
            options={countryDropdownOptions}
            value={destinationCountry}
            onChange={(nextCountry) => {
              setDestinationCountry(nextCountry);
              const nextCities = cityOptionsForCountry(nextCountry);
              setDestinationCity(nextCities[0] || "Other...");
              setManualCity("");
              setCityMode("select");
            }}
          />
        </div>

        <div className="travel-location-section">
          <span className="form-section-label">City</span>
          <SearchableDropdown
            label="City"
            placeholder="Search city"
            options={cityDropdownOptions}
            value={destinationCity}
            onChange={(nextCity) => {
              setDestinationCity(nextCity);
              setCityMode(nextCity === "Other..." ? "other" : "select");
              if (nextCity !== "Other...") setManualCity("");
            }}
          />
          {cityMode === "other" && (
            <label className="manual-city-field">
              City name
              <input
                className="input"
                placeholder="Enter destination city"
                value={manualCity}
                onChange={(event) => setManualCity(event.target.value)}
              />
            </label>
          )}
        </div>

        <div className="travel-location-section">
          <span className="form-section-label">Preferred language</span>
          <SearchableDropdown
            label="Language"
            placeholder="Choose language"
            options={languageDropdownOptions}
            value={selectedLanguage}
            onChange={(value) => setSelectedLanguage(value as SupportedLanguage)}
          />
        </div>

        <section className="trip-summary-card">
          <span>Trip Summary</span>
          <SummaryRow label="From" value={`${countryFlag(originCountry)} ${originCountry || "Not selected"}`} />
          <SummaryRow label="To" value={`${countryFlag(destinationCountry)} ${destinationCountry || "Not selected"}`} />
          <SummaryRow label="City" value={finalDestinationCity || "Not selected"} />
          <SummaryRow label="Language" value={languageLabel} />
        </section>

        {status && <div className="route-status">{status}</div>}

        <button className="primary-btn full-width travel-location-save" onClick={save}>
          Update Travel Location
        </button>
      </section>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function SearchableDropdown<T extends string>({
  label,
  placeholder,
  options,
  value,
  onChange
}: {
  label: string;
  placeholder: string;
  options: Array<{ value: T; label: ReactNode; search: string }>;
  value: T | string;
  onChange: (value: T) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  const filtered = options
    .filter((option) => option.search.toLowerCase().includes(query.trim().toLowerCase()))
    .slice(0, 80);

  return (
    <div className="searchable-select">
      <span>{label}</span>
      <button className="searchable-select-trigger" type="button" onClick={() => setOpen((current) => !current)}>
        <strong>{selected?.label || placeholder}</strong>
        <em>⌄</em>
      </button>

      {open && (
        <div className="searchable-select-menu">
          <input
            autoFocus
            className="input"
            placeholder={placeholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="searchable-select-options">
            {filtered.map((option) => (
              <button
                type="button"
                key={option.value}
                className={option.value === value ? "active" : ""}
                onClick={() => {
                  onChange(option.value);
                  setQuery("");
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            ))}
            {filtered.length === 0 && <p>No matches found.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
