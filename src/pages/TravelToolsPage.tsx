import { Coins, Languages, ListChecks, MapPin, Monitor, Smartphone, WalletCards, BookOpen, MessageSquareText } from "lucide-react";
import { BackButton } from "../components/BackButton";
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
  return (
    <div className="travel-tools-page">
      <div className="topbar">
        <BackButton onBack={onBack} />
        <div>
          <div className="brand">Travel <span>Tools</span></div>
          <div className="subtle">Fast access to essentials for any trip.</div>
        </div>
      </div>

      <section className="travel-tools-hero">
        <span>Essentials</span>
        <h1>Everything you need before and during travel.</h1>
        <p>Internet, money, language help, checklists, expenses, offline guides, and more.</p>
      </section>

      <div className="travel-tools-grid">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button className="travel-tool-card" key={tool.label} onClick={() => setTab(tool.tab)}>
              <Icon size={22} />
              <strong>{tool.label}</strong>
              <span>{tool.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
