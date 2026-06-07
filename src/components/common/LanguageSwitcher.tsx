"use client";
import React from "react";
import { useTranslation } from "react-i18next";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const nextLang = i18n.language === "vi" ? "en" : "vi";
    i18n.changeLanguage(nextLang);
  };

  return (
    <button
      suppressHydrationWarning
      onClick={toggleLanguage}
      className="flex items-center justify-center w-10 h-10 text-gray-500 hover:text-brand-500 border border-gray-200 hover:border-brand-500 rounded-lg dark:border-gray-800 dark:text-gray-400 dark:hover:text-brand-400 dark:hover:border-brand-500 transition-colors font-medium"
      title="Toggle Language"
    >
      {i18n.language === "vi" ? "VI" : "EN"}
    </button>
  );
}
