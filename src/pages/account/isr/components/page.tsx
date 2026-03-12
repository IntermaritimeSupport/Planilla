"use client"

import { authFetcher } from "../../../../services/api"
import { useState, useMemo } from "react"
import useSWR from "swr"
import { useCompany } from "../../../../context/routerContext"
import { useTheme } from "../../../../context/themeContext"
import { ChevronDown, ChevronRight, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react"
import PagesHeader from "../../../../components/headers/pagesHeader"
import { usePageName } from "../../../../hook/usePageName"

/* ============================
   INTERFACES
============================ */

interface Deduction {
  type: string
  amount: number
}

interface Payroll {
  id: string
  grossSalary: number
  netSalary: number
  payPeriod: string
  deductions: Deduction[]
  employee: {
    id: string
    firstName: string
    lastName: string
    cedula: string
  }
}

interface PayrollRun {
  id: string
  periodDate: string
  status: string
  payrolls: Payroll[]
}

interface MonthSummary {
  year: number
  month: number        // 0-indexed
  monthName: string
  runs: PayrollRun[]
  totalISR: number
  employeeSummaries: EmployeeSummary[]
  isPaid: boolean
  daysLate: number
}

interface EmployeeSummary {
  employeeId: string
  name: string
  cedula: string
  isrAmount: number
}

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
]

const fmt = (n: number) => `$${Number(n).toFixed(2)}`

/* ============================
   COMPONENT
============================ */

