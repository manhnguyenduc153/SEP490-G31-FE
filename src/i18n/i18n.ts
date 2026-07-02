import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enTranslations from "./locales/en.json";
import viTranslations from "./locales/vi.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslations,
      },
      vi: {
        translation: viTranslations,
      },
    },
    fallbackLng: "vi", // Default to Vietnamese
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    detection: {
      // Check localStorage first, fallback to 'vi' if not set
      order: ["localStorage"],
      caches: ["localStorage"],
    },
  });

export default i18n;
