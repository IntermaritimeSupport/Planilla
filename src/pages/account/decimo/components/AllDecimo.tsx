"use client"

import { authFetcher, getToken } from "../../../../services/api"
import { useState, useCallback, useMemo } from "react"
import useSWR, { mutate } from "swr"
import { useCompany } from "../../../../context/routerContext"
import { useTheme } from "../../../../context/themeContext"
import {
  Gift, Calendar, Info, Download, AlertTriangle,
  UserCheck, Loader2, CheckCircle2, Clock, XCircle,
  ChevronDown, ChevronUp, Lock,
} from "lucide-react"
import PagesHeader from "../../../../components/headers/pagesHeader"
import { usePageName } from "../../../../hook/usePageName"
import Pagination from "../../../../components/ui/Pagination"

const PARTIDA_INFO = [
  { num: 1, month: "Abril",     payMonth: 4,  periodLabel: (y: number) => `16 Dic ${y-1} \u2013 15 Abr ${y}` },
  { num: 2, month: "Agosto",    payMonth: 8,  periodLabel: (y: number) => `16 Abr ${y} \u2013 15 Ago ${y}` },
  { num: 3, month: "Diciembre", payMonth: 12, periodLabel: (y: number) => `16 Ago ${y} \u2013 15 Dic ${y}` },
]

const PAGE_SIZE = 15

type SalaryType = "MONTHLY" | "BIWEEKLY"

interface SalaryHistoryEntry {
  id: string
  previousSalary: number
  newSalary: number
  previousType: string
  newType: string
  effectiveDate: string
}

interface EmployeeBase {
  id: string; firstName: string; lastName: string; cedula: string
  salary: number; salaryType: SalaryType; hireDate?: string | null
  salaryHistory?: SalaryHistoryEntry[]
}

interface LegalParameter { id: string; key: string; percentage: number; category: string; minRange: number | null; maxRange: number | null; status: string }
interface DecimoCalc { grossThirteenth: number; ssEmp: number; ssPat: number; isr: number; net: number; totalCostPatrono: number }
interface EmployeeThirteenth extends EmployeeBase { monthlySalary: number; calc: DecimoCalc }
interface ThirteenthTotals { gross: number; ssEmp: number; ssPat: number; isr: number; net: number; totalCostPatrono: number }
interface PartidaStatus { partida: number; name: string; status: "PAID" | "PENDING"; paymentId: string | null; amount: number | null; ssAmount: number | null; netAmount: number | null; paymentDate: string | null; notes: string | null }

const fmt = (n: number) => new Intl.NumberFormat("es-PA", { style: "currency", currency: "USD" }).format(n)
function getMonthlySalary(salary: number, salaryType: SalaryType): number { return salaryType === "BIWEEKLY" ? salary * 2 : salary }

// Períodos exactos de cada partida (inicio inclusivo, fin inclusivo)
// Partida 1: 16 Dic año-1 → 15 Abr año
// Partida 2: 16 Abr año   → 15 Ago año
// Partida 3: 16 Ago año   → 15 Dic año
function getPartidaRange(part: 1 | 2 | 3, year: number): { start: Date; end: Date } {
  if (part === 1) return {
    start: new Date(year - 1, 11, 16, 0, 0, 0, 0),
    end:   new Date(year,     3, 15, 23, 59, 59, 999),
  }
  if (part === 2) return {
    start: new Date(year, 3, 16, 0, 0, 0, 0),
    end:   new Date(year, 7, 15, 23, 59, 59, 999),
  }
  return {
    start: new Date(year, 7, 16, 0, 0, 0, 0),
    end:   new Date(year, 11, 15, 23, 59, 59, 999),
  }
}

