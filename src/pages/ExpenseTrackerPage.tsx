import { useEffect, useMemo, useState } from "react";
import { getExchangeRates } from "../services/exchangeRates";

type ExpenseCategory = "Hotels" | "Food" | "Tickets" | "Transportation" | "Shopping";

type ExpenseEntry = {
  id: string;
  amount: number;
  category: ExpenseCategory;
  currency: string;
  date: string;
  note: string;
};

const STORAGE_KEY = "fanatlas.expenses";
const categories: ExpenseCategory[] = ["Hotels", "Food", "Tickets", "Transportation", "Shopping"];
const currencies = ["USD", "EUR", "CAD", "MXN", "MAD", "GBP", "BRL"];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function readExpenses(): ExpenseEntry[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item) => (
      item &&
      categories.includes(item.category) &&
      Number.isFinite(Number(item.amount)) &&
      typeof item.currency === "string" &&
      typeof item.date === "string"
    ));
  } catch {
    return [];
  }
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    currency,
    maximumFractionDigits: 2,
    style: "currency"
  }).format(amount);
}

function convertAmount(amount: number, from: string, to: string, rates: Record<string, number>) {
  if (from === to) return amount;
  if (!rates[from] || !rates[to]) return null;
  return amount * (rates[to] / rates[from]);
}

export function ExpenseTrackerPage() {
  const [amount, setAmount] = useState("25");
  const [category, setCategory] = useState<ExpenseCategory>("Food");
  const [currency, setCurrency] = useState("USD");
  const [date, setDate] = useState(today());
  const [entries, setEntries] = useState<ExpenseEntry[]>(() => readExpenses());
  const [error, setError] = useState("");
  const [loadingRates, setLoadingRates] = useState(true);
  const [note, setNote] = useState("");
  const [rates, setRates] = useState<Record<string, number>>({});
  const [reportCurrency, setReportCurrency] = useState("USD");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    getExchangeRates()
      .then((result) => {
        setRates(result.rates);
        setError("");
      })
      .catch((err) => {
        console.error("Expense exchange-rate error:", err);
        setError("Live exchange rates are unavailable. Same-currency totals still work.");
      })
      .finally(() => setLoadingRates(false));
  }, []);

  const totals = useMemo(() => {
    const emptyBreakdown = Object.fromEntries(categories.map((item) => [item, 0])) as Record<ExpenseCategory, number>;
    let tripTotal = 0;
    let dailySpend = 0;
    let unconvertedCount = 0;

    entries.forEach((entry) => {
      const converted = convertAmount(entry.amount, entry.currency, reportCurrency, rates);
      const value = converted ?? (entry.currency === reportCurrency ? entry.amount : null);

      if (value === null) {
        unconvertedCount += 1;
        return;
      }

      tripTotal += value;
      emptyBreakdown[entry.category] += value;
      if (entry.date === today()) dailySpend += value;
    });

    return {
      breakdown: emptyBreakdown,
      dailySpend,
      tripTotal,
      unconvertedCount
    };
  }, [entries, rates, reportCurrency]);

  function addExpense() {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Enter a valid expense amount.");
      return;
    }

    setEntries((current) => [
      {
        id: crypto.randomUUID(),
        amount: numericAmount,
        category,
        currency,
        date,
        note: note.trim()
      },
      ...current
    ]);
    setAmount("");
    setNote("");
    setError("");
  }

  function deleteExpense(id: string) {
    setEntries((current) => current.filter((entry) => entry.id !== id));
  }

  const maxCategoryTotal = Math.max(...categories.map((item) => totals.breakdown[item]), 1);

  return (
    <div className="expense-page">
      <div className="topbar">
        <div>
          <div className="brand">Expenses <span>{loadingRates ? "Loading" : "Trip"}</span></div>
          <div className="subtle">Track daily spend and trip budget across currencies</div>
        </div>
      </div>

      <section className="expense-summary">
        <div>
          <span>Daily Spend</span>
          <strong>{formatMoney(totals.dailySpend, reportCurrency)}</strong>
        </div>
        <div>
          <span>Trip Total</span>
          <strong>{formatMoney(totals.tripTotal, reportCurrency)}</strong>
        </div>
      </section>

      <label className="expense-report-currency">
        <span>Report Currency</span>
        <select className="input" value={reportCurrency} onChange={(event) => setReportCurrency(event.target.value)}>
          {currencies.map((code) => <option key={code}>{code}</option>)}
        </select>
      </label>

      {error && <div className="route-status error">{error}</div>}
      {totals.unconvertedCount > 0 && (
        <div className="route-status">
          {totals.unconvertedCount} expense{totals.unconvertedCount === 1 ? "" : "s"} could not be converted to {reportCurrency}.
        </div>
      )}

      <section className="expense-form">
        <div className="grid-2 expense-grid">
          <label>
            <span>Amount</span>
            <input className="input" inputMode="decimal" min="0" step="0.01" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} />
          </label>
          <label>
            <span>Currency</span>
            <select className="input" value={currency} onChange={(event) => setCurrency(event.target.value)}>
              {currencies.map((code) => <option key={code}>{code}</option>)}
            </select>
          </label>
          <label>
            <span>Category</span>
            <select className="input" value={category} onChange={(event) => setCategory(event.target.value as ExpenseCategory)}>
              {categories.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span>Date</span>
            <input className="input" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
        </div>
        <input className="input" placeholder="Optional note" value={note} onChange={(event) => setNote(event.target.value)} />
        <button className="primary-btn" onClick={addExpense}>Add Expense</button>
      </section>

      <section className="expense-breakdown">
        <h3>Category Breakdown</h3>
        {categories.map((item) => {
          const value = totals.breakdown[item];
          return (
            <div className="expense-breakdown-row" key={item}>
              <div>
                <strong>{item}</strong>
                <span>{formatMoney(value, reportCurrency)}</span>
              </div>
              <i><b style={{ width: `${Math.max(4, (value / maxCategoryTotal) * 100)}%` }} /></i>
            </div>
          );
        })}
      </section>

      <section>
        <div className="section-row">
          <h3>Recent Expenses</h3>
          <span className="subtle">{entries.length} saved</span>
        </div>

        {entries.length === 0 && (
          <div className="empty-state">
            Add your first hotel, food, ticket, transportation, or shopping expense.
          </div>
        )}

        <div className="expense-list">
          {entries.map((entry) => (
            <article className="expense-entry" key={entry.id}>
              <div>
                <strong>{entry.category}</strong>
                <p>{entry.date}{entry.note ? ` · ${entry.note}` : ""}</p>
              </div>
              <span>{formatMoney(entry.amount, entry.currency)}</span>
              <button className="favorite-delete-btn" onClick={() => deleteExpense(entry.id)}>×</button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
