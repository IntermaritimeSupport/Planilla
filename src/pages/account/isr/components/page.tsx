"use client"

import { authFetcher } from "../../../../services/api"
import { useState, useMemo } from "react"
import useSWR from "swr"
import { useCompany } from "../../../../context/routerContext"
import { useTheme } from "../../../../context/themeContext"
import {
  ChevronDown, ChevronRight, CheckCircle, XCircle,
  Clock, AlertTriangle, TrendingUp, Users, Calendar, FileText,
} from "lucide-react"
import PagesHeader from "../../../../components/headers/pagesHeader"
import { usePageName } from "../../../../hook/usePageName"

/* ============================
   INTERFACES
============================ */

interface Deduction {
  deductionType: string
  amount: number
}

interface Payroll {
  id: string
  grossSalary: number
  netSalary: number
  incomeTax: number
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

interface EmployeeSummary {
  employeeId: string
  name: string
  cedula: string
  isrAmount: number
  nRuns: number
}

interface MonthSummary {
  year: number
  month: number
  monthName: string
  runs: PayrollRun[]
  totalISR: number
  employeeSummaries: EmployeeSummary[]
  isPaid: boolean
  daysLate: number
}

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

const MESES_CORTO = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]

const fmt = (n: number) =>
  new Intl.NumberFormat("es-PA", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n)

