"use client"

import { useState, useCallback, useMemo } from "react"
import useSWR from "swr"
import { useCompany } from "../../../../context/routerContext"
import { useTheme } from "../../../../context/themeContext"
import { Info, Search } from "lucide-react"
import PagesHeader from "../../../../components/headers/pagesHeader"
import { usePageName } from "../../../../hook/usePageName"

/* ============================
   INTERFACES
============================ */

type SalaryType = "monthly" | "quincenal" | "biweekly"

interface EmployeeBase {
  id: string
  firstName: string
  lastName: string
  cedula: string
  salary: number
  salaryType: SalaryType // 👈 viene del API (mensual o quincenal)
}

// Formato normalizado para el cálculo en frontend
interface LegalISRParameter {
  id: string
  min: number
  max: number | null
  rate: number // 0.15, 0.25
  label: string
  description: string
}

// Formato real que devuelve tu API
type ApiISRParam = {
  id: string
  name: string
  description: string
  percentage: number // 0, 15, 25
  minRange: number
  maxRange: number
}

/* ============================
   FETCHERS
============================ */

const fetcher = (url: string) => fetch(url).then(res => res.json())

// Normaliza la respuesta del API (minRange/maxRange/percentage -> min/max/rate)
const legalFetcher = async (url: string): Promise<LegalISRParameter[]> => {
  const res = await fetch(url)
  const data: ApiISRParam[] = await res.json()

  return (data ?? []).map(p => ({
    id: p.id,
    min: Number(p.minRange) || 0,
    max: p.maxRange >= 99999999 ? null : Number(p.maxRange),
    rate: (Number(p.percentage) || 0) / 100, // 15 -> 0.15
    label: p.name,
    description: p.description
  }))
}

/* ============================
   HELPERS
============================ */

// Convierte el salario del empleado a:
// - base mensual (para anualizar a 13)
// - base quincenal (para mostrar / calcular por quincena)
const getPeriodBases = (salary: number, salaryType: SalaryType) => {
  const s = Number(salary) || 0

  // asumimos:
  // - monthly: salary es mensual
  // - quincenal/biweekly: salary es por quincena
  const isQuincenal = salaryType === "quincenal" || salaryType === "biweekly"

  const monthlyGross = isQuincenal ? s * 2 : s
  const biweeklyGross = isQuincenal ? s : s / 2

  return { monthlyGross, biweeklyGross }
}

const formatMoney = (v: number) => `$${(Number(v) || 0).toFixed(2)}`

/* ============================
   COMPONENT
============================ */

