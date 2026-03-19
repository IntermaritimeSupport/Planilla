"use client"

import { authFetcher } from "../../../../services/api"
import { useState, useCallback, useMemo } from "react"
import useSWR from "swr"
import { useCompany } from "../../../../context/routerContext"
import { useTheme } from "../../../../context/themeContext"
import { Users, AlertCircle, X, Loader2, ChevronDown, Download } from "lucide-react"
import Pagination from "../../../../components/ui/Pagination"
import PagesHeader from "../../../../components/headers/pagesHeader"
import { usePageName } from "../../../../hook/usePageName"

/* ============================
   TIPOS
============================ */

interface Employee {
  id: string
  firstName: string
  lastName: string
  cedula: string
  salary: number
  salaryType: "MONTHLY" | "BIWEEKLY"
}

interface LegalParameter {
  key: string
  category: string
  percentage: number
  minRange?: number | null
  maxRange?: number | null
  status: "active" | "inactive"
}

interface SipeEmployeeCalc extends Employee {
  gross: number
  ssEmp: number
  ssPat: number
  eduEmp: number
  eduPat: number
  riesgo: number
  isr: number
  decCSS: number
  totalSipe: number
}

interface MonthCalc {
  month: number      // 1-12
  monthName: string
  ssEmp: number
  ssPat: number
  eduEmp: number
  eduPat: number
  riesgo: number
  isr: number
  decCSS: number
  total: number
  isDecimo: boolean
  isPast: boolean
  isCurrent: boolean
}

const MONTHS_ES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
]

// Meses con décimo: Abril (4), Agosto (8), Diciembre (12)
const DECIMO_MONTHS = new Set([4, 8, 12])

