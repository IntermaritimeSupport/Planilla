"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import useSWR from "swr"
import { useCompany } from "../../../../context/routerContext"
import { Users, AlertCircle, X } from "lucide-react"
import PagesHeader from "../../../../components/headers/pagesHeader"
import { usePageName } from "../../../../hook/usePageName"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export const AllSipe: React.FC = () => {
  const { selectedCompany } = useCompany()
  const { pageName } = usePageName()

  // --- ESTADOS ---
  const [selectedMonth, ] = useState(new Date().toISOString().split("T")[0].substring(0, 7))
  const [employeeCalculations, setEmployeeCalculations] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)

  // --- FETCH DATA ---
  const { data: employees, } = useSWR(
    selectedCompany ? `${import.meta.env.VITE_API_URL}/api/payroll/employees?companyId=${selectedCompany.id}` : null,
    fetcher
  )

  // --- LÓGICA DE FECHAS SIPE ---
  // Si estamos en Diciembre, el periodo de planilla es Noviembre.
  const payrollPeriod = useMemo(() => {
    const date = new Date(selectedMonth + "-15");
    date.setMonth(date.getMonth() - 1);
    return {
      monthName: date.toLocaleDateString("es-PA", { month: "long" }),
      year: date.getFullYear(),
      isDec: date.getMonth() === 11,
      isApr: date.getMonth() === 3,
      isAug: date.getMonth() === 7
    };
  }, [selectedMonth]);

  const dueDate = `${selectedMonth}-15`;

  // --- CÁLCULOS LEGALES (SEGÚN TU INFO) ---
  const calculateSipeForEmployee = useCallback((emp: any) => {
    const gross = Number(emp.salary) || 0;
    
    // Tasas Proporcionadas
    const ssEmp = gross * 0.0975;      // 9.75%
    const ssPat = gross * 0.1325;      // 13.25% (Ajustado)
    const eduEmp = gross * 0.0125;     // 1.25%
    const eduPat = gross * 0.0150;     // 1.50%
    const riesgo = gross * 0.0098;     // 0.98%
    
    // ISR (Simulado sobre base gravable)
    const baseISR = gross - ssEmp - eduEmp;
    const isr = baseISR > 916.66 ? (baseISR - 916.66) * 0.15 : 0; 

    // Décimo (Solo Abril, Agosto, Diciembre)
    let decCSS = 0;
    if (payrollPeriod.isApr || payrollPeriod.isAug || payrollPeriod.isDec) {
        decCSS = (gross / 12) * 0.0725;
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
      totalSipe: ssEmp + ssPat + eduEmp + eduPat + riesgo + isr + decCSS
    };
  }, [payrollPeriod]);

  useEffect(() => {
    if (employees) {
      setEmployeeCalculations(employees.map(calculateSipeForEmployee));
    }
  }, [employees, calculateSipeForEmployee]);

  // Totales de la Tabla
  const totals = useMemo(() => {
    return employeeCalculations.reduce((acc, curr) => ({
      ssEmp: acc.ssEmp + curr.ssEmp,
      ssPat: acc.ssPat + curr.ssPat,
      eduEmp: acc.eduEmp + curr.eduEmp,
      eduPat: acc.eduPat + curr.eduPat,
      riesgo: acc.riesgo + curr.riesgo,
      isr: acc.isr + curr.isr,
      decCSS: acc.decCSS + curr.decCSS,
      total: acc.total + curr.totalSipe
    }), { ssEmp: 0, ssPat: 0, eduEmp: 0, eduPat: 0, riesgo: 0, isr: 0, decCSS: 0, total: 0 });
  }, [employeeCalculations]);

  const format = (val: number) => `USD ${val.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  return (
    <div className="bg-[#0f172a] text-white min-h-screen p-8">
      <PagesHeader title={pageName} description={`Empresa: ${selectedCompany?.name}`} onExport={() => {}} />

      {/* Banner de Pago del Mes Anterior */}
      <div className="bg-[#1e293b] border-l-4 border-green-500 p-6 rounded-lg mb-8 flex justify-between items-center">
        <div>
          <h4 className="text-green-400 font-bold uppercase text-sm">Pago del Mes Anterior - {payrollPeriod.monthName} {payrollPeriod.year}</h4>
          <p className="text-gray-400 text-xs">Este es el pago que debe realizar este mes (antes del 15 de {new Date(selectedMonth+"-15").toLocaleDateString("es-PA", {month:'long'})})</p>
          <h2 className="text-3xl font-bold mt-2">{format(totals.total)}</h2>
        </div>
        <div className="text-right">
          <p className="text-gray-400 text-xs italic">Fecha Límite</p>
          <p className="font-mono font-bold text-xl">{dueDate}</p>
          <button className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg mt-3 text-sm font-bold transition-all">Guardar en Historial</button>
        </div>
      </div>

      {/* Tabla de Reporte General */}
      <div className="bg-[#1e293b] rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-[#334155] text-gray-300 uppercase">
            <tr>
              <th className="p-4">Periodo</th>
              <th className="p-4">CSS Empleado (9.75%)</th>
              <th className="p-4">CSS Patrono (13.25%)</th>
              <th className="p-4">Seg. Educ. Emp.</th>
              <th className="p-4">Seg. Educ. Patr.</th>
              <th className="p-4">Riesgo (0.98%)</th>
              <th className="p-4">ISR</th>
              {/* {decCSS > 0 && <th className="p-4 text-yellow-400">Décimo CSS</th>} */}
              <th className="p-4 text-green-400">Total SIPE</th>
              <th className="p-4">Detalle</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-700 hover:bg-slate-700/50">
              <td className="p-4 font-bold">{payrollPeriod.year}-{selectedMonth.split("-")[1]} <span className="text-red-500 ml-2">VENCIDO</span></td>
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
                  className="bg-slate-600 p-2 rounded hover:bg-blue-600 transition-colors"
                >
                  <Users size={16} />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* MODAL DE DESGLOSE POR USUARIO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e293b] w-full max-w-6xl max-h-[90vh] rounded-2xl border border-gray-700 flex flex-col">
            <div className="p-6 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center gap-2"><Users className="text-blue-400" /> Desglose Individual de Planilla - {payrollPeriod.monthName}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white"><X /></button>
            </div>
            
            <div className="overflow-auto p-6">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700">
                    <th className="pb-3">Colaborador</th>
                    <th className="pb-3">Salario</th>
                    <th className="pb-3">SS Emp (9.75%)</th>
                    <th className="pb-3">SS Pat (13.25%)</th>
                    <th className="pb-3">Educ. Emp</th>
                    <th className="pb-3">Educ. Pat</th>
                    <th className="pb-3">Riesgo</th>
                    <th className="pb-3">ISR</th>
                    <th className="pb-3 text-green-400">Total SIPE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {employeeCalculations.map((calc) => (
                    <tr key={calc.id} className="hover:bg-slate-800/40">
                      <td className="py-4 font-medium">{calc.firstName} {calc.lastName}<br/><span className="text-[10px] text-gray-500">{calc.cedula}</span></td>
                      <td className="py-4">{format(calc.gross)}</td>
                      <td className="py-4 text-red-300">{format(calc.ssEmp)}</td>
                      <td className="py-4">{format(calc.ssPat)}</td>
                      <td className="py-4 text-red-300">{format(calc.eduEmp)}</td>
                      <td className="py-4">{format(calc.eduPat)}</td>
                      <td className="py-4">{format(calc.riesgo)}</td>
                      <td className="py-4 text-blue-300">{format(calc.isr)}</td>
                      <td className="py-4 font-bold text-green-400">{format(calc.totalSipe)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-6 border-t border-gray-700 text-right bg-slate-900/50">
                <span className="text-gray-400 mr-4">Total Acumulado del Mes:</span>
                <span className="text-2xl font-bold text-green-400">{format(totals.total)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Alerta de Advertencia */}
      <div className="mt-8 bg-red-900/20 border border-red-500/50 p-4 rounded-lg flex items-start gap-4">
        <AlertCircle className="text-red-500" />
        <div>
          <h5 className="text-red-400 font-bold text-sm">¡Advertencia! Pagos Vencidos</h5>
          <p className="text-red-200/70 text-xs mt-1">Tiene uno o más pagos SIPE vencidos. Por favor, revíselos en la tabla inferior y márquelos como pagados para evitar recargos e intereses de la CSS.</p>
        </div>
      </div>
    </div>
  )
}