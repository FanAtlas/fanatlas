import { useState } from "react";
import { BackButton } from "../components/BackButton";
import { useLanguage } from "../LanguageContext";

export function VoiceTranslatorPage({ onBack }: { onBack: () => void }) {
  const { language, t } = useLanguage();
  const [target,setTarget]=useState("Spanish");
  const output: Record<string,string>={Spanish:"¿Dónde está el hospital más cercano?",French:"Où est l’hôpital le plus proche ?",Arabic:"أين أقرب مستشفى؟"};
  return <div dir={language === "ar" ? "rtl" : "ltr"}><div className="topbar"><BackButton onBack={onBack} /><div className="brand">{t.translatorTitle} <span>{t.translatorSubtitle}</span></div></div><div className="translator-card"><button className="mic-button">🎙</button><p className="subtle">{t.voiceCaptureSoon}</p><textarea className="textarea" defaultValue="Where is the nearest hospital?" /><select className="input" value={target} onChange={e=>setTarget(e.target.value)}><option>Spanish</option><option>French</option><option>Arabic</option></select><div className="translation-output">{output[target]}</div><button className="primary-btn">🔊 {t.playAudio}</button></div></div>
}
