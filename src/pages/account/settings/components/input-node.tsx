"use client"

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
  return (
    <div>
      <label className="block text-sm text-gray-300 mb-1">
        {label} {required && "*"}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full bg-gray-700 px-3 py-2 rounded-lg border border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
      />
    </div>
  )
}
