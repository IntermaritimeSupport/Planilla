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

interface EmployeeBase {
  id: string
  firstName: string
  lastName: string
  cedula: string
  salary: number
}

interface LegalISRParameter {
  id: string
  min: number
  max: number | null
  rate: number
  label: string
  description: string
}
/* ============================
   FETCHER
============================ */

const fetcher = (url: string) => fetch(url).then(res => res.json())

/* ============================
   COMPONENT
============================ */

export const AllISR: React.FC = () => {
  const { selectedCompany } = useCompany()
  const { isDarkMode } = useTheme()
  const { pageName } = usePageName()
  const [searchTerm, setSearchTerm] = useState("")

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
    fetcher
  )
  console.log("Legal", legalParams)

/* ============================
   CALC ISR (PROGRESIVO)
============================ */

const calculateAnnualISRProgressive = (
  annualTaxable: number,
  params: LegalISRParameter[]
) => {
  // Ordena por mínimo ascendente por seguridad
  const sorted = [...params].sort((a, b) => a.min - b.min)

  let total = 0

  for (const tramo of sorted) {
    const upper = tramo.max ?? Infinity

    // porción gravable dentro de este tramo
    const portion = Math.min(annualTaxable, upper) - tramo.min

    if (portion > 0 && tramo.rate > 0) {
      total += portion * tramo.rate
    }
  }

  return total
}

const calculateISRDetails = useCallback(
  (salary: number) => {
    if (!legalParams) {
      return {
        monthlyTaxable: 0,
        annualTaxable: 0,
        monthlyISR: 0,
        rateLabel: "—",
        totalDeductions: 0
      }
    }

    const gross = Number(salary) || 0
    const ss = gross * 0.0975
    const se = gross * 0.0125

    const monthlyTaxable = gross - ss - se

    // Tu proyección usa 13 salarios (incluye décimo). Mantengo eso:
    const annualTaxable = monthlyTaxable * 13

    // Encuentra el tramo "principal" solo para mostrar etiqueta
    const tramoActual = [...legalParams]
      .sort((a, b) => a.min - b.min)
      .find(p => annualTaxable >= p.min && (p.max === null || annualTaxable <= p.max))

    const annualISR = calculateAnnualISRProgressive(annualTaxable, legalParams)

    // ISR se retiene mensual: normalmente entre 12 meses.
    // Si tu empresa retiene en 13 periodos, cambia a 13.
    const PAY_PERIODS_FOR_ISR = 12
    const monthlyISR = annualISR / PAY_PERIODS_FOR_ISR

    const rateLabel = tramoActual?.label ?? "Exento"

    return {
      monthlyTaxable,
      annualTaxable,
      monthlyISR,
      rateLabel,
      totalDeductions: ss + se + monthlyISR
    }
  },
  [legalParams]
)

  /* ============================
     FILTER + MAP
  ============================ */

  const employeeData = useMemo(() => {
    if (!employees) return []

    return employees
      .filter(emp =>
        `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.cedula.includes(searchTerm)
      )
      .map(emp => ({
        ...emp,
        details: calculateISRDetails(emp.salary)
      }))
  }, [employees, searchTerm, calculateISRDetails])

  if (loadingEmployees || loadingLegal) {
    return (
      <div className={`flex items-center justify-center min-h-screen transition-colors ${
        isDarkMode ? 'bg-slate-900' : 'bg-gray-50'
      }`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  /* ============================
     RENDER
  ============================ */

  return (
    <div className={`transition-colors ${isDarkMode ? 'bg-slate-900' : ''}`}>
      <PagesHeader
        title={pageName}
        description="Impuesto sobre la Renta - Proyección Anual"
        onExport={() => {}}
      />

      {/* TARJETAS DINÁMICAS DESDE API */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {legalParams?.map(param => (
          <div
            key={param.id}
            className={`p-6 rounded-xl border transition-colors ${
              isDarkMode
                ? 'bg-slate-800 border-slate-700'
                : 'bg-white border-gray-200'
            }`}
          >
            <p className={`text-xs uppercase font-bold ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Tramo
            </p>
            <h3 className={`text-xl font-bold mt-1 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {param.description}
            </h3>
            <p
              className={`text-sm font-semibold ${
                param.rate === 0
                  ? "text-green-400"
                  : param.rate === 0.15
                  ? "text-blue-400"
                  : "text-orange-400"
              }`}
            >
              {param.label}
            </p>
          </div>
        ))}
      </div>

      {/* TABLE */}
      <div className={`rounded-xl border overflow-hidden transition-colors ${
        isDarkMode
          ? 'bg-slate-800 border-gray-700'
          : 'bg-white border-gray-200'
      }`}>
        <div className={`p-6 border-b flex flex-col md:flex-row justify-between gap-4 transition-colors ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="relative w-full md:w-96">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-400'
            }`} size={18} />
            <input
              type="text"
              placeholder="Buscar por nombre o cédula..."
              className={`w-full rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-colors ${
                isDarkMode
                  ? 'bg-slate-900 border border-slate-700 text-white'
                  : 'bg-gray-100 border border-gray-300 text-gray-900'
              }`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className={`flex items-center gap-2 text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            <Info size={16} className="text-blue-400" />
            Cálculo basado en parámetros legales
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className={`w-full text-left text-sm ${
            isDarkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            <thead className={`uppercase text-[10px] transition-colors ${
              isDarkMode
                ? 'bg-slate-800/50 text-gray-400'
                : 'bg-gray-100 text-gray-600'
            }`}>
              <tr>
                <th className="px-6 py-4">Empleado</th>
                <th className="px-6 py-4">Salario</th>
                <th className="px-6 py-4">Gravable</th>
                <th className="px-6 py-4 text-blue-400">ISR</th>
                <th className="px-6 py-4">Neto</th>
              </tr>
            </thead>
            <tbody className={`divide-y transition-colors ${
              isDarkMode ? 'divide-slate-800' : 'divide-gray-200'
            }`}>
              {employeeData.map(emp => (
                <tr key={emp.id} className={`transition-colors ${
                  isDarkMode
                    ? 'hover:bg-slate-700/30'
                    : 'hover:bg-gray-100'
                }`}>
                  <td className="px-6 py-4">
                    <div className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {emp.firstName} {emp.lastName}
                    </div>
                    <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                      {emp.cedula}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono">
                    ${emp.salary.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    ${emp.details.monthlyTaxable.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 font-bold text-blue-400">
                    ${emp.details.monthlyISR.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 font-bold text-green-400">
                    ${(emp.salary - emp.details.totalDeductions).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}