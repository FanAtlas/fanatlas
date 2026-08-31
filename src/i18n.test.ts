import { describe, expect, it } from "vitest";
import { text } from "./i18n";

const languages = ["en", "es", "fr", "ar", "pt"] as const;

describe("i18n key coverage", () => {
  it("keeps supported language dictionaries aligned for product evolution keys", () => {
    const englishKeys = Object.keys(text.en).filter((key) =>
      key.startsWith("travelPassport.")
      || key.startsWith("travelJournal.")
      || key.startsWith("travelInsights.")
      || key.startsWith("travelExplorer.")
      || key.startsWith("fanAtlasAI.")
    );

    for (const language of languages) {
      for (const key of englishKeys) {
        expect(text[language][key as keyof typeof text.en], `${language} missing ${key}`).toBeTruthy();
      }
    }
  });
});