export const AllSipe: React.FC = () => {
  const { selectedCompany } = useCompany()
  const { isDarkMode } = useTheme()
  const { pageName } = usePageName()

  const now = new Date()
  const currentYear  = now.getFullYear()
  const currentMonth = now.getMonth() + 1 // 1-12

  const [selectedYear,  setSelectedYear]  = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)  // 1-12, null = resumen anual
  const [modalOpen,     setModalOpen]     = useState(false)
  const [modalPage,     setModalPage]     = useState(1)
  const MODAL_PAGE_SIZE = 20

  /* ============================
     DATA
  ============================ */

  const { data: employees, isLoading: loadingEmps, error: empError } = useSWR<Employee[]>(
    selectedCompany
      ? `${import.meta.env.VITE_API_URL}/api/payroll/employees?companyId=${selectedCompany.id}`
      : null,
    authFetcher
  )

  const { data: legalParams, isLoading: loadingParams, error: paramsError } = useSWR<LegalParameter[]>(
    selectedCompany
      ? `${import.meta.env.VITE_API_URL}/api/system/legal-parameters?companyId=${selectedCompany.id}`
      : null,
    authFetcher
  )

  /* ============================
     PARAMS MAP
  ============================ */

  const paramsMap = useMemo(() => {
    if (!legalParams) return {} as Record<string, LegalParameter>
    return Object.fromEntries(
      legalParams.filter(p => p.status === "active").map(p => [p.key, p])
    ) as Record<string, LegalParameter>
  }, [legalParams])

  const getParam = (key: string) => paramsMap[key]

  /* ============================
     ISR MENSUAL
  ============================ */

  const calculateISR = useCallback(
    (monthlyGross: number): number => {
      if (!legalParams) return 0
      const annualTaxable = monthlyGross * 13
      const isrRates = legalParams
        .filter(p => p.category === "isr" && p.status === "active")
        .sort((a, b) => Number(a.minRange) - Number(b.minRange))

      let annualISR = 0
      for (const rate of isrRates) {
        if (Number(rate.percentage) === 0) continue
        const rawMin = Number(rate.minRange) || 0
        const min    = rawMin > 0 ? rawMin - 1 : 0
        const max    = rate.maxRange ? Number(rate.maxRange) : Infinity
        if (annualTaxable > min) {
          annualISR += (Math.min(annualTaxable, max) - min) * (Number(rate.percentage) / 100)
        }
      }
      return annualISR / 13
    },
    [legalParams]
  )

  /* ============================
     CÁLCULO POR EMPLEADO
  ============================ */

  const calcEmployee = useCallback(
    (emp: Employee, isDecimoMonth: boolean): SipeEmployeeCalc => {
      const rawSalary = Number(emp.salary) || 0
      const gross     = emp.salaryType === "BIWEEKLY" ? rawSalary * 2 : rawSalary

      const ssEmpRate  = Number(getParam("ss_empleado")?.percentage  ?? 9.75)
      const ssPatRate  = Number(getParam("ss_patrono")?.percentage   ?? 12.25)
      const seEmpRate  = Number(getParam("se_empleado")?.percentage  ?? 1.25)
      const sePatRate  = Number(getParam("se_patrono")?.percentage   ?? 1.5)
      const riesgoRate = Number(getParam("riesgo_profesional")?.percentage ?? 0.98)

      const ssEmp  = gross * (ssEmpRate  / 100)
      const ssPat  = gross * (ssPatRate  / 100)
      const eduEmp = gross * (seEmpRate  / 100)
      const eduPat = gross * (sePatRate  / 100)
      const riesgo = gross * (riesgoRate / 100)
      const isr    = calculateISR(gross)

      let decCSS = 0
      if (isDecimoMonth) {
        const decRate = Number(getParam("decimo_css")?.percentage ?? 7.25)
        decCSS = ((gross * 3) / 12) * (decRate / 100)
      }

      const totalSipe = ssEmp + ssPat + eduEmp + eduPat + riesgo + isr + decCSS
      return { ...emp, gross, ssEmp, ssPat, eduEmp, eduPat, riesgo, isr, decCSS, totalSipe }
    },
    [calculateISR, getParam]
  )

  /* ============================
     CÁLCULOS ANUALES (12 MESES)
  ============================ */

  const monthCalcs = useMemo<MonthCalc[]>(() => {
    if (!employees || !legalParams) return []

    return Array.from({ length: 12 }, (_, i) => {
      const month      = i + 1
      const isDecimo   = DECIMO_MONTHS.has(month)
      const calcs      = employees.map(e => calcEmployee(e, isDecimo))
      const isPast     = selectedYear < currentYear || (selectedYear === currentYear && month < currentMonth)
      const isCurrent  = selectedYear === currentYear && month === currentMonth

      const sum = (key: keyof SipeEmployeeCalc) =>
        Number(calcs.reduce((s, c) => s + (c[key] as number), 0).toFixed(2))

      return {
        month,
        monthName: MONTHS_ES[i],
        ssEmp:   sum("ssEmp"),
        ssPat:   sum("ssPat"),
        eduEmp:  sum("eduEmp"),
        eduPat:  sum("eduPat"),
        riesgo:  sum("riesgo"),
        isr:     sum("isr"),
        decCSS:  sum("decCSS"),
        total:   Number((sum("ssEmp") + sum("ssPat") + sum("eduEmp") + sum("eduPat") + sum("riesgo") + sum("isr") + sum("decCSS")).toFixed(2)),
        isDecimo,
        isPast,
        isCurrent,
      }
    })
  }, [employees, legalParams, selectedYear, currentYear, currentMonth, calcEmployee])

  // Empleados para el modal del mes seleccionado
  const modalCalcs = useMemo<SipeEmployeeCalc[]>(() => {
    if (!employees || !legalParams || selectedMonth === null) return []
    const isDecimo = DECIMO_MONTHS.has(selectedMonth)
    return employees.map(e => calcEmployee(e, isDecimo))
  }, [employees, legalParams, selectedMonth, calcEmployee])

  const totalAnual = useMemo(
    () => Number(monthCalcs.reduce((s, m) => s + m.total, 0).toFixed(2)),
    [monthCalcs]
  )

  const format = (n: number) =>
    `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const exportModalToExcel = () => {
    if (!selectedMonth || !selectedMonthData) return
    import("xlsx").then(XLSX => {
      const monthName = MONTHS_ES[selectedMonth - 1]
      const isDecimo  = selectedMonthData.isDecimo

      // ── Filas de datos ───────────────────────────────────────────────
      const dataRows = modalCalcs.map((c, i) => ({
        "#":            i + 1,
        "Colaborador":  `${c.firstName} ${c.lastName}`,
        "Cédula":       c.cedula,
        "Salario Bruto":      c.gross,
        "SS Empleado (9.75%)": c.ssEmp,
        "SS Patrono (12.25%)": c.ssPat,
        "Educ. Empleado (1.25%)": c.eduEmp,
        "Educ. Patrono (1.5%)":   c.eduPat,
        "Riesgo Prof.":  c.riesgo,
        "ISR Mensual":   c.isr,
        ...(isDecimo ? { "Décimo CSS": c.decCSS } : {}),
        "TOTAL SIPE":    c.totalSipe,
      }))

      // ── Fila de totales ──────────────────────────────────────────────
      const sum = (key: keyof SipeEmployeeCalc) =>
        modalCalcs.reduce((s, c) => s + (c[key] as number), 0)

      dataRows.push({
        "#":            "",
        "Colaborador":  "TOTAL",
        "Cédula":       "",
        "Salario Bruto":           sum("gross"),
        "SS Empleado (9.75%)":     sum("ssEmp"),
        "SS Patrono (12.25%)":     sum("ssPat"),
        "Educ. Empleado (1.25%)":  sum("eduEmp"),
        "Educ. Patrono (1.5%)":    sum("eduPat"),
        "Riesgo Prof.":            sum("riesgo"),
        "ISR Mensual":             sum("isr"),
        ...(isDecimo ? { "Décimo CSS": sum("decCSS") } : {}),
        "TOTAL SIPE":              sum("totalSipe"),
      } as any)

      const ws = XLSX.utils.json_to_sheet(dataRows)

      // ── Ancho de columnas ────────────────────────────────────────────
      ws["!cols"] = [
        { wch: 4  },  // #
        { wch: 26 },  // Colaborador
        { wch: 14 },  // Cédula
        { wch: 16 },  // Bruto
        { wch: 20 },  // SS Emp
        { wch: 20 },  // SS Pat
        { wch: 22 },  // Educ Emp
        { wch: 22 },  // Educ Pat
        { wch: 14 },  // Riesgo
        { wch: 14 },  // ISR
        ...(isDecimo ? [{ wch: 14 }] : []),  // Décimo
        { wch: 14 },  // Total
      ]

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, `SIPE ${monthName} ${selectedYear}`)
      XLSX.writeFile(wb, `SIPE_${monthName}_${selectedYear}.xlsx`)
    })
  }

  /* ============================
     LOADING / ERROR
  ============================ */

  if (loadingEmps || loadingParams) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${isDarkMode ? "bg-slate-900" : "bg-gray-50"}`}>
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    )
  }

  if (empError || paramsError) {
    return (
      <div className={`flex items-center justify-center min-h-screen gap-2 ${isDarkMode ? "bg-slate-900 text-red-400" : "bg-gray-50 text-red-600"}`}>
        <AlertCircle /> Error cargando datos
      </div>
    )
  }

  const selectedMonthData = selectedMonth !== null ? monthCalcs[selectedMonth - 1] : null

  // Años disponibles: 3 años atrás hasta el año actual
  const yearOptions = Array.from({ length: 4 }, (_, i) => currentYear - 3 + i)

  return (
    <div className={`transition-colors ${isDarkMode ? "bg-slate-900" : ""}`}>
      <PagesHeader title={pageName} description={`Empresa: ${selectedCompany?.name}`} onExport={() => {}} />

      {/* ── Selector de Año ──────────────────────────────────────────────── */}
      <div className={`flex items-center justify-between mb-6 p-4 rounded-xl border ${isDarkMode ? "bg-slate-800 border-gray-700" : "bg-white border-gray-200"}`}>
        <div>
          <p className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            Reporte SIPE
          </p>
          <p className={`text-sm mt-0.5 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
            {employees?.length ?? 0} empleados · Total anual estimado:{" "}
            <span className="font-bold text-green-400">{format(totalAnual)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className={`text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>Año:</label>
          <div className="relative">
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className={`appearance-none rounded-lg px-4 py-2 pr-8 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDarkMode ? "bg-gray-700 border border-gray-600 text-white" : "bg-white border border-gray-300 text-gray-900"
              }`}
            >
              {yearOptions.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <ChevronDown size={14} className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${isDarkMode ? "text-gray-400" : "text-gray-500"}`} />
          </div>
        </div>
      </div>

      {/* ── Grilla de 12 meses ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        {monthCalcs.map(m => (
          <button
            key={m.month}
            onClick={() => { setSelectedMonth(m.month); setModalOpen(true); setModalPage(1) }}
            className={`relative rounded-xl border p-4 text-left transition-all hover:shadow-md hover:scale-[1.02] ${
              m.isCurrent
                ? isDarkMode ? "border-blue-500 bg-blue-900/30" : "border-blue-500 bg-blue-50"
                : m.isPast
                  ? isDarkMode ? "border-gray-600 bg-slate-800" : "border-gray-200 bg-white"
                  : isDarkMode ? "border-gray-700 bg-slate-800/50 opacity-60" : "border-gray-200 bg-gray-50 opacity-60"
            }`}
          >
            {m.isDecimo && (
              <span className={`absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                isDarkMode ? "bg-amber-500/20 text-amber-400" : "bg-amber-100 text-amber-700"
              }`}>+13°</span>
            )}
            {m.isCurrent && (
              <span className={`absolute top-2 left-2 w-2 h-2 rounded-full bg-blue-500 animate-pulse`} />
            )}
            <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${
              m.isCurrent
                ? "text-blue-400"
                : isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}>{m.monthName}</p>
            <p className={`text-lg font-black font-mono leading-tight ${isDarkMode ? "text-white" : "text-gray-900"}`}>
              {format(m.total)}
            </p>
            <div className={`mt-2 space-y-0.5 text-[10px] ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
              <div className="flex justify-between">
                <span>CSS Emp</span><span>{format(m.ssEmp)}</span>
              </div>
              <div className="flex justify-between">
                <span>CSS Pat</span><span>{format(m.ssPat)}</span>
              </div>
              <div className="flex justify-between">
                <span>ISR</span><span>{format(m.isr)}</span>
              </div>
            </div>
            <div className={`mt-3 text-[10px] font-medium flex items-center gap-1 ${
              m.isPast && !m.isCurrent
                ? "text-gray-500"
                : m.isCurrent
                  ? "text-blue-400"
                  : isDarkMode ? "text-gray-600" : "text-gray-400"
            }`}>
              {m.isPast && !m.isCurrent ? "Vencido · 15/" + String(m.month + 1 > 12 ? 1 : m.month + 1).padStart(2,"0")
                : m.isCurrent ? "Vence: 15/" + String(m.month + 1 > 12 ? 1 : m.month + 1).padStart(2,"0") + "/" + (m.month === 12 ? selectedYear + 1 : selectedYear)
                : "Próximo"}
            </div>
          </button>
        ))}
      </div>

      {/* ── Resumen anual ────────────────────────────────────────────────── */}
      <div className={`rounded-xl border overflow-hidden mb-8 ${isDarkMode ? "bg-slate-800 border-gray-700" : "bg-white border-gray-200"}`}>
        <div className={`px-5 py-3 border-b ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
          <h3 className={`text-sm font-bold uppercase tracking-wider ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            Resumen Anual {selectedYear}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className={`w-full text-xs ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
            <thead className={`${isDarkMode ? "bg-slate-700 text-gray-300" : "bg-gray-100 text-gray-600"}`}>
              <tr>
                <th className="px-4 py-2 text-left">Mes</th>
                <th className="px-4 py-2 text-right">CSS Emp</th>
                <th className="px-4 py-2 text-right">CSS Pat</th>
                <th className="px-4 py-2 text-right">Educ. Emp</th>
                <th className="px-4 py-2 text-right">Educ. Pat</th>
                <th className="px-4 py-2 text-right">Riesgo</th>
                <th className="px-4 py-2 text-right">ISR</th>
                <th className="px-4 py-2 text-right text-amber-400">Déc. CSS</th>
                <th className="px-4 py-2 text-right text-green-400 font-bold">Total</th>
                <th className="px-4 py-2 text-center">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {monthCalcs.map(m => (
                <tr key={m.month} className={`border-b transition-colors ${
                  m.isCurrent
                    ? isDarkMode ? "border-blue-800 bg-blue-900/20" : "border-blue-200 bg-blue-50"
                    : isDarkMode ? "border-gray-700 hover:bg-slate-700/40" : "border-gray-100 hover:bg-gray-50"
                }`}>
                  <td className={`px-4 py-2 font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                    {m.monthName}
                    {m.isDecimo && (
                      <span className={`ml-1.5 text-[9px] px-1 py-0.5 rounded ${isDarkMode ? "bg-amber-500/20 text-amber-400" : "bg-amber-100 text-amber-700"}`}>13°</span>
                    )}
                    {m.isCurrent && (
                      <span className={`ml-1.5 text-[9px] px-1 py-0.5 rounded ${isDarkMode ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-700"}`}>actual</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">{format(m.ssEmp)}</td>
                  <td className="px-4 py-2 text-right font-mono">{format(m.ssPat)}</td>
                  <td className="px-4 py-2 text-right font-mono">{format(m.eduEmp)}</td>
                  <td className="px-4 py-2 text-right font-mono">{format(m.eduPat)}</td>
                  <td className="px-4 py-2 text-right font-mono">{format(m.riesgo)}</td>
                  <td className="px-4 py-2 text-right font-mono text-blue-400">{format(m.isr)}</td>
                  <td className={`px-4 py-2 text-right font-mono ${m.decCSS > 0 ? "text-amber-400" : isDarkMode ? "text-gray-600" : "text-gray-300"}`}>
                    {format(m.decCSS)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono font-bold text-green-400">{format(m.total)}</td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => { setSelectedMonth(m.month); setModalOpen(true); setModalPage(1) }}
                      className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? "text-blue-400 hover:bg-blue-600/20" : "text-blue-600 hover:bg-blue-100"}`}
                      title="Ver desglose individual"
                    >
                      <Users size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className={`font-bold border-t-2 ${isDarkMode ? "border-gray-600 bg-slate-700/50" : "border-gray-300 bg-gray-100"}`}>
                <td className={`px-4 py-3 ${isDarkMode ? "text-white" : "text-gray-900"}`}>TOTAL ANUAL</td>
                <td className="px-4 py-3 text-right font-mono">
                  {format(monthCalcs.reduce((s, m) => s + m.ssEmp, 0))}
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {format(monthCalcs.reduce((s, m) => s + m.ssPat, 0))}
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {format(monthCalcs.reduce((s, m) => s + m.eduEmp, 0))}
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {format(monthCalcs.reduce((s, m) => s + m.eduPat, 0))}
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {format(monthCalcs.reduce((s, m) => s + m.riesgo, 0))}
                </td>
                <td className="px-4 py-3 text-right font-mono text-blue-400">
                  {format(monthCalcs.reduce((s, m) => s + m.isr, 0))}
                </td>
                <td className="px-4 py-3 text-right font-mono text-amber-400">
                  {format(monthCalcs.reduce((s, m) => s + m.decCSS, 0))}
                </td>
                <td className="px-4 py-3 text-right font-mono text-green-400 text-base">
                  {format(totalAnual)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── Modal desglose por empleado ──────────────────────────────────── */}
      {modalOpen && selectedMonth !== null && selectedMonthData && (
        <div className={`fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4 ${isDarkMode ? "bg-black/80" : "bg-black/50"}`}>
          <div className={`w-full max-w-6xl max-h-[90vh] rounded-2xl border flex flex-col shadow-2xl ${isDarkMode ? "bg-slate-800 border-gray-700" : "bg-white border-gray-200"}`}>
            <div className={`p-5 border-b flex justify-between items-center ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
              <div>
                <h3 className={`text-lg font-bold flex items-center gap-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                  <Users className="text-blue-400" size={20} />
                  Desglose SIPE — {selectedMonthData.monthName} {selectedYear}
                </h3>
                <p className={`text-xs mt-0.5 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                  {modalCalcs.length} empleados · Total: <span className="font-bold text-green-400">{format(selectedMonthData.total)}</span>
                  {selectedMonthData.isDecimo && <span className="ml-2 text-amber-400">· Incluye décimo CSS</span>}
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className={`p-2 rounded-full transition-colors ${isDarkMode ? "text-gray-400 hover:text-white bg-gray-700" : "text-gray-600 hover:text-gray-900 bg-gray-100"}`}
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-auto p-5">
              <table className={`w-full text-xs ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                <thead>
                  <tr className={`uppercase border-b ${isDarkMode ? "text-gray-400 border-gray-700" : "text-gray-600 border-gray-200"}`}>
                    <th className="pb-2 px-2 text-left">Colaborador</th>
                    <th className="pb-2 px-2 text-right">Bruto</th>
                    <th className="pb-2 px-2 text-right">SS Emp</th>
                    <th className="pb-2 px-2 text-right">SS Pat</th>
                    <th className="pb-2 px-2 text-right">Educ. Emp</th>
                    <th className="pb-2 px-2 text-right">Educ. Pat</th>
                    <th className="pb-2 px-2 text-right">Riesgo</th>
                    <th className="pb-2 px-2 text-right">ISR</th>
                    {selectedMonthData.isDecimo && <th className="pb-2 px-2 text-right text-amber-400">Déc. CSS</th>}
                    <th className="pb-2 px-2 text-right text-green-400">Total SIPE</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? "divide-gray-800" : "divide-gray-100"}`}>
                  {modalCalcs.slice((modalPage - 1) * MODAL_PAGE_SIZE, modalPage * MODAL_PAGE_SIZE).map(c => (
                    <tr key={c.id} className={`transition-colors ${isDarkMode ? "hover:bg-slate-700/40" : "hover:bg-gray-50"}`}>
                      <td className="py-3 px-2">
                        <div className={`font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}>{c.firstName} {c.lastName}</div>
                        <div className={`text-[10px] ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>{c.cedula}</div>
                      </td>
                      <td className="py-3 px-2 text-right font-mono">{format(c.gross)}</td>
                      <td className="py-3 px-2 text-right font-mono text-red-400">{format(c.ssEmp)}</td>
                      <td className="py-3 px-2 text-right font-mono">{format(c.ssPat)}</td>
                      <td className="py-3 px-2 text-right font-mono text-red-400">{format(c.eduEmp)}</td>
                      <td className="py-3 px-2 text-right font-mono">{format(c.eduPat)}</td>
                      <td className="py-3 px-2 text-right font-mono">{format(c.riesgo)}</td>
                      <td className="py-3 px-2 text-right font-mono text-blue-400">{format(c.isr)}</td>
                      {selectedMonthData.isDecimo && <td className="py-3 px-2 text-right font-mono text-amber-400">{format(c.decCSS)}</td>}
                      <td className="py-3 px-2 text-right font-mono font-bold text-green-400">{format(c.totalSipe)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className={`border-t-2 font-bold text-xs ${isDarkMode ? "border-gray-600 bg-slate-700/60 text-white" : "border-gray-300 bg-gray-100 text-gray-900"}`}>
                    <td className="py-3 px-2 uppercase tracking-wide">
                      Total <span className={`font-normal text-[10px] ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>({modalCalcs.length} emp.)</span>
                    </td>
                    <td className="py-3 px-2 text-right font-mono">
                      {format(modalCalcs.reduce((s, c) => s + c.gross, 0))}
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-red-400">
                      {format(modalCalcs.reduce((s, c) => s + c.ssEmp, 0))}
                    </td>
                    <td className="py-3 px-2 text-right font-mono">
                      {format(modalCalcs.reduce((s, c) => s + c.ssPat, 0))}
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-red-400">
                      {format(modalCalcs.reduce((s, c) => s + c.eduEmp, 0))}
                    </td>
                    <td className="py-3 px-2 text-right font-mono">
                      {format(modalCalcs.reduce((s, c) => s + c.eduPat, 0))}
                    </td>
                    <td className="py-3 px-2 text-right font-mono">
                      {format(modalCalcs.reduce((s, c) => s + c.riesgo, 0))}
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-blue-400">
                      {format(modalCalcs.reduce((s, c) => s + c.isr, 0))}
                    </td>
                    {selectedMonthData.isDecimo && (
                      <td className="py-3 px-2 text-right font-mono text-amber-400">
                        {format(modalCalcs.reduce((s, c) => s + c.decCSS, 0))}
                      </td>
                    )}
                    <td className="py-3 px-2 text-right font-mono text-green-400 text-sm">
                      {format(modalCalcs.reduce((s, c) => s + c.totalSipe, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className={`p-5 border-t flex justify-between items-center ${isDarkMode ? "border-gray-700 bg-slate-900/40" : "border-gray-200 bg-gray-50"}`}>
              <div className="flex items-center gap-4">
                <span className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>{modalCalcs.length} empleados</span>
                {modalCalcs.length > MODAL_PAGE_SIZE && (
                  <Pagination total={modalCalcs.length} pageSize={MODAL_PAGE_SIZE} page={modalPage} onChange={setModalPage} compact />
                )}
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={exportModalToExcel}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors"
                >
                  <Download size={15} />
                  Descargar Excel
                </button>
                <div>
                  <span className={`mr-3 text-xs font-bold uppercase ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Total:</span>
                  <span className="text-xl font-bold text-green-400 font-mono">{format(selectedMonthData.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
