import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { Home, MapPin, Compass, Trophy, User, Shield } from "lucide-react";
import "./styles.css";
import { HomePage } from "./pages/HomePage";
import { MapPage } from "./pages/MapPage";
import { ExplorePage } from "./pages/ExplorePage";
import { MatchesPage } from "./pages/MatchesPage";
import { ProfilePage } from "./pages/ProfilePage";
import { SOSPage } from "./pages/SOSPage";
import { AIChatPage } from "./pages/AIChatPage";
import { TravelGuidesPage } from "./pages/TravelGuidesPage";

type Tab = "home" | "map" | "explore" | "matches" | "sos" | "profile" | "ai" | "guides";

function App() {
  const [tab, setTab] = useState<Tab>("home");

  const render = () => {
    if (tab === "home") return <HomePage setTab={setTab} />;
    if (tab === "map") return <MapPage />;
    if (tab === "explore") return <ExplorePage />;
    if (tab === "matches") return <MatchesPage setTab={setTab} />;
    if (tab === "sos") return <SOSPage />;
    if (tab === "profile") return <ProfilePage />;
    if (tab === "ai") return <AIChatPage />;
    if (tab === "guides") return <TravelGuidesPage />;
    return <HomePage setTab={setTab} />;
  };

  const nav = [
    { id: "home", label: "Home", icon: Home },
    { id: "map", label: "Map", icon: MapPin },
    { id: "explore", label: "Explore", icon: Compass },
    { id: "matches", label: "Matches", icon: Trophy },
    { id: "sos", label: "SOS", icon: Shield },
    { id: "profile", label: "Profile", icon: User },
  ] as const;

  return (
    <div className="app-shell">
      <main className="screen">{render()}</main>
      <nav className="bottom-nav">
        {nav.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`nav-btn ${tab === item.id ? "active" : ""}`}
              onClick={() => setTab(item.id as Tab)}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
