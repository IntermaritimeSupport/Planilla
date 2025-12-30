"use client"

import { useState, useCallback, useMemo } from "react"
import useSWR from "swr"
import { useCompany } from "../../../../context/routerContext"
import { Gift, Calendar, Info, Download, AlertTriangle, UserCheck } from "lucide-react"
import PagesHeader from "../../../../components/headers/pagesHeader"
import { usePageName } from "../../../../hook/usePageName"

interface EmployeeThirteenth {
  id: string;
  firstName: string;
  lastName: string;
  cedula: string;
  salary: number;
  calc: {
    grossThirteenth: number;
    ss: number;
    isr: number;
    net: number;
  };
}

// 2. Definimos la interfaz para el acumulador de totales
interface ThirteenthTotals {
  gross: number;
  ss: number;
  net: number;
}

interface EmployeeBase {
  id: string;
  firstName: string;
  lastName: string;
  cedula: string;
  salary: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export const AllDecimo: React.FC = () => {
  const { selectedCompany } = useCompany()
  const { pageName } = usePageName()

  // --- LÓGICA DE PARTIDAS ---
  // Partida 1: 16 Dic al 15 Abr (Se paga en Abril)
  // Partida 2: 16 Abr al 15 Ago (Se paga en Agosto)
  // Partida 3: 16 Ago al 15 Dic (Se paga en Diciembre)
  const [currentPartida, setCurrentPartida] = useState(1)

  const { data: employees, isLoading } = useSWR(
    selectedCompany ? `${import.meta.env.VITE_API_URL}/api/payroll/employees?companyId=${selectedCompany.id}` : null,
    fetcher
  )

  const partidaInfo = useMemo(() => {
    const years = new Date().getFullYear()
    switch (currentPartida) {
      case 1: return { name: "Primera Partida", period: `16 Dic ${years-1} - 15 Abr ${years}`, month: "Abril" }
      case 2: return { name: "Segunda Partida", period: `16 Abr ${years} - 15 Ago ${years}`, month: "Agosto" }
      case 3: return { name: "Tercera Partida", period: `16 Ago ${years} - 15 Dic ${years}`, month: "Diciembre" }
      default: return { name: "", period: "", month: "" }
    }
  }, [currentPartida])

  const calculateThirteenth = useCallback((baseSalary: number) => {
    // El décimo es la suma de salarios del periodo / 12
    // Para efectos de esta pantalla, simulamos que el salario ha sido constante en los 4 meses
    const totalPeriodIncome = baseSalary * 4 
    const grossThirteenth = totalPeriodIncome / 12
    
    // Retenciones Legales Décimo:
    // 1. Seguro Social: 7.25% (A diferencia del 9.75% regular)
    // 2. Seguro Educativo: NO aplica para el décimo
    // 3. ISR: Solo si el monto excede la base imponible proporcional
    const ss = grossThirteenth * 0.0725
    const isr = grossThirteenth > 846 ? (grossThirteenth - 846) * 0.15 : 0 // Estimación proporcional
    
    return {
      grossThirteenth,
      ss,
      isr,
      net: grossThirteenth - ss - isr
    }
  }, [])

const employeeData = useMemo(() => {
  if (!employees) return [];
  
  // Tipamos 'emp' como EmployeeBase para que TS sepa qué propiedades tiene
  return (employees as EmployeeBase[]).map((emp: EmployeeBase) => ({
    ...emp,
    calc: calculateThirteenth(emp.salary)
  }));
}, [employees, calculateThirteenth]);

const totals = useMemo(() => {
  return (employeeData as EmployeeThirteenth[]).reduce(
    (acc: ThirteenthTotals, curr: EmployeeThirteenth): ThirteenthTotals => ({
      gross: acc.gross + curr.calc.grossThirteenth,
      ss: acc.ss + curr.calc.ss,
      net: acc.net + curr.calc.net
    }), 
    { gross: 0, ss: 0, net: 0 } // Valor inicial
  );
}, [employeeData]);
  if (isLoading) return <div className="flex items-center justify-center min-h-screen bg-[#0f172a]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div>

  return (
    <div className="bg-[#0f172a] text-white min-h-screen p-8">
      <PagesHeader title={`${pageName} Tercer mes`} description="Cálculo y Gestión de Partidas Legales" onExport={() => {}} />

      {/* Selector de Partida */}
      <div className="flex gap-4 mb-8">
        {[1, 2, 3].map((num) => (
          <button
            key={num}
            onClick={() => setCurrentPartida(num)}
            className={`flex-1 p-4 rounded-xl border transition-all ${
              currentPartida === num 
                ? 'bg-blue-600 border-blue-400 shadow-lg shadow-blue-900/20' 
                : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <div className="text-xs uppercase font-bold opacity-70">Partida {num}</div>
            <div className="text-lg font-bold">
              {num === 1 ? 'Abril' : num === 2 ? 'Agosto' : 'Diciembre'}
            </div>
          </button>
        ))}
      </div>

      {/* Resumen de la Partida Seleccionada */}
      <div className="bg-gradient-to-r from-blue-900/40 to-slate-800 p-6 rounded-2xl border border-blue-500/30 mb-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-blue-500/20 p-4 rounded-full">
            <Gift className="text-blue-400" size={32} />
          </div>
          <div>
            <h3 className="text-xl font-bold">{partidaInfo.name} - {new Date().getFullYear()}</h3>
            <p className="text-gray-400 text-sm flex items-center gap-2">
              <Calendar size={14} /> Periodo: {partidaInfo.period}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8">
          <div className="text-center">
            <p className="text-gray-400 text-xs uppercase mb-1">Total Bruto</p>
            <p className="text-2xl font-bold">${totals.gross.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
          </div>
          <div className="text-center">
            <p className="text-xs uppercase mb-1 text-green-400">Total a Pagar (Neto)</p>
            <p className="text-2xl font-bold text-green-400">${totals.net.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
          </div>
        </div>
      </div>

      {/* Tabla de Empleados */}
      <div className="bg-[#1e293b] rounded-xl border border-gray-700 overflow-hidden">
        <div className="p-4 bg-slate-800/50 border-b border-gray-700 flex justify-between items-center">
          <h4 className="font-bold text-sm uppercase tracking-widest text-gray-400">Detalle de Colaboradores</h4>
          <button className="flex items-center gap-2 text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded transition-colors">
            <Download size={14} /> Exportar TXT para Banco
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-gray-500 uppercase text-[10px] font-bold">
              <tr>
                <th className="px-6 py-4">Empleado</th>
                <th className="px-6 py-4">Salario Base</th>
                <th className="px-6 py-4 text-center">Base Acumulada (4m)</th>
                <th className="px-6 py-4">Monto Bruto</th>
                <th className="px-6 py-4">S.S. (7.25%)</th>
                <th className="px-6 py-4 text-green-400 font-bold">Monto Neto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {employeeData.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-700/20 transition-colors">
                  <td className="px-6 py-4 flex items-center gap-3">
                    <UserCheck className="text-gray-500" size={16} />
                    <div>
                      <div className="font-bold">{emp.firstName} {emp.lastName}</div>
                      <div className="text-[10px] text-gray-500">{emp.cedula}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono">${emp.salary.toLocaleString()}</td>
                  <td className="px-6 py-4 text-center text-gray-400">
                    ${(emp.salary * 4).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 font-semibold">
                    ${emp.calc.grossThirteenth.toLocaleString(undefined, {minimumFractionDigits: 2})}
                  </td>
                  <td className="px-6 py-4 text-red-400/80">
                    -${emp.calc.ss.toLocaleString(undefined, {minimumFractionDigits: 2})}
                  </td>
                  <td className="px-6 py-4 font-bold text-green-400">
                    ${emp.calc.net.toLocaleString(undefined, {minimumFractionDigits: 2})}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reglas de Negocio */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800/40 p-4 rounded-lg border border-slate-700">
          <div className="flex items-center gap-2 text-yellow-500 mb-2">
            <AlertTriangle size={16} />
            <h5 className="text-xs font-bold uppercase">Seguro Social</h5>
          </div>
          <p className="text-[11px] text-gray-400">La tasa de Seguro Social para el décimo es del **7.25%**, a diferencia del salario regular.</p>
        </div>
        <div className="bg-slate-800/40 p-4 rounded-lg border border-slate-700">
          <div className="flex items-center gap-2 text-blue-500 mb-2">
            <Info size={16} />
            <h5 className="text-xs font-bold uppercase">Seguro Educativo</h5>
          </div>
          <p className="text-[11px] text-gray-400">Por ley en Panamá, el décimo tercer mes **no es objeto** de descuento de Seguro Educativo.</p>
        </div>
        <div className="bg-slate-800/40 p-4 rounded-lg border border-slate-700">
          <div className="flex items-center gap-2 text-green-500 mb-2">
            <Gift size={16} />
            <h5 className="text-xs font-bold uppercase">Fórmula de Pago</h5>
          </div>
          <p className="text-[11px] text-gray-400">Se calcula sumando todos los salarios (brutos) del periodo y dividiendo el total entre 12.</p>
        </div>
      </div>
    </div>
  )
}