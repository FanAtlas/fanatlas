import { useState } from "react";
import { citiesForCountry, countryNames } from "../data/destinations";
import { Language, languages } from "../i18n";
import { useLanguage } from "../LanguageContext";
import { supabase } from "../lib/supabase";
import { DESTINATION_CITY_KEY, DESTINATION_COUNTRY_KEY, LOCATION_SOURCE_KEY, ORIGIN_COUNTRY_KEY } from "../TravelLocationContext";

type Props = {
  onComplete: () => void;
};

export function OnboardingPage({ onComplete }: Props) {
  const { language, setLanguage } = useLanguage();
  const [step, setStep] = useState(1);
  const [originCountry, setOriginCountry] = useState("");
  const [destinationCountry, setDestinationCountry] = useState("");
  const [destinationCity, setDestinationCity] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function finish() {
    if (!originCountry || !destinationCountry || !destinationCity) {
      setError("Choose where you are from, where you are traveling, and what city you are visiting.");
      return;
    }

    setSaving(true);
    setError("");

    const { data, error: userError } = supabase
      ? await supabase.auth.getUser()
      : { data: { user: null }, error: null };
    const user = data.user;

    if (supabase && (userError || !user)) {
      setSaving(false);
      setError(userError?.message || "You need to be signed in to finish setup.");
      return;
    }

    localStorage.setItem("fanatlas_language", language);
    localStorage.setItem(ORIGIN_COUNTRY_KEY, originCountry);
    localStorage.setItem(DESTINATION_COUNTRY_KEY, destinationCountry);
    localStorage.setItem(DESTINATION_CITY_KEY, destinationCity);
    localStorage.setItem(LOCATION_SOURCE_KEY, "manual");

    const { error: profileError } = supabase && user ? await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email,
      username: user.email?.split("@")[0] || user.phone || "FanAtlas user",
      language,
      origin_country: originCountry,
      destination_country: destinationCountry,
      destination_city: destinationCity
    }) : { error: null };

    setSaving(false);

    if (profileError) {
      setError(profileError.message);
      return;
    }

    onComplete();
  }

  return (
    <div className="onboarding-page">
      <div className="onboarding-card">
        <div className="onboarding-language-current language-pill">{languages[language]}</div>
        <div className="auth-logo">FA</div>
        <h1>FanAtlas Setup</h1>
        <p>Set your travel basics before entering the app.</p>

        {step === 1 && (
          <>
            <h2>Preferred language</h2>
            <select
              value={language}
              onChange={(event) => {
                setError("");
                setLanguage(event.target.value as Language);
              }}
            >
              <option value="en">🇺🇸 English</option>
              <option value="fr">🇫🇷 Français</option>
              <option value="es">🇪🇸 Español</option>
              <option value="ar">🇲🇦 العربية</option>
              <option value="pt">🇵🇹 Português</option>
            </select>
            <button className="primary-btn full-width" onClick={() => setStep(2)}>
              Continue
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h2>Where are you coming from?</h2>
            <input
              list="onboarding-origin-countries"
              value={originCountry}
              placeholder="Morocco, France, Canada..."
              onChange={(event) => {
                setError("");
                setOriginCountry(event.target.value);
              }}
            />
            <datalist id="onboarding-origin-countries">
              {countryNames.map((country) => (
                <option key={country} value={country} />
              ))}
            </datalist>
            <button className="primary-btn full-width" disabled={!originCountry} onClick={() => setStep(3)}>
              Continue
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <h2>Where are you traveling to?</h2>
            <input
              list="onboarding-destination-countries"
              value={destinationCountry}
              placeholder="Spain, Japan, Brazil..."
              onChange={(event) => {
                setError("");
                const nextCountry = event.target.value;
                setDestinationCountry(nextCountry);
                if (citiesForCountry(nextCountry).length) {
                  setDestinationCity(citiesForCountry(nextCountry)[0] || "");
                }
              }}
            />
            <datalist id="onboarding-destination-countries">
              {countryNames.map((country) => (
                <option key={country} value={country} />
              ))}
            </datalist>
            {error && <p className="onboarding-error">{error}</p>}
            <button className="primary-btn full-width" disabled={!destinationCountry} onClick={() => setStep(4)}>
              Continue
            </button>
          </>
        )}

        {step === 4 && (
          <>
            <h2>What city are you visiting?</h2>
            <input
              list="onboarding-destination-cities"
              value={destinationCity}
              placeholder="Paris, Tokyo, Cairo..."
              onChange={(event) => {
                setError("");
                setDestinationCity(event.target.value);
              }}
            />
            <datalist id="onboarding-destination-cities">
              {citiesForCountry(destinationCountry).map((city) => (
                <option key={city} value={city} />
              ))}
            </datalist>
            {error && <p className="onboarding-error">{error}</p>}
            <button className="primary-btn full-width" disabled={saving || !destinationCity} onClick={finish}>
              {saving ? "Saving..." : "Finish Setup"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
