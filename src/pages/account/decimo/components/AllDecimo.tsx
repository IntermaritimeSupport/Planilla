"use client"

import { authFetcher, getToken } from "../../../../services/api"
import { useState, useCallback, useMemo } from "react"
import useSWR, { mutate } from "swr"
import { useCompany } from "../../../../context/routerContext"
import { useTheme } from "../../../../context/themeContext"
import {
  Gift, Calendar, Info, Download, AlertTriangle,
  UserCheck, Loader2, CheckCircle2, Clock, XCircle,
  ChevronDown, ChevronUp, Lock, X, FileSpreadsheet,
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
interface DecimoLineItem { monthLabel: string; daysWorked: number; daysInMonth: number; monthlySalary: number; aporte: number }
interface DecimoBaseResult { gross: number; lines: DecimoLineItem[]; effectiveStart: Date; periodStart: Date }
interface EmployeeThirteenth extends EmployeeBase { monthlySalary: number; calc: DecimoCalc; baseResult: DecimoBaseResult }
interface ThirteenthTotals { gross: number; ssEmp: number; ssPat: number; isr: number; net: number; totalCostPatrono: number }
interface PartidaStatus { partida: number; name: string; status: "PAID" | "PENDING"; paymentId: string | null; amount: number | null; ssAmount: number | null; netAmount: number | null; paymentDate: string | null; notes: string | null }

const MONTH_NAMES_SHORT = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]
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
/** Redondea una fecha al inicio de la quincena en que cae (1 o 16 del mes) */
function toQuincenaStart(d: Date): Date {
  return d.getDate() <= 15
    ? new Date(d.getFullYear(), d.getMonth(), 1)
    : new Date(d.getFullYear(), d.getMonth(), 16)
}

