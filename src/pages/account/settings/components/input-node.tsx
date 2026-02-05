"use client"

import { useTheme } from "../../../../context/themeContext"

interface InputNodeProps {
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  required?: boolean
  placeholder?: string
  type?: string
}

export function InputNode({
  label,
  value,
  onChange,
  disabled = false,
  required = false,
  placeholder = "",
  type = "text",
}: InputNodeProps) {
  const { isDarkMode } = useTheme()

  return (
    <div>
      <label className={`block text-sm mb-1 transition-colors ${
        isDarkMode
          ? 'text-gray-300'
          : 'text-gray-700'
      }`}>
        {label} {required && "*"}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className={`w-full px-3 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
          isDarkMode
            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
        }`}
      />
    </div>
  )
}