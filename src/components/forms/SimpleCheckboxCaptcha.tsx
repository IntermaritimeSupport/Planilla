"use client" // Fundamental para que la interactividad (onClick) funcione en el navegador

import type React from "react"
import { useTranslation } from "react-i18next"

interface SimpleCheckboxCaptchaProps {
  verified: boolean
  onVerify: (isVerified: boolean) => void
  label?: string
}

export function SimpleCheckboxCaptcha({
  verified,
  onVerify,
  label,
}: SimpleCheckboxCaptchaProps) {
  const { t } = useTranslation()

  // Si no se proporciona una etiqueta, usamos una por defecto.
  const displayLabel = label || t("I am not a robot")

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Llama a la función onVerify del componente padre para actualizar el estado.
    onVerify(e.target.checked)
  }

  return (
    <div className="flex items-center p-4 bg-gray-50 border border-gray-200 rounded-lg">
      <label
        htmlFor="simple-captcha"
        className="flex items-center cursor-pointer select-none"
      >
        <input
          id="simple-captcha"
          type="checkbox"
          checked={verified}
          onChange={handleCheckboxChange}
          className="h-6 w-6 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="ml-3 text-base text-gray-800">{displayLabel}</span>
      </label>
    </div>
  )
}