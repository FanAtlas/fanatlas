import { useEffect, useMemo, useState } from "react";
import { BackButton } from "../components/BackButton";

type ChecklistCategory = {
  title: string;
  items: string[];
};

const STORAGE_KEY = "fanatlas.travelChecklist";

const checklist: ChecklistCategory[] = [
  {
    title: "Before Travel",
    items: ["Passport", "Visa", "Tickets", "Hotel"]
  },
  {
    title: "Arrival",
    items: ["Airport Transport", "eSIM", "Currency"]
  },
  {
    title: "Match Day",
    items: ["Ticket", "Stadium Route", "Fan Zone"]
  }
];

function itemKey(category: string, item: string) {
  return `${category}:${item}`;
}

function readCheckedItems() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function ChecklistPage({ onBack }: { onBack: () => void }) {
  const [checkedItems, setCheckedItems] = useState<string[]>(() => readCheckedItems());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(checkedItems));
  }, [checkedItems]);

  const totalItems = checklist.reduce((sum, category) => sum + category.items.length, 0);
  const completedItems = checkedItems.length;
  const progress = useMemo(() => Math.round((completedItems / totalItems) * 100), [completedItems, totalItems]);

  function toggleItem(key: string) {
    setCheckedItems((current) => (
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
    ));
  }

  function resetChecklist() {
    setCheckedItems([]);
  }

  return (
    <div className="checklist-page">
      <div className="topbar">
        <BackButton onBack={onBack} />
        <div>
          <div className="brand">Travel <span>Checklist</span></div>
          <div className="subtle">Before travel, arrival, and match day essentials</div>
        </div>
      </div>

      <section className="checklist-hero">
        <div>
          <span>Trip Progress</span>
          <h1>{completedItems}/{totalItems} complete</h1>
          <p>Keep your World Cup travel basics ready before leaving, after arrival, and on match day.</p>
        </div>
        <strong>{progress}%</strong>
      </section>

      <div className="checklist-progress" aria-label={`${progress}% complete`}>
        <i style={{ width: `${progress}%` }} />
      </div>

      {checklist.map((category) => {
        const completeCount = category.items.filter((item) => checkedItems.includes(itemKey(category.title, item))).length;

        return (
          <section className="checklist-section" key={category.title}>
            <div className="section-row">
              <h3>{category.title}</h3>
              <span className="subtle">{completeCount}/{category.items.length}</span>
            </div>

            <div className="checklist-items">
              {category.items.map((item) => {
                const key = itemKey(category.title, item);
                const checked = checkedItems.includes(key);

                return (
                  <label className={`fan-checkbox-row checklist-item ${checked ? "checked" : ""}`} key={key}>
                    <input
                      className="fan-checkbox"
                      checked={checked}
                      onChange={() => toggleItem(key)}
                      type="checkbox"
                    />
                    <span>{item}</span>
                  </label>
                );
              })}
            </div>
          </section>
        );
      })}

      <button className="secondary-btn checklist-reset" onClick={resetChecklist}>
        Reset Checklist
      </button>
    </div>
  );
}
