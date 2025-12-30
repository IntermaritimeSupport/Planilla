"use client"

import type React from "react"

interface CustomCheckboxProps {
  id: string
  checked: boolean
  onChange: (checked: boolean) => void
  label: React.ReactNode
  required?: boolean
}

export const CustomCheckbox: React.FC<CustomCheckboxProps> = ({ id, checked, onChange, label, required = false }) => {
  return (
    <div className="flex items-start">
      <div className="flex items-center h-5">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          required={required}
          className="w-5 h-5 border border-gray-300 rounded bg-gray-50 focus:ring-3 focus:ring-blue-300 cursor-pointer"
        />
      </div>
      <label htmlFor={id} className="ml-3 text-sm font-medium text-gray-700 cursor-pointer">
        {label}
      </label>
    </div>
  )
}
