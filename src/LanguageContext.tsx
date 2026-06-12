import { createContext, useContext } from "react";
import { Language, text } from "./i18n";

export const LanguageContext = createContext({
  language: "en" as Language,
  setLanguage: (_lang: Language) => {},
  t: text.en
});

export const useLanguage = () => useContext(LanguageContext);
