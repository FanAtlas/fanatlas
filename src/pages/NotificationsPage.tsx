import { useEffect, useMemo, useState } from "react";
import { Bell, BellRing, Check, Clock, Trash2 } from "lucide-react";
import { BackButton } from "../components/BackButton";
import { Tab } from "../main";
import {
  clearReadNotifications,
  deleteNotification,
  FanAtlasNotification,
  getNotifications,
  markNotificationRead,
  notificationEventName
} from "../services/notifications";

const typeLabels: Record<FanAtlasNotification["type"], string> = {
  match: "Match Reminder",
  hotel: "Hotel Check-in Reminder",
  ticket: "Ticket Reminder",
  "fan-zone": "Fan Zone Reminder",
  emergency: "Emergency Alert",
  transportation: "Transportation Alert",
  sos: "Emergency Alert",
  "stadium-arrival": "Transportation Alert"
};

const typeIcons: Record<FanAtlasNotification["type"], string> = {
  match: "⚽",
  hotel: "🏨",
  ticket: "🎟",
  "fan-zone": "🎉",
  emergency: "🚨",
  transportation: "🚆",
  sos: "🚨",
  "stadium-arrival": "🚆"
};

function formatDueDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time not set";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function dueStatus(notification: FanAtlasNotification) {
  const due = new Date(notification.dueAt).getTime();
  if (Number.isNaN(due)) return "Scheduled";
  return due <= Date.now() ? "Due now" : "Scheduled";
}

export function NotificationsPage({ setTab }: { setTab: (tab: Tab) => void }) {
  const [notifications, setNotifications] = useState<FanAtlasNotification[]>(() => getNotifications());

  useEffect(() => {
    function refresh() {
      setNotifications(getNotifications());
    }

    window.addEventListener(notificationEventName(), refresh);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener(notificationEventName(), refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  );

  function openNotification(notification: FanAtlasNotification) {
    markNotificationRead(notification.id);
    setNotifications(getNotifications());

    if (notification.actionTab) {
      setTab(notification.actionTab as Tab);
    }
  }

  function removeNotification(id: string) {
    deleteNotification(id);
    setNotifications(getNotifications());
  }

  function clearRead() {
    clearReadNotifications();
    setNotifications(getNotifications());
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="brand">Notifications <span>{unreadCount}</span></div>
          <div className="subtle">Match, hotel, ticket, fan zone, emergency, and transportation alerts</div>
        </div>
        <div className="notification-top-actions">
          <button className="small-dark-btn" onClick={() => setTab("notificationSettings")}>Settings</button>
          <BackButton onBack={() => setTab("profile")} />
        </div>
      </div>

      <div className="notification-summary">
        <BellRing size={24} />
        <div>
          <strong>{notifications.length} reminders saved</strong>
          <p>{unreadCount} unread · category settings control what can be scheduled.</p>
        </div>
      </div>

      {notifications.length > 0 && (
        <button className="secondary-btn full-width" onClick={clearRead}>
          <Check size={16} /> Clear read reminders
        </button>
      )}

      <div className="notification-list">
        {notifications.length === 0 && (
          <div className="card-dark">
            <Bell size={22} />
            <strong>No reminders yet</strong>
            <p className="subtle">Add reminders from Match Day, Hotels, Tickets, Fan Zones, SOS, or the Map.</p>
          </div>
        )}

        {notifications.map((notification) => (
          <article
            className={`notification-card ${notification.read ? "read" : "unread"}`}
            key={notification.id}
          >
            <button className="notification-main" onClick={() => openNotification(notification)}>
              <span className="notification-icon">{typeIcons[notification.type]}</span>
              <span>
                <small>{typeLabels[notification.type]} · {notification.source}</small>
                <strong>{notification.title}</strong>
                <p>{notification.message}</p>
                <em><Clock size={13} /> {formatDueDate(notification.dueAt)} · {dueStatus(notification)}</em>
              </span>
            </button>

            <button className="notification-delete" onClick={() => removeNotification(notification.id)} aria-label="Delete reminder">
              <Trash2 size={16} />
            </button>
          </article>
        ))}
      </div>
    </>
  );
}
