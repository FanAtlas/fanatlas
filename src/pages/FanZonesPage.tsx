import { useState } from "react";
import { BackButton } from "../components/BackButton";
import { fanZones } from "../data/mockData";
import { useLanguage } from "../LanguageContext";
import { Tab } from "../main";
import { reminderDate, scheduleNotification } from "../services/notifications";
import { FavoriteButton } from "../components/FavoriteButton";

export function FanZonesPage({ onBack, setTab }: { onBack: () => void; setTab: (tab: Tab) => void }) {
  const { language, t } = useLanguage();
  const [notificationMessage, setNotificationMessage] = useState("");
  const actionLabels: Record<string, string> = {
    "VIP Packages": t.vipPackages,
    "Fan Zone Transportation": t.transportation,
    "Official Merchandise": "Official Merchandise"
  };

  async function addFanZoneReminder(zone: typeof fanZones[number]) {
    const { permission } = await scheduleNotification({
      type: "fan-zone",
      title: `Fan Zone reminder: ${zone.name}`,
      message: `${zone.city} · ${zone.hours} · ${zone.entry}. Check crowd level and return route before going.`,
      dueAt: reminderDate(240),
      source: "Fan Zones",
      actionTab: "fanzones"
    });

    setNotificationMessage(
      permission === "denied"
        ? "Fan Zone reminder saved in FanAtlas. Browser notifications are blocked."
        : `Fan Zone reminder saved for ${zone.name}.`
    );
  }

  return (
    <div dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="topbar">
        <BackButton onBack={onBack} />
        <div>
          <div className="brand">{t.fanZones} <span>2026</span></div>
          <div className="subtle">{t.watchPartiesDesc}</div>
        </div>
      </div>

      {notificationMessage && <div className="route-status">{notificationMessage}</div>}

      {fanZones.map((zone) => (
        <div className="zone-card" key={zone.name}>
          <div className="favorite-card-heading">
            <h3>🎉 {zone.name}</h3>
            <FavoriteButton
              compact
              item={{
                item_type: "fan-zone",
                item_id: zone.name,
                name: zone.name,
                city: zone.city,
                metadata: zone
              }}
            />
          </div>
          <p>📍 {zone.city}</p>
          <p>🗓 {zone.dates}</p>
          <p>🕘 {zone.hours}</p>
          <p>👥 {zone.capacity}</p>
          <p>🎟 {zone.entry}</p>
          <p>🛡 {t.safetyScore}: {zone.safety}/10</p>

          <button className="secondary-btn full-width" onClick={() => addFanZoneReminder(zone)}>
            Add Fan Zone reminder
          </button>

          <div className="fanzone-actions">
            {zone.actions.map((action) => (
              <button
                className={`fanzone-btn ${action.tone}`}
                key={action.label}
                onClick={() => setTab(action.tab as Tab)}
              >
                {actionLabels[action.label] || action.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
