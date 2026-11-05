"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { KN } from "@/lib/translations";

export type Language = "en" | "kn";
const STORAGE_KEY = "sv_groups_language";
type LanguageContextValue = {
  language: Language;
  setLanguage: (next: Language) => void;
  t: (englishText: string) => string;
};

const LanguageContext = createContext<LanguageContextValue>({
  language: "en",
  setLanguage: () => undefined,
  t: text => text,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Render English on SSR and first client render to avoid hydration mismatch.
  // The previously chosen language is restored immediately after hydration.
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "en" || stored === "kn") setLanguageState(stored);
    } catch { /* Browsers can deny storage access; the toggle still works. */ }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dataset.language = language;
  }, [language]);

  function setLanguage(next: Language) {
    setLanguageState(next);
    try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* optional persistence */ }
  }

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    setLanguage,
    t: text => language === "kn" ? KN[text] ?? text : text,
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}

/** Lightweight client boundary for translating strings in server components. */
export function T({ text }: { text: string }) {
  const { t } = useLanguage();
  return <>{t(text)}</>;
}
