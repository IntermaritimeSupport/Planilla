"use client"

import { useState, useCallback, useMemo } from "react"
import useSWR from "swr"
import { useCompany } from "../../../../context/routerContext"
import { Info, Search, } from "lucide-react"
import PagesHeader from "../../../../components/headers/pagesHeader"
import { usePageName } from "../../../../hook/usePageName"

// 1. Interfaz base de la API
interface EmployeeBase {
  id: string;
  firstName: string;
  lastName: string;
  cedula: string;
  salary: number;
}

// 2. Interfaz extendida para el renderizado (incluye los cálculos)
interface EmployeeWithISR extends EmployeeBase {
  details: {
    monthlyTaxable: number;
    annualTaxable: number;
    monthlyISR: number;
    rateLabel: string;
    totalDeductions: number;
  };
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export const AllISR: React.FC = () => {
  const { selectedCompany } = useCompany()
  const { pageName } = usePageName()
  const [searchTerm, setSearchTerm] = useState("")

  const { data: employees, isLoading } = useSWR<EmployeeBase[]>(
    selectedCompany ? `${import.meta.env.VITE_API_URL}/api/payroll/employees?companyId=${selectedCompany.id}` : null,
    fetcher
  )

  const calculateISRDetails = useCallback((salary: number) => {
    const gross = Number(salary) || 0
    const ss = gross * 0.0975
    const se = gross * 0.0125
    const monthlyTaxable = gross - ss - se
    const annualTaxable = monthlyTaxable * 13 

    let annualISR = 0
    let rateLabel = "0%"

    if (annualTaxable <= 11000) {
      annualISR = 0
      rateLabel = "Exento"
    } else if (annualTaxable <= 50000) {
      annualISR = (annualTaxable - 11000) * 0.15
      rateLabel = "15%"
    } else {
      annualISR = 5850 + (annualTaxable - 50000) * 0.25
      rateLabel = "25%"
    }

    const monthlyISR = annualISR / 13
    return {
      monthlyTaxable,
      annualTaxable,
      monthlyISR,
      rateLabel,
      totalDeductions: ss + se + monthlyISR
    }
  }, [])

  // 3. Corregimos el tipado de los parámetros en filter y map
  const employeeData = useMemo(() => {
    if (!employees) return []
    return employees
      .filter((emp: EmployeeBase) => 
        `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.cedula.includes(searchTerm)
      )
      .map((emp: EmployeeBase): EmployeeWithISR => ({
        ...emp,
        details: calculateISRDetails(emp.salary)
      }))
  }, [employees, searchTerm, calculateISRDetails])

  if (isLoading) return <div className="flex items-center justify-center min-h-screen bg-[#0f172a]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div>

  return (
    <div className="bg-[#0f172a] text-white min-h-screen p-8">
      <PagesHeader title={pageName} description="Impuesto sobre la Renta - Proyección Anual" onExport={() => {}} />

      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <p className="text-gray-400 text-xs uppercase font-bold">Tramo 1</p>
          <h3 className="text-xl font-bold mt-1">Hasta $11,000.00</h3>
          <p className="text-green-400 text-sm font-semibold">Exento de Impuestos</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <p className="text-gray-400 text-xs uppercase font-bold">Tramo 2</p>
          <h3 className="text-xl font-bold mt-1">$11,001 a $50,000</h3>
          <p className="text-blue-400 text-sm font-semibold">15% sobre el excedente</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <p className="text-gray-400 text-xs uppercase font-bold">Tramo 3</p>
          <h3 className="text-xl font-bold mt-1">Más de $50,000</h3>
          <p className="text-orange-400 text-sm font-semibold">25% sobre el excedente</p>
        </div>
      </div>

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
            Cálculo basado en 13 salarios anuales
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/50 text-gray-400 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-6 py-4">Empleado</th>
                <th className="px-6 py-4">Salario Mensual</th>
                <th className="px-6 py-4">Renta Gravable Mensual</th>
                <th className="px-6 py-4 text-blue-400">ISR Mensual</th>
                <th className="px-6 py-4">Neto Estimado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {/* Usamos el tipo extendido para el map del render */}
              {employeeData.map((emp: EmployeeWithISR) => (
                <tr key={emp.id} className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold">{emp.firstName} {emp.lastName}</div>
                    <div className="text-xs text-gray-500">{emp.cedula}</div>
                  </td>
                  <td className="px-6 py-4 font-mono">${emp.salary.toLocaleString()}</td>
                  <td className="px-6 py-4 text-gray-300">
                    ${emp.details.monthlyTaxable.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 font-bold text-blue-400">
                    ${emp.details.monthlyISR.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 font-bold text-green-400">
                    ${(emp.salary - emp.details.totalDeductions).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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