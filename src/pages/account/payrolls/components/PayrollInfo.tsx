import { useState } from "react"
import { AlertCircle, ChevronDown } from "lucide-react"

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
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="bg-blue-900 bg-opacity-20 border border-blue-600 rounded-lg overflow-hidden transition-all duration-300">
      {/* Header - Clickeable */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-start gap-3 p-6 hover:bg-blue-900/30 transition-colors"
      >
        <AlertCircle className="flex-shrink-0 text-blue-400 mt-0.5" size={24} />
        <div className="flex-1 text-left">
          <h4 className="font-semibold text-blue-300">
            Información sobre Cálculos Panameños
          </h4>
          <p className="text-xs text-blue-200/60 mt-1">
            Haz clic para {isOpen ? "ocultar" : "ver"} los detalles
          </p>
        </div>
        <ChevronDown
          size={20}
          className={`text-blue-400 flex-shrink-0 transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Content - Colapsable */}
      {isOpen && (
        <div className="px-6 pb-6 border-t border-blue-600/30 pt-4">
          <ul className="text-sm text-blue-100 space-y-3">
            <li className="flex gap-2">
              <span className="text-blue-400 flex-shrink-0">•</span>
              <span>
                <strong>Tipos de Salario:</strong> Se soportan salarios MONTHLY
                (Mensual) y BIWEEKLY (Quincenal). Los cálculos se normalizan a
                mensual internamente.
              </span>
            </li>

            <li className="flex gap-2">
              <span className="text-blue-400 flex-shrink-0">•</span>
              <span>
                <strong>Normalización BIWEEKLY:</strong> Salario Quincenal × 26
                semanas ÷ 12 meses = Equivalente Mensual
              </span>
            </li>

            <li className="flex gap-2">
              <span className="text-blue-400 flex-shrink-0">•</span>
              <span>
                <strong>SSS (Seguro Social):</strong>{" "}
                <span className="text-blue-300 font-semibold">
                  {sssRate.toFixed(2)}%
                </span>{" "}
                del salario bruto
              </span>
            </li>

            <li className="flex gap-2">
              <span className="text-blue-400 flex-shrink-0">•</span>
              <div>
                <strong>ISR (Impuesto sobre la Renta):</strong> Escala fiscal
                dinámica desde parámetros
                {isrTramos.length > 0 && (
                  <ul className="ml-4 mt-2 space-y-1 bg-blue-600/10 rounded p-2 border border-blue-600/20">
                    {isrTramos.map((tramo, idx) => (
                      <li key={idx} className="text-xs flex justify-between">
                        <span>
                          <strong>{tramo.name}:</strong> {tramo.percentage}%
                        </span>
                        <span className="text-blue-300/70">
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
              <span className="text-blue-400 flex-shrink-0">•</span>
              <span>
                <strong>Décimo Tercer Mes:</strong> Se calcula como (Salario
                Total Anual) / 12. Se paga en abril, agosto y diciembre.
              </span>
            </li>

            <li className="flex gap-2">
              <span className="text-blue-400 flex-shrink-0">•</span>
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