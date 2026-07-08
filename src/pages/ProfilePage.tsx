import { useEffect, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  Globe2,
  Heart,
  Languages,
  LogOut,
  Shield,
  Ticket,
  Wrench
} from "lucide-react";
import { Language, languages } from "../i18n";
import { useLanguage } from "../LanguageContext";
import { LegalFooter } from "../components/LegalFooter";
import { supabase } from "../lib/supabase";
import { Tab } from "../main";
import { useTravelLocation } from "../TravelLocationContext";

type Profile = {
  email: string;
  username: string;
  country: string;
  favorite_team: string;
  language: Language | "";
  interests: string[];
};

const defaultProfile: Profile = {
  email: "",
  username: "",
  country: "",
  favorite_team: "",
  language: "",
  interests: []
};

export function ProfilePage({
  isAdmin,
  setTab
}: {
  isAdmin: boolean;
  setTab: (tab: Tab) => void;
}) {
  const { language, setLanguage, t } = useLanguage();
  const { travelLocation } = useTravelLocation();
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      if (!supabase) {
        setLoading(false);
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.getUser();
      const user = authData.user;

      if (!mounted) return;

      if (authError || !user) {
        setProfileError(authError?.message || "Could not load signed-in user.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("email, username, country, favorite_team, language, interests")
        .eq("id", user.id)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        setProfileError(error.message);
      }

      setProfile({
        email: data?.email || user.email || "",
        username: data?.username || user.email?.split("@")[0] || "",
        country: data?.country || "",
        favorite_team: data?.favorite_team || "",
        language: data?.language || "",
        interests: Array.isArray(data?.interests) ? data.interests : []
      });

      setLoading(false);
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  const displayName = profile.username || profile.email.split("@")[0] || t.profileUser;
  const initials = displayName
    .split(/[.\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "FA";

  return (
    <div className="profile-page" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="topbar">
        <div className="brand">
          FanAtlas <span>2026</span>
        </div>
        <div className="language-pill">{languages[language]}</div>
      </div>

      <div className="profile-hero">
        <div className="avatar">{initials}</div>
        <div className="profile-hero-copy">
          <span><BadgeCheck size={14} /> Signed in</span>
          <h2>{displayName}</h2>
          <p>{profile.email || t.signedIn}</p>
        </div>
      </div>

      {loading && (
        <div className="card-dark">
          <strong>Loading profile...</strong>
          <p className="subtle">Fetching your saved FanAtlas settings.</p>
        </div>
      )}

      {profileError && (
        <div className="alert-card danger">
          <AlertTriangle size={18} />
          <div>
            <strong>Profile unavailable</strong>
            <p>{profileError}</p>
          </div>
        </div>
      )}

      <section className="profile-section">
        <button className="profile-row" onClick={() => setTab("travelLocation")}>
          <span className="profile-row-icon"><Globe2 size={19} /></span>
          <span>
            <strong>Change travel location</strong>
            <small>Traveling to {travelLocation.destinationCity}, {travelLocation.destinationCountry}</small>
          </span>
          <em>›</em>
        </button>

        <div className="profile-row profile-info-row">
          <span className="profile-row-icon"><MapPinIcon /></span>
          <span>
            <strong>Home country</strong>
            <small>{travelLocation.originCountry || "Not set"}</small>
          </span>
        </div>

        <div className="profile-row profile-info-row">
          <span className="profile-row-icon"><Globe2 size={19} /></span>
          <span>
            <strong>Traveling to</strong>
            <small>{travelLocation.destinationCity}, {travelLocation.destinationCountry}</small>
          </span>
        </div>

        <button className="profile-row" onClick={() => setTab("matches")}>
          <span className="profile-row-icon"><Heart size={19} /></span>
          <span>
            <strong>{t.favoriteTeam}</strong>
            <small>{profile.favorite_team || "Not set"}</small>
          </span>
          <em>›</em>
        </button>

        <label className="profile-row profile-language-row">
          <span className="profile-row-icon"><Languages size={19} /></span>
          <span>
            <strong>{t.language}</strong>
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value as Language)}
            >
              <option value="en">🇺🇸 English</option>
              <option value="fr">🇫🇷 Français</option>
              <option value="es">🇪🇸 Español</option>
              <option value="ar">🇲🇦 العربية</option>
              <option value="pt">🇵🇹 Português</option>
            </select>
          </span>
          <em>›</em>
        </label>
      </section>

      {profile.interests.length > 0 && (
        <div className="profile-interest-strip">
          {profile.interests.map((interest) => (
            <span key={interest}>{interest}</span>
          ))}
        </div>
      )}

      <section className="profile-section">
        <button className="profile-row" onClick={() => setTab("tickets")}>
          <span className="profile-row-icon"><Ticket size={19} /></span>
          <span>
            <strong>{t.myTickets}</strong>
            <small>{t.ticketDetails}</small>
          </span>
          <em>›</em>
        </button>

        {isAdmin && (
          <button className="profile-row" onClick={() => setTab("revenue")}>
            <span className="profile-row-icon"><BarChart3 size={19} /></span>
            <span>
              <strong>Revenue Tracking</strong>
              <small>Affiliate clicks, top products, and top stadiums</small>
            </span>
            <em>›</em>
          </button>
        )}

        <button className="profile-row" onClick={() => setTab("traveltools")}>
          <span className="profile-row-icon"><Wrench size={19} /></span>
          <span>
            <strong>{t.travelTools}</strong>
            <small>eSIM, currency, translator, checklist, expenses, and guides</small>
          </span>
          <em>›</em>
        </button>

        <button className="profile-row" onClick={() => setTab("offline")}>
          <span className="profile-row-icon"><Globe2 size={19} /></span>
          <span>
            <strong>{t.offlineContent}</strong>
            <small>Save country guides and emergency details for offline access</small>
          </span>
          <em>›</em>
        </button>

        <button className="profile-row emergency" onClick={() => setTab("sos")}>
          <span className="profile-row-icon"><Shield size={19} /></span>
          <span>
            <strong>{t.sosEmergency}</strong>
            <small>{t.sosEmergencyDesc}</small>
          </span>
          <em>›</em>
        </button>
      </section>

      <button className="signout" onClick={signOut}>
        <LogOut size={18} /> {t.signOut}
      </button>

      <LegalFooter setTab={setTab} />
    </div>
  );
}

function MapPinIcon() {
  return <Globe2 size={19} />;
}
