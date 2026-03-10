"use client"

/**
 * SalaryHistoryModal.tsx
 * Modal de historial de salarios accesible desde AllEmployees.tsx
 * Se abre con un botón en la fila del empleado.
 */

import { useState, useEffect } from "react"
import { X, History, TrendingUp, TrendingDown, Minus, Loader2, AlertCircle } from "lucide-react"
import { useTheme } from "../../../../context/themeContext"

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface SalaryHistoryEntry {
  id: string
  previousSalary: number
  newSalary: number
  previousType: string
  newType: string
  changeReason: string
  notes?: string
  effectiveDate: string
  changedByUser?: { username?: string; email: string }
}

interface SalaryHistoryModalProps {
  employeeId: string
  employeeName: string
  currentSalary: number
  currentSalaryType: string
  onClose: () => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const REASON_LABELS: Record<string, string> = {
  PROMOTION:      "Ascenso",
  ADJUSTMENT:     "Ajuste salarial",
  CORRECTION:     "Corrección de error",
  COST_OF_LIVING: "Costo de vida",
  PERFORMANCE:    "Desempeño",
  RESTRUCTURE:    "Reestructuración",
  OTHER:          "Otro",
}

const SALARY_TYPE_LABEL: Record<string, string> = {
  MONTHLY:  "Mensual",
  BIWEEKLY: "Quincenal",
}

const fmt = (n: number) =>
  new Intl.NumberFormat("es-PA", { style: "currency", currency: "USD" }).format(n)

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("es-PA", { day: "2-digit", month: "short", year: "numeric" })

// ─── Componente ───────────────────────────────────────────────────────────────

export default function SalaryHistoryModal({
  employeeId,
  employeeName,
  currentSalary,
  currentSalaryType,
  onClose,
}: SalaryHistoryModalProps) {
  const { isDarkMode } = useTheme()
  const [history, setHistory] = useState<SalaryHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const API_URL = import.meta.env.VITE_API_URL as string

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true)
        const token = localStorage.getItem("jwt")
        const res = await fetch(`${API_URL}/api/payroll/employees/${employeeId}/salary-history`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error(`Error ${res.status}`)
        const data = await res.json()
        setHistory(data.history || [])
      } catch (e: any) {
        setError(e.message || "Error al cargar historial")
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [employeeId, API_URL])

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/60">
      <div className={`w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl border shadow-2xl transition-colors ${
        isDarkMode ? "bg-slate-900 border-gray-700" : "bg-white border-gray-200"
      }`}>

        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          isDarkMode ? "border-gray-700" : "border-gray-200"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDarkMode ? "bg-blue-900/40" : "bg-blue-100"}`}>
              <History size={18} className={isDarkMode ? "text-blue-400" : "text-blue-600"} />
            </div>
            <div>
              <h2 className={`text-base font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                Historial de Salarios
              </h2>
              <p className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                {employeeName} · Actual: <span className="font-mono font-bold">
                  {fmt(currentSalary)}
                </span> {SALARY_TYPE_LABEL[currentSalaryType] || currentSalaryType}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className={`p-2 rounded-full transition-colors ${
              isDarkMode ? "text-gray-400 hover:text-white hover:bg-gray-700" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
            }`}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-6">

          {loading && (
            <div className="flex items-center justify-center py-16 gap-3">
              <Loader2 size={22} className="animate-spin text-blue-400" />
              <span className={isDarkMode ? "text-gray-400" : "text-gray-500"}>Cargando historial...</span>
            </div>
          )}

          {error && (
            <div className={`flex items-center gap-3 p-4 rounded-lg ${
              isDarkMode ? "bg-red-900/20 text-red-400 border border-red-800" : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              <AlertCircle size={16} />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {!loading && !error && history.length === 0 && (
            <div className={`flex flex-col items-center justify-center py-16 gap-3 ${
              isDarkMode ? "text-gray-600" : "text-gray-400"
            }`}>
              <History size={40} className="opacity-30" />
              <p className="text-sm font-medium">Sin cambios de salario registrados</p>
              <p className="text-xs text-center max-w-xs">
                Cuando edites el salario de este colaborador y guardes los cambios, el historial aparecerá aquí.
              </p>
            </div>
          )}

          {!loading && !error && history.length > 0 && (
            <>
              {/* Resumen rápido */}
              <div className={`grid grid-cols-3 gap-4 mb-6`}>
                <div className={`p-3 rounded-lg text-center ${isDarkMode ? "bg-gray-800" : "bg-gray-100"}`}>
                  <p className={`text-[10px] uppercase font-bold mb-1 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
                    Cambios totales
                  </p>
                  <p className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                    {history.length}
                  </p>
                </div>
                <div className={`p-3 rounded-lg text-center ${isDarkMode ? "bg-gray-800" : "bg-gray-100"}`}>
                  <p className={`text-[10px] uppercase font-bold mb-1 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
                    Primer salario
                  </p>
                  <p className={`text-base font-bold font-mono ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                    {fmt(Number(history[history.length - 1]?.previousSalary || 0))}
                  </p>
                </div>
                <div className={`p-3 rounded-lg text-center ${isDarkMode ? "bg-gray-800" : "bg-gray-100"}`}>
                  <p className={`text-[10px] uppercase font-bold mb-1 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
                    Variación total
                  </p>
                  {(() => {
                    const first = Number(history[history.length - 1]?.previousSalary || 0)
                    const diff  = currentSalary - first
                    const isUp  = diff > 0
                    return (
                      <p className={`text-base font-bold font-mono flex items-center justify-center gap-1 ${
                        isUp
                          ? isDarkMode ? "text-green-400" : "text-green-700"
                          : isDarkMode ? "text-red-400"   : "text-red-700"
                      }`}>
                        {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {isUp ? "+" : ""}{fmt(diff)}
                      </p>
                    )
                  })()}
                </div>
              </div>

              {/* Tabla */}
              <div className={`rounded-xl border overflow-hidden ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
                <table className={`w-full text-xs ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                  <thead className={`uppercase text-[10px] tracking-wider ${
                    isDarkMode ? "bg-gray-800 text-gray-400" : "bg-gray-50 text-gray-500"
                  }`}>
                    <tr>
                      <th className="px-4 py-3 text-left">Fecha</th>
                      <th className="px-4 py-3 text-left">Anterior</th>
                      <th className="px-4 py-3 text-left">Nuevo</th>
                      <th className="px-4 py-3 text-left">Diferencia</th>
                      <th className="px-4 py-3 text-left">Motivo</th>
                      <th className="px-4 py-3 text-left">Realizado por</th>
                      <th className="px-4 py-3 text-left">Notas</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDarkMode ? "divide-gray-700/50" : "divide-gray-100"}`}>
                    {history.map((entry) => {
                      const diff  = Number(entry.newSalary) - Number(entry.previousSalary)
                      const isUp  = diff > 0
                      const isDn  = diff < 0
                      return (
                        <tr key={entry.id} className={`transition-colors ${
                          isDarkMode ? "hover:bg-gray-800/50" : "hover:bg-gray-50"
                        }`}>
                          <td className="px-4 py-3 font-mono whitespace-nowrap">
                            {fmtDate(entry.effectiveDate)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono">{fmt(Number(entry.previousSalary))}</span>
                            <span className={`ml-1 text-[10px] ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                              {SALARY_TYPE_LABEL[entry.previousType] || entry.previousType}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono font-bold">{fmt(Number(entry.newSalary))}</span>
                            <span className={`ml-1 text-[10px] ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                              {SALARY_TYPE_LABEL[entry.newType] || entry.newType}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`flex items-center gap-1 font-bold font-mono ${
                              isUp ? isDarkMode ? "text-green-400" : "text-green-700"
                              : isDn ? isDarkMode ? "text-red-400"   : "text-red-700"
                              : isDarkMode ? "text-gray-400" : "text-gray-500"
                            }`}>
                              {isUp ? <TrendingUp  size={11} /> : null}
                              {isDn ? <TrendingDown size={11} /> : null}
                              {!isUp && !isDn ? <Minus size={11} /> : null}
                              {isUp ? "+" : ""}{fmt(diff)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              isDarkMode ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-700"
                            }`}>
                              {REASON_LABELS[entry.changeReason] || entry.changeReason}
                            </span>
                          </td>
                          <td className={`px-4 py-3 text-[11px] ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                            {entry.changedByUser?.username || entry.changedByUser?.email || "—"}
                          </td>
                          <td className={`px-4 py-3 text-[11px] italic max-w-[140px] truncate ${
                            isDarkMode ? "text-gray-500" : "text-gray-400"
                          }`} title={entry.notes || ""}>
                            {entry.notes || "—"}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className={`flex justify-end p-4 border-t ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
          <button onClick={onClose}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              isDarkMode
                ? "bg-gray-700 text-gray-200 hover:bg-gray-600"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
