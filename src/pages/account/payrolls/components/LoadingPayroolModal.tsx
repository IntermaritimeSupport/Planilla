"use client"

import { useTheme } from "../../../../context/themeContext"

const LoadingPayrollModal: React.FC<{
  isOpen: boolean
  successCount: number
  errorCount: number
  totalCount: number
}> = ({ isOpen, successCount, errorCount, totalCount }) => {
  const { isDarkMode } = useTheme()
  if (!isOpen) return null

  const processedCount = successCount + errorCount
  const progressPercentage = totalCount > 0 ? (processedCount / totalCount) * 100 : 0

  return (
    <div className={`fixed inset-0 flex items-center justify-center z-50 p-4 ${isDarkMode ? "bg-black/70" : "bg-black/40"}`}>
      <div className={`border rounded-xl max-w-md w-full shadow-2xl p-8 ${
        isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
      }`}>
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent" />
          </div>

          <h2 className={`text-xl font-semibold mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            Generando Nóminas
          </h2>
          <p className={`text-sm mb-6 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            Por favor espera mientras se procesan las nóminas...
          </p>

          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className={`text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                {processedCount} de {totalCount} empleados
              </span>
              <span className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                {Math.round(progressPercentage)}%
              </span>
            </div>
            <div className={`w-full rounded-full h-2.5 overflow-hidden ${isDarkMode ? "bg-gray-700" : "bg-gray-200"}`}>
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all duration-300 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className={`rounded-lg p-3 border ${isDarkMode ? "bg-green-900/30 border-green-600/50" : "bg-green-50 border-green-300"}`}>
              <div className={`text-2xl font-bold ${isDarkMode ? "text-green-400" : "text-green-600"}`}>{successCount}</div>
              <div className={`text-xs ${isDarkMode ? "text-green-200" : "text-green-700"}`}>Exitosas</div>
            </div>
            <div className={`rounded-lg p-3 border ${isDarkMode ? "bg-red-900/30 border-red-600/50" : "bg-red-50 border-red-300"}`}>
              <div className={`text-2xl font-bold ${isDarkMode ? "text-red-400" : "text-red-600"}`}>{errorCount}</div>
              <div className={`text-xs ${isDarkMode ? "text-red-200" : "text-red-700"}`}>Errores</div>
            </div>
          </div>

          <p className={`text-xs mt-6 italic ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
            No cierres esta ventana ni navegues a otra página
          </p>
        </div>
      </div>
    </div>
  )
}
export default LoadingPayrollModal
