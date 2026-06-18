import { useState } from "react";
import { getCountryOptions } from "../data/onboardingOptions";
import { Language } from "../i18n";
import { useLanguage } from "../LanguageContext";
import { supabase } from "../lib/supabase";

type Props = {
  onComplete: () => void;
};

const destinationCountries = ["USA", "Canada", "Mexico"];

export function OnboardingPage({ onComplete }: Props) {
  const { language, setLanguage } = useLanguage();
  const [step, setStep] = useState(1);
  const [originCountry, setOriginCountry] = useState("");
  const [destinationCountry, setDestinationCountry] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const countryOptions = getCountryOptions();

  async function finish() {
    if (!originCountry || !destinationCountry) {
      setError("Choose where you are coming from and where you are traveling to.");
      return;
    }

    if (!supabase) {
      setError("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
      return;
    }

    setSaving(true);
    setError("");

    const { data, error: userError } = await supabase.auth.getUser();
    const user = data.user;

    if (userError || !user) {
      setSaving(false);
      setError(userError?.message || "You need to be signed in to finish setup.");
      return;
    }

    localStorage.setItem("fanatlas.language", language);

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email,
      username: user.email?.split("@")[0] || user.phone || "FanAtlas user",
      language,
      origin_country: originCountry,
      destination_country: destinationCountry
    });

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
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="ar">العربية</option>
              <option value="pt">Português</option>
            </select>
            <button className="primary-btn full-width" onClick={() => setStep(2)}>
              Continue
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h2>Where are you coming from?</h2>
            <select
              value={originCountry}
              onChange={(event) => {
                setError("");
                setOriginCountry(event.target.value);
              }}
            >
              <option value="">Select country</option>
              {countryOptions.map((country) => (
                <option key={country.name} value={country.name}>
                  {country.name}
                </option>
              ))}
            </select>
            <button className="primary-btn full-width" disabled={!originCountry} onClick={() => setStep(3)}>
              Continue
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <h2>Where are you traveling to?</h2>
            <select
              value={destinationCountry}
              onChange={(event) => {
                setError("");
                setDestinationCountry(event.target.value);
              }}
            >
              <option value="">Select destination</option>
              {destinationCountries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
            {error && <p className="onboarding-error">{error}</p>}
            <button className="primary-btn full-width" disabled={saving || !destinationCountry} onClick={finish}>
              {saving ? "Saving..." : "Finish Setup"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
