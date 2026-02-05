"use client"

import { useState, useCallback, useMemo } from "react"
import useSWR from "swr"
import { useCompany } from "../../../../context/routerContext"
import { useTheme } from "../../../../context/themeContext"
import {
  Gift,
  Calendar,
  Info,
  Download,
  AlertTriangle,
  UserCheck,
  Loader2,
} from "lucide-react"
import PagesHeader from "../../../../components/headers/pagesHeader"
import { usePageName } from "../../../../hook/usePageName"

/* =======================
   TIPOS
======================= */

type SalaryType = "MONTHLY" | "BIWEEKLY"

interface EmployeeBase {
  id: string
  firstName: string
  lastName: string
  cedula: string
  salary: number
  salaryType: SalaryType
}

interface LegalParameter {
  id: string
  key: string
  percentage: number
  category: string
  minRange: number | null
  maxRange: number | null
  status: string
}

interface EmployeeThirteenth extends EmployeeBase {
  monthlySalary: number
  calc: {
    grossThirteenth: number
    ss: number
    isr: number
    net: number
  }
}

interface ThirteenthTotals {
  gross: number
  ss: number
  net: number
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

/* =======================
   HELPERS
======================= */

function getMonthlySalary(salary: number, salaryType: SalaryType): number {
  return salaryType === "BIWEEKLY" ? salary * 2 : salary
}

/* =======================
   COMPONENTE
======================= */

export const AllDecimo: React.FC = () => {
  const { selectedCompany } = useCompany()
  const { isDarkMode } = useTheme()
  const { pageName } = usePageName()
  const [currentPartida, setCurrentPartida] = useState(1)

  /* ---------- DATA ---------- */

  const { data: employees, isLoading: loadingEmps } = useSWR<EmployeeBase[]>(
    selectedCompany
      ? `${import.meta.env.VITE_API_URL}/api/payroll/employees?companyId=${selectedCompany.id}`
      : null,
    fetcher
  )

  const { data: legalParams, isLoading: loadingParams } =
    useSWR<LegalParameter[]>(
      selectedCompany
        ? `${import.meta.env.VITE_API_URL}/api/system/legal-decimo-parameters?companyId=${selectedCompany.id}`
        : null,
      fetcher
    )

  const getParam = useCallback(
    (key: string) => legalParams?.find((p) => p.key === key && p.status === "active"),
    [legalParams]
  )

  /* ---------- PARTIDAS ---------- */

  const partidaInfo = useMemo(() => {
    const year = new Date().getFullYear()
    switch (currentPartida) {
      case 1:
        return { name: "Primera Partida", period: `16 Dic ${year - 1} - 15 Abr ${year}` }
      case 2:
        return { name: "Segunda Partida", period: `16 Abr ${year} - 15 Ago ${year}` }
      case 3:
        return { name: "Tercera Partida", period: `16 Ago ${year} - 15 Dic ${year}` }
      default:
        return { name: "", period: "" }
    }
  }, [currentPartida])

  /* ---------- ISR PROPORCIONAL ---------- */

  const calculateISRForDecimo = useCallback(
    (annualSalary: number, annualISR: number, decimoAmount: number) => {
      if (!legalParams) return 0

      const brackets = legalParams
        .filter((p) => p.category === "isr" && p.status === "active")
        .sort((a, b) => (a.minRange ?? 0) - (b.minRange ?? 0))

      const newAnnualIncome = annualSalary + decimoAmount
      let newAnnualISR = 0

      for (const b of brackets) {
        const min = b.minRange ?? 0
        const max = b.maxRange ?? Infinity
        const rate = b.percentage / 100

        if (newAnnualIncome > min) {
          const taxable = Math.min(newAnnualIncome, max) - min
          newAnnualISR += taxable * rate
        }
      }

      return Math.max(0, newAnnualISR - annualISR)
    },
    [legalParams]
  )

  /* ---------- DÉCIMO ---------- */

  const calculateThirteenth = useCallback(
    (totalPaidInPeriod: number, annualSalary: number, annualISR: number) => {
      const grossThirteenth = totalPaidInPeriod / 12
      const ssRate = getParam("ss_decimo")?.percentage ?? 7.25
      const ss = grossThirteenth * (ssRate / 100)
      const isr = calculateISRForDecimo(annualSalary, annualISR, grossThirteenth)

      return {
        grossThirteenth,
        ss,
        isr,
        net: grossThirteenth - ss - isr,
      }
    },
    [getParam, calculateISRForDecimo]
  )

  /* ---------- EMPLEADOS ---------- */

  const employeeData = useMemo<EmployeeThirteenth[]>(() => {
    if (!employees) return []

    return employees.map((emp) => {
      const monthlySalary = getMonthlySalary(emp.salary, emp.salaryType)
      const totalPaidInPeriod = monthlySalary * 4
      const annualSalary = monthlySalary * 13
      const annualISR = 0

      return {
        ...emp,
        monthlySalary,
        calc: calculateThirteenth(
          totalPaidInPeriod,
          annualSalary,
          annualISR
        ),
      }
    })
  }, [employees, calculateThirteenth])

  /* ---------- TOTALES ---------- */

  const totals = useMemo<ThirteenthTotals>(() => {
    return employeeData.reduce(
      (acc, curr) => ({
        gross: acc.gross + curr.calc.grossThirteenth,
        ss: acc.ss + curr.calc.ss,
        net: acc.net + curr.calc.net,
      }),
      { gross: 0, ss: 0, net: 0 }
    )
  }, [employeeData])

  /* ---------- LOADING ---------- */

  if (loadingEmps || loadingParams) {
    return (
      <div className={`flex items-center justify-center min-h-screen transition-colors ${
        isDarkMode ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-900'
      }`}>
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    )
  }

  return (
    <div className={`transition-colors ${isDarkMode ? 'bg-slate-900 text-white' : 'text-gray-900'}`}>
      <PagesHeader 
        title={`${pageName} - Décimo Tercer Mes`} 
        description="Cálculo dinámico basado en parámetros legales de la base de datos" 
        onExport={() => { }} 
      />

      {/* Selector de Partida */}
      <div className="flex gap-4 mb-8">
        {[1, 2, 3].map((num) => (
          <button
            key={num}
            onClick={() => setCurrentPartida(num)}
            className={`flex-1 p-4 rounded-xl border transition-all ${
              currentPartida === num
                ? 'bg-blue-600 border-blue-400 shadow-lg shadow-blue-900/20'
                : isDarkMode
                ? 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                : 'bg-white border-gray-300 hover:bg-gray-100'
            }`}
          >
            <div className={`text-xs uppercase font-bold opacity-70 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>
              Partida {num}
            </div>
            <div className={`text-lg font-bold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {num === 1 ? 'Abril' : num === 2 ? 'Agosto' : 'Diciembre'}
            </div>
          </button>
        ))}
      </div>

      {/* Resumen de la Partida */}
      <div className={`p-6 rounded-2xl border mb-8 flex flex-col md:flex-row justify-between items-center gap-6 transition-colors ${
        isDarkMode
          ? 'bg-gradient-to-r from-blue-900/40 to-slate-800 border-blue-500/30'
          : 'bg-gradient-to-r from-blue-100 to-gray-100 border-blue-300'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`p-4 rounded-full transition-colors ${
            isDarkMode
              ? 'bg-blue-500/20'
              : 'bg-blue-200'
          }`}>
            <Gift className="text-blue-400" size={32} />
          </div>
          <div>
            <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {partidaInfo.name} - {new Date().getFullYear()}
            </h3>
            <p className={`text-sm flex items-center gap-2 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              <Calendar size={14} /> Periodo: {partidaInfo.period}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8">
          <div className="text-center">
            <p className={`text-xs uppercase mb-1 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Total Bruto
            </p>
            <p className={`text-2xl font-bold font-mono ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              ${totals.gross.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-center">
            <p className={`text-xs uppercase mb-1 ${
              isDarkMode ? 'text-green-400' : 'text-green-600'
            }`}>
              Total Neto a Pagar
            </p>
            <p className={`text-2xl font-bold font-mono ${
              isDarkMode ? 'text-green-400' : 'text-green-600'
            }`}>
              ${totals.net.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Tabla de Empleados */}
      <div className={`rounded-xl border overflow-hidden shadow-2xl transition-colors ${
        isDarkMode
          ? 'bg-slate-800 border-gray-700'
          : 'bg-white border-gray-200'
      }`}>
        <div className={`p-4 border-b flex justify-between items-center transition-colors ${
          isDarkMode
            ? 'bg-slate-800/50 border-gray-700'
            : 'bg-gray-100 border-gray-200'
        }`}>
          <h4 className={`font-bold text-sm uppercase tracking-widest ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Detalle de Colaboradores
          </h4>
          <button className="flex items-center gap-2 text-xs bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors font-bold text-white">
            <Download size={14} /> Exportar Planilla
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className={`w-full text-sm text-left transition-colors ${
            isDarkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            <thead className={`uppercase text-[10px] font-bold transition-colors ${
              isDarkMode
                ? 'bg-slate-900/50 text-gray-500'
                : 'bg-gray-100 text-gray-600'
            }`}>
              <tr>
                <th className="px-6 py-4">Empleado</th>
                <th className="px-6 py-4">Salario Base (Mensual)</th>
                <th className="px-6 py-4">Monto Bruto</th>
                <th className="px-6 py-4 text-red-400">S.S. ({getParam('ss_decimo')?.percentage || '7.25'}%)</th>
                <th className="px-6 py-4 text-blue-400">ISR</th>
                <th className="px-6 py-4 text-green-400 font-bold">Monto Neto</th>
              </tr>
            </thead>
            <tbody className={`divide-y transition-colors ${
              isDarkMode ? 'divide-slate-800' : 'divide-gray-200'
            }`}>
              {employeeData.map((emp) => (
                <tr 
                  key={emp.id} 
                  className={`transition-colors ${
                    isDarkMode
                      ? 'hover:bg-slate-700/20'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <td className="px-6 py-4 flex items-center gap-3">
                    <UserCheck className="text-blue-500/50" size={16} />
                    <div>
                      <div className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-gray-900'}`}>
                        {emp.firstName} {emp.lastName}
                      </div>
                      <div className={`text-[10px] ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        {emp.cedula}
                      </div>
                    </div>
                  </td>
                  <td className={`px-6 py-4 font-mono ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    ${emp.monthlySalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </td>
                  <td className={`px-6 py-4 font-semibold ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                    ${emp.calc.grossThirteenth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-red-400/80 font-mono">
                    -${emp.calc.ss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </td>
                  <td className="px-6 py-4 text-blue-400/80 font-mono">
                    -${emp.calc.isr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 font-bold text-green-400 font-mono text-lg">
                    ${emp.calc.net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reglas de Negocio dinámicas desde API */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`p-4 rounded-lg border transition-colors ${
          isDarkMode
            ? 'bg-slate-800/40 border-slate-700'
            : 'bg-yellow-50 border-yellow-300'
        }`}>
          <div className={`flex items-center gap-2 mb-2 ${
            isDarkMode ? 'text-yellow-500' : 'text-yellow-600'
          }`}>
            <AlertTriangle size={16} />
            <h5 className="text-xs font-bold uppercase">Seguro Social</h5>
          </div>
          <p className={`text-[11px] ${isDarkMode ? 'text-gray-400' : 'text-gray-700'}`}>
            Tasa actual: <strong>{getParam('ss_decimo')?.percentage || 7.25}%</strong>. 
            Este porcentaje se aplica sobre el bruto del décimo según configuración de la base de datos.
          </p>
        </div>
        <div className={`p-4 rounded-lg border transition-colors ${
          isDarkMode
            ? 'bg-slate-800/40 border-slate-700'
            : 'bg-blue-50 border-blue-300'
        }`}>
          <div className={`flex items-center gap-2 mb-2 ${
            isDarkMode ? 'text-blue-500' : 'text-blue-600'
          }`}>
            <Info size={16} />
            <h5 className="text-xs font-bold uppercase">Seguro Educativo</h5>
          </div>
          <p className={`text-[11px] ${isDarkMode ? 'text-gray-400' : 'text-gray-700'}`}>
            El Seguro Educativo para el décimo es <strong>{getParam('se_decimo')?.percentage || 0}%</strong>. 
            Por ley, el décimo tercer mes está exento de este descuento.
          </p>
        </div>
        <div className={`p-4 rounded-lg border transition-colors ${
          isDarkMode
            ? 'bg-slate-800/40 border-slate-700'
            : 'bg-green-50 border-green-300'
        }`}>
          <div className={`flex items-center gap-2 mb-2 ${
            isDarkMode ? 'text-green-500' : 'text-green-600'
          }`}>
            <Gift size={16} />
            <h5 className="text-xs font-bold uppercase">Base de Cálculo</h5>
          </div>
          <p className={`text-[11px] ${isDarkMode ? 'text-gray-400' : 'text-gray-700'}`}>
            Fórmula: (Sumatoria de salarios del periodo / 12). Se consideran los últimos 4 meses de ingresos brutos.
          </p>
        </div>
      </div>
    </div>
  )
}