export const AllISR: React.FC = () => {
  const { selectedCompany } = useCompany()
  const { isDarkMode } = useTheme()
  const { pageName } = usePageName()

  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState<"monthly" | "biweekly">("monthly") // 👈 switch de vista

  /* ============================
     DATA
  ============================ */

  const { data: employees, isLoading: loadingEmployees } = useSWR<EmployeeBase[]>(
    selectedCompany
      ? `${import.meta.env.VITE_API_URL}/api/payroll/employees?companyId=${selectedCompany.id}`
      : null,
    fetcher
  )

  const { data: legalParams, isLoading: loadingLegal } = useSWR<LegalISRParameter[]>(
    selectedCompany
      ? `${import.meta.env.VITE_API_URL}/api/system/legal-parameters/isr/rates?companyId=${selectedCompany.id}`
      : null,
    legalFetcher
  )

  /* ============================
     ISR PROGRESIVO (ANUAL)
     - Regla confirmada por tu planilla:
       Base ISR = BRUTO (no se resta SS/SE)
     - Proyección anual = mensual * 13 (incluye décimo)
     - Retención por periodo:
       mensual: anual / 13
       quincenal: anual / 26   (13 meses * 2 quincenas)
  ============================ */

  const calculateAnnualISRProgressive = useCallback((annualIncome: number, params: LegalISRParameter[]) => {
    const sorted = [...params].sort((a, b) => a.min - b.min)
    let total = 0

    for (const tramo of sorted) {
      const upper = tramo.max ?? Infinity
      const portion = Math.min(annualIncome, upper) - tramo.min
      if (portion > 0 && tramo.rate > 0) total += portion * tramo.rate
    }

    return total
  }, [])

  const calculateISRDetails = useCallback(
    (employeeSalary: number, salaryType: SalaryType) => {
      if (!legalParams) {
        return {
          grossPeriod: 0,
          baseISRPeriod: 0,
          annualBaseISR: 0,
          periodISR: 0,
          rateLabel: "—",
          ssPeriod: 0,
          sePeriod: 0,
          netPeriod: 0,
          totalDeductionsPeriod: 0
        }
      }

      const { monthlyGross, biweeklyGross } = getPeriodBases(employeeSalary, salaryType)

      // Vista seleccionada
      const grossPeriod = viewMode === "monthly" ? monthlyGross : biweeklyGross

      // ✅ Según tu planilla: base ISR = BRUTO
      const baseISRPeriod = grossPeriod

      // ✅ Proyección anual siempre desde la base mensual * 13 (incluye décimo)
      const annualBaseISR = monthlyGross * 13

      // ✅ ISR anual progresivo
      const annualISR = calculateAnnualISRProgressive(annualBaseISR, legalParams)

      // ✅ ISR por periodo según vista (mensual 13, quincenal 26)
      const periods = viewMode === "monthly" ? 13 : 26
      const periodISR = annualISR / periods

      // ✅ SS/SE se calculan por el periodo mostrado (para NETO)
      const ssPeriod = grossPeriod * 0.0975
      const sePeriod = grossPeriod * 0.0125

      const totalDeductionsPeriod = ssPeriod + sePeriod + periodISR
      const netPeriod = grossPeriod - totalDeductionsPeriod

      const tramoActual = [...legalParams]
        .sort((a, b) => a.min - b.min)
        .find(p => annualBaseISR >= p.min && (p.max === null || annualBaseISR <= p.max))

      return {
        grossPeriod,
        baseISRPeriod,
        annualBaseISR,
        periodISR,
        rateLabel: tramoActual?.label ?? "Exento",
        ssPeriod,
        sePeriod,
        netPeriod,
        totalDeductionsPeriod
      }
    },
    [legalParams, calculateAnnualISRProgressive, viewMode]
  )

  /* ============================
     FILTER + MAP
  ============================ */

  const employeeData = useMemo(() => {
    if (!employees) return []

    return employees
      .filter(emp => {
        const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase()
        return fullName.includes(searchTerm.toLowerCase()) || emp.cedula.includes(searchTerm)
      })
      .map(emp => ({
        ...emp,
        details: calculateISRDetails(emp.salary, emp.salaryType)
      }))
  }, [employees, searchTerm, calculateISRDetails])

  if (loadingEmployees || loadingLegal) {
    return (
      <div
        className={`flex items-center justify-center min-h-screen transition-colors ${
          isDarkMode ? "bg-slate-900" : "bg-gray-50"
        }`}
      >
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  /* ============================
     RENDER
  ============================ */

  return (
    <div className={`transition-colors ${isDarkMode ? "bg-slate-900" : ""}`}>
      <PagesHeader title={pageName} description="Impuesto sobre la Renta - Proyección Anual" onExport={() => {}} />

      {/* TARJETAS DINÁMICAS DESDE API */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {legalParams?.map(param => (
          <div
            key={param.id}
            className={`p-6 rounded-xl border transition-colors ${
              isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"
            }`}
          >
            <p className={`text-xs uppercase font-bold ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
              Tramo
            </p>
            <h3 className={`text-xl font-bold mt-1 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
              {param.description}
            </h3>
            <p
              className={`text-sm font-semibold ${
                param.rate === 0 ? "text-green-400" : param.rate === 0.15 ? "text-blue-400" : "text-orange-400"
              }`}
            >
              {param.label}
            </p>
          </div>
        ))}
      </div>

      {/* TABLE */}
      <div
        className={`rounded-xl border overflow-hidden transition-colors ${
          isDarkMode ? "bg-slate-800 border-gray-700" : "bg-white border-gray-200"
        }`}
      >
        <div
          className={`p-6 border-b flex flex-col md:flex-row justify-between gap-4 transition-colors ${
            isDarkMode ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <div className="flex flex-col gap-3 w-full md:w-auto">
            {/* Search */}
            <div className="relative w-full md:w-96">
              <Search
                className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                  isDarkMode ? "text-gray-500" : "text-gray-400"
                }`}
                size={18}
              />
              <input
                type="text"
                placeholder="Buscar por nombre o cédula..."
                className={`w-full rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-colors ${
                  isDarkMode
                    ? "bg-slate-900 border border-slate-700 text-white"
                    : "bg-gray-100 border border-gray-300 text-gray-900"
                }`}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Switch Mensual / Quincenal */}
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                Vista:
              </span>

              <div
                className={`inline-flex rounded-lg border overflow-hidden ${
                  isDarkMode ? "border-slate-700" : "border-gray-300"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setViewMode("monthly")}
                  className={`px-3 py-1.5 text-xs font-bold transition-colors ${
                    viewMode === "monthly"
                      ? isDarkMode
                        ? "bg-blue-600 text-white"
                        : "bg-blue-600 text-white"
                      : isDarkMode
                      ? "bg-slate-900 text-gray-300 hover:bg-slate-700/40"
                      : "bg-white text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Mensual
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode("biweekly")}
                  className={`px-3 py-1.5 text-xs font-bold transition-colors ${
                    viewMode === "biweekly"
                      ? isDarkMode
                        ? "bg-blue-600 text-white"
                        : "bg-blue-600 text-white"
                      : isDarkMode
                      ? "bg-slate-900 text-gray-300 hover:bg-slate-700/40"
                      : "bg-white text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Quincenal
                </button>
              </div>

              <span className={`text-[11px] ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
                (base ISR = bruto, anual = mensual×13)
              </span>
            </div>
          </div>

          <div className={`flex items-center gap-2 text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
            <Info size={16} className="text-blue-400" />
            Cálculo basado en parámetros legales
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className={`w-full text-left text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
            <thead
              className={`uppercase text-[10px] transition-colors ${
                isDarkMode ? "bg-slate-800/50 text-gray-400" : "bg-gray-100 text-gray-600"
              }`}
            >
              <tr>
                <th className="px-6 py-4">Empleado</th>
                <th className="px-6 py-4">{viewMode === "monthly" ? "Salario (Mensual)" : "Salario (Quincenal)"}</th>
                <th className="px-6 py-4">Base ISR</th>
                <th className="px-6 py-4 text-blue-400">I/R</th>
                <th className="px-6 py-4">Neto</th>
              </tr>
            </thead>

            <tbody className={`divide-y transition-colors ${isDarkMode ? "divide-slate-800" : "divide-gray-200"}`}>
              {employeeData.map(emp => (
                <tr
                  key={emp.id}
                  className={`transition-colors ${isDarkMode ? "hover:bg-slate-700/30" : "hover:bg-gray-100"}`}
                >
                  <td className="px-6 py-4">
                    <div className={`font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                      {emp.firstName} {emp.lastName}
                    </div>
                    <div className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-600"}`}>
                      {emp.cedula} · {emp.salaryType === "monthly" ? "Mensual" : "Quincenal"}
                    </div>
                  </td>

                  <td className="px-6 py-4 font-mono">{formatMoney(emp.details.grossPeriod)}</td>

                  <td className="px-6 py-4 font-mono">{formatMoney(emp.details.baseISRPeriod)}</td>

                  <td className="px-6 py-4 font-bold text-blue-400 font-mono">{formatMoney(emp.details.periodISR)}</td>

                  <td className="px-6 py-4 font-bold text-green-400 font-mono">{formatMoney(emp.details.netPeriod)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}