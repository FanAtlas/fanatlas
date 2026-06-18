import { useEffect, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  Bell,
  Globe2,
  Heart,
  Languages,
  LogOut,
  Map,
  Monitor,
  Shield,
  Sparkles,
  Ticket,
  UserRound
} from "lucide-react";
import { Language, languages } from "../i18n";
import { useLanguage } from "../LanguageContext";
import { supabase } from "../lib/supabase";
import { Tab } from "../main";
import { MapDestination } from "../mapDestinations";
import { getPremiumSubscription, isPremiumActive, premiumEventName } from "../services/premium";

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
  setMapDestination,
  setTab
}: {
  setMapDestination: (destination: MapDestination | null) => void;
  setTab: (tab: Tab) => void;
}) {
  const { language, setLanguage, t } = useLanguage();
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [premiumActive, setPremiumActive] = useState(() => isPremiumActive());

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

  useEffect(() => {
    function refreshPremium() {
      setPremiumActive(isPremiumActive(getPremiumSubscription()));
    }

    window.addEventListener(premiumEventName(), refreshPremium);
    window.addEventListener("storage", refreshPremium);

    return () => {
      window.removeEventListener(premiumEventName(), refreshPremium);
      window.removeEventListener("storage", refreshPremium);
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
          {premiumActive && (
            <span className="premium-badge-inline"><Sparkles size={13} /> Premium</span>
          )}
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
        <button className="profile-row" onClick={() => setTab("offline")}>
          <span className="profile-row-icon"><Globe2 size={19} /></span>
          <span>
            <strong>Country</strong>
            <small>{profile.country || "Not set"}</small>
          </span>
          <em>›</em>
        </button>

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
              <option value="es">🇲🇽 Español</option>
              <option value="fr">🇫🇷 Français</option>
              <option value="ar">🇲🇦 العربية</option>
              <option value="pt">🇧🇷 Português</option>
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

      <button className="profile-premium-row" onClick={() => setTab("premium")}>
        <span><Sparkles size={20} /> {t.premium}</span>
        <strong>{premiumActive ? "Manage plan" : t.upgradePlan} →</strong>
      </button>

      <section className="profile-section">
        <button className="profile-row" onClick={() => setTab("tickets")}>
          <span className="profile-row-icon"><Ticket size={19} /></span>
          <span>
            <strong>{t.myTickets}</strong>
            <small>{t.ticketDetails}</small>
          </span>
          <em>›</em>
        </button>

        <button className="profile-row" onClick={() => setTab("notifications")}>
          <span className="profile-row-icon"><Bell size={19} /></span>
          <span>
            <strong>Notifications</strong>
            <small>Match, hotel, ticket, fan zone, SOS, and arrival reminders</small>
          </span>
          <em>›</em>
        </button>

        <button className="profile-row" onClick={() => setTab("revenue")}>
          <span className="profile-row-icon"><BarChart3 size={19} /></span>
          <span>
            <strong>Revenue Tracking</strong>
            <small>Affiliate clicks, top products, and top stadiums</small>
          </span>
          <em>›</em>
        </button>

        <button
          className="profile-row"
          onClick={() => {
            setMapDestination(null);
            setTab("map");
          }}
        >
          <span className="profile-row-icon"><Map size={19} /></span>
          <span>
            <strong>{t.offlineContent}</strong>
            <small>{t.offlineContentDesc}</small>
          </span>
          <em>›</em>
        </button>

        <button className="profile-row" onClick={() => setTab("tv")}>
          <span className="profile-row-icon"><Monitor size={19} /></span>
          <span>
            <strong>{t.connectTv}</strong>
            <small>{t.connectTvDesc}</small>
          </span>
          <em>›</em>
        </button>

        <button className="profile-row" onClick={() => setTab("translator")}>
          <span className="profile-row-icon"><UserRound size={19} /></span>
          <span>
            <strong>{t.voiceTranslator}</strong>
            <small>{t.tenLanguages}</small>
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
    </div>
  );
}
