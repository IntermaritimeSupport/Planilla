import { useState } from "react"
import { AlertCircle, ChevronDown } from "lucide-react"
import { useTheme } from "../../../../context/themeContext"

interface ISRTramo {
  name: string
  percentage: number
  minRange: number
  maxRange: number
}

interface PayrollInfoProps {
  sssRate: number
  isrTramos: ISRTramo[]
  defaultOpen?: boolean
}

export const PayrollInfo: React.FC<PayrollInfoProps> = ({
  sssRate,
  isrTramos,
  defaultOpen = false,
}) => {
  const { isDarkMode } = useTheme()
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className={`rounded-lg overflow-hidden transition-all duration-300 border ${
      isDarkMode
        ? 'bg-blue-900/20 border-blue-600'
        : 'bg-blue-50 border-blue-300'
    }`}>
      {/* Header - Clickeable */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-start gap-3 p-6 transition-colors ${
          isDarkMode
            ? 'hover:bg-blue-900/30'
            : 'hover:bg-blue-100'
        }`}
      >
        <AlertCircle className={`flex-shrink-0 mt-0.5 ${
          isDarkMode ? 'text-blue-400' : 'text-blue-600'
        }`} size={24} />
        <div className="flex-1 text-left">
          <h4 className={`font-semibold ${
            isDarkMode ? 'text-blue-300' : 'text-blue-900'
          }`}>
            Información sobre Cálculos Panameños
          </h4>
          <p className={`text-xs mt-1 ${
            isDarkMode ? 'text-blue-200/60' : 'text-blue-700/60'
          }`}>
            Haz clic para {isOpen ? "ocultar" : "ver"} los detalles
          </p>
        </div>
        <ChevronDown
          size={20}
          className={`flex-shrink-0 transition-transform duration-300 ${
            isDarkMode ? 'text-blue-400' : 'text-blue-600'
          } ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Content - Colapsable */}
      {isOpen && (
        <div className={`px-6 pb-6 border-t pt-4 transition-colors ${
          isDarkMode ? 'border-blue-600/30' : 'border-blue-200'
        }`}>
          <ul className={`text-sm space-y-3 ${
            isDarkMode ? 'text-blue-100' : 'text-blue-900'
          }`}>
            <li className="flex gap-2">
              <span className={`flex-shrink-0 ${
                isDarkMode ? 'text-blue-400' : 'text-blue-600'
              }`}>•</span>
              <span>
                <strong>Tipos de Salario:</strong> Se soportan salarios MONTHLY
                (Mensual) y BIWEEKLY (Quincenal). Los cálculos se normalizan a
                mensual internamente.
              </span>
            </li>

            <li className="flex gap-2">
              <span className={`flex-shrink-0 ${
                isDarkMode ? 'text-blue-400' : 'text-blue-600'
              }`}>•</span>
              <span>
                <strong>Normalización BIWEEKLY:</strong> Salario Quincenal × 26
                semanas ÷ 12 meses = Equivalente Mensual
              </span>
            </li>

            <li className="flex gap-2">
              <span className={`flex-shrink-0 ${
                isDarkMode ? 'text-blue-400' : 'text-blue-600'
              }`}>•</span>
              <span>
                <strong>SSS (Seguro Social):</strong>{" "}
                <span className={`font-semibold ${
                  isDarkMode ? 'text-blue-300' : 'text-blue-700'
                }`}>
                  {sssRate.toFixed(2)}%
                </span>{" "}
                del salario bruto
              </span>
            </li>

            <li className="flex gap-2">
              <span className={`flex-shrink-0 ${
                isDarkMode ? 'text-blue-400' : 'text-blue-600'
              }`}>•</span>
              <div>
                <strong>ISR (Impuesto sobre la Renta):</strong> Escala fiscal
                dinámica desde parámetros
                {isrTramos.length > 0 && (
                  <ul className={`ml-4 mt-2 space-y-1 rounded p-2 border transition-colors ${
                    isDarkMode
                      ? 'bg-blue-600/10 border-blue-600/20'
                      : 'bg-blue-100/50 border-blue-300'
                  }`}>
                    {isrTramos.map((tramo, idx) => (
                      <li key={idx} className={`text-xs flex justify-between ${
                        isDarkMode ? 'text-blue-200' : 'text-blue-800'
                      }`}>
                        <span>
                          <strong>{tramo.name}:</strong> {tramo.percentage}%
                        </span>
                        <span className={isDarkMode ? 'text-blue-300/70' : 'text-blue-700'}>
                          ${tramo.minRange.toLocaleString()} - $
                          {tramo.maxRange.toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>

            <li className="flex gap-2">
              <span className={`flex-shrink-0 ${
                isDarkMode ? 'text-blue-400' : 'text-blue-600'
              }`}>•</span>
              <span>
                <strong>Décimo Tercer Mes:</strong> Se calcula como (Salario
                Total Anual) / 12. Se paga en abril, agosto y diciembre.
              </span>
            </li>

            <li className="flex gap-2">
              <span className={`flex-shrink-0 ${
                isDarkMode ? 'text-blue-400' : 'text-blue-600'
              }`}>•</span>
              <span>
                <strong>Desglose por Período:</strong> El salario neto mensual
                se divide automáticamente en quincenal (÷ 2) para facilitar el
                pago.
              </span>
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}