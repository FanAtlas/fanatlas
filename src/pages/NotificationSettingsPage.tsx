import { useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { Tab } from "../main";
import {
  FanAtlasNotificationCategory,
  getNotificationSettings,
  notificationCategories,
  setNotificationCategoryEnabled
} from "../services/notifications";

export function NotificationSettingsPage({ setTab }: { setTab: (tab: Tab) => void }) {
  const [settings, setSettings] = useState(() => getNotificationSettings());

  function toggle(category: FanAtlasNotificationCategory) {
    setSettings(setNotificationCategoryEnabled(category, !settings[category]));
  }

  const enabledCount = Object.values(settings).filter(Boolean).length;

  return (
    <div className="notification-settings-page">
      <div className="topbar">
        <div>
          <div className="brand">Notification <span>Settings</span></div>
          <div className="subtle">Enable or disable alert categories</div>
        </div>
        <button className="small-dark-btn" onClick={() => setTab("notifications")}>Back</button>
      </div>

      <div className="notification-settings-hero">
        {enabledCount > 0 ? <Bell size={25} /> : <BellOff size={25} />}
        <div>
          <strong>{enabledCount} of {notificationCategories.length} categories enabled</strong>
          <p>No paid notification services are connected yet. This prepares the local/browser notification architecture.</p>
        </div>
      </div>

      <div className="notification-settings-list">
        {notificationCategories.map((category) => (
          <button
            className={`notification-setting-row ${settings[category.id] ? "enabled" : "disabled"}`}
            key={category.id}
            onClick={() => toggle(category.id)}
          >
            <span className="notification-setting-icon">{category.icon}</span>
            <span>
              <strong>{category.label}</strong>
              <small>{category.description}</small>
            </span>
            <i>{settings[category.id] ? "On" : "Off"}</i>
          </button>
        ))}
      </div>
    </div>
  );
}
