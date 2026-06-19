import { Coins, Languages, ListChecks, MapPin, Monitor, Smartphone, WalletCards, BookOpen, MessageSquareText } from "lucide-react";
import { BackButton } from "../components/BackButton";
import { useLanguage } from "../LanguageContext";
import { Tab } from "../main";

const tools = [
  { label: "eSIM", description: "Mobile data for travel.", icon: Smartphone, tab: "esim" as Tab },
  { label: "Currency", description: "Live exchange rates.", icon: Coins, tab: "currency" as Tab },
  { label: "Translator", description: "Translate useful phrases.", icon: Languages, tab: "translator" as Tab },
  { label: "Checklist", description: "Track trip essentials.", icon: ListChecks, tab: "checklist" as Tab },
  { label: "Expenses", description: "Track travel spending.", icon: WalletCards, tab: "expenses" as Tab },
  { label: "Offline Guide", description: "Save travel basics.", icon: MapPin, tab: "offline" as Tab },
  { label: "Phrasebook", description: "Emergency phrases.", icon: MessageSquareText, tab: "phrasebook" as Tab },
  { label: "Travel Guides", description: "Before and during trip tips.", icon: BookOpen, tab: "guides" as Tab },
  { label: "TV Mode", description: "Connect trip view to a screen.", icon: Monitor, tab: "tv" as Tab }
];

export function TravelToolsPage({ onBack, setTab }: { onBack: () => void; setTab: (tab: Tab) => void }) {
  const { language, t } = useLanguage();

  return (
    <div className="travel-tools-page" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="topbar">
        <BackButton onBack={onBack} />
        <div>
          <div className="brand">{t.travelTools}</div>
          <div className="subtle">{t.travelToolsSubtitle}</div>
        </div>
      </div>

      <section className="travel-tools-hero">
        <span>{t.travelEssentials}</span>
        <h1>{t.travelToolsHero}</h1>
        <p>{t.travelToolsHeroDesc}</p>
      </section>

      <div className="travel-tools-grid">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button className="travel-tool-card" key={tool.label} onClick={() => setTab(tool.tab)}>
              <Icon size={22} />
              <strong>{tool.label === "Currency" ? t.currency : tool.label === "Translator" ? t.voiceTranslator : tool.label === "Travel Guides" ? t.travelGuides : tool.label === "TV Mode" ? t.tvMode : tool.label}</strong>
              <span>{tool.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
