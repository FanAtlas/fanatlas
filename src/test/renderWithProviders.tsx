import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement } from "react";
import { LanguageContext } from "../LanguageContext";
import { type Language, text } from "../i18n";

type RenderWithProvidersOptions = RenderOptions & {
  language?: Language;
};

export function renderWithProviders(
  ui: ReactElement,
  { language = "en", ...renderOptions }: RenderWithProvidersOptions = {}
) {
  const setLanguage = () => {};

  return render(
    <LanguageContext.Provider value={{ language, setLanguage, t: text[language] }}>
      {ui}
    </LanguageContext.Provider>,
    renderOptions
  );
}
