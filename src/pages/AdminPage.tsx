import { useEffect, useMemo, useState } from "react";
import { BackButton } from "../components/BackButton";
import { supabase } from "../lib/supabase";

type AdminSection = "Fan Zones" | "Hotels" | "Restaurants" | "City Guides" | "Alerts";

type AdminContentItem = {
  id: string;
  section: AdminSection;
  title: string;
  city: string;
  status: "Draft" | "Published";
  summary: string;
  updatedAt: string;
};

const STORAGE_KEY = "fanatlas.adminContent";
const ADMIN_EMAIL = "kadsimohamedads@gmail.com";
const sections: AdminSection[] = ["Fan Zones", "Hotels", "Restaurants", "City Guides", "Alerts"];

const seedContent: AdminContentItem[] = [
  {
    id: "fan-zone-times-square",
    section: "Fan Zones",
    title: "Times Square Fan Park",
    city: "New York/New Jersey",
    status: "Published",
    summary: "Large public fan park with screens, food, and VIP package opportunities.",
    updatedAt: "2026-06-18"
  },
  {
    id: "hotel-stadium-search",
    section: "Hotels",
    title: "Search Hotels Near This Stadium",
    city: "All host cities",
    status: "Draft",
    summary: "Affiliate-ready stadium hotel search block with budget, mid, and luxury filters.",
    updatedAt: "2026-06-18"
  },
  {
    id: "restaurant-katz",
    section: "Restaurants",
    title: "Katz's Delicatessen",
    city: "New York",
    status: "Published",
    summary: "Restaurant detail card with reserve, delivery, and navigation actions.",
    updatedAt: "2026-06-18"
  },
  {
    id: "city-guide-mexico-city",
    section: "City Guides",
    title: "Mexico City Guide",
    city: "Mexico City",
    status: "Published",
    summary: "Attractions, transport, hotels, restaurants, fan zones, and safety notes.",
    updatedAt: "2026-06-18"
  },
  {
    id: "alert-dallas-heat",
    section: "Alerts",
    title: "Dallas Heat Advisory",
    city: "Dallas",
    status: "Published",
    summary: "Hydration, sunscreen, shade, and stadium arrival safety guidance.",
    updatedAt: "2026-06-18"
  }
];

function readAdminContent() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) && parsed.length ? parsed as AdminContentItem[] : seedContent;
  } catch {
    return seedContent;
  }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function AdminPage({ onBack }: { onBack: () => void }) {
  const [activeSection, setActiveSection] = useState<AdminSection>("Fan Zones");
  const [adminError, setAdminError] = useState("");
  const [content, setContent] = useState<AdminContentItem[]>(() => readAdminContent());
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingAccess, setLoadingAccess] = useState(true);
  const [draft, setDraft] = useState({
    city: "",
    status: "Draft" as "Draft" | "Published",
    summary: "",
    title: ""
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
  }, [content]);

  useEffect(() => {
    async function loadAccess() {
      if (!supabase) {
        setAdminError("Supabase is not configured. Admin access requires the approved owner account.");
        setLoadingAccess(false);
        return;
      }

      try {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;
        if (!user) {
          setAdminError("Sign in with an admin account to access content tools.");
          setLoadingAccess(false);
          return;
        }

        const allowed = user.email?.toLowerCase() === ADMIN_EMAIL;
        setIsAdmin(allowed);
        setAdminError(allowed ? "" : "This account is not allowed to access admin tools.");
      } catch (error: any) {
        setAdminError(error?.message || "Unable to verify admin access.");
      } finally {
        setLoadingAccess(false);
      }
    }

    loadAccess();
  }, []);

  const visibleContent = useMemo(() => (
    content.filter((item) => item.section === activeSection)
  ), [activeSection, content]);

  function saveDraft() {
    if (!draft.title.trim()) return;

    setContent((current) => [
      {
        id: crypto.randomUUID(),
        section: activeSection,
        title: draft.title.trim(),
        city: draft.city.trim() || "All host cities",
        status: draft.status,
        summary: draft.summary.trim() || "No summary yet.",
        updatedAt: today()
      },
      ...current
    ]);
    setDraft({ city: "", status: "Draft", summary: "", title: "" });
  }

  function toggleStatus(id: string) {
    setContent((current) => current.map((item) => (
      item.id === id
        ? { ...item, status: item.status === "Published" ? "Draft" : "Published", updatedAt: today() }
        : item
    )));
  }

  function deleteItem(id: string) {
    setContent((current) => current.filter((item) => item.id !== id));
  }

  if (loadingAccess) {
    return (
      <div className="admin-page">
        <div className="topbar">
          <BackButton onBack={onBack} />
          <div className="brand">Admin <span>Tools</span></div>
        </div>
        <div className="route-status">Checking admin access...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="admin-page">
        <div className="topbar">
          <BackButton onBack={onBack} />
          <div>
            <div className="brand">Admin <span>Locked</span></div>
            <div className="subtle">Content management is protected.</div>
          </div>
        </div>
        <section className="admin-locked">
          <h1>Admin access required</h1>
          <p>{adminError || "Your account does not have permission to manage FanAtlas content."}</p>
          <small>Use the approved owner email to access admin tools.</small>
        </section>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="topbar">
        <BackButton onBack={onBack} />
        <div>
          <div className="brand">Admin <span>Tools</span></div>
          <div className="subtle">Draft content management for FanAtlas operations</div>
        </div>
      </div>

      <section className="admin-hero">
        <span>Future CMS ready</span>
        <h1>Manage travel content safely.</h1>
        <p>Use this panel to stage Fan Zones, Hotels, Restaurants, City Guides, and Alerts before wiring database-backed publishing.</p>
      </section>

      <div className="chip-scroll">
        {sections.map((section) => (
          <button
            className={`chip ${activeSection === section ? "active" : ""}`}
            key={section}
            onClick={() => setActiveSection(section)}
          >
            {section}
          </button>
        ))}
      </div>

      <section className="admin-editor">
        <h3>Add {activeSection} Item</h3>
        <input
          className="input"
          placeholder="Title"
          value={draft.title}
          onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
        />
        <div className="grid-2 admin-grid">
          <input
            className="input"
            placeholder="City"
            value={draft.city}
            onChange={(event) => setDraft((current) => ({ ...current, city: event.target.value }))}
          />
          <select
            className="input"
            value={draft.status}
            onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as "Draft" | "Published" }))}
          >
            <option>Draft</option>
            <option>Published</option>
          </select>
        </div>
        <textarea
          className="textarea"
          placeholder="Summary"
          value={draft.summary}
          onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))}
        />
        <button className="primary-btn" onClick={saveDraft}>Save Draft Item</button>
      </section>

      <section>
        <div className="section-row">
          <h3>{activeSection}</h3>
          <span className="subtle">{visibleContent.length} items</span>
        </div>

        <div className="admin-content-list">
          {visibleContent.map((item) => (
            <article className="admin-content-card" key={item.id}>
              <div>
                <span>{item.city} · Updated {item.updatedAt}</span>
                <strong>{item.title}</strong>
                <p>{item.summary}</p>
              </div>
              <em className={item.status.toLowerCase()}>{item.status}</em>
              <div className="admin-card-actions">
                <button className="secondary-btn" onClick={() => toggleStatus(item.id)}>
                  {item.status === "Published" ? "Unpublish" : "Publish"}
                </button>
                <button className="favorite-delete-btn" onClick={() => deleteItem(item.id)}>×</button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
