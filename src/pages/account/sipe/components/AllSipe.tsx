"use client"

import { useState, useCallback, useMemo } from "react"
import useSWR from "swr"
import { useCompany } from "../../../../context/routerContext"
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
      <div className="flex items-center justify-center min-h-screen bg-[#0f172a] text-white">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    )
  }

  if (empError || paramsError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0f172a] text-red-400">
        <AlertCircle />
        Error cargando datos
      </div>
    )
  }


  return (
    <div className="bg-[#0f172a] text-white">
      <PagesHeader title={pageName} description={`Empresa: ${selectedCompany?.name}`} onExport={() => {}} />

      {/* Banner de Pago del Mes Anterior */}
      <div className="bg-[#1e293b] border-l-4 border-green-500 p-6 rounded-lg mb-8 flex justify-between items-center shadow-2xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-green-400 font-bold uppercase text-sm">Pago del Mes Anterior - {payrollPeriod.monthName} {payrollPeriod.year}</h4>
            <div className="group relative">
                <Info size={14} className="text-gray-500 cursor-help" />
                <div className="absolute bottom-full left-0 mb-2 w-64 p-2 bg-black text-[10px] rounded hidden group-hover:block z-50">
                    Tasas aplicadas desde base de datos: 
                    SS Emp: {getParam('ss_empleado')?.percentage}% | 
                    SS Pat: {getParam('ss_patrono')?.percentage}% |
                    Riesgo: {getParam('riesgo_profesional')?.percentage}%
                </div>
            </div>
          </div>
          <p className="text-gray-400 text-xs">Este es el pago que debe realizar este mes (antes del 15 de {new Date(selectedMonth + "-15").toLocaleDateString("es-PA", { month: 'long' })})</p>
          <h2 className="text-4xl font-bold mt-2 text-white">{format(totals.total)}</h2>
        </div>
        <div className="text-right">
          <p className="text-gray-400 text-xs italic">Fecha Límite</p>
          <p className="font-mono font-bold text-2xl text-orange-400">{dueDate}</p>
          <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg mt-3 text-sm font-bold transition-all transform hover:scale-105">
            Guardar en Historial
          </button>
        </div>
      </div>

      {/* Tabla de Reporte General */}
      <div className="bg-[#1e293b] rounded-xl border border-gray-700 overflow-hidden shadow-xl">
        <table className="w-full text-xs text-left">
          <thead className="bg-[#334155] text-gray-300 uppercase">
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
            <tr className="border-b border-gray-700 hover:bg-slate-700/50 transition-colors">
              <td className="p-4 font-bold">
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
                  className="bg-blue-600/20 text-blue-400 p-2 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e293b] w-full max-w-6xl max-h-[90vh] rounded-2xl border border-gray-700 flex flex-col shadow-2xl">
            <div className="p-6 border-b border-gray-700 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                    <Users className="text-blue-400" /> Desglose Individual de Planilla
                </h3>
                <p className="text-gray-400 text-xs mt-1">Periodo: {payrollPeriod.monthName} {payrollPeriod.year}</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-gray-400 hover:text-white bg-gray-800 p-2 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="overflow-auto p-6">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700 uppercase">
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
                <tbody className="divide-y divide-gray-800">
                  {employeeCalculations.map((calc) => (
                    <tr key={calc.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-4 px-2">
                        <div className="font-medium text-white">{calc.firstName} {calc.lastName}</div>
                        <div className="text-[10px] text-gray-500">{calc.cedula}</div>
                      </td>
                      <td className="py-4 px-2 font-mono">{format(calc.gross)}</td>
                      <td className="py-4 px-2 text-red-300 font-mono">{format(calc.ssEmp)}</td>
                      <td className="py-4 px-2 text-gray-300 font-mono">{format(calc.ssPat)}</td>
                      <td className="py-4 px-2 text-red-300 font-mono">{format(calc.eduEmp)}</td>
                      <td className="py-4 px-2 text-gray-300 font-mono">{format(calc.eduPat)}</td>
                      <td className="py-4 px-2 text-gray-300 font-mono">{format(calc.riesgo)}</td>
                      <td className="py-4 px-2 text-blue-300 font-mono">{format(calc.isr)}</td>
                      <td className="py-4 px-2 font-bold text-green-400 font-mono">{format(calc.totalSipe)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-6 border-t border-gray-700 flex justify-between items-center bg-slate-900/50 rounded-b-2xl">
                <p className="text-gray-400 text-sm">Mostrando {employeeCalculations.length} empleados registrados</p>
                <div>
                    <span className="text-gray-400 mr-4 uppercase text-xs font-bold">Total Acumulado:</span>
                    <span className="text-2xl font-bold text-green-400 font-mono">{format(totals.total)}</span>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Alerta de Advertencia */}
      <div className="mt-8 bg-red-900/20 border border-red-500/50 p-4 rounded-lg flex items-start gap-4 shadow-lg animate-pulse">
        <AlertCircle className="text-red-500 flex-shrink-0" />
        <div>
          <h5 className="text-red-400 font-bold text-sm">¡Advertencia! Pagos Vencidos Detectados</h5>
          <p className="text-red-200/70 text-xs mt-1">
            Tiene uno o más pagos SIPE vencidos según el calendario de la CSS. 
            Por favor, realice el pago a la brevedad para evitar recargos e intereses moratorios del 10% mensual.
          </p>
        </div>
      </div>
    </div>
  )
}