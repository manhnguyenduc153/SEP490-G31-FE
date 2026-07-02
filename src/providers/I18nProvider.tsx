"use client";

import React, { ReactNode, useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "../i18n/i18n";

interface I18nProviderProps {
  children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  useEffect(() => {
    const updateLang = (lng: string) => {
      document.documentElement.setAttribute("lang", lng);
    };
    
    // Set initial lang
    if (i18n.language) {
      updateLang(i18n.language);
    }
    
    // Listen for changes
    i18n.on("languageChanged", updateLang);
    
    return () => {
      i18n.off("languageChanged", updateLang);
    };
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
