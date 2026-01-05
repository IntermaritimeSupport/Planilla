"use client"

import { useState, useCallback, useMemo } from "react"
import useSWR from "swr"
import { useCompany } from "../../../../context/routerContext"
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

  /* ============================
     CALC ISR (DINÁMICO)
  ============================ */

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
      const annualTaxable = monthlyTaxable * 13

      const tramo = legalParams.find(p =>
        annualTaxable >= p.min &&
        (p.max === null || annualTaxable <= p.max)
      )

      let annualISR = 0
      let rateLabel = "Exento"

      if (tramo && tramo.rate > 0) {
        annualISR = annualTaxable * tramo.rate
        rateLabel = tramo.label
      }

      const monthlyISR = annualISR / 13

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
      <div className="flex items-center justify-center min-h-screen bg-[#0f172a]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  /* ============================
     RENDER
  ============================ */

  return (
    <div className="bg-[#0f172a] text-white">
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
            className="bg-slate-800 p-6 rounded-xl border border-slate-700"
          >
            <p className="text-gray-400 text-xs uppercase font-bold">
              Tramo
            </p>
            <h3 className="text-xl font-bold mt-1">
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
      <div className="bg-[#1e293b] rounded-xl border border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-700 flex flex-col md:flex-row justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="text"
              placeholder="Buscar por nombre o cédula..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Info size={16} className="text-blue-400" />
            Cálculo basado en parámetros legales
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/50 text-gray-400 uppercase text-[10px]">
              <tr>
                <th className="px-6 py-4">Empleado</th>
                <th className="px-6 py-4">Salario</th>
                <th className="px-6 py-4">Gravable</th>
                <th className="px-6 py-4 text-blue-400">ISR</th>
                <th className="px-6 py-4">Neto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {employeeData.map(emp => (
                <tr key={emp.id} className="hover:bg-slate-700/30">
                  <td className="px-6 py-4">
                    <div className="font-bold">
                      {emp.firstName} {emp.lastName}
                    </div>
                    <div className="text-xs text-gray-500">
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
