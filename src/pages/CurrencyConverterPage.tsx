import { useEffect, useMemo, useState } from "react";
import { BackButton } from "../components/BackButton";
import { getExchangeRates } from "../services/exchangeRates";

const AUTO_REFRESH_MS = 30 * 60 * 1000;
const COMMON_CURRENCIES = [
  "USD",
  "CAD",
  "MXN",
  "EUR",
  "GBP",
  "MAD",
  "BRL",
  "ARS",
  "AUD",
  "CHF",
  "CNY",
  "COP",
  "EGP",
  "JPY",
  "KRW",
  "QAR",
  "SAR",
  "TRY",
  "UYU",
  "ZAR"
];

const regionCurrency: Record<string, string> = {
  AR: "ARS",
  AU: "AUD",
  BR: "BRL",
  CA: "CAD",
  CH: "CHF",
  CN: "CNY",
  CO: "COP",
  EG: "EGP",
  GB: "GBP",
  JP: "JPY",
  KR: "KRW",
  MA: "MAD",
  MX: "MXN",
  QA: "QAR",
  SA: "SAR",
  TR: "TRY",
  US: "USD",
  UY: "UYU",
  ZA: "ZAR"
};

type ConversionResult = {
  amount: number;
  from: string;
  rate: number;
  to: string;
  value: number;
};

function detectLocalCurrency() {
  const locale = Intl.DateTimeFormat().resolvedOptions().locale;
  const region = locale.split("-").pop()?.toUpperCase() || "";
  return regionCurrency[region] || "USD";
}

function formatUpdatedTime(value: string | number) {
  if (!value) return "";

  const timestamp = /^\d+$/.test(String(value))
    ? Number(value) * 1000
    : Date.parse(String(value));

  if (!Number.isFinite(timestamp)) return String(value);

  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));

  if (diffMinutes < 1) return "just now";
  if (diffMinutes === 1) return "1 min ago";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours === 1) return "1 hour ago";
  if (diffHours < 24) return `${diffHours} hours ago`;

  return new Date(timestamp).toLocaleString();
}

export function CurrencyConverterPage({ onBack }: { onBack: () => void }) {
  const [amount, setAmount] = useState(100);
  const [converted, setConverted] = useState<ConversionResult | null>(null);
  const [error, setError] = useState("");
  const [from, setFrom] = useState(() => detectLocalCurrency());
  const [lastUpdated, setLastUpdated] = useState<string | number>("");
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState("");
  const [rates, setRates] = useState<Record<string, number>>({});
  const [to, setTo] = useState("MXN");

  async function loadRates() {
    try {
      setLoading(true);
      setError("");
      const result = await getExchangeRates();
      setRates(result.rates);
      setProvider(result.provider);
      setLastUpdated(result.timeLastUpdate || new Date().toLocaleString());

      const localCurrency = detectLocalCurrency();
      if (result.rates[localCurrency]) setFrom(localCurrency);
      if (!result.rates[to]) setTo(result.rates.MXN ? "MXN" : "USD");
    } catch (err: any) {
      setError("Unable to load exchange rates. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRates();
    const id = window.setInterval(loadRates, AUTO_REFRESH_MS);
    return () => window.clearInterval(id);
  }, []);

  const codes = useMemo(() => {
    const liveCodes = Object.keys(rates);
    const preferred = COMMON_CURRENCIES.filter((code) => rates[code]);
    const remaining = liveCodes
      .filter((code) => !preferred.includes(code))
      .sort((a, b) => a.localeCompare(b));
    return [...preferred, ...remaining];
  }, [rates]);

  const currentConversion = useMemo(() => {
    if (!rates[from] || !rates[to]) return null;
    const rate = rates[to] / rates[from];
    return {
      amount,
      from,
      rate,
      to,
      value: amount * rate
    };
  }, [amount, from, rates, to]);

  useEffect(() => {
    if (currentConversion && !converted) {
      setConverted(currentConversion);
    }
  }, [converted, currentConversion]);

  function convert() {
    if (!currentConversion) {
      setError("Unable to load exchange rates. Please try again.");
      return;
    }

    setError("");
    setConverted(currentConversion);
  }

  function swapCurrencies() {
    setFrom(to);
    setTo(from);
    setConverted(null);
  }

  const display = converted || currentConversion;

  return (
    <>
      <div className="topbar">
        <BackButton onBack={onBack} />
        <div className="brand">
          Currency <span>{loading ? "Loading" : "Live"}</span>
        </div>
        <button className="mini-btn" onClick={loadRates} disabled={loading}>
          Refresh
        </button>
      </div>

      <div className="converter-card">
        {error && (
          <div className="route-status error">
            {error}
          </div>
        )}

        <input
          className="input"
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
        />

        <div className="grid-2 currency-selector-grid">
          <label>
            <span className="subtle">From</span>
            <select className="input" value={from} onChange={(e) => setFrom(e.target.value)} disabled={codes.length === 0}>
              {codes.map((code) => (
                <option key={code}>{code}</option>
              ))}
            </select>
          </label>

          <label>
            <span className="subtle">To</span>
            <select className="input" value={to} onChange={(e) => setTo(e.target.value)} disabled={codes.length === 0}>
              {codes.map((code) => (
                <option key={code}>{code}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="currency-actions">
          <button className="secondary-btn" onClick={swapCurrencies} disabled={loading || codes.length === 0}>
            Swap
          </button>
          <button className="primary-btn" onClick={convert} disabled={loading || !currentConversion}>
            Convert
          </button>
        </div>

        <div className="result-amount">
          {display === null ? "--" : `${display.amount.toLocaleString()} ${display.from} = ${display.value.toFixed(2)} ${display.to}`}
        </div>

        {display && (
          <div className="currency-rate-card">
            Rate: 1 {display.from} = {display.rate.toFixed(4)} {display.to}
          </div>
        )}

        <p className="subtle">
          Live rates from {provider || "exchange-rate provider"}.
          {lastUpdated ? ` Updated: ${formatUpdatedTime(lastUpdated)}.` : ""}
          {" "}Auto-refreshes every 30 minutes.
        </p>
      </div>
    </>
  );
}
