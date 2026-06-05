import { useMemo, useState } from "react";
const rates: Record<string, number> = { USD: 1, CAD: 1.37, MXN: 18.2, EUR: 0.92, GBP: 0.78, MAD: 10.0, BRL: 5.3, JPY: 157 };
export function CurrencyConverterPage() {
  const [amount,setAmount]=useState(100); const [from,setFrom]=useState("USD"); const [to,setTo]=useState("MXN");
  const result=useMemo(()=>amount/rates[from]*rates[to],[amount,from,to]); const codes=Object.keys(rates);
  return <><div className="topbar"><div className="brand">Currency <span>Live soon</span></div></div><div className="converter-card"><input className="input" type="number" value={amount} onChange={e=>setAmount(Number(e.target.value))}/><div className="grid-2"><select className="input" value={from} onChange={e=>setFrom(e.target.value)}>{codes.map(c=><option key={c}>{c}</option>)}</select><select className="input" value={to} onChange={e=>setTo(e.target.value)}>{codes.map(c=><option key={c}>{c}</option>)}</select></div><div className="result-amount">{result.toFixed(2)} {to}</div><p className="subtle">Mock rates. Connect exchange API later.</p></div></>
}
