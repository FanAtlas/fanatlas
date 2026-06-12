import { useState } from "react";
import { supabase } from "../lib/supabase";

type Props = {
  onComplete: () => void;
};

export function OnboardingPage({ onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [language, setLanguage] = useState("en");
  const [country, setCountry] = useState("");
  const [favoriteTeam, setFavoriteTeam] = useState("");
  const [interests, setInterests] = useState<string[]>([]);

  const toggleInterest = (item: string) => {
    setInterests((prev) =>
      prev.includes(item)
        ? prev.filter((i) => i !== item)
        : [...prev, item]
    );
  };

  async function finish() {
    if (!supabase) return;

    const { data } = await supabase.auth.getUser();
    const user = data.user;

    if (!user) return;

    await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email,
      username: user.email?.split("@")[0],
      language,
      country,
      favorite_team: favoriteTeam,
      interests,
      notifications: true,
      onboarding_complete: true
    });

    onComplete();
  }

  return (
    <div className="onboarding-page">
      <div className="onboarding-card">
        {step === 1 && (
          <>
            <h1>Welcome to FanAtlas 🌎⚽</h1>
            <p>Your FIFA World Cup 2026 travel companion.</p>
            <button className="primary-btn full-width" onClick={() => setStep(2)}>
              Get Started
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h2>Select your language</h2>
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="en">🇺🇸 English</option>
              <option value="es">🇲🇽 Español</option>
              <option value="fr">🇫🇷 Français</option>
              <option value="ar">🇲🇦 العربية</option>
              <option value="pt">🇧🇷 Português</option>
            </select>
            <button className="primary-btn full-width" onClick={() => setStep(3)}>
              Continue
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <h2>Where are you traveling from?</h2>
            {["United States", "Morocco", "Mexico", "Canada", "France", "Brazil", "Argentina", "Spain"].map((c) => (
              <button
                key={c}
                className={`choice-btn ${country === c ? "active" : ""}`}
                onClick={() => setCountry(c)}
              >
                {c}
              </button>
            ))}
            <button className="primary-btn full-width" onClick={() => setStep(4)}>
              Continue
            </button>
          </>
        )}

        {step === 4 && (
          <>
            <h2>Who are you supporting?</h2>
            {["Morocco", "USA", "Mexico", "Canada", "Brazil", "Argentina", "France", "Spain"].map((team) => (
              <button
                key={team}
                className={`choice-btn ${favoriteTeam === team ? "active" : ""}`}
                onClick={() => setFavoriteTeam(team)}
              >
                {team}
              </button>
            ))}
            <button className="primary-btn full-width" onClick={() => setStep(5)}>
              Continue
            </button>
          </>
        )}

        {step === 5 && (
          <>
            <h2>What do you need?</h2>
            {["Hotels", "Restaurants", "Fan Zones", "eSIM", "Transportation", "Tickets", "AI Assistant"].map((item) => (
              <button
                key={item}
                className={`choice-btn ${interests.includes(item) ? "active" : ""}`}
                onClick={() => toggleInterest(item)}
              >
                {interests.includes(item) ? "✅ " : ""}{item}
              </button>
            ))}
            <button className="primary-btn full-width" onClick={finish}>
              Finish Setup
            </button>
          </>
        )}
      </div>
    </div>
  );
}