export const AllISR: React.FC = () => {
  const { selectedCompany } = useCompany()
  const { isDarkMode } = useTheme()
  const { pageName } = usePageName()

  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [expandedMonths, setExpandedMonths] = useState<Set<number>>(new Set())

  /* ============================
     DATA
  ============================ */

  const { data: runs, isLoading } = useSWR<PayrollRun[]>(
    selectedCompany
      ? `${import.meta.env.VITE_API_URL}/api/payroll/payrolls/runs?companyId=${selectedCompany.id}&year=${selectedYear}`
      : null,
    authFetcher
  )

  /* ============================
     AGRUPAR POR MES
  ============================ */

  const monthSummaries = useMemo<MonthSummary[]>(() => {
    const today = new Date()
    const result: MonthSummary[] = []

    for (let m = 0; m < 12; m++) {
      const monthRuns = (runs ?? []).filter(r => {
        const d = new Date(r.periodDate)
        return d.getFullYear() === selectedYear && d.getMonth() === m
      })

      // ISR total del mes: suma de todas las deducciones ISR de todas las nóminas del mes
      const employeeMap: Record<string, EmployeeSummary> = {}
      let totalISR = 0

      for (const run of monthRuns) {
        for (const payroll of run.payrolls) {
          const isrDeduction = payroll.deductions
            .filter(d => d.type === "ISR")
            .reduce((sum, d) => sum + Number(d.amount), 0)

          totalISR += isrDeduction

          const empId = payroll.employee.id
          if (!employeeMap[empId]) {
            employeeMap[empId] = {
              employeeId: empId,
              name: `${payroll.employee.firstName} ${payroll.employee.lastName}`,
              cedula: payroll.employee.cedula,
              isrAmount: 0,
            }
          }
          employeeMap[empId].isrAmount += isrDeduction
        }
      }

      // Pagado si hay al menos un run con status PAID
      const isPaid = monthRuns.some(r => r.status === "PAID")

      // Días de retraso: si el mes ya pasó y no está pagado
      // La DGI requiere pago el 15 del mes siguiente
      const dueDate = new Date(selectedYear, m + 1, 15)
      const daysLate = !isPaid && today > dueDate
        ? Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0

      // Solo incluir meses que ya empezaron
      const monthStart = new Date(selectedYear, m, 1)
      if (monthStart > today && selectedYear >= currentYear) continue

      result.push({
        year: selectedYear,
        month: m,
        monthName: MESES[m],
        runs: monthRuns,
        totalISR,
        employeeSummaries: Object.values(employeeMap),
        isPaid,
        daysLate,
      })
    }

    return result
  }, [runs, selectedYear, currentYear])

  const totalAnualISR = useMemo(
    () => monthSummaries.reduce((sum, m) => sum + m.totalISR, 0),
    [monthSummaries]
  )

  const toggleMonth = (month: number) => {
    setExpandedMonths(prev => {
      const next = new Set(prev)
      next.has(month) ? next.delete(month) : next.add(month)
      return next
    })
  }

  /* ============================
     RENDER HELPERS
  ============================ */

  const StatusBadge = ({ isPaid, daysLate, hasData }: { isPaid: boolean; daysLate: number; hasData: boolean }) => {
    if (!hasData) {
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
          isDarkMode ? "bg-slate-700 text-gray-400" : "bg-gray-100 text-gray-500"
        }`}>
          <Clock size={12} /> Sin nómina
        </span>
      )
    }
    if (isPaid) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500/20 text-green-400">
          <CheckCircle size={12} /> Pagado
        </span>
      )
    }
    if (daysLate > 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/20 text-red-400">
          <AlertTriangle size={12} /> {daysLate}d de retraso
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-400">
        <XCircle size={12} /> Pendiente
      </span>
    )
  }

  /* ============================
     RENDER
  ============================ */

  return (
    <div className={`transition-colors ${isDarkMode ? "bg-slate-900" : ""}`}>
      <PagesHeader
        title={pageName}
        description="Impuesto sobre la Renta — retenciones mensuales por año"
        onExport={() => {}}
      />

      {/* SELECTOR DE AÑO */}
      <div className="flex items-center gap-4 mb-6">
        <span className={`text-sm font-semibold ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>Año:</span>
        <div className="flex gap-2">
          {[currentYear - 1, currentYear, currentYear + 1].map(y => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                selectedYear === y
                  ? "bg-blue-600 text-white"
                  : isDarkMode
                  ? "bg-slate-800 text-gray-300 hover:bg-slate-700"
                  : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
              }`}
            >
              {y}
            </button>
          ))}
        </div>

        {/* Total anual */}
        <div className={`ml-auto text-right`}>
          <p className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>ISR Retenido {selectedYear}</p>
          <p className={`text-2xl font-black ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            {fmt(totalAnualISR)}
          </p>
        </div>
      </div>

      {/* LISTA DE MESES */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {monthSummaries.length === 0 && (
            <div className={`text-center py-10 text-sm ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
              No hay datos para {selectedYear}
            </div>
          )}

          {monthSummaries.map(ms => {
            const isExpanded = expandedMonths.has(ms.month)
            const hasData = ms.runs.length > 0

            return (
              <div
                key={ms.month}
                className={`rounded-xl border overflow-hidden transition-colors ${
                  isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"
                }`}
              >
                {/* CABECERA DEL MES */}
                <button
                  type="button"
                  onClick={() => hasData && toggleMonth(ms.month)}
                  className={`w-full flex items-center justify-between px-6 py-4 text-left transition-colors ${
                    hasData
                      ? isDarkMode ? "hover:bg-slate-700/40" : "hover:bg-gray-50"
                      : "cursor-default"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {hasData ? (
                      isExpanded
                        ? <ChevronDown size={16} className="text-blue-400" />
                        : <ChevronRight size={16} className={isDarkMode ? "text-gray-500" : "text-gray-400"} />
                    ) : (
                      <ChevronRight size={16} className={isDarkMode ? "text-gray-600" : "text-gray-300"} />
                    )}
                    <span className={`font-bold text-base ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                      {ms.monthName} {ms.year}
                    </span>
                    <StatusBadge isPaid={ms.isPaid} daysLate={ms.daysLate} hasData={hasData} />
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
                        {ms.employeeSummaries.length} empleado{ms.employeeSummaries.length !== 1 ? "s" : ""}
                      </p>
                      <p className={`text-lg font-black ${
                        hasData
                          ? isDarkMode ? "text-blue-300" : "text-blue-600"
                          : isDarkMode ? "text-gray-600" : "text-gray-300"
                      }`}>
                        {hasData ? fmt(ms.totalISR) : "—"}
                      </p>
                    </div>
                  </div>
                </button>

                {/* DETALLE DE EMPLEADOS */}
                {isExpanded && hasData && (
                  <div className={`border-t ${isDarkMode ? "border-slate-700" : "border-gray-200"}`}>
                    <table className={`w-full text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                      <thead className={`uppercase text-[10px] ${
                        isDarkMode ? "bg-slate-700/50 text-gray-400" : "bg-gray-50 text-gray-500"
                      }`}>
                        <tr>
                          <th className="px-6 py-3 text-left">Empleado</th>
                          <th className="px-6 py-3 text-left">Cédula</th>
                          <th className="px-6 py-3 text-right text-blue-400">ISR Retenido</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isDarkMode ? "divide-slate-700" : "divide-gray-100"}`}>
                        {ms.employeeSummaries
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map(emp => (
                            <tr
                              key={emp.employeeId}
                              className={`transition-colors ${isDarkMode ? "hover:bg-slate-700/30" : "hover:bg-gray-50"}`}
                            >
                              <td className={`px-6 py-3 font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                                {emp.name}
                              </td>
                              <td className={`px-6 py-3 font-mono text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                                {emp.cedula}
                              </td>
                              <td className="px-6 py-3 text-right font-bold text-blue-400 font-mono">
                                {fmt(emp.isrAmount)}
                              </td>
                            </tr>
                          ))
                        }
                      </tbody>
                      <tfoot className={`border-t font-bold ${isDarkMode ? "border-slate-600 text-white" : "border-gray-300 text-gray-900"}`}>
                        <tr>
                          <td className="px-6 py-3" colSpan={2}>Total ISR {ms.monthName}</td>
                          <td className="px-6 py-3 text-right font-mono text-blue-400">{fmt(ms.totalISR)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
