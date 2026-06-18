import { useMemo, useState } from "react";

type PhraseLanguage = "English" | "Spanish" | "French" | "Arabic" | "Portuguese";
type PhraseCategory = "Medical" | "Police" | "Transportation" | "Hotel" | "Restaurant";

type Phrase = {
  key: string;
  category: PhraseCategory;
  translations: Record<PhraseLanguage, string>;
};

const languages: PhraseLanguage[] = ["English", "Spanish", "French", "Arabic", "Portuguese"];
const categories: PhraseCategory[] = ["Medical", "Police", "Transportation", "Hotel", "Restaurant"];

const languageCodes: Record<PhraseLanguage, string> = {
  English: "en-US",
  Spanish: "es-ES",
  French: "fr-FR",
  Arabic: "ar-SA",
  Portuguese: "pt-BR"
};

const phrases: Phrase[] = [
  {
    key: "need-doctor",
    category: "Medical",
    translations: {
      English: "I need a doctor.",
      Spanish: "Necesito un médico.",
      French: "J'ai besoin d'un médecin.",
      Arabic: "أحتاج إلى طبيب.",
      Portuguese: "Preciso de um médico."
    }
  },
  {
    key: "allergic",
    category: "Medical",
    translations: {
      English: "I am allergic to this.",
      Spanish: "Soy alérgico a esto.",
      French: "Je suis allergique à cela.",
      Arabic: "لدي حساسية من هذا.",
      Portuguese: "Sou alérgico a isso."
    }
  },
  {
    key: "call-police",
    category: "Police",
    translations: {
      English: "Please call the police.",
      Spanish: "Por favor llame a la policía.",
      French: "Veuillez appeler la police.",
      Arabic: "من فضلك اتصل بالشرطة.",
      Portuguese: "Por favor, chame a polícia."
    }
  },
  {
    key: "lost-passport",
    category: "Police",
    translations: {
      English: "My passport was lost or stolen.",
      Spanish: "Mi pasaporte se perdió o fue robado.",
      French: "Mon passeport a été perdu ou volé.",
      Arabic: "فقدت جواز سفري أو تمت سرقته.",
      Portuguese: "Meu passaporte foi perdido ou roubado."
    }
  },
  {
    key: "stadium-route",
    category: "Transportation",
    translations: {
      English: "How do I get to the stadium?",
      Spanish: "¿Cómo llego al estadio?",
      French: "Comment puis-je aller au stade ?",
      Arabic: "كيف أصل إلى الملعب؟",
      Portuguese: "Como chego ao estádio?"
    }
  },
  {
    key: "official-taxi",
    category: "Transportation",
    translations: {
      English: "Where is the official taxi or rideshare pickup?",
      Spanish: "¿Dónde está la zona oficial de taxis o viajes compartidos?",
      French: "Où se trouve la zone officielle de taxi ou VTC ?",
      Arabic: "أين توجد منطقة سيارات الأجرة أو النقل التشاركي الرسمية؟",
      Portuguese: "Onde fica o ponto oficial de táxi ou aplicativo?"
    }
  },
  {
    key: "hotel-address",
    category: "Hotel",
    translations: {
      English: "This is my hotel address.",
      Spanish: "Esta es la dirección de mi hotel.",
      French: "Voici l'adresse de mon hôtel.",
      Arabic: "هذا هو عنوان فندقي.",
      Portuguese: "Este é o endereço do meu hotel."
    }
  },
  {
    key: "late-checkin",
    category: "Hotel",
    translations: {
      English: "I have a reservation and will arrive late.",
      Spanish: "Tengo una reserva y llegaré tarde.",
      French: "J'ai une réservation et j'arriverai en retard.",
      Arabic: "لدي حجز وسأصل متأخراً.",
      Portuguese: "Tenho uma reserva e chegarei tarde."
    }
  },
  {
    key: "food-allergy",
    category: "Restaurant",
    translations: {
      English: "Does this contain nuts, seafood, or dairy?",
      Spanish: "¿Esto contiene nueces, mariscos o lácteos?",
      French: "Est-ce que cela contient des noix, des fruits de mer ou des produits laitiers ?",
      Arabic: "هل يحتوي هذا على مكسرات أو مأكولات بحرية أو ألبان؟",
      Portuguese: "Isso contém nozes, frutos do mar ou laticínios?"
    }
  },
  {
    key: "water-bill",
    category: "Restaurant",
    translations: {
      English: "Can I have water and the bill, please?",
      Spanish: "¿Me trae agua y la cuenta, por favor?",
      French: "Puis-je avoir de l'eau et l'addition, s'il vous plaît ?",
      Arabic: "هل يمكنني الحصول على ماء والفاتورة من فضلك؟",
      Portuguese: "Pode me trazer água e a conta, por favor?"
    }
  }
];

export function PhrasebookPage() {
  const [activeCategory, setActiveCategory] = useState<PhraseCategory>("Medical");
  const [language, setLanguage] = useState<PhraseLanguage>("English");
  const [status, setStatus] = useState("");
  const visiblePhrases = useMemo(() => phrases.filter((phrase) => phrase.category === activeCategory), [activeCategory]);

  function playPhrase(text: string) {
    if (!("speechSynthesis" in window)) {
      setStatus("Audio playback is not available in this browser.");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = languageCodes[language];
    utterance.rate = 0.9;
    utterance.onend = () => setStatus("");
    utterance.onerror = () => setStatus("Audio playback failed. Try another phrase or browser.");
    window.speechSynthesis.speak(utterance);
    setStatus("Playing phrase audio...");
  }

  return (
    <div className="phrasebook-page" dir={language === "Arabic" ? "rtl" : "ltr"}>
      <div className="topbar">
        <div>
          <div className="brand">Emergency <span>Phrasebook</span></div>
          <div className="subtle">Medical, police, transport, hotel, and restaurant phrases</div>
        </div>
      </div>

      <section className="phrasebook-hero">
        <span>Emergency ready</span>
        <h1>Show or play key phrases fast.</h1>
        <p>Choose a language and category, then show the translated phrase to local staff or use audio playback where supported.</p>
      </section>

      <div className="phrasebook-controls">
        <label>
          <span>Language</span>
          <select className="input" value={language} onChange={(event) => setLanguage(event.target.value as PhraseLanguage)}>
            {languages.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
      </div>

      <div className="chip-scroll">
        {categories.map((category) => (
          <button
            className={`chip ${activeCategory === category ? "active" : ""}`}
            key={category}
            onClick={() => setActiveCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>

      {status && <div className="route-status">{status}</div>}

      <div className="phrasebook-list">
        {visiblePhrases.map((phrase) => (
          <article className="phrase-card" key={phrase.key}>
            <span>{activeCategory}</span>
            <strong>{phrase.translations[language]}</strong>
            {language !== "English" && <p>{phrase.translations.English}</p>}
            <button className="secondary-btn" onClick={() => playPhrase(phrase.translations[language])}>
              Play Audio
            </button>
          </article>
        ))}
      </div>

      <div className="action-note">
        <span>Audio architecture uses browser speech synthesis now and can later swap to hosted TTS files or a server-side voice API.</span>
      </div>
    </div>
  );
}
