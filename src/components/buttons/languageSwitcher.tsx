"use client"

import { useTranslation } from "react-i18next"
import { useState, useEffect } from "react"

interface LanguageSwitcherProps {
  className?: string;
}

const LanguageSwitcher = ({ className }: LanguageSwitcherProps) => {
  const { i18n } = useTranslation()
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language)

  useEffect(() => {
    setCurrentLanguage(i18n.language)
  }, [i18n.language])

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
    localStorage.setItem("i18nextLng", lng)
    setCurrentLanguage(lng)
  }

  return (
    <div className={`${className} flex gap-2 p-4`}>
      <button
        onClick={() => changeLanguage("en")}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium
          transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${
            currentLanguage === "en"
              ? "bg-blue-600 text-white shadow-md hover:bg-blue-700"
              : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
          }
        `}
        aria-label="Switch to English"
      >
        <span className="text-sm">🇪🇸</span>
        <span>ES</span>
      </button>

      <button
        onClick={() => changeLanguage("es")}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium
          transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${
            currentLanguage === "es"
              ? "bg-blue-600 text-white shadow-md hover:bg-blue-700"
              : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
          }
        `}
        aria-label="Cambiar a Español"
      >
        <span className="text-sm">🇺🇸</span>
        <span>EN</span>
      </button>
    </div>
  )
}

export default LanguageSwitcher
