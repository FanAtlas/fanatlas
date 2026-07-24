import { useMemo, useState } from "react";
import { BackButton } from "../components/BackButton";
import { fanZones } from "../data/mockData";
import { useLanguage } from "../LanguageContext";
import { Tab } from "../main";
import { reminderDate, scheduleNotification } from "../services/notifications";
import { FavoriteButton } from "../components/FavoriteButton";
import { useLocation } from "../LocationContext";
import { distanceKm, estimatedTravelMinutes, formatDistance } from "../lib/location";
import { getFanZoneDestination } from "../mapDestinations";

export function FanZonesPage({ onBack, setTab }: { onBack: () => void; setTab: (tab: Tab) => void }) {
  const { language, t } = useLanguage();
  const { location, status: locationStatus } = useLocation();
  const [notificationMessage, setNotificationMessage] = useState("");
  const actionLabels: Record<string, string> = {
    "VIP Packages": t.vipPackages,
    "Fan Zone Transportation": t.transportation,
    "Official Merchandise": t.officialMerchandise
  };
  const sortedFanZones = useMemo(() => fanZones
    .map((zone) => {
      const destination = getFanZoneDestination(zone.name);
      return {
        ...zone,
        userDistanceKm: location && destination ? distanceKm(location, destination) : null
      };
    })
    .sort((a, b) => {
      if (a.userDistanceKm === null || b.userDistanceKm === null) return 0;
      return a.userDistanceKm - b.userDistanceKm;
    }), [location]);

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
          <div className="brand">{t.fanZones} <span>Archive</span></div>
          <div className="subtle">{t.watchPartiesDesc}</div>
        </div>
      </div>

      {notificationMessage && <div className="route-status">{notificationMessage}</div>}
      {locationStatus !== "available" && locationStatus !== "requesting" && (
        <div className="location-fallback">Enable location for nearby recommendations.</div>
      )}

      {sortedFanZones.map((zone) => (
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
          {zone.userDistanceKm !== null && (
            <p>📏 {formatDistance(zone.userDistanceKm)} · about {estimatedTravelMinutes(zone.userDistanceKm)} min</p>
          )}

          <button className="secondary-btn full-width" onClick={() => addFanZoneReminder(zone)}>
            {t.addFanZoneReminder}
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
