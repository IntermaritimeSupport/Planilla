"use client"

import { useState, useCallback, useMemo } from "react"
import useSWR from "swr"
import { useCompany } from "../../../../context/routerContext"
import { useTheme } from "../../../../context/themeContext"
import { Users, AlertCircle, X, Loader2, Info } from "lucide-react"
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

/* ============================
   FETCHER
============================ */

const fetcher = (url: string) => fetch(url).then(res => res.json())

export const AllSipe: React.FC = () => {
  const { selectedCompany } = useCompany()
  const { isDarkMode } = useTheme()
  const { pageName } = usePageName()

  const [selectedMonth] = useState(
    new Date().toISOString().split("T")[0].substring(0, 7)
  )

  const [isModalOpen, setIsModalOpen] = useState(false)

  /* ============================
     DATA
  ============================ */

  const { data: employees, isLoading: loadingEmps, error: empError } = useSWR<Employee[]>(
    selectedCompany
      ? `${import.meta.env.VITE_API_URL}/api/payroll/employees?companyId=${selectedCompany.id}`
      : null,
    fetcher
  )

  const { data: legalParams, isLoading: loadingParams, error: paramsError } = useSWR<LegalParameter[]>(
    selectedCompany
      ? `${import.meta.env.VITE_API_URL}/api/system/legal-parameters?companyId=${selectedCompany.id}`
      : null,
    fetcher
  )

  /* ============================
     PARAMS MAP (OPTIMIZADO)
  ============================ */

  const paramsMap = useMemo(() => {
    if (!legalParams) return {}
    return Object.fromEntries(
      legalParams
        .filter(p => p.status === "active")
        .map(p => [p.key, p])
    ) as Record<string, LegalParameter>
  }, [legalParams])

  const getParam = (key: string) => paramsMap[key]

  /* ============================
     PERIODO DE PLANILLA
  ============================ */

  const payrollPeriod = useMemo(() => {
    const date = new Date(selectedMonth + "-15")
    date.setMonth(date.getMonth() - 1)

    return {
      monthName: date.toLocaleDateString("es-PA", { month: "long" }),
      year: date.getFullYear(),
      isApr: date.getMonth() === 3,
      isAug: date.getMonth() === 7,
      isDec: date.getMonth() === 11,
    }
  }, [selectedMonth])

  const dueDate = `${selectedMonth}-15`

  /* ============================
     ISR ANUAL (LEGAL)
  ============================ */

  const calculateISR = useCallback(
    (monthlyTaxable: number) => {
      if (!legalParams) return 0

      const annualTaxable = monthlyTaxable * 13

      const isrRates = legalParams
        .filter(p => p.category === "isr" && p.status === "active")
        .sort((a, b) => Number(a.minRange) - Number(b.minRange))

      let annualISR = 0

      for (const rate of isrRates) {
        const min = Number(rate.minRange) || 0
        const max = rate.maxRange ? Number(rate.maxRange) : Infinity
        const percent = Number(rate.percentage) / 100

        if (annualTaxable > min) {
          const taxable = Math.min(annualTaxable, max) - min
          annualISR += taxable * percent
        }
      }

      return annualISR / 13
    },
    [legalParams]
  )

  /* ============================
     CÁLCULO POR EMPLEADO
  ============================ */

  const calculateSipeForEmployee = useCallback(
    (emp: Employee): SipeEmployeeCalc => {
      const gross = Number(emp.salary) || 0

      const ssEmpRate = Number(getParam("ss_empleado")?.percentage ?? 9.75)
      const ssPatRate = Number(getParam("ss_patrono")?.percentage ?? 12.25)
      const seEmpRate = Number(getParam("se_empleado")?.percentage ?? 1.25)
      const sePatRate = Number(getParam("se_patrono")?.percentage ?? 1.5)
      const riesgoRate = Number(getParam("riesgo_profesional")?.percentage ?? 0.98)

      const ssEmp = gross * (ssEmpRate / 100)
      const ssPat = gross * (ssPatRate / 100)
      const eduEmp = gross * (seEmpRate / 100)
      const eduPat = gross * (sePatRate / 100)
      const riesgo = gross * (riesgoRate / 100)

      const baseISR = gross - ssEmp - eduEmp
      const isr = calculateISR(baseISR)

      let decCSS = 0
      if (payrollPeriod.isApr || payrollPeriod.isAug || payrollPeriod.isDec) {
        const decRate = Number(getParam("decimo_css")?.percentage ?? 7.25)
        decCSS = ((gross * 3) / 12) * (decRate / 100)
      }

      return {
        ...emp,
        gross,
        ssEmp,
        ssPat,
        eduEmp,
        eduPat,
        riesgo,
        isr,
        decCSS,
        totalSipe: ssEmp + ssPat + eduEmp + eduPat + riesgo + decCSS,
      }
    },
    [calculateISR, getParam, payrollPeriod]
  )

const employeeCalculations = useMemo<SipeEmployeeCalc[]>(() => {
  if (!employees || !legalParams) return []
  return employees.map(calculateSipeForEmployee)
}, [employees, legalParams, calculateSipeForEmployee])

  const totals = useMemo(() => {
    return employeeCalculations.reduce(
      (acc, c) => ({
        ssEmp: acc.ssEmp + c.ssEmp,
        ssPat: acc.ssPat + c.ssPat,
        eduEmp: acc.eduEmp + c.eduEmp,
        eduPat: acc.eduPat + c.eduPat,
        riesgo: acc.riesgo + c.riesgo,
        isr: acc.isr + c.isr,
        decCSS: acc.decCSS + c.decCSS,
        total: acc.total + c.totalSipe,
      }),
      { ssEmp: 0, ssPat: 0, eduEmp: 0, eduPat: 0, riesgo: 0, isr: 0, decCSS: 0, total: 0 }
    )
  }, [employeeCalculations])

  const format = (n: number) =>
    `USD ${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`

  /* ============================
     LOADING / ERROR
  ============================ */

  if (loadingEmps || loadingParams) {
    return (
      <div className={`flex items-center justify-center min-h-screen transition-colors ${
        isDarkMode ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-900'
      }`}>
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    )
  }

  if (empError || paramsError) {
    return (
      <div className={`flex items-center justify-center min-h-screen transition-colors ${
        isDarkMode ? 'bg-slate-900 text-red-400' : 'bg-gray-50 text-red-600'
      }`}>
        <AlertCircle />
        Error cargando datos
      </div>
    )
  }


  return (
    <div className={`transition-colors ${isDarkMode ? 'bg-slate-900' : ''}`}>
      <PagesHeader title={pageName} description={`Empresa: ${selectedCompany?.name}`} onExport={() => {}} />

      {/* Banner de Pago del Mes Anterior */}
      <div className={`border-l-4 border-green-500 p-6 rounded-lg mb-8 flex justify-between items-center shadow-2xl transition-colors ${
        isDarkMode 
          ? 'bg-slate-800' 
          : 'bg-white border border-gray-200'
      }`}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h4 className={`font-bold uppercase text-sm ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
              Pago del Mes Anterior - {payrollPeriod.monthName} {payrollPeriod.year}
            </h4>
            <div className="group relative">
                <Info size={14} className={`cursor-help ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                <div className={`absolute bottom-full left-0 mb-2 w-64 p-2 rounded hidden group-hover:block z-50 text-[10px] ${
                  isDarkMode 
                    ? 'bg-black text-gray-200' 
                    : 'bg-gray-900 text-gray-100'
                }`}>
                    Tasas aplicadas desde base de datos: 
                    SS Emp: {getParam('ss_empleado')?.percentage}% | 
                    SS Pat: {getParam('ss_patrono')?.percentage}% |
                    Riesgo: {getParam('riesgo_profesional')?.percentage}%
                </div>
            </div>
          </div>
          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Este es el pago que debe realizar este mes (antes del 15 de {new Date(selectedMonth + "-15").toLocaleDateString("es-PA", { month: 'long' })})
          </p>
          <h2 className={`text-4xl font-bold mt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {format(totals.total)}
          </h2>
        </div>
        <div className="text-right">
          <p className={`text-xs italic ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Fecha Límite</p>
          <p className={`font-mono font-bold text-2xl ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>
            {dueDate}
          </p>
          <button className={`px-6 py-2 rounded-lg mt-3 text-sm font-bold transition-all transform hover:scale-105 ${
            isDarkMode
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}>
            Guardar en Historial
          </button>
        </div>
      </div>

      {/* Tabla de Reporte General */}
      <div className={`rounded-xl border overflow-hidden shadow-xl transition-colors ${
        isDarkMode
          ? 'bg-slate-800 border-gray-700'
          : 'bg-white border-gray-200'
      }`}>
        <table className={`w-full text-xs text-left ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          <thead className={`uppercase transition-colors ${
            isDarkMode
              ? 'bg-slate-700 text-gray-300'
              : 'bg-gray-200 text-gray-700'
          }`}>
            <tr>
              <th className="p-4">Periodo</th>
              <th className="p-4">CSS Emp ({getParam('ss_empleado')?.percentage || '9.75'}%)</th>
              <th className="p-4">CSS Pat ({getParam('ss_patrono')?.percentage || '12.25'}%)</th>
              <th className="p-4">Seg. Educ. Emp.</th>
              <th className="p-4">Seg. Educ. Patr.</th>
              <th className="p-4">Riesgo ({getParam('riesgo_profesional')?.percentage || '0.98'}%)</th>
              <th className="p-4">ISR</th>
              {totals.decCSS > 0 && <th className="p-4 text-yellow-400">Décimo CSS</th>}
              <th className="p-4 text-green-400">Total SIPE</th>
              <th className="p-4">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr className={`border transition-colors ${
              isDarkMode
                ? 'border-gray-700 hover:bg-slate-700/50'
                : 'border-gray-200 hover:bg-gray-100'
            }`}>
              <td className={`p-4 font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {payrollPeriod.year}-{selectedMonth.split("-")[1]} 
                <span className="bg-red-500/20 text-red-500 px-2 py-0.5 rounded ml-2 text-[10px]">VENCIDO</span>
              </td>
              <td className="p-4">{format(totals.ssEmp)}</td>
              <td className="p-4">{format(totals.ssPat)}</td>
              <td className="p-4">{format(totals.eduEmp)}</td>
              <td className="p-4">{format(totals.eduPat)}</td>
              <td className="p-4">{format(totals.riesgo)}</td>
              <td className="p-4 text-blue-400">{format(totals.isr)}</td>
              {totals.decCSS > 0 && <td className="p-4 text-yellow-500 font-bold">{format(totals.decCSS)}</td>}
              <td className="p-4 font-bold text-green-400 text-lg">{format(totals.total)}</td>
              <td className="p-4">
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className={`p-2 rounded-lg transition-all ${
                    isDarkMode
                      ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white'
                      : 'bg-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white'
                  }`}
                  title="Ver desglose individual"
                >
                  <Users size={18} />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* MODAL DE DESGLOSE POR USUARIO */}
      {isModalOpen && (
        <div className={`fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4 ${
          isDarkMode ? 'bg-black/80' : 'bg-black/50'
        }`}>
          <div className={`w-full max-w-6xl max-h-[90vh] rounded-2xl border flex flex-col shadow-2xl transition-colors ${
            isDarkMode
              ? 'bg-slate-800 border-gray-700'
              : 'bg-white border-gray-200'
          }`}>
            <div className={`p-6 border-b flex justify-between items-center transition-colors ${
              isDarkMode
                ? 'border-gray-700'
                : 'border-gray-200'
            }`}>
              <div>
                <h3 className={`text-xl font-bold flex items-center gap-2 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                    <Users className="text-blue-400" /> Desglose Individual de Planilla
                </h3>
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Periodo: {payrollPeriod.monthName} {payrollPeriod.year}
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className={`p-2 rounded-full transition-colors ${
                  isDarkMode
                    ? 'text-gray-400 hover:text-white bg-gray-800'
                    : 'text-gray-600 hover:text-gray-900 bg-gray-100'
                }`}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="overflow-auto p-6">
              <table className={`w-full text-xs text-left ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <thead>
                  <tr className={`uppercase border-b transition-colors ${
                    isDarkMode
                      ? 'text-gray-400 border-gray-700'
                      : 'text-gray-600 border-gray-200'
                  }`}>
                    <th className="pb-3 px-2">Colaborador</th>
                    <th className="pb-3 px-2">Salario Bruto</th>
                    <th className="pb-3 px-2">SS Emp ({getParam('ss_empleado')?.percentage}%)</th>
                    <th className="pb-3 px-2">SS Pat ({getParam('ss_patrono')?.percentage}%)</th>
                    <th className="pb-3 px-2">Educ. Emp</th>
                    <th className="pb-3 px-2">Educ. Pat</th>
                    <th className="pb-3 px-2">Riesgo</th>
                    <th className="pb-3 px-2">ISR</th>
                    <th className="pb-3 px-2 text-green-400">Total SIPE</th>
                  </tr>
                </thead>
                <tbody className={`divide-y transition-colors ${
                  isDarkMode ? 'divide-gray-800' : 'divide-gray-200'
                }`}>
                  {employeeCalculations.map((calc) => (
                    <tr key={calc.id} className={`transition-colors ${
                      isDarkMode
                        ? 'hover:bg-slate-700/40'
                        : 'hover:bg-gray-100'
                    }`}>
                      <td className="py-4 px-2">
                        <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {calc.firstName} {calc.lastName}
                        </div>
                        <div className={`text-[10px] ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                          {calc.cedula}
                        </div>
                      </td>
                      <td className="py-4 px-2 font-mono">{format(calc.gross)}</td>
                      <td className="py-4 px-2 text-red-300 font-mono">{format(calc.ssEmp)}</td>
                      <td className={`py-4 px-2 font-mono ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {format(calc.ssPat)}
                      </td>
                      <td className="py-4 px-2 text-red-300 font-mono">{format(calc.eduEmp)}</td>
                      <td className={`py-4 px-2 font-mono ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {format(calc.eduPat)}
                      </td>
                      <td className={`py-4 px-2 font-mono ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {format(calc.riesgo)}
                      </td>
                      <td className="py-4 px-2 text-blue-300 font-mono">{format(calc.isr)}</td>
                      <td className="py-4 px-2 font-bold text-green-400 font-mono">{format(calc.totalSipe)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={`p-6 border-t flex justify-between items-center rounded-b-2xl transition-colors ${
              isDarkMode
                ? 'border-gray-700 bg-slate-900/50'
                : 'border-gray-200 bg-gray-100/50'
            }`}>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Mostrando {employeeCalculations.length} empleados registrados
                </p>
                <div>
                    <span className={`mr-4 uppercase text-xs font-bold ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Total Acumulado:
                    </span>
                    <span className="text-2xl font-bold text-green-400 font-mono">{format(totals.total)}</span>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Alerta de Advertencia */}
      <div className={`mt-8 p-4 rounded-lg flex items-start gap-4 shadow-lg animate-pulse border transition-colors ${
        isDarkMode
          ? 'bg-red-900/20 border-red-500/50'
          : 'bg-red-100/50 border-red-400'
      }`}>
        <AlertCircle className={isDarkMode ? 'text-red-500' : 'text-red-600'} />
        <div>
          <h5 className={`font-bold text-sm ${isDarkMode ? 'text-red-400' : 'text-red-700'}`}>
            ¡Advertencia! Pagos Vencidos Detectados
          </h5>
          <p className={`text-xs mt-1 ${isDarkMode ? 'text-red-200/70' : 'text-red-700/70'}`}>
            Tiene uno o más pagos SIPE vencidos según el calendario de la CSS. 
            Por favor, realice el pago a la brevedad para evitar recargos e intereses moratorios del 10% mensual.
          </p>
        </div>
      </div>
    </div>
  )
}