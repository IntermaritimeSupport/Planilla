"use client"

import type React from "react"

interface CustomButtonProps {
  type?: "button" | "submit"
  onClick?: () => void
  disabled?: boolean
  variant?: "primary" | "secondary"
  children: React.ReactNode
  className?: string
}

export const CustomButton: React.FC<CustomButtonProps> = ({
  type = "button",
  onClick,
  disabled = false,
  variant = "primary",
  children,
  className = "",
}) => {
  const baseClasses =
    "w-full h-12 px-6 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2"

  const variantClasses = {
    primary: `bg-blue-600 text-white hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 
              disabled:bg-gray-300 disabled:cursor-not-allowed`,
    secondary: `bg-gray-900 text-white hover:bg-gray-800 focus:ring-4 focus:ring-gray-200 
                disabled:bg-gray-300 disabled:cursor-not-allowed`,
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </button>
  )
}