function calcDecimoBase(
  emp: EmployeeBase,
  part: 1 | 2 | 3,
  year: number,
): DecimoBaseResult {
  const { start: pStart, end: pEnd } = getPartidaRange(part, year)
  const hireRaw = emp.hireDate ? new Date(emp.hireDate) : null
  // La fecha de ingreso también aplica por quincena
  const hireQuincena = hireRaw ? toQuincenaStart(hireRaw) : null
  const effectiveStart = hireQuincena && hireQuincena > pStart ? hireQuincena : pStart

  if (effectiveStart > pEnd) return { gross: 0, lines: [], effectiveStart, periodStart: pStart }

  type Segment = { from: Date; salary: number; salaryType: SalaryType }
  const segments: Segment[] = []
  const history = (emp.salaryHistory ?? []).slice().sort(
    (a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime()
  )

  if (history.length === 0) {
    segments.push({ from: effectiveStart, salary: emp.salary, salaryType: emp.salaryType })
  } else {
    const firstChange = history[0]
    // El cambio aplica desde el inicio de su quincena
    const firstChangeQuincena = toQuincenaStart(new Date(firstChange.effectiveDate))
    if (firstChangeQuincena > effectiveStart) {
      segments.push({ from: effectiveStart, salary: Number(firstChange.previousSalary), salaryType: firstChange.previousType as SalaryType })
    }
    for (let i = 0; i < history.length; i++) {
      const change = history[i]
      const changeQuincena = toQuincenaStart(new Date(change.effectiveDate))
      if (changeQuincena > pEnd) break
      const segStart = changeQuincena < effectiveStart ? effectiveStart : changeQuincena
      segments.push({ from: segStart, salary: Number(change.newSalary), salaryType: change.newType as SalaryType })
    }
  }

  const lines: DecimoLineItem[] = []
  let base = 0
  for (let i = 0; i < segments.length; i++) {
    // segEnd es el último día INCLUSIVO de este segmento
    // El siguiente segmento empieza en segments[i+1].from (exclusivo para este)
    // Restamos 1 día a nivel de calendario, no 1ms, para evitar ambigüedades
    const segEndDate = i + 1 < segments.length
      ? (() => { const d = new Date(segments[i + 1].from); d.setDate(d.getDate() - 1); return d })()
      : pEnd
    const s = segments[i].from < effectiveStart ? effectiveStart : segments[i].from
    const e = segEndDate > pEnd ? pEnd : segEndDate
    if (s > e) continue
    const monthlySal = getMonthlySalary(segments[i].salary, segments[i].salaryType)
    let cursor = new Date(s.getFullYear(), s.getMonth(), 1)
    while (cursor <= e) {
      const monthEnd    = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
      const daysInMonth = monthEnd.getDate()
      const workStart   = s > cursor ? s : cursor
      const workEnd     = e < monthEnd ? e : monthEnd
      const daysWorked  = workEnd.getDate() - workStart.getDate() + 1
      const aporte      = (monthlySal / daysInMonth) * daysWorked
      base += aporte
      lines.push({ monthLabel: `${MONTH_NAMES_SHORT[cursor.getMonth()]} ${cursor.getFullYear()}`, daysWorked, daysInMonth, monthlySalary: monthlySal, aporte })
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    }
  }

  return { gross: Number(base.toFixed(4)), lines, effectiveStart, periodStart: pStart }
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
  const [modalEmp, setModalEmp] = useState<EmployeeThirteenth | null>(null)

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
        const baseResult = calcDecimoBase(emp, part, year)
        return { ...emp, monthlySalary, calc: calculateThirteenth(baseResult.gross), baseResult }
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

      {/* LÍNEA DE TIEMPO - 3 PARTIDAS */}
      <div className={`mb-8 p-5 rounded-2xl border ${isDarkMode ? "bg-slate-800/60 border-gray-700" : "bg-white border-gray-200"}`}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <h3 className={`text-sm font-bold uppercase tracking-wider ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Progreso Décimo {year}</h3>
            {decimoHistory && (
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${decimoHistory.totalPaid === 3 ? (isDarkMode ? "bg-green-900/40 text-green-300" : "bg-green-100 text-green-700") : decimoHistory.totalPaid > 0 ? (isDarkMode ? "bg-blue-900/40 text-blue-300" : "bg-blue-100 text-blue-700") : (isDarkMode ? "bg-gray-700 text-gray-400" : "bg-gray-200 text-gray-600")}`}>
                {decimoHistory.totalPaid}/3 pagadas
              </span>
            )}
          </div>
          {decimoHistory && decimoHistory.totalPaid === 3 && (
            <span className={`text-xs font-bold flex items-center gap-1 ${isDarkMode ? "text-green-300" : "text-green-700"}`}>
              <CheckCircle2 size={14} /> Décimo completado
            </span>
          )}
        </div>

        {/* Barra de progreso */}
        <div className="relative mb-6">
          <div className={`absolute top-5 left-[16.67%] right-[16.67%] h-1 rounded-full ${isDarkMode ? "bg-gray-700" : "bg-gray-200"}`} />
          <div
            className="absolute top-5 left-[16.67%] h-1 rounded-full bg-green-500 transition-all duration-700"
            style={{ width: `${((decimoHistory?.totalPaid ?? 0) / 3) * 66.66}%` }}
          />
          <div className="grid grid-cols-3 relative">
            {PARTIDA_INFO.map((p, idx) => {
              const status = decimoHistory?.partidas[idx]
              const isPaid = status?.status === "PAID"
              const isActive = currentPartida === p.num
              return (
                <button
                  key={p.num}
                  onClick={() => { setCurrentPartida(p.num); setPage(1) }}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 z-10 transition-all ${
                    isPaid
                      ? "bg-green-500 border-green-400 shadow-lg shadow-green-500/30"
                      : isActive
                      ? (isDarkMode ? "bg-blue-600 border-blue-400 shadow-lg shadow-blue-500/30" : "bg-blue-500 border-blue-400 shadow-lg shadow-blue-500/20")
                      : (isDarkMode ? "bg-gray-700 border-gray-600 group-hover:border-gray-500" : "bg-gray-100 border-gray-300 group-hover:border-gray-400")
                  }`}>
                    {isPaid
                      ? <CheckCircle2 size={18} className="text-white" />
                      : <span className={`text-sm font-bold ${isActive ? "text-white" : (isDarkMode ? "text-gray-400" : "text-gray-500")}`}>{p.num}</span>
                    }
                  </div>
                  <div className="text-center">
                    <div className={`text-xs font-bold ${isActive ? (isDarkMode ? "text-blue-400" : "text-blue-600") : isPaid ? (isDarkMode ? "text-green-400" : "text-green-600") : (isDarkMode ? "text-gray-500" : "text-gray-500")}`}>
                      {p.month}
                    </div>
                    <div className={`text-[10px] mt-0.5 ${isDarkMode ? "text-gray-600" : "text-gray-400"}`}>{p.periodLabel(year)}</div>
                    {isPaid && status?.netAmount != null && (
                      <div className={`text-[11px] font-mono font-bold mt-1 ${isDarkMode ? "text-green-400" : "text-green-600"}`}>
                        {fmt(status.netAmount)}
                      </div>
                    )}
                    {isPaid && status?.paymentDate && (
                      <div className={`text-[10px] ${isDarkMode ? "text-gray-600" : "text-gray-400"}`}>
                        {new Date(status.paymentDate).toLocaleDateString("es-PA", { day: "2-digit", month: "short" })}
                      </div>
                    )}
                    {isPaid ? (
                      <button
                        onClick={e => { e.stopPropagation(); handleVoidPayment(status!.paymentId!) }}
                        className={`mt-1.5 text-[10px] px-2 py-0.5 rounded border transition-colors ${isDarkMode ? "text-red-400 border-red-800/60 hover:bg-red-900/40" : "text-red-500 border-red-200 hover:bg-red-50"}`}
                      >
                        <XCircle size={9} className="inline mr-0.5" />Revertir
                      </button>
                    ) : (
                      <span className={`mt-1 inline-block text-[10px] px-2 py-0.5 rounded-full font-medium ${isActive ? (isDarkMode ? "bg-blue-900/40 text-blue-400" : "bg-blue-100 text-blue-600") : (isDarkMode ? "bg-gray-700/50 text-gray-500" : "bg-gray-100 text-gray-400")}`}>
                        {isActive ? "ACTIVA" : "PENDIENTE"}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
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
      {partidaStatus?.status === "PENDING" && (
        <div className={`mb-6 p-5 rounded-xl border-2 ${isDarkMode ? "border-amber-700/50 bg-amber-900/10" : "border-amber-300 bg-amber-50"}`}>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className={`text-sm font-bold flex items-center gap-2 ${isDarkMode ? "text-amber-300" : "text-amber-700"}`}><Clock size={15} /> Partida {currentPartida} — {PARTIDA_INFO[currentPartida-1].month} pendiente de pago</p>
              <p className={`text-xs mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>Total a pagar: <strong>{fmt(totals.net)}</strong> neto · <strong>{fmt(totals.gross)}</strong> bruto · {employeeData.length} empleados</p>
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
      )}
      {partidaStatus?.status === "PAID" && (
        <div className={`mb-6 p-4 rounded-xl border flex items-center justify-between gap-4 flex-wrap ${isDarkMode ? "border-green-700/40 bg-green-900/10" : "border-green-300 bg-green-50"}`}>
          <div className={`flex items-center gap-2 text-sm font-medium ${isDarkMode ? "text-green-300" : "text-green-700"}`}>
            <Lock size={14} /> Partida {currentPartida} registrada como pagada el {new Date(partidaStatus.paymentDate!).toLocaleDateString("es-PA", { day: "2-digit", month: "long", year: "numeric" })}.
            {partidaStatus.notes && <span className={`ml-2 text-xs italic ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>"{partidaStatus.notes}"</span>}
          </div>
          <button onClick={() => handleVoidPayment(partidaStatus.paymentId!)} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${isDarkMode ? "text-red-400 border-red-800 hover:bg-red-900/40" : "text-red-600 border-red-300 hover:bg-red-100"}`}>
            <XCircle size={12} /> Revertir a pendiente
          </button>
        </div>
      )}

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
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? "divide-slate-700/50" : "divide-gray-100"}`}>
              {pagedEmployees.map((emp) => {
                const enteredLate = emp.baseResult.effectiveStart > emp.baseResult.periodStart
                return (
                  <tr key={emp.id} className={`transition-colors ${isDarkMode ? "hover:bg-slate-700/20" : "hover:bg-gray-50"}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <UserCheck className="text-blue-500/50 shrink-0" size={15} />
                        <div>
                          <div className={`font-medium text-sm ${isDarkMode ? "text-slate-200" : "text-gray-900"}`}>{emp.firstName} {emp.lastName}</div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>{emp.cedula}</span>
                            {enteredLate && (
                              <span className="text-[10px] text-amber-400 font-medium">· ingresó {emp.baseResult.effectiveStart.toLocaleDateString("es-PA")}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className={`px-4 py-3 font-mono text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>{fmt(emp.monthlySalary)}</td>
                    <td className={`px-4 py-3 font-semibold font-mono text-sm ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>{fmt(emp.calc.grossThirteenth)}</td>
                    <td className="px-4 py-3 text-red-400/80 font-mono text-sm">-{fmt(emp.calc.ssEmp)}</td>
                    <td className="px-4 py-3 text-blue-400/80 font-mono text-sm">-{fmt(emp.calc.isr)}</td>
                    <td className={`px-4 py-3 text-amber-400/80 font-mono text-sm border-l-2 ${isDarkMode ? "border-slate-600" : "border-gray-200"}`}>{fmt(emp.calc.ssPat)}</td>
                    <td className={`px-4 py-3 font-mono text-sm ${isDarkMode ? "text-amber-300" : "text-amber-700"}`}>{fmt(emp.calc.totalCostPatrono)}</td>
                    <td className={`px-4 py-3 font-bold font-mono text-sm border-l-2 ${isDarkMode ? "text-green-400 border-slate-600" : "text-green-600 border-gray-200"}`}>{fmt(emp.calc.net)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setModalEmp(emp)}
                        title="Ver desglose"
                        className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? "hover:bg-slate-700 text-gray-400 hover:text-blue-400" : "hover:bg-gray-100 text-gray-400 hover:text-blue-600"}`}
                      >
                        <FileSpreadsheet size={15} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className={`font-bold text-xs border-t-2 ${isDarkMode ? "bg-slate-900/40 border-gray-600 text-white" : "bg-gray-100 border-gray-300 text-gray-900"}`}>
                {/* col 1: Empleado (label) */}
                <td colSpan={2} className="px-4 py-3 uppercase tracking-wide">Totales ({employeeData.length} empleados)</td>
                {/* col 3: Bruto */}
                <td className="px-4 py-3 font-mono">{fmt(totals.gross)}</td>
                {/* col 4: SS Emp */}
                <td className="px-4 py-3 font-mono text-red-400">-{fmt(totals.ssEmp)}</td>
                {/* col 5: ISR */}
                <td className="px-4 py-3 font-mono text-blue-400">-{fmt(totals.isr)}</td>
                {/* col 6: SS Pat */}
                <td className={`px-4 py-3 font-mono text-amber-400 border-l-2 ${isDarkMode ? "border-slate-600" : "border-gray-300"}`}>{fmt(totals.ssPat)}</td>
                {/* col 7: Costo Patrono */}
                <td className={`px-4 py-3 font-mono ${isDarkMode ? "text-amber-300" : "text-amber-700"}`}>{fmt(totals.totalCostPatrono)}</td>
                {/* col 8: Neto */}
                <td className={`px-4 py-3 font-mono text-base border-l-2 ${isDarkMode ? "text-green-400 border-slate-600" : "text-green-600 border-gray-300"}`}>{fmt(totals.net)}</td>
                {/* col 9: icono (vacío) */}
                <td />
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

      {/* ── MODAL DE DESGLOSE ── */}
      {modalEmp && (() => {
        const emp = modalEmp
        const enteredLate = emp.baseResult.effectiveStart > emp.baseResult.periodStart
        const partidaInfo = PARTIDA_INFO[currentPartida - 1]

        const handleDownload = () => {
          const rows = [
            ["Mes", "Días trabajados", "Días del mes", "Salario mensual", "Fórmula", "Aporte"],
            ...emp.baseResult.lines.map(l => [
              l.monthLabel,
              l.daysWorked,
              l.daysInMonth,
              l.monthlySalary.toFixed(2),
              `${l.monthlySalary.toFixed(2)} ÷ ${l.daysInMonth} × ${l.daysWorked}`,
              l.aporte.toFixed(2),
            ]),
            ["", "", "", "", "Total bruto", emp.calc.grossThirteenth.toFixed(2)],
            ["", "", "", "", "SS Empleado", `-${emp.calc.ssEmp.toFixed(2)}`],
            ["", "", "", "", "ISR", `-${emp.calc.isr.toFixed(2)}`],
            ["", "", "", "", "Neto", emp.calc.net.toFixed(2)],
          ]
          const csv = rows.map(r => r.join(",")).join("\n")
          const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = `decimo_${emp.firstName}_${emp.lastName}_partida${currentPartida}_${year}.csv`
          a.click()
          URL.revokeObjectURL(url)
        }

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(2px)" }}
            onClick={() => setModalEmp(null)}
          >
            <div
              className={`relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden ${isDarkMode ? "bg-slate-900 border border-slate-700" : "bg-white border border-gray-200"}`}
              onClick={e => e.stopPropagation()}
            >
              {/* Header modal */}
              <div className={`flex items-center justify-between px-6 py-4 border-b ${isDarkMode ? "border-slate-700" : "border-gray-200"}`}>
                <div>
                  <p className={`font-bold text-base ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                    {emp.firstName} {emp.lastName}
                  </p>
                  <p className={`text-xs mt-0.5 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
                    {emp.cedula} · Partida {currentPartida} ({partidaInfo.month} {year}) · {partidaInfo.periodLabel(year)}
                  </p>
                  {enteredLate && (
                    <p className="text-xs text-amber-400 mt-0.5">
                      Ingresó el {emp.baseResult.effectiveStart.toLocaleDateString("es-PA")} — período completo desde {emp.baseResult.periodStart.toLocaleDateString("es-PA")}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setModalEmp(null)}
                  className={`p-2 rounded-lg transition-colors ${isDarkMode ? "hover:bg-slate-800 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Tabla desglose */}
              <div className="overflow-y-auto max-h-[55vh]">
                <table className="w-full text-xs">
                  <thead className={`sticky top-0 ${isDarkMode ? "bg-slate-800 text-gray-500" : "bg-gray-50 text-gray-400"}`}>
                    <tr>
                      <th className="px-5 py-3 text-left font-semibold uppercase tracking-wider">Mes</th>
                      <th className="px-5 py-3 text-left font-semibold uppercase tracking-wider">Días</th>
                      <th className="px-5 py-3 text-left font-semibold uppercase tracking-wider">Salario mensual</th>
                      <th className="px-5 py-3 text-left font-semibold uppercase tracking-wider">Fórmula</th>
                      <th className="px-5 py-3 text-right font-semibold uppercase tracking-wider text-blue-400">Aporte</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDarkMode ? "divide-slate-700/50" : "divide-gray-100"}`}>
                    {emp.baseResult.lines.map((line, idx) => (
                      <tr key={idx} className={isDarkMode ? "hover:bg-slate-800/40" : "hover:bg-gray-50"}>
                        <td className={`px-5 py-2.5 font-medium ${isDarkMode ? "text-slate-300" : "text-gray-700"}`}>{line.monthLabel}</td>
                        <td className="px-5 py-2.5 font-mono">
                          {line.daysWorked === line.daysInMonth
                            ? <span className="text-emerald-400">{line.daysWorked} / {line.daysInMonth}</span>
                            : <span className="text-amber-400">{line.daysWorked} / {line.daysInMonth}</span>
                          }
                        </td>
                        <td className="px-5 py-2.5 font-mono text-slate-400">{fmt(line.monthlySalary)}</td>
                        <td className="px-5 py-2.5 font-mono text-slate-500 text-[10px]">
                          {fmt(line.monthlySalary)} ÷ {line.daysInMonth} × {line.daysWorked}
                        </td>
                        <td className="px-5 py-2.5 font-mono font-semibold text-right text-blue-400">{fmt(line.aporte)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer con resumen y descarga */}
              <div className={`border-t px-6 py-4 ${isDarkMode ? "border-slate-700 bg-slate-800/60" : "border-gray-200 bg-gray-50"}`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="grid grid-cols-4 gap-4 flex-1">
                    {[
                      { label: "Bruto",       value: fmt(emp.calc.grossThirteenth), color: isDarkMode ? "text-white" : "text-gray-900" },
                      { label: "SS Emp.",     value: `-${fmt(emp.calc.ssEmp)}`,     color: "text-red-400" },
                      { label: "ISR",         value: `-${fmt(emp.calc.isr)}`,       color: "text-red-400" },
                      { label: "Neto",        value: fmt(emp.calc.net),             color: "text-emerald-400" },
                    ].map(item => (
                      <div key={item.label}>
                        <p className="text-[10px] text-slate-500 mb-0.5">{item.label}</p>
                        <p className={`font-mono font-bold text-sm ${item.color}`}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shrink-0"
                  >
                    <Download size={14} /> Descargar CSV
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
