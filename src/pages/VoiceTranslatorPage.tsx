import { useState } from "react";
export function VoiceTranslatorPage() {
  const [target,setTarget]=useState("Spanish");
  const output: Record<string,string>={Spanish:"¿Dónde está el hospital más cercano?",French:"Où est l’hôpital le plus proche ?",Arabic:"أين أقرب مستشفى؟"};
  return <><div className="topbar"><div className="brand">Voice Translator <span>10 languages</span></div></div><div className="translator-card"><button className="mic-button">🎙</button><p className="subtle">Voice capture connects later. Use text mode now.</p><textarea className="textarea" defaultValue="Where is the nearest hospital?" /><select className="input" value={target} onChange={e=>setTarget(e.target.value)}><option>Spanish</option><option>French</option><option>Arabic</option></select><div className="translation-output">{output[target]}</div><button className="primary-btn">🔊 Play Audio</button></div></>
}