/**
 * Calcula la base bruta proporcional del décimo de un empleado para una partida,
 * considerando su fecha de ingreso y los cambios de salario que ocurrieron
 * dentro del período.
 *
 * Algoritmo:
 * 1. El período efectivo empieza en max(inicio_partida, hireDate)
 * 2. Se construye una línea de tiempo de salarios vigentes dentro del período
 * 3. Por cada segmento [segStart, segEnd] con salario S:
 *    - Para cada mes calendario que toca el segmento:
 *      diasTrabajadosEnMes / diasTotalesDelMes × salarioMensual
 * 4. Se suman todos los aportes
 */
function calcDecimoBase(
  emp: EmployeeBase,
  part: 1 | 2 | 3,
  year: number,
): number {
  const { start: pStart, end: pEnd } = getPartidaRange(part, year)

  // Ajustar inicio por hireDate
  const hireDate = emp.hireDate ? new Date(emp.hireDate) : null
  const effectiveStart = hireDate && hireDate > pStart ? hireDate : pStart

  // Si no llegó a trabajar en este período
  if (effectiveStart > pEnd) return 0

  // Construir línea de tiempo de cambios de salario dentro del período
  // Cada entrada: { from: Date, salary: number, salaryType: SalaryType }
  type Segment = { from: Date; salary: number; salaryType: SalaryType }
  const segments: Segment[] = []

  // Salario actual es el vigente desde la última fecha de la historia hasta hoy
  const history = (emp.salaryHistory ?? []).slice().sort(
    (a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime()
  )

  if (history.length === 0) {
    // Sin historial: salario actual aplica para todo el período
    segments.push({ from: effectiveStart, salary: emp.salary, salaryType: emp.salaryType })
  } else {
    // El primer segmento usa el salario que estaba vigente antes del primer cambio
    // (previousSalary del primer registro)
    const firstChange = history[0]
    const firstChangeDate = new Date(firstChange.effectiveDate)

    if (firstChangeDate > effectiveStart) {
      // Antes del primer cambio: usar previousSalary del primer registro
      segments.push({
        from: effectiveStart,
        salary: Number(firstChange.previousSalary),
        salaryType: firstChange.previousType as SalaryType,
      })
    }

    for (let i = 0; i < history.length; i++) {
      const change = history[i]
      const changeDate = new Date(change.effectiveDate)
      if (changeDate > pEnd) break
      const segStart = changeDate < effectiveStart ? effectiveStart : changeDate
      segments.push({
        from: segStart,
        salary: Number(change.newSalary),
        salaryType: change.newType as SalaryType,
      })
    }
  }

  // Calcular base sumando aporte de cada segmento día a día por mes
  let base = 0
  for (let i = 0; i < segments.length; i++) {
    const segStart = segments[i].from
    const segEnd = i + 1 < segments.length
      ? new Date(new Date(segments[i + 1].from).getTime() - 1)  // justo antes del siguiente cambio
      : pEnd

    // Recortar al período efectivo
    const s = segStart < effectiveStart ? effectiveStart : segStart
    const e = segEnd > pEnd ? pEnd : segEnd

    if (s > e) continue

    const monthlySalary = getMonthlySalary(segments[i].salary, segments[i].salaryType)

    // Iterar mes a mes dentro del segmento [s, e]
    let cursor = new Date(s.getFullYear(), s.getMonth(), 1)
    while (cursor <= e) {
      const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
      const monthEnd   = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
      const daysInMonth = monthEnd.getDate()

      const workStart = s > monthStart ? s : monthStart
      const workEnd   = e < monthEnd   ? e : monthEnd

      const daysWorked = workEnd.getDate() - workStart.getDate() + 1
      base += (monthlySalary / daysInMonth) * daysWorked

      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    }
  }

  return Number(base.toFixed(4))
}

export const AllDecimo: React.FC = () => {
  const { selectedCompany } = useCompany()
  const { isDarkMode } = useTheme()
  const { pageName } = usePageName()
  const API_URL = import.meta.env.VITE_API_URL as string
  const year = new Date().getFullYear()

  const [currentPartida, setCurrentPartida] = useState(1)
  const [page, setPage] = useState(1)
  const [payingPartida, setPayingPartida] = useState<number | null>(null)
  const [payNotes, setPayNotes] = useState("")
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [expandedRules, setExpandedRules] = useState(false)

  const notify = (type: "success" | "error", text: string) => {
    setNotification({ type, text })
    setTimeout(() => setNotification(null), 4500)
  }

  const { data: employees, isLoading: loadingEmps } = useSWR<EmployeeBase[]>(
    selectedCompany ? `${API_URL}/api/payroll/employees?companyId=${selectedCompany.id}` : null, authFetcher)
  const { data: legalParams, isLoading: loadingParams } = useSWR<LegalParameter[]>(
    selectedCompany ? `${API_URL}/api/system/legal-decimo-parameters?companyId=${selectedCompany.id}` : null, authFetcher)

  const historyKey = selectedCompany
    ? `${API_URL}/api/payroll/decimo/history?companyId=${selectedCompany.id}&year=${year}` : null
  const { data: decimoHistory, mutate: mutateHistory } = useSWR<{ year: number; partidas: PartidaStatus[]; totalPaid: number }>(
    historyKey, authFetcher, { revalidateOnFocus: false })

  const getParam = useCallback((key: string) => legalParams?.find((p) => p.key === key && p.status === "active"), [legalParams])

  const partidaStatus = useMemo<PartidaStatus | null>(() => {
    if (!decimoHistory) return null
    return decimoHistory.partidas.find(p => p.partida === currentPartida) || null
  }, [decimoHistory, currentPartida])


// Calcula deducciones y neto dado un monto bruto proporcional ya calculado
const calculateThirteenth = useCallback(
  (grossPart: number): DecimoCalc => {
    const ssEmpRate = getParam("ss_decimo")?.percentage ?? 7.25
    const ssPatRate = getParam("ss_decimo_patrono")?.percentage ?? 10.75

    const gross = Number(grossPart.toFixed(2))
    const ssEmp = Number((gross * (ssEmpRate / 100)).toFixed(2))
    const ssPat = Number((gross * (ssPatRate / 100)).toFixed(2))

    // ISR sobre el bruto proporcional de la partida
    const isrBrackets = legalParams
      ?.filter(p => p.category === "isr" && p.status === "active" && p.percentage > 0)
      .sort((a, b) => (a.minRange ?? 0) - (b.minRange ?? 0)) ?? []
    const primerTramoConTasa = isrBrackets[0]
    const exentoAnual = primerTramoConTasa?.minRange ?? 11000
    const tasaISR     = (primerTramoConTasa?.percentage ?? 15) / 100
    const montoExento = Number((exentoAnual / 39).toFixed(6))
    const isr         = Number((Math.max(0, (gross - montoExento) * tasaISR)).toFixed(2))

    const net              = Number((gross - ssEmp - isr).toFixed(2))
    const totalCostPatrono = Number((gross + ssPat).toFixed(2))

    return { grossThirteenth: gross, ssEmp, ssPat, isr, net, totalCostPatrono }
  },
  [getParam, legalParams]
)

  const employeeData = useMemo<EmployeeThirteenth[]>(() => {
    if (!employees) return []
    const part = currentPartida as 1 | 2 | 3
    const { end: pEnd } = getPartidaRange(part, year)

    return employees
      .filter(emp => {
        if (!emp.hireDate) return true
        return new Date(emp.hireDate) <= pEnd
      })
      .map((emp) => {
        const monthlySalary = getMonthlySalary(emp.salary, emp.salaryType)
        // Base bruta proporcional: considera hireDate y cambios de salario
        const grossBase = calcDecimoBase(emp, part, year)
        return { ...emp, monthlySalary, calc: calculateThirteenth(grossBase) }
      })
  }, [employees, calculateThirteenth, currentPartida, year])

  const totals = useMemo<ThirteenthTotals>(() =>
    employeeData.reduce((acc, c) => ({
      gross:            acc.gross            + c.calc.grossThirteenth,
      ssEmp:            acc.ssEmp            + c.calc.ssEmp,
      ssPat:            acc.ssPat            + c.calc.ssPat,
      isr:              acc.isr              + c.calc.isr,
      net:              acc.net              + c.calc.net,
      totalCostPatrono: acc.totalCostPatrono + c.calc.totalCostPatrono,
    }), { gross: 0, ssEmp: 0, ssPat: 0, isr: 0, net: 0, totalCostPatrono: 0 })
  , [employeeData])

  const pagedEmployees = useMemo(() => employeeData.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [employeeData, page])

  const handleRegisterPayment = async () => {
    if (!selectedCompany) return
    setPayingPartida(currentPartida)
    try {
      const token = getToken()
      const res = await fetch(`${API_URL}/api/payroll/decimo/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ companyId: selectedCompany.id, year, partida: currentPartida, amount: totals.gross, ssAmount: totals.ssEmp, netAmount: totals.net, paymentDate: new Date().toISOString().split("T")[0], notes: payNotes || null }),
      })
      const data = await res.json()
      if (!res.ok) { notify("error", res.status === 409 ? "Esta partida ya est\u00e1 registrada como pagada" : data.error || "Error al registrar"); return }
      notify("success", `${PARTIDA_INFO[currentPartida - 1].month} registrada como pagada \u2713`)
      setPayNotes("")
      mutateHistory()
      mutate(historyKey)
    } catch (e: any) { notify("error", e.message || "Error al registrar pago") }
    finally { setPayingPartida(null) }
  }

  const handleVoidPayment = async (paymentId: string) => {
    if (!confirm("Anular este registro? La partida volver\u00e1 a PENDIENTE.")) return
    try {
      const token = getToken()
      const res = await fetch(`${API_URL}/api/payroll/decimo/pay/${paymentId}`, { method: "DELETE", headers: { "Authorization": `Bearer ${token}` } })
      if (!res.ok) throw new Error((await res.json()).error)
      notify("success", "Pago anulado \u2014 partida pendiente")
      mutateHistory()
    } catch (e: any) { notify("error", e.message || "Error al anular") }
  }

  if (loadingEmps || loadingParams) {
    return <div className={`flex items-center justify-center min-h-screen ${isDarkMode ? "bg-slate-900" : "bg-gray-50"}`}><Loader2 className="animate-spin text-blue-500" size={48} /></div>
  }

  const brd = isDarkMode ? "border-gray-700" : "border-gray-200"
  const lbl = `block text-xs font-bold uppercase mb-1.5 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`

  return (
    <div className={`transition-colors ${isDarkMode ? "bg-slate-900 text-white" : "text-gray-900"}`}>

      {notification && (
        <div className={`fixed bottom-5 right-5 z-50 px-5 py-4 rounded-xl shadow-2xl border text-sm font-medium ${notification.type === "success" ? (isDarkMode ? "bg-green-900 border-green-600 text-green-200" : "bg-green-100 border-green-400 text-green-800") : (isDarkMode ? "bg-red-900 border-red-600 text-red-200" : "bg-red-100 border-red-400 text-red-800")}`}>
          {notification.type === "success" ? "\u2705 " : "\u274c "}{notification.text}
        </div>
      )}

      <PagesHeader title={`${pageName} - D\u00e9cimo Tercer Mes`} description="C\u00e1lculo y seguimiento de las 3 partidas del d\u00e9cimo" onExport={() => {}} />

      {/* TRACKER DE 3 PARTIDAS */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h3 className={`text-sm font-bold uppercase tracking-wider ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Estado del D\u00e9cimo {year}</h3>
          {decimoHistory && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${decimoHistory.totalPaid === 3 ? (isDarkMode ? "bg-green-900/40 text-green-300" : "bg-green-100 text-green-700") : (isDarkMode ? "bg-gray-700 text-gray-400" : "bg-gray-200 text-gray-600")}`}>
              {decimoHistory.totalPaid}/3 pagadas
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {PARTIDA_INFO.map((p, idx) => {
            const status = decimoHistory?.partidas[idx]
            const isPaid = status?.status === "PAID"
            const isActive = currentPartida === p.num
            return (
              <button key={p.num} onClick={() => { setCurrentPartida(p.num); setPage(1) }}
                className={`relative p-4 rounded-xl border-2 transition-all text-left ${isActive ? (isDarkMode ? "border-blue-500 bg-blue-900/30 shadow-lg" : "border-blue-500 bg-blue-50 shadow-md") : (isDarkMode ? "border-gray-700 bg-slate-800 hover:border-gray-600" : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm")}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${isPaid ? "bg-green-500 border-green-400" : isActive ? "bg-blue-600 border-blue-400" : (isDarkMode ? "bg-gray-700 border-gray-600" : "bg-gray-100 border-gray-300")}`}>
                    {isPaid ? <CheckCircle2 size={20} className="text-white" /> : <Clock size={18} className={isActive ? "text-white" : (isDarkMode ? "text-gray-400" : "text-gray-500")} />}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isPaid ? (isDarkMode ? "bg-green-900/30 text-green-300 border-green-700" : "bg-green-100 text-green-700 border-green-300") : (isDarkMode ? "bg-gray-700/50 text-gray-400 border-gray-600" : "bg-gray-100 text-gray-500 border-gray-200")}`}>
                    {isPaid ? "\u2713 PAGADA" : "PENDIENTE"}
                  </span>
                </div>
                <div className={`text-xs font-bold uppercase mb-0.5 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Partida {p.num}</div>
                <div className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>{p.month}</div>
                <div className={`text-[10px] mt-1 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>{p.periodLabel(year)}</div>
                {isPaid && status?.netAmount != null && (
                  <div className={`mt-2 pt-2 border-t ${brd}`}>
                    <div className={`text-xs font-mono font-bold ${isDarkMode ? "text-green-400" : "text-green-700"}`}>{fmt(status.netAmount)}</div>
                    {status.paymentDate && <div className={`text-[10px] ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>{new Date(status.paymentDate).toLocaleDateString("es-PA", { day:"2-digit", month:"short", year:"numeric" })}</div>}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* RESUMEN PARTIDA ACTIVA */}
      <div className={`p-6 rounded-2xl border mb-6 flex flex-col md:flex-row justify-between items-center gap-6 ${isDarkMode ? "bg-gradient-to-r from-blue-900/40 to-slate-800 border-blue-500/30" : "bg-gradient-to-r from-blue-50 to-gray-50 border-blue-200"}`}>
        <div className="flex items-center gap-4">
          <div className={`p-4 rounded-full ${isDarkMode ? "bg-blue-500/20" : "bg-blue-100"}`}><Gift className="text-blue-400" size={32} /></div>
          <div>
            <h3 className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>{PARTIDA_INFO[currentPartida-1].month} {year} \u2014 Partida {currentPartida}</h3>
            <p className={`text-sm flex items-center gap-2 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}><Calendar size={14} />{PARTIDA_INFO[currentPartida-1].periodLabel(year)}</p>
            {partidaStatus?.status === "PAID" && <p className={`text-xs mt-1 flex items-center gap-1 font-medium ${isDarkMode ? "text-green-400" : "text-green-700"}`}><CheckCircle2 size={12} /> Pagada el {new Date(partidaStatus.paymentDate!).toLocaleDateString("es-PA")}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          <div>
            <p className={`text-xs uppercase mb-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Bruto</p>
            <p className={`text-lg font-bold font-mono ${isDarkMode ? "text-white" : "text-gray-900"}`}>{fmt(totals.gross)}</p>
          </div>
          <div>
            <p className={`text-xs uppercase mb-1 ${isDarkMode ? "text-red-400" : "text-red-500"}`}>SS Emp. ({getParam("ss_decimo")?.percentage ?? 7.25}%)</p>
            <p className={`text-lg font-bold font-mono ${isDarkMode ? "text-red-400" : "text-red-600"}`}>-{fmt(totals.ssEmp)}</p>
          </div>
          <div>
            <p className={`text-xs uppercase mb-1 ${isDarkMode ? "text-blue-400" : "text-blue-500"}`}>ISR</p>
            <p className={`text-lg font-bold font-mono ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}>-{fmt(totals.isr)}</p>
          </div>
          <div>
            <p className={`text-xs uppercase mb-1 ${isDarkMode ? "text-green-400" : "text-green-600"}`}>Neto Empleado</p>
            <p className={`text-2xl font-bold font-mono ${isDarkMode ? "text-green-400" : "text-green-600"}`}>{fmt(totals.net)}</p>
          </div>
          <div>
            <p className={`text-xs uppercase mb-1 ${isDarkMode ? "text-amber-400" : "text-amber-600"}`}>SS Pat. ({getParam("ss_decimo_patrono")?.percentage ?? 10.75}%)</p>
            <p className={`text-lg font-bold font-mono ${isDarkMode ? "text-amber-400" : "text-amber-600"}`}>{fmt(totals.ssPat)}</p>
            <p className={`text-[10px] ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>costo patrono</p>
          </div>
        </div>
      </div>

      {/* PANEL DE PAGO */}
      {partidaStatus?.status === "PENDING" ? (
        <div className={`mb-6 p-5 rounded-xl border-2 ${isDarkMode ? "border-amber-700/50 bg-amber-900/10" : "border-amber-300 bg-amber-50"}`}>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className={`text-sm font-bold flex items-center gap-2 ${isDarkMode ? "text-amber-300" : "text-amber-700"}`}><Clock size={15} /> Partida {currentPartida} pendiente de pago</p>
              <p className={`text-xs mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>Registra el pago una vez que hayas transferido a los empleados.</p>
            </div>
            <div className="flex items-end gap-3">
              <div>
                <label className={lbl}>Notas (opcional)</label>
                <input value={payNotes} onChange={(e) => setPayNotes(e.target.value)} placeholder="Ej. Transferencia banco..." className={`rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-60 ${isDarkMode ? "bg-gray-800 border border-gray-600 text-white" : "bg-white border border-gray-300"}`} />
              </div>
              <button onClick={handleRegisterPayment} disabled={payingPartida !== null} className="flex items-center gap-2 px-5 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-bold transition-all disabled:opacity-50">
                {payingPartida === currentPartida ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Marcar como Pagada
              </button>
            </div>
          </div>
        </div>
      ) : partidaStatus?.status === "PAID" ? (
        <div className={`mb-6 p-4 rounded-xl border flex items-center justify-between ${isDarkMode ? "border-green-700/40 bg-green-900/10" : "border-green-300 bg-green-50"}`}>
          <div className={`flex items-center gap-2 text-sm font-medium ${isDarkMode ? "text-green-300" : "text-green-700"}`}>
            <Lock size={14} /> Esta partida ya fue registrada como pagada.
            {partidaStatus.notes && <span className={`ml-2 text-xs italic ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>"{partidaStatus.notes}"</span>}
          </div>
          <button onClick={() => handleVoidPayment(partidaStatus.paymentId!)} className={`text-xs px-3 py-1 rounded-lg border transition-colors ${isDarkMode ? "text-red-400 border-red-800 hover:bg-red-900/40" : "text-red-600 border-red-300 hover:bg-red-100"}`}>
            <XCircle size={11} className="inline mr-1" />Anular registro
          </button>
        </div>
      ) : null}

      {/* TABLA */}
      <div className={`rounded-xl border overflow-hidden shadow-xl ${isDarkMode ? "bg-slate-800 border-gray-700" : "bg-white border-gray-200"}`}>
        <div className={`p-4 border-b flex justify-between items-center ${isDarkMode ? "bg-slate-800/50 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
          <h4 className={`font-bold text-sm uppercase tracking-wide ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>Detalle de Colaboradores <span className={`font-normal text-xs ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>({employeeData.length})</span></h4>
          <button className="flex items-center gap-2 text-xs bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-bold text-white transition-colors"><Download size={14} /> Exportar</button>
        </div>
        <div className="overflow-x-auto">
          <table className={`w-full text-sm text-left ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
            <thead className={`uppercase text-[10px] font-bold ${isDarkMode ? "bg-slate-900/50 text-gray-500" : "bg-gray-50 text-gray-500"}`}>
              <tr>
                <th className="px-4 py-3">Empleado</th>
                <th className="px-4 py-3">Sal. Mensual</th>
                <th className="px-4 py-3">Bruto Partida</th>
                <th className="px-4 py-3 text-red-400">SS Emp. ({getParam("ss_decimo")?.percentage ?? 7.25}%)</th>
                <th className="px-4 py-3 text-blue-400">ISR (÷3)</th>
                <th className={`px-4 py-3 border-l-2 ${isDarkMode ? "border-slate-600 text-amber-400" : "border-gray-300 text-amber-600"}`}>SS Pat. ({getParam("ss_decimo_patrono")?.percentage ?? 10.75}%)</th>
                <th className={`px-4 py-3 ${isDarkMode ? "text-amber-300" : "text-amber-700"}`}>Costo Patrono</th>
                <th className={`px-4 py-3 border-l-2 text-green-400 font-bold ${isDarkMode ? "border-slate-600" : "border-gray-300"}`}>Neto Empleado</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? "divide-slate-700/50" : "divide-gray-100"}`}>
              {pagedEmployees.map((emp) => (
                <tr key={emp.id} className={`transition-colors ${isDarkMode ? "hover:bg-slate-700/20" : "hover:bg-gray-50"}`}>
                  <td className="px-4 py-3 flex items-center gap-3">
                    <UserCheck className="text-blue-500/50 shrink-0" size={15} />
                    <div>
                      <div className={`font-medium text-sm ${isDarkMode ? "text-slate-200" : "text-gray-900"}`}>{emp.firstName} {emp.lastName}</div>
                      <div className={`text-[10px] ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>{emp.cedula}</div>
                    </div>
                  </td>
                  <td className={`px-4 py-3 font-mono text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>{fmt(emp.monthlySalary)}</td>
                  <td className={`px-4 py-3 font-semibold font-mono text-sm ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>{fmt(emp.calc.grossThirteenth)}</td>
                  <td className="px-4 py-3 text-red-400/80 font-mono text-sm">-{fmt(emp.calc.ssEmp)}</td>
                  <td className="px-4 py-3 text-blue-400/80 font-mono text-sm">-{fmt(emp.calc.isr)}</td>
                  <td className={`px-4 py-3 text-amber-400/80 font-mono text-sm border-l-2 ${isDarkMode ? "border-slate-600" : "border-gray-200"}`}>{fmt(emp.calc.ssPat)}</td>
                  <td className={`px-4 py-3 font-mono text-sm ${isDarkMode ? "text-amber-300" : "text-amber-700"}`}>{fmt(emp.calc.totalCostPatrono)}</td>
                  <td className={`px-4 py-3 font-bold font-mono text-sm border-l-2 ${isDarkMode ? "text-green-400 border-slate-600" : "text-green-600 border-gray-200"}`}>{fmt(emp.calc.net)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className={`font-bold text-xs border-t-2 ${isDarkMode ? "bg-slate-900/40 border-gray-600 text-white" : "bg-gray-100 border-gray-300 text-gray-900"}`}>
                <td colSpan={2} className="px-4 py-3">TOTALES ({employeeData.length} empleados)</td>
                <td className="px-4 py-3 font-mono">{fmt(totals.gross)}</td>
                <td className="px-4 py-3 font-mono text-red-400">-{fmt(totals.ssEmp)}</td>
                <td className="px-4 py-3 font-mono text-blue-400">-{fmt(totals.isr)}</td>
                <td className={`px-4 py-3 font-mono text-amber-400 border-l-2 ${isDarkMode ? "border-slate-600" : "border-gray-300"}`}>{fmt(totals.ssPat)}</td>
                <td className={`px-4 py-3 font-mono ${isDarkMode ? "text-amber-300" : "text-amber-700"}`}>{fmt(totals.totalCostPatrono)}</td>
                <td className={`px-4 py-3 font-mono text-base border-l-2 ${isDarkMode ? "text-green-400 border-slate-600" : "text-green-600 border-gray-300"}`}>{fmt(totals.net)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        {employeeData.length > PAGE_SIZE && (
          <div className={`p-4 border-t flex items-center justify-between ${brd}`}>
            <Pagination total={employeeData.length} pageSize={PAGE_SIZE} page={page} onChange={setPage} />
          </div>
        )}
      </div>

      {/* REGLAS COLAPSABLES */}
      <div className="mt-6">
        <button onClick={() => setExpandedRules(!expandedRules)} className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${isDarkMode ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"}`}>
          {expandedRules ? <ChevronUp size={13} /> : <ChevronDown size={13} />} Par\u00e1metros Legales Aplicados
        </button>
        {expandedRules && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-lg border ${isDarkMode ? "bg-slate-800/40 border-slate-700" : "bg-yellow-50 border-yellow-200"}`}>
              <div className={`flex items-center gap-2 mb-2 ${isDarkMode ? "text-yellow-500" : "text-yellow-600"}`}><AlertTriangle size={14} /><h5 className="text-xs font-bold uppercase">Seguro Social</h5></div>
              <p className={`text-[11px] ${isDarkMode ? "text-gray-400" : "text-gray-700"}`}>
                Empleado: <strong>{getParam("ss_decimo")?.percentage ?? 7.25}%</strong> · Patrono: <strong>{getParam("ss_decimo_patrono")?.percentage ?? 10.75}%</strong>. Sobre el décimo total anual, dividido en 3 partidas.
              </p>
            </div>
            <div className={`p-4 rounded-lg border ${isDarkMode ? "bg-slate-800/40 border-slate-700" : "bg-blue-50 border-blue-200"}`}>
              <div className={`flex items-center gap-2 mb-2 ${isDarkMode ? "text-blue-500" : "text-blue-600"}`}><Info size={14} /><h5 className="text-xs font-bold uppercase">ISR y Seg. Educativo</h5></div>
              <p className={`text-[11px] ${isDarkMode ? "text-gray-400" : "text-gray-700"}`}>
                ISR: base = salario × 13 meses. ISR décimo = ISR(13m) − ISR(12m) ÷ 3 partidas. Seguro Educativo: <strong>exento</strong> por ley.
              </p>
            </div>
            <div className={`p-4 rounded-lg border ${isDarkMode ? "bg-slate-800/40 border-slate-700" : "bg-green-50 border-green-200"}`}>
              <div className={`flex items-center gap-2 mb-2 ${isDarkMode ? "text-green-500" : "text-green-600"}`}><Gift size={14} /><h5 className="text-xs font-bold uppercase">Fórmula por Partida</h5></div>
              <p className={`text-[11px] ${isDarkMode ? "text-gray-400" : "text-gray-700"}`}>
                Bruto total = Salario mensual · SS total = Bruto × {getParam("ss_decimo")?.percentage ?? 7.25}% · ISR = ISR(13m) − ISR(12m) · Cada partida = Total ÷ 3 · <strong>Neto partida = (Bruto − SS − ISR) ÷ 3</strong>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
