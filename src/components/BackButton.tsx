import { useLanguage } from "../LanguageContext";

export function BackButton({ onBack }: { onBack?: () => void }) {
  const { language, t } = useLanguage();

  function handleBack() {
    if (onBack) {
      onBack();
      return;
    }

    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.assign("/");
  }

  return (
    <button className="back-btn" onClick={handleBack} type="button">
      {language === "ar" ? `${t.back} →` : `← ${t.back}`}
    </button>
  );
}
