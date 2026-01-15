const LoadingPayrollModal: React.FC<{
  isOpen: boolean
  successCount: number
  errorCount: number
  totalCount: number
}> = ({ isOpen, successCount, errorCount, totalCount }) => {
  if (!isOpen) return null

  const processedCount = successCount + errorCount
  const progressPercentage = totalCount > 0 ? (processedCount / totalCount) * 100 : 0

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-lg max-w-md w-full shadow-2xl p-8">
        <div className="text-center">
          <div className="mb-6">
            <div className="inline-block">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-white mb-2">Generando Nóminas</h2>
          <p className="text-gray-400 text-sm mb-6">
            Por favor espera mientras se procesan las nóminas de los empleados...
          </p>

          {/* Barra de progreso */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-300 font-medium">
                {processedCount} de {totalCount} empleados
              </span>
              <span className="text-sm text-gray-400">
                {Math.round(progressPercentage)}%
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all duration-300 ease-out"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>

          {/* Contadores de éxito y error */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-900/30 border border-green-600/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-400">{successCount}</div>
              <div className="text-xs text-green-200">Exitosas</div>
            </div>
            <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-red-400">{errorCount}</div>
              <div className="text-xs text-red-200">Errores</div>
            </div>
          </div>

          <p className="text-gray-500 text-xs mt-6 italic">
            No cierres esta ventana ni navegues a otra página
          </p>
        </div>
      </div>
    </div>
  )
}
export default LoadingPayrollModal