"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { useTranslations } from "@/lib/language-context"

export function LanguageToggle() {
  const { language, setLanguage } = useTranslations()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const nextLanguage = language === "en" ? "es" : "en"

  return (
    <div className="fixed bottom-16 right-4 z-50">
      <Button
        variant="outline"
        size="icon"
        className="rounded-full border-border bg-card/80 backdrop-blur shadow-lg font-semibold text-xs"
        onClick={() => setLanguage(nextLanguage)}
        aria-label="Toggle language"
      >
        {language.toUpperCase()}
      </Button>
    </div>
  )
}
