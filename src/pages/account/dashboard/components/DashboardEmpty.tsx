"use client"

import { FolderOpen, AlertTriangle } from "lucide-react"
import { useTheme } from "../../../../context/themeContext"

interface DashboardEmptyStateProps {
  title?: string
  description?: string
  isError?: boolean
}

export default function DashboardEmptyState({
  title = "No hay información para mostrar",
  description = "Cuando haya datos disponibles, aparecerán aquí automáticamente.",
  isError = false,
}: DashboardEmptyStateProps) {
  const { isDarkMode } = useTheme()

  return (
    <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center">
      <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
        isError
          ? isDarkMode ? "bg-red-900/30 text-red-400" : "bg-red-100 text-red-600"
          : isDarkMode ? "bg-gray-800 text-gray-500"  : "bg-gray-100 text-gray-500"
      }`}>
        {isError ? <AlertTriangle className="h-8 w-8" /> : <FolderOpen className="h-8 w-8" />}
      </div>
      <h2 className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-gray-800"}`}>
        {title}
      </h2>
      <p className={`mt-1 max-w-md text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
        {description}
      </p>
    </div>
  )
}
