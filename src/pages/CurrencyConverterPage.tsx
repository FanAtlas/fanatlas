import { useEffect, useMemo, useState } from "react";
import { fallbackRates, getExchangeRates } from "../services/exchangeRates";

export function CurrencyConverterPage() {
  const [amount, setAmount] = useState(100);
  const [error, setError] = useState("");
  const [from, setFrom] = useState("USD");
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"live" | "demo">("demo");
  const [rates, setRates] = useState(fallbackRates);
  const [to, setTo] = useState("MXN");

  useEffect(() => {
    getExchangeRates().then((result) => {
      setError(result.error || "");
      setMode(result.mode);
      setRates(result.rates);
      setLoading(false);
    });
  }, []);

  const result = useMemo(
    () => (amount / rates[from]) * rates[to],
    [amount, from, rates, to]
  );
  const codes = Object.keys(rates);

  return (
    <>
      <div className="topbar">
        <div className="brand">
          Currency <span>{loading ? "Loading" : mode === "live" ? "Live" : "Demo"}</span>
        </div>
      </div>

      <div className="converter-card">
        {error && (
          <div className="route-status error">
            {error} Showing demo rates so you can keep converting.
          </div>
        )}

        <input
          className="input"
          type="number"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
        />

        <div className="grid-2">
          <select className="input" value={from} onChange={(e) => setFrom(e.target.value)}>
            {codes.map((code) => (
              <option key={code}>{code}</option>
            ))}
          </select>

          <select className="input" value={to} onChange={(e) => setTo(e.target.value)}>
            {codes.map((code) => (
              <option key={code}>{code}</option>
            ))}
          </select>
        </div>

        <div className="result-amount">{result.toFixed(2)} {to}</div>
        <p className="subtle">
          {mode === "live"
            ? "Rates loaded from the configured exchange provider."
            : "Demo rates. Add VITE_EXCHANGE_RATES_URL for live exchange rates."}
        </p>
      </div>
    </>
  );
}
