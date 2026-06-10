import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Tab } from "../main";

export function ProfilePage({ setTab }: { setTab: (tab: Tab) => void }) {
  const [email, setEmail] = useState("");

  useEffect(() => {
    async function loadUser() {
      if (!supabase) return;

      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email || "");
    }

    loadUser();
  }, []);

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  return (
    <>
      <div className="topbar">
        <div className="brand">
          FanAtlas <span>2026</span>
        </div>
        <div className="language-pill">🌐 English</div>
      </div>

      <div className="profile-hero">
        <div className="avatar">👤</div>
        <h2>{email ? email.split("@")[0] : "FanAtlas User"}</h2>
        <p>{email || "Signed in"}</p>
      </div>

      <div className="setting-row">
        <span>♡ Favorite Team</span>
        <strong>Morocco ›</strong>
      </div>

      <div className="setting-row">
        <span>🌐 Language</span>
        <strong>English ›</strong>
      </div>

      <button className="premium-row">
        👑 FanAtlas Premium <span>Upgrade plan →</span>
      </button>

      <button className="setting-row" onClick={() => setTab("map")}>
        <span>📡 Offline Content</span>
        <strong>Download maps & itineraries</strong>
      </button>

      <button className="setting-row" onClick={() => setTab("tv")}>
        <span>📺 Connect to TV</span>
        <strong>Cast map & matches</strong>
      </button>

      <button className="setting-row" onClick={() => setTab("translator")}>
        <span>🗣 Voice Translator</span>
        <strong>10 languages</strong>
      </button>

      <button className="signout" onClick={signOut}>
        ↪ Sign Out
      </button>
    </>
  );
}