/* ISR desde deductions o fallback a incomeTax */
function getISRFromPayroll(payroll: Payroll): number {
  const fromDeductions = payroll.deductions
    .filter(d => d.deductionType === "ISR")
    .reduce((sum, d) => sum + Number(d.amount), 0)
  if (fromDeductions > 0) return fromDeductions
  return Number(payroll.incomeTax ?? 0)
}

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
      const monthStart = new Date(selectedYear, m, 1)
      if (monthStart > today && selectedYear >= currentYear) continue

      const monthRuns = (runs ?? []).filter(r => {
        const d = new Date(r.periodDate)
        return d.getFullYear() === selectedYear && d.getMonth() === m
      })

      const employeeMap: Record<string, EmployeeSummary> = {}
      let totalISR = 0

      for (const run of monthRuns) {
        for (const payroll of run.payrolls) {
          const isrAmount = getISRFromPayroll(payroll)
          totalISR += isrAmount

          const empId = payroll.employee.id
          if (!employeeMap[empId]) {
            employeeMap[empId] = {
              employeeId: empId,
              name: `${payroll.employee.firstName} ${payroll.employee.lastName}`,
              cedula: payroll.employee.cedula,
              isrAmount: 0,
              nRuns: 0,
            }
          }
          employeeMap[empId].isrAmount += isrAmount
          employeeMap[empId].nRuns += 1
        }
      }

      const isPaid = monthRuns.some(r => r.status === "PAID")
      const dueDate = new Date(selectedYear, m + 1, 15)
      const daysLate = !isPaid && today > dueDate
        ? Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0

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

  const stats = useMemo(() => {
    const totalAnual = monthSummaries.reduce((s, m) => s + m.totalISR, 0)
    const mesesConDatos = monthSummaries.filter(m => m.runs.length > 0)
    const mesesPagados = mesesConDatos.filter(m => m.isPaid).length
    const mesesPendientes = mesesConDatos.filter(m => !m.isPaid).length
    const mesesEnRetraso = mesesConDatos.filter(m => m.daysLate > 0).length
    const empleadosUnicos = new Set(
      monthSummaries.flatMap(m => m.employeeSummaries.map(e => e.employeeId))
    ).size
    return { totalAnual, mesesConDatos: mesesConDatos.length, mesesPagados, mesesPendientes, mesesEnRetraso, empleadosUnicos }
  }, [monthSummaries])

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
    if (!hasData) return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
        isDarkMode ? "bg-slate-700/60 text-gray-500" : "bg-gray-100 text-gray-400"
      }`}>
        <Clock size={11} /> Sin nómina
      </span>
    )
    if (isPaid) return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
        <CheckCircle size={11} /> Pagado a DGI
      </span>
    )
    if (daysLate > 0) return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/20">
        <AlertTriangle size={11} /> {daysLate}d de retraso
      </span>
    )
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/20">
        <XCircle size={11} /> Pendiente
      </span>
    )
  }

  /* ============================
     RENDER
  ============================ */

  return (
    <div className={`min-h-screen transition-colors ${isDarkMode ? "bg-slate-900" : "bg-gray-50"}`}>
      <PagesHeader
        title={pageName}
        description="Impuesto sobre la Renta — retenciones mensuales por año"
        onExport={() => {}}
      />

      {/* SELECTOR DE AÑO */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <span className={`text-sm font-semibold ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>Año:</span>
        <div className="flex gap-2">
          {[currentYear - 1, currentYear, currentYear + 1].map(y => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                selectedYear === y
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : isDarkMode
                  ? "bg-slate-800 text-gray-300 hover:bg-slate-700 border border-slate-700"
                  : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm"
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* STATS CARDS */}
      {!isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {/* Total anual */}
          <div className={`col-span-2 rounded-xl p-5 border ${
            isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200 shadow-sm"
          }`}>
            <div className="flex items-center justify-between mb-1">
              <p className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                ISR Total {selectedYear}
              </p>
              <TrendingUp size={16} className="text-blue-400" />
            </div>
            <p className={`text-3xl font-black tracking-tight ${isDarkMode ? "text-white" : "text-gray-900"}`}>
              {fmt(stats.totalAnual)}
            </p>
            <p className={`text-xs mt-1 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
              Acumulado {stats.mesesConDatos} mes{stats.mesesConDatos !== 1 ? "es" : ""} con nómina
            </p>
          </div>

          {/* Empleados */}
          <div className={`rounded-xl p-5 border ${
            isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200 shadow-sm"
          }`}>
            <div className="flex items-center justify-between mb-1">
              <p className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                Empleados
              </p>
              <Users size={16} className="text-violet-400" />
            </div>
            <p className={`text-2xl font-black ${isDarkMode ? "text-white" : "text-gray-900"}`}>
              {stats.empleadosUnicos}
            </p>
            <p className={`text-xs mt-1 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>con retención ISR</p>
          </div>

          {/* Estado */}
          <div className={`rounded-xl p-5 border ${
            isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200 shadow-sm"
          }`}>
            <div className="flex items-center justify-between mb-1">
              <p className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                Estado DGI
              </p>
              <Calendar size={16} className={stats.mesesEnRetraso > 0 ? "text-red-400" : "text-emerald-400"} />
            </div>
            <div className="flex flex-col gap-1 mt-1">
              {stats.mesesPagados > 0 && (
                <span className="text-xs font-semibold text-emerald-400">{stats.mesesPagados} pagado{stats.mesesPagados !== 1 ? "s" : ""}</span>
              )}
              {stats.mesesPendientes > 0 && (
                <span className="text-xs font-semibold text-amber-400">{stats.mesesPendientes} pendiente{stats.mesesPendientes !== 1 ? "s" : ""}</span>
              )}
              {stats.mesesEnRetraso > 0 && (
                <span className="text-xs font-semibold text-red-400">{stats.mesesEnRetraso} en retraso</span>
              )}
              {stats.mesesConDatos === 0 && (
                <span className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>Sin datos</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MINIBAR MENSUAL */}
      {!isLoading && monthSummaries.length > 0 && (
        <div className={`rounded-xl border p-4 mb-6 ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}>
          <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            Distribución mensual
          </p>
          <div className="flex items-end gap-1.5 h-16">
            {MESES_CORTO.map((m, idx) => {
              const ms = monthSummaries.find(s => s.month === idx)
              if (!ms) return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                  <div className={`w-full rounded-sm ${isDarkMode ? "bg-slate-700/40" : "bg-gray-100"}`} style={{ height: "4px" }} />
                  <span className={`text-[9px] ${isDarkMode ? "text-gray-600" : "text-gray-300"}`}>{m}</span>
                </div>
              )
              const maxISR = Math.max(...monthSummaries.map(s => s.totalISR), 1)
              const heightPct = ms.totalISR > 0 ? Math.max((ms.totalISR / maxISR) * 100, 8) : 4
              const barColor = ms.daysLate > 0 ? "bg-red-500" : ms.isPaid ? "bg-emerald-500" : ms.totalISR > 0 ? "bg-blue-500" : isDarkMode ? "bg-slate-600" : "bg-gray-200"
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1" title={`${ms.monthName}: ${fmt(ms.totalISR)}`}>
                  <div className="w-full flex items-end" style={{ height: "48px" }}>
                    <div
                      className={`w-full rounded-sm transition-all ${barColor} opacity-80`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className={`text-[9px] font-medium ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>{m}</span>
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-4 mt-3">
            <span className="flex items-center gap-1.5 text-[10px] text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"/>Pagado</span>
            <span className="flex items-center gap-1.5 text-[10px] text-blue-400"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block"/>Pendiente</span>
            <span className="flex items-center gap-1.5 text-[10px] text-red-400"><span className="w-2 h-2 rounded-full bg-red-500 inline-block"/>En retraso</span>
          </div>
        </div>
      )}

      {/* LISTA DE MESES */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
          <p className={`text-sm ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>Cargando retenciones...</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {monthSummaries.length === 0 && (
            <div className={`flex flex-col items-center justify-center py-20 gap-3 rounded-xl border ${
              isDarkMode ? "border-slate-700 bg-slate-800" : "border-gray-200 bg-white"
            }`}>
              <FileText size={36} className={isDarkMode ? "text-slate-600" : "text-gray-300"} />
              <p className={`text-sm font-medium ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                No hay nóminas registradas en {selectedYear}
              </p>
            </div>
          )}

          {monthSummaries.map(ms => {
            const isExpanded = expandedMonths.has(ms.month)
            const hasData = ms.runs.length > 0
            const accentColor = ms.daysLate > 0 ? "border-red-500/40" : ms.isPaid ? "border-emerald-500/30" : hasData ? "border-blue-500/30" : ""

            return (
              <div
                key={ms.month}
                className={`rounded-xl border overflow-hidden transition-all ${
                  isDarkMode
                    ? `bg-slate-800 border-slate-700 ${hasData ? accentColor : ""}`
                    : `bg-white border-gray-200 shadow-sm ${hasData ? accentColor : ""}`
                }`}
              >
                {/* CABECERA */}
                <button
                  type="button"
                  onClick={() => hasData && toggleMonth(ms.month)}
                  className={`w-full flex items-center justify-between px-5 py-4 text-left transition-colors ${
                    hasData
                      ? isDarkMode ? "hover:bg-slate-700/40" : "hover:bg-gray-50"
                      : "cursor-default"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {hasData ? (
                      isExpanded
                        ? <ChevronDown size={15} className="text-blue-400 flex-shrink-0" />
                        : <ChevronRight size={15} className={`flex-shrink-0 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`} />
                    ) : (
                      <div className="w-4 flex-shrink-0" />
                    )}
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`font-bold text-sm w-24 ${
                        hasData
                          ? isDarkMode ? "text-white" : "text-gray-900"
                          : isDarkMode ? "text-gray-600" : "text-gray-300"
                      }`}>
                        {ms.monthName}
                      </span>
                      <StatusBadge isPaid={ms.isPaid} daysLate={ms.daysLate} hasData={hasData} />
                    </div>
                  </div>

                  <div className="flex items-center gap-8 flex-shrink-0">
                    {hasData && (
                      <span className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                        {ms.employeeSummaries.length} emp.
                      </span>
                    )}
                    <span className={`text-base font-black font-mono tabular-nums ${
                      hasData
                        ? ms.daysLate > 0 ? "text-red-400" : isDarkMode ? "text-white" : "text-gray-900"
                        : isDarkMode ? "text-slate-600" : "text-gray-200"
                    }`}>
                      {hasData ? fmt(ms.totalISR) : "—"}
                    </span>
                  </div>
                </button>

                {/* DETALLE EMPLEADOS */}
                {isExpanded && hasData && (
                  <div className={`border-t ${isDarkMode ? "border-slate-700" : "border-gray-100"}`}>
                    <table className="w-full text-sm">
                      <thead className={`text-[10px] uppercase font-bold tracking-wider ${
                        isDarkMode ? "bg-slate-700/50 text-gray-400" : "bg-gray-50 text-gray-500"
                      }`}>
                        <tr>
                          <th className="px-5 py-2.5 text-left">Empleado</th>
                          <th className="px-5 py-2.5 text-left">Cédula</th>
                          <th className="px-5 py-2.5 text-right">Períodos</th>
                          <th className="px-5 py-2.5 text-right text-blue-400">ISR Retenido</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isDarkMode ? "divide-slate-700/60" : "divide-gray-50"}`}>
                        {ms.employeeSummaries
                          .sort((a, b) => b.isrAmount - a.isrAmount)
                          .map(emp => (
                            <tr
                              key={emp.employeeId}
                              className={`transition-colors ${isDarkMode ? "hover:bg-slate-700/30" : "hover:bg-blue-50/40"}`}
                            >
                              <td className={`px-5 py-3 font-semibold text-sm ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                                {emp.name}
                              </td>
                              <td className={`px-5 py-3 font-mono text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                                {emp.cedula}
                              </td>
                              <td className={`px-5 py-3 text-right text-xs ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                                {emp.nRuns} quincena{emp.nRuns !== 1 ? "s" : ""}
                              </td>
                              <td className="px-5 py-3 text-right font-bold font-mono tabular-nums text-blue-400">
                                {fmt(emp.isrAmount)}
                              </td>
                            </tr>
                          ))
                        }
                      </tbody>
                      <tfoot className={`border-t text-sm font-bold ${
                        isDarkMode ? "border-slate-600 bg-slate-700/30" : "border-gray-200 bg-gray-50"
                      }`}>
                        <tr>
                          <td className={`px-5 py-3 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`} colSpan={3}>
                            Total ISR — {ms.monthName} {ms.year}
                          </td>
                          <td className="px-5 py-3 text-right font-mono tabular-nums text-blue-400">{fmt(ms.totalISR)}</td>
                        </tr>
                      </tfoot>
                    </table>

                    {/* Due date reminder */}
                    {!ms.isPaid && (
                      <div className={`px-5 py-2.5 text-xs flex items-center gap-2 border-t ${
                        ms.daysLate > 0
                          ? isDarkMode ? "border-red-900/40 bg-red-900/10 text-red-400" : "border-red-100 bg-red-50 text-red-500"
                          : isDarkMode ? "border-slate-700 bg-slate-700/20 text-gray-500" : "border-gray-100 bg-gray-50 text-gray-400"
                      }`}>
                        {ms.daysLate > 0
                          ? <><AlertTriangle size={12} /> Vencido — pago a DGI debió realizarse el 15 de {MESES[ms.month === 11 ? 0 : ms.month + 1]}</>
                          : <><Clock size={12} /> Pago a DGI vence el 15 de {MESES[ms.month === 11 ? 0 : ms.month + 1]}</>
                        }
                      </div>
                    )}
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
