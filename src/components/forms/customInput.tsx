"use client"

import type React from "react"

interface CustomInputProps {
  id: string
  type?: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  required?: boolean
  icon?: React.ReactNode
}

export const CustomInput: React.FC<CustomInputProps> = ({
  id,
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
  icon,
}) => {
  return (
    <div className="relative" id="hidden-relative">
      {icon && <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">{icon}</div>}
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className={`w-full h-12 px-4 ${icon ? "pl-10" : ""} bg-white border border-gray-200 rounded-xl 
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                   transition-all duration-200 text-gray-900 placeholder-gray-400
                   hover:border-gray-300`}
      />
    </div>
  )
}
