"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { messages, type SupportedLanguage } from "@/lib/i18n/messages"

interface LanguageContextValue {
  language: SupportedLanguage
  setLanguage: (lang: SupportedLanguage) => void
  t: (key: keyof (typeof messages)["en"] | string, fallback?: string) => string
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined)
const STORAGE_KEY = "odootools_language"

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>("en")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as SupportedLanguage | null
    if (stored === "en" || stored === "es") {
      setLanguageState(stored)
    }
    setMounted(true)
  }, [])

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang)
    localStorage.setItem(STORAGE_KEY, lang)
  }

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      t: (key, fallback) => {
        if (!mounted) {
          return fallback ?? key
        }
        return messages[language][key as keyof (typeof messages)["en"]] ?? fallback ?? key
      },
    }),
    [language, mounted],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useTranslations() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error("useTranslations must be used within a LanguageProvider")
  }
  return context
}
