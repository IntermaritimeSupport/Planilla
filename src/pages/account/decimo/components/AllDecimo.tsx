"use client"

import { authFetcher, getToken } from "../../../../services/api"
import { useState, useCallback, useMemo } from "react"
import useSWR, { mutate } from "swr"
import { useCompany } from "../../../../context/routerContext"
import { useTheme } from "../../../../context/themeContext"
import {
  Gift, Info, Download, AlertTriangle,
  UserCheck, Loader2, CheckCircle2, XCircle,
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
interface DecimoLineItem { monthLabel: string; monthlySalary: number; aporte: number }
interface DecimoBaseResult { gross: number; lines: DecimoLineItem[]; effectiveStart: Date; periodStart: Date; monthsWorked: number }
interface EmployeeThirteenth extends EmployeeBase { monthlySalary: number; calc: DecimoCalc; baseResult: DecimoBaseResult }
interface ThirteenthTotals { gross: number; ssEmp: number; ssPat: number; isr: number; net: number; totalCostPatrono: number }
interface PartidaStatus { partida: number; name: string; status: "PAID" | "PENDING"; paymentId: string | null; totalAmount: number | null; paymentDate: string | null; notes: string | null }

const MONTH_NAMES_SHORT = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]
const fmt = (n: number) => new Intl.NumberFormat("es-PA", { style: "currency", currency: "USD" }).format(n)
function getMonthlySalary(salary: number, salaryType: SalaryType): number { const s = Number(salary); return salaryType === "BIWEEKLY" ? s * 2 : s }

function getPartidaRange(part: 1 | 2 | 3, year: number): { start: Date; end: Date } {
  if (part === 1) return { start: new Date(year - 1, 11, 16, 0, 0, 0, 0), end: new Date(year, 3, 15, 23, 59, 59, 999) }
  if (part === 2) return { start: new Date(year, 3, 16, 0, 0, 0, 0), end: new Date(year, 7, 15, 23, 59, 59, 999) }
  return { start: new Date(year, 7, 16, 0, 0, 0, 0), end: new Date(year, 11, 15, 23, 59, 59, 999) }
}

/** Redondea una fecha al inicio de la quincena en que cae (1 o 16 del mes) */
function toQuincenaStart(d: Date): Date {
  return d.getDate() <= 15
    ? new Date(d.getFullYear(), d.getMonth(), 1)
    : new Date(d.getFullYear(), d.getMonth(), 16)
}

/**
 * Calcula las líneas de desglose y los meses trabajados en el período.
 * monthsWorked se usa para prorratear el gross cuando el empleado no trabajó los 4 meses completos.
 */
function calcDecimoLines(emp: EmployeeBase, part: 1 | 2 | 3, year: number): Omit<DecimoBaseResult, "gross"> {
  const { start: pStart, end: pEnd } = getPartidaRange(part, year)
  const hireRaw = emp.hireDate ? new Date(emp.hireDate) : null
  const hireQuincena = hireRaw ? toQuincenaStart(hireRaw) : null
  const effectiveStart = hireQuincena && hireQuincena > pStart ? hireQuincena : pStart

  if (effectiveStart > pEnd) return { lines: [], effectiveStart, periodStart: pStart, monthsWorked: 0 }

  type Segment = { from: Date; salary: number; salaryType: SalaryType }
  const segments: Segment[] = []
  const history = (emp.salaryHistory ?? []).slice().sort(
    (a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime()
  )

  if (history.length === 0) {
    segments.push({ from: effectiveStart, salary: Number(emp.salary), salaryType: emp.salaryType })
  } else {
    const firstChange = history[0]
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
  let monthsWorked = 0

  for (let i = 0; i < segments.length; i++) {
    const segEndDate = i + 1 < segments.length
      ? (() => { const d = new Date(segments[i + 1].from); d.setDate(d.getDate() - 1); return d })()
      : pEnd
    const s = segments[i].from < effectiveStart ? effectiveStart : segments[i].from
    const e = segEndDate > pEnd ? pEnd : segEndDate
    if (s > e) continue
    const monthlySal = getMonthlySalary(segments[i].salary, segments[i].salaryType)
    let cursor = new Date(s.getFullYear(), s.getMonth(), 1)
    while (cursor <= e) {
      monthsWorked++
      // Aporte por mes = salario × 1/12 (el décimo anual es 1 salario, dividido entre 12 meses)
      const aporte = Number((monthlySal / 12).toFixed(2))
      lines.push({ monthLabel: `${MONTH_NAMES_SHORT[cursor.getMonth()]} ${cursor.getFullYear()}`, monthlySalary: monthlySal, aporte })
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    }
  }

  return { lines, effectiveStart, periodStart: pStart, monthsWorked }
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
  const [activeTab, setActiveTab] = useState<"actual" | "historico">("actual")
  const [modalEmp, setModalEmp] = useState<EmployeeThirteenth | null>(null)
  const [modalEmpContext, setModalEmpContext] = useState<{ partida: number; year: number } | null>(null)
  const [historialModal, setHistorialModal] = useState<{ year: number; partida: number; pago: { totalAmount: number | null; paymentDate: string | null; notes: string | null } } | null>(null)

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

  const allYearsKey = selectedCompany
    ? `${API_URL}/api/payroll/decimo/history/all?companyId=${selectedCompany.id}` : null
  const { data: allYearsData, mutate: mutateAllYearsData } = useSWR<{
    years: Array<{
      year: number
      partidas: Array<{ partida: number; status: string; paymentId: string | null; paymentDate: string | null; totalAmount: number | null; notes: string | null }>
      paidCount: number
      totalPaid: number
    }>
  }>(allYearsKey, authFetcher, { revalidateOnFocus: false })

  const getParam = useCallback((key: string) => legalParams?.find((p) => p.key === key && p.status === "active"), [legalParams])

  const partidaStatus = useMemo<PartidaStatus | null>(() => {
    if (!decimoHistory) return null
    return decimoHistory.partidas.find(p => p.partida === currentPartida) || null
  }, [decimoHistory, currentPartida])

  const calcISRAnual = useCallback((baseAnual: number): number => {
    const brackets = legalParams
      ?.filter(p => p.category === "isr" && p.status === "active" && p.percentage > 0)
      .sort((a, b) => (a.minRange ?? 0) - (b.minRange ?? 0)) ?? []
    let isr = 0
    for (const bracket of brackets) {
      const min = bracket.minRange ?? 0
      const max = bracket.maxRange ?? Infinity
      if (baseAnual <= min) break
      const taxable = Math.min(baseAnual, max) - min
      isr += taxable * (bracket.percentage / 100)
    }
    return isr
  }, [legalParams])

  const calculateThirteenth = useCallback(
    (monthlySalary: number, monthsWorked: number): DecimoCalc => {
      // Bruto partida = salario × meses_trabajados / 15
      // Cada partida cubre 5 meses (ej: Dic-Abr), 3 partidas × 5 meses = 15.
      // Período completo (5 meses): salario × 5/15 = salario/3. Si ingresó tarde, se proratea.
      const gross = Number(((monthlySalary * monthsWorked) / 15).toFixed(2))

      const ssEmpRate = getParam("ss_decimo")?.percentage ?? 7.25
      const ssPatRate = getParam("ss_decimo_patrono")?.percentage ?? 10.75
      const ssEmp = Number((gross * (ssEmpRate / 100)).toFixed(2))
      const ssPat = Number((gross * (ssPatRate / 100)).toFixed(2))

      // ISR: diferencia marginal ISR(13 meses) - ISR(12 meses) ÷ 3 partidas
      const isrAnualCon    = calcISRAnual(monthlySalary * 13)
      const isrAnualSin    = calcISRAnual(monthlySalary * 12)
      const isr = Number((Math.max(0, isrAnualCon - isrAnualSin) / 3).toFixed(2))

      const net = Number((gross - ssEmp - isr).toFixed(2))
      const totalCostPatrono = Number((gross + ssPat).toFixed(2))
      return { grossThirteenth: gross, ssEmp, ssPat, isr, net, totalCostPatrono }
    },
    [getParam, calcISRAnual]
  )

  const historialEmpleados = useMemo<EmployeeThirteenth[]>(() => {
    if (!historialModal || !employees) return []
    const { year: hYear, partida: hPart } = historialModal
    const part = hPart as 1 | 2 | 3
    const { end: pEnd } = getPartidaRange(part, hYear)
    return employees
      .filter(emp => { if (!emp.hireDate) return true; return new Date(emp.hireDate) <= pEnd })
      .map((emp) => {
        const monthlySalary = getMonthlySalary(emp.salary, emp.salaryType)
        const { lines, effectiveStart, periodStart, monthsWorked } = calcDecimoLines(emp, part, hYear)
        const calc = calculateThirteenth(monthlySalary, monthsWorked)
        const baseResult: DecimoBaseResult = { gross: calc.grossThirteenth, lines, effectiveStart, periodStart, monthsWorked }
        return { ...emp, monthlySalary, calc, baseResult }
      })
  }, [historialModal, employees, calculateThirteenth])

  const historialTotals = useMemo<ThirteenthTotals>(() =>
    historialEmpleados.reduce((acc, c) => ({
      gross:            acc.gross            + c.calc.grossThirteenth,
      ssEmp:            acc.ssEmp            + c.calc.ssEmp,
      ssPat:            acc.ssPat            + c.calc.ssPat,
      isr:              acc.isr              + c.calc.isr,
      net:              acc.net              + c.calc.net,
      totalCostPatrono: acc.totalCostPatrono + c.calc.totalCostPatrono,
    }), { gross: 0, ssEmp: 0, ssPat: 0, isr: 0, net: 0, totalCostPatrono: 0 })
  , [historialEmpleados])

  const employeeData = useMemo<EmployeeThirteenth[]>(() => {
    if (!employees) return []
    const part = currentPartida as 1 | 2 | 3
    const { end: pEnd } = getPartidaRange(part, year)
    return employees
      .filter(emp => { if (!emp.hireDate) return true; return new Date(emp.hireDate) <= pEnd })
      .map((emp) => {
        const monthlySalary = getMonthlySalary(emp.salary, emp.salaryType)
        const { lines, effectiveStart, periodStart, monthsWorked } = calcDecimoLines(emp, part, year)
        const calc = calculateThirteenth(monthlySalary, monthsWorked)
        const baseResult: DecimoBaseResult = { gross: calc.grossThirteenth, lines, effectiveStart, periodStart, monthsWorked }
        return { ...emp, monthlySalary, calc, baseResult }
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
        body: JSON.stringify({ companyId: selectedCompany.id, year, partida: currentPartida, totalAmount: totals.gross, paymentDate: new Date().toISOString().split("T")[0], notes: payNotes || null }),
      })
      const data = await res.json()
      if (!res.ok) { notify("error", res.status === 409 ? "Esta partida ya está registrada como pagada" : data.error || "Error al registrar"); return }
      notify("success", `${PARTIDA_INFO[currentPartida - 1].month} registrada como pagada ✓`)
      setPayNotes("")
      mutateHistory()
      mutateAllYearsData()
      mutate(historyKey)
    } catch (e: unknown) { notify("error", e instanceof Error ? e.message : "Error al registrar pago") }
    finally { setPayingPartida(null) }
  }

  const handleExportPartidaExcel = async () => {
    const XLSX = await import("xlsx")
    const partidaInfo = PARTIDA_INFO[currentPartida - 1]
    const wb = XLSX.utils.book_new()

    // Hoja 1: detalle por empleado
    const header = ["Empleado", "Cédula", "Sal. Mensual", "Bruto Décimo", "SS Empleado", "ISR", "SS Patrono", "Neto", "Costo Patrono"]
    const rows = employeeData.map(e => [
      `${e.firstName} ${e.lastName}`,
      e.cedula,
      e.monthlySalary,
      e.calc.grossThirteenth,
      e.calc.ssEmp,
      e.calc.isr,
      e.calc.ssPat,
      e.calc.net,
      e.calc.totalCostPatrono,
    ])
    rows.push(["TOTALES", "", totals.gross, totals.gross, totals.ssEmp, totals.isr, totals.ssPat, totals.net, totals.totalCostPatrono])
    const ws1 = XLSX.utils.aoa_to_sheet([header, ...rows])
    ws1["!cols"] = [22, 14, 14, 16, 14, 14, 14, 14, 16].map(w => ({ wch: w }))
    XLSX.utils.book_append_sheet(wb, ws1, "Detalle Empleados")

    // Hoja 2: desglose mensual de cada empleado (columnas = meses)
    const allMonths = Array.from(new Set(employeeData.flatMap(e => e.baseResult.lines.map(l => l.monthLabel))))
    const h2 = ["Empleado", ...allMonths, "Total"]
    const r2 = employeeData.map(e => {
      const byMonth: Record<string, number> = {}
      e.baseResult.lines.forEach(l => { byMonth[l.monthLabel] = l.aporte })
      return [`${e.firstName} ${e.lastName}`, ...allMonths.map(m => byMonth[m] ?? 0), e.calc.grossThirteenth]
    })
    const ws2 = XLSX.utils.aoa_to_sheet([h2, ...r2])
    ws2["!cols"] = [{ wch: 22 }, ...allMonths.map(() => ({ wch: 13 })), { wch: 14 }]
    XLSX.utils.book_append_sheet(wb, ws2, "Desglose Mensual")

    XLSX.writeFile(wb, `decimo_partida${currentPartida}_${partidaInfo.month}_${year}.xlsx`)
  }

  const handleExportPartidaPDF = async () => {
    const { default: jsPDF } = await import("jspdf")
    const partidaInfo = PARTIDA_INFO[currentPartida - 1]
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" })
    const pageW = 279
    const marginL = 15
    const marginR = 15
    const contentW = pageW - marginL - marginR
    let y = 18

    // Encabezado
    doc.setFontSize(13)
    doc.setFont("helvetica", "bold")
    doc.text(`Décimo Tercer Mes — Partida ${currentPartida} (${partidaInfo.month} ${year})`, marginL, y); y += 6
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(120, 120, 120)
    doc.text(`Período: ${partidaInfo.periodLabel(year)}   ·   ${employeeData.length} empleados`, marginL, y)
    doc.setTextColor(0, 0, 0)
    y += 6

    doc.setDrawColor(200, 200, 200)
    doc.line(marginL, y, pageW - marginR, y); y += 5

    // Cabecera tabla
    const cols = [
      { label: "Empleado",      w: 52, align: "left"  as const },
      { label: "Cédula",        w: 24, align: "left"  as const },
      { label: "Sal. Mensual",  w: 26, align: "right" as const },
      { label: "Bruto",         w: 24, align: "right" as const },
      { label: "SS Emp.",       w: 22, align: "right" as const },
      { label: "ISR",           w: 20, align: "right" as const },
      { label: "SS Pat.",       w: 22, align: "right" as const },
      { label: "Neto",          w: 26, align: "right" as const },
      { label: "Costo Patrono", w: 28, align: "right" as const },
    ]

    doc.setFontSize(7.5)
    doc.setFont("helvetica", "bold")
    doc.setFillColor(240, 240, 240)
    doc.rect(marginL, y - 3.5, contentW, 6, "F")
    let x = marginL
    for (const col of cols) {
      const tx = col.align === "right" ? x + col.w - 1 : x + 1
      doc.text(col.label, tx, y, { align: col.align })
      x += col.w
    }
    y += 4
    doc.setDrawColor(180, 180, 180)
    doc.line(marginL, y, pageW - marginR, y); y += 3

    // Filas empleados
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7)
    for (const emp of employeeData) {
      if (y > 185) {
        doc.addPage()
        y = 18
      }
      const values = [
        `${emp.firstName} ${emp.lastName}`,
        emp.cedula,
        fmt(emp.monthlySalary),
        fmt(emp.calc.grossThirteenth),
        fmt(emp.calc.ssEmp),
        fmt(emp.calc.isr),
        fmt(emp.calc.ssPat),
        fmt(emp.calc.net),
        fmt(emp.calc.totalCostPatrono),
      ]
      x = marginL
      cols.forEach((col, i) => {
        const tx = col.align === "right" ? x + col.w - 1 : x + 1
        doc.text(values[i], tx, y, { align: col.align, maxWidth: col.w - 2 })
        x += col.w
      })
      y += 5
    }

    // Fila totales
    y += 1
    doc.setDrawColor(180, 180, 180)
    doc.line(marginL, y, pageW - marginR, y); y += 3
    doc.setFont("helvetica", "bold")
    doc.setFontSize(7.5)
    const totalValues = [
      `TOTALES (${employeeData.length})`, "",
      fmt(employeeData.reduce((s,e) => s + e.monthlySalary, 0)),
      fmt(totals.gross), fmt(totals.ssEmp), fmt(totals.isr),
      fmt(totals.ssPat), fmt(totals.net), fmt(totals.totalCostPatrono),
    ]
    x = marginL
    cols.forEach((col, i) => {
      const tx = col.align === "right" ? x + col.w - 1 : x + 1
      doc.text(totalValues[i], tx, y, { align: col.align })
      x += col.w
    })

    // Pie
    y += 10
    doc.setFontSize(6.5)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(150, 150, 150)
    doc.text(`Generado el ${new Date().toLocaleDateString("es-PA", { day: "2-digit", month: "long", year: "numeric" })} · FlowPlanilla`, marginL, y)

    doc.save(`decimo_partida${currentPartida}_${partidaInfo.month}_${year}.pdf`)
  }

  const handleVoidPayment = async (paymentId: string) => {
    if (!confirm("¿Anular este registro? La partida volverá a PENDIENTE.")) return
    try {
      const token = getToken()
      const res = await fetch(`${API_URL}/api/payroll/decimo/pay/${paymentId}`, { method: "DELETE", headers: { "Authorization": `Bearer ${token}` } })
      if (!res.ok) throw new Error((await res.json()).error)
      notify("success", "Pago anulado — partida pendiente")
      mutateHistory()
      mutateAllYearsData()
    } catch (e: unknown) { notify("error", e instanceof Error ? e.message : "Error al anular") }
  }

  if (loadingEmps || loadingParams) {
    return <div className={`flex items-center justify-center min-h-screen ${isDarkMode ? "bg-slate-900" : "bg-gray-50"}`}><Loader2 className="animate-spin text-blue-500" size={48} /></div>
  }

  const brd = isDarkMode ? "border-gray-700" : "border-gray-200"

  return (
    <div className={`transition-colors ${isDarkMode ? "bg-slate-900 text-white" : "text-gray-900"}`}>

      {notification && (
        <div className={`fixed bottom-5 right-5 z-50 px-5 py-4 rounded-xl shadow-2xl border text-sm font-medium ${notification.type === "success" ? (isDarkMode ? "bg-green-900 border-green-600 text-green-200" : "bg-green-100 border-green-400 text-green-800") : (isDarkMode ? "bg-red-900 border-red-600 text-red-200" : "bg-red-100 border-red-400 text-red-800")}`}>
          {notification.type === "success" ? "✅ " : "❌ "}{notification.text}
        </div>
      )}

      <PagesHeader
        title={`${pageName} - Décimo Tercer Mes`}
        description="Cálculo y seguimiento de las 3 partidas del décimo"
        onExport={activeTab === "actual" ? handleExportPartidaExcel : undefined}
        onExportLabel={`Excel Partida ${currentPartida}`}
        onExportPDF={activeTab === "actual" ? handleExportPartidaPDF : undefined}
      />

      {/* TABS */}
      <div className={`flex gap-1 mb-4 p-1 rounded-xl w-fit ${isDarkMode ? "bg-slate-800" : "bg-gray-100"}`}>
        {([
          { key: "actual",    label: `Año ${year}` },
          { key: "historico", label: "Historial" },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab.key
                ? (isDarkMode ? "bg-slate-700 text-white shadow" : "bg-white text-gray-900 shadow")
                : (isDarkMode ? "text-gray-500 hover:text-gray-300" : "text-gray-500 hover:text-gray-700")
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB HISTORIAL ── */}
      {activeTab === "historico" && (
        <div className={`rounded-xl border overflow-hidden ${isDarkMode ? "bg-slate-800 border-gray-700" : "bg-white border-gray-200"}`}>
          {!allYearsData ? (
            <div className="flex items-center justify-center py-16 gap-2 text-sm text-gray-500">
              <Loader2 size={16} className="animate-spin" /> Cargando historial...
            </div>
          ) : allYearsData.years.length === 0 ? (
            <div className={`py-16 text-center text-sm ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
              No hay pagos registrados aún.
            </div>
          ) : (
            <table className={`w-full text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
              <thead className={`text-[10px] uppercase font-bold ${isDarkMode ? "bg-slate-900/50 text-gray-500" : "bg-gray-50 text-gray-500"}`}>
                <tr>
                  <th className="px-5 py-3 text-left">Año</th>
                  <th className="px-4 py-3 text-center">1ra Partida — Abril</th>
                  <th className="px-4 py-3 text-center">2da Partida — Agosto</th>
                  <th className="px-4 py-3 text-center">3ra Partida — Diciembre</th>
                  <th className="px-4 py-3 text-right">Total Pagado</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? "divide-slate-700/50" : "divide-gray-100"}`}>
                {allYearsData.years.map((row) => (
                  <tr key={row.year} className={`transition-colors ${isDarkMode ? "hover:bg-slate-700/20" : "hover:bg-gray-50"}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-base ${row.year === year ? (isDarkMode ? "text-blue-400" : "text-blue-600") : (isDarkMode ? "text-white" : "text-gray-900")}`}>
                          {row.year}
                        </span>
                        {row.year === year && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${isDarkMode ? "bg-blue-900/40 text-blue-400" : "bg-blue-100 text-blue-600"}`}>actual</span>
                        )}
                      </div>
                      <div className="flex gap-1 mt-1">
                        {[0,1,2].map(i => (
                          <div key={i} className={`h-1.5 w-6 rounded-full ${row.partidas[i]?.status === "PAID" ? "bg-green-500" : (isDarkMode ? "bg-gray-700" : "bg-gray-200")}`} />
                        ))}
                      </div>
                      <div className={`text-[10px] mt-1 ${isDarkMode ? "text-gray-600" : "text-gray-400"}`}>{row.paidCount}/3 partidas</div>
                    </td>
                    {row.partidas.map((p) => (
                      <td key={p.partida} className="px-4 py-4 text-center">
                        {p.status === "PAID" ? (
                          <button
                            onClick={() => setHistorialModal({ year: row.year, partida: p.partida, pago: { totalAmount: p.totalAmount, paymentDate: p.paymentDate, notes: p.notes } })}
                            className={`w-full rounded-lg px-2 py-1.5 transition-colors text-left ${isDarkMode ? "hover:bg-slate-700/40" : "hover:bg-green-50"}`}
                          >
                            <div className="flex items-center justify-center gap-1 mb-0.5">
                              <CheckCircle2 size={13} className="text-green-500" />
                              <span className={`font-mono font-bold text-xs ${isDarkMode ? "text-green-400" : "text-green-600"}`}>
                                {p.totalAmount != null ? fmt(p.totalAmount) : "—"}
                              </span>
                            </div>
                            {p.paymentDate && (
                              <div className={`text-[10px] ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                                {new Date(p.paymentDate).toLocaleDateString("es-PA", { day: "2-digit", month: "short", year: "numeric" })}
                              </div>
                            )}
                            {p.notes && (
                              <div className={`text-[10px] italic truncate max-w-[140px] mx-auto ${isDarkMode ? "text-gray-600" : "text-gray-400"}`} title={p.notes}>
                                {p.notes}
                              </div>
                            )}
                          </button>
                        ) : (
                          <span className={`text-[11px] px-2 py-0.5 rounded-full ${isDarkMode ? "bg-gray-700/60 text-gray-500" : "bg-gray-100 text-gray-400"}`}>
                            Pendiente
                          </span>
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-4 text-right">
                      <span className={`font-mono font-bold text-sm ${row.paidCount === 3 ? (isDarkMode ? "text-green-400" : "text-green-600") : (isDarkMode ? "text-gray-400" : "text-gray-600")}`}>
                        {fmt(row.totalPaid)}
                      </span>
                      {row.paidCount === 3 && (
                        <div className="flex items-center justify-end gap-1 mt-0.5">
                          <CheckCircle2 size={11} className="text-green-500" />
                          <span className={`text-[10px] font-medium ${isDarkMode ? "text-green-500" : "text-green-600"}`}>Completo</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className={`font-bold text-xs border-t-2 ${isDarkMode ? "bg-slate-900/40 border-gray-600 text-white" : "bg-gray-50 border-gray-300 text-gray-900"}`}>
                  <td className="px-5 py-3 uppercase tracking-wide">Total general</td>
                  <td colSpan={3} />
                  <td className={`px-4 py-3 text-right font-mono ${isDarkMode ? "text-green-400" : "text-green-600"}`}>
                    {fmt(allYearsData.years.reduce((s, r) => s + r.totalPaid, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

      {/* ── TAB AÑO ACTUAL ── */}
      {activeTab === "actual" && <>

      {/* PANEL COMPACTO: LÍNEA DE TIEMPO + TOTALES + ACCIÓN */}
      <div className={`mb-4 rounded-xl border ${isDarkMode ? "bg-slate-800/60 border-gray-700" : "bg-white border-gray-200"}`}>
        {/* Fila: 3 partidas como segmentos clickeables */}
        <div className={`grid grid-cols-3 divide-x ${isDarkMode ? "divide-gray-700" : "divide-gray-200"}`}>
          {PARTIDA_INFO.map((p, idx) => {
            const status = decimoHistory?.partidas[idx]
            const isPaid = status?.status === "PAID"
            const isActive = currentPartida === p.num
            return (
              <button
                key={p.num}
                onClick={() => { setCurrentPartida(p.num); setPage(1) }}
                className={`group relative flex items-center gap-3 px-5 py-3 transition-colors text-left
                  ${isDarkMode ? "hover:bg-slate-700/30" : "hover:bg-gray-50"}
                  ${isActive ? (isDarkMode ? "bg-blue-900/20" : "bg-blue-50/60") : ""}
                  ${idx === 0 ? "rounded-tl-xl" : ""} ${idx === 2 ? "rounded-tr-xl" : ""}
                `}
              >
                <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${
                  isPaid ? "bg-green-500 border-green-400"
                  : isActive ? (isDarkMode ? "bg-blue-600 border-blue-500" : "bg-blue-500 border-blue-400")
                  : (isDarkMode ? "bg-gray-700 border-gray-600" : "bg-gray-100 border-gray-300")
                }`}>
                  {isPaid
                    ? <CheckCircle2 size={14} className="text-white" />
                    : <span className={`text-xs font-bold ${isActive ? "text-white" : (isDarkMode ? "text-gray-500" : "text-gray-400")}`}>{p.num}</span>
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-bold ${isActive ? (isDarkMode ? "text-blue-400" : "text-blue-600") : isPaid ? (isDarkMode ? "text-green-400" : "text-green-600") : (isDarkMode ? "text-gray-300" : "text-gray-700")}`}>
                      {p.month}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                      isPaid ? (isDarkMode ? "bg-green-900/40 text-green-400" : "bg-green-100 text-green-600")
                      : isActive ? (isDarkMode ? "bg-blue-900/40 text-blue-400" : "bg-blue-100 text-blue-600")
                      : (isDarkMode ? "bg-gray-700 text-gray-500" : "bg-gray-100 text-gray-400")
                    }`}>
                      {isPaid ? "✓ Pagada" : isActive ? "Activa" : "Pendiente"}
                    </span>
                  </div>
                  <div className={`text-[10px] truncate ${isDarkMode ? "text-gray-600" : "text-gray-400"}`}>{p.periodLabel(year)}</div>
                  {isPaid && status?.totalAmount != null && (
                    <div className={`text-xs font-mono font-bold ${isDarkMode ? "text-green-400" : "text-green-600"}`}>
                      {fmt(status.totalAmount)}
                      {status.paymentDate && <span className={`ml-1 font-normal text-[10px] ${isDarkMode ? "text-gray-600" : "text-gray-400"}`}>
                        · {new Date(status.paymentDate).toLocaleDateString("es-PA", { day: "2-digit", month: "short" })}
                      </span>}
                    </div>
                  )}
                </div>
                {isPaid && (
                  <button
                    onClick={e => { e.stopPropagation(); handleVoidPayment(status!.paymentId!) }}
                    title="Revertir a pendiente"
                    className={`shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${isDarkMode ? "text-red-400 hover:bg-red-900/40" : "text-red-400 hover:bg-red-50"}`}
                  >
                    <XCircle size={13} />
                  </button>
                )}
              </button>
            )
          })}
        </div>

        {/* Fila de totales + acción */}
        <div className={`border-t px-5 py-3 flex items-center gap-6 flex-wrap ${isDarkMode ? "border-gray-700/60" : "border-gray-100"}`}>
          <div className="flex items-center gap-5 flex-wrap flex-1 min-w-0">
            {[
              { label: "Bruto",       value: fmt(totals.gross),    color: isDarkMode ? "text-white" : "text-gray-900" },
              { label: `SS Emp. ${getParam("ss_decimo")?.percentage ?? 7.25}%`, value: `-${fmt(totals.ssEmp)}`, color: "text-red-400" },
              { label: "ISR",         value: `-${fmt(totals.isr)}`, color: isDarkMode ? "text-blue-400" : "text-blue-600" },
              { label: `SS Pat. ${getParam("ss_decimo_patrono")?.percentage ?? 10.75}%`, value: fmt(totals.ssPat), color: isDarkMode ? "text-amber-400" : "text-amber-600" },
              { label: "Neto",        value: fmt(totals.net),      color: isDarkMode ? "text-green-400" : "text-green-600", large: true },
            ].map(item => (
              <div key={item.label} className="shrink-0">
                <div className={`text-[10px] uppercase font-medium mb-0.5 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>{item.label}</div>
                <div className={`font-mono font-bold ${"large" in item && item.large ? "text-base" : "text-sm"} ${item.color}`}>{item.value}</div>
              </div>
            ))}
          </div>
          {partidaStatus?.status === "PENDING" && (
            <div className="flex items-center gap-2 shrink-0">
              <input
                value={payNotes}
                onChange={e => setPayNotes(e.target.value)}
                placeholder="Notas..."
                className={`rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500 w-36 ${isDarkMode ? "bg-gray-900 border border-gray-600 text-white placeholder-gray-600" : "bg-gray-50 border border-gray-300 text-gray-900"}`}
              />
              <button
                onClick={handleRegisterPayment}
                disabled={payingPartida !== null}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition-all disabled:opacity-50 whitespace-nowrap"
              >
                {payingPartida === currentPartida ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                Marcar pagada
              </button>
            </div>
          )}
          {partidaStatus?.status === "PAID" && (
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-xs flex items-center gap-1 ${isDarkMode ? "text-green-400" : "text-green-600"}`}>
                <Lock size={12} /> Pagada el {new Date(partidaStatus.paymentDate!).toLocaleDateString("es-PA", { day: "2-digit", month: "short", year: "numeric" })}
              </span>
              <button
                onClick={() => handleVoidPayment(partidaStatus.paymentId!)}
                className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded border transition-colors ${isDarkMode ? "text-red-400 border-red-800 hover:bg-red-900/40" : "text-red-500 border-red-200 hover:bg-red-50"}`}
              >
                <XCircle size={11} /> Revertir
              </button>
            </div>
          )}
        </div>
      </div>

      {/* TABLA */}
      <div className={`rounded-xl border overflow-hidden shadow-xl ${isDarkMode ? "bg-slate-800 border-gray-700" : "bg-white border-gray-200"}`}>
        <div className={`p-4 border-b flex justify-between items-center ${isDarkMode ? "bg-slate-800/50 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
          <h4 className={`font-bold text-sm uppercase tracking-wide ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
            Detalle de Colaboradores <span className={`font-normal text-xs ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>({employeeData.length})</span>
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className={`w-full text-sm text-left ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
            <thead className={`uppercase text-[10px] font-bold ${isDarkMode ? "bg-slate-900/50 text-gray-500" : "bg-gray-50 text-gray-500"}`}>
              <tr>
                <th className="px-4 py-3">Empleado</th>
                <th className="px-4 py-3">Sal. Mensual</th>
                <th className="px-4 py-3">Bruto Partida</th>
                <th className="px-4 py-3 text-red-400">SS Emp. ({getParam("ss_decimo")?.percentage ?? 7.25}%)</th>
                <th className="px-4 py-3 text-blue-400">ISR</th>
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
                <td colSpan={2} className="px-4 py-3 uppercase tracking-wide">Totales ({employeeData.length} empleados)</td>
                <td className="px-4 py-3 font-mono">{fmt(totals.gross)}</td>
                <td className="px-4 py-3 font-mono text-red-400">-{fmt(totals.ssEmp)}</td>
                <td className="px-4 py-3 font-mono text-blue-400">-{fmt(totals.isr)}</td>
                <td className={`px-4 py-3 font-mono text-amber-400 border-l-2 ${isDarkMode ? "border-slate-600" : "border-gray-300"}`}>{fmt(totals.ssPat)}</td>
                <td className={`px-4 py-3 font-mono ${isDarkMode ? "text-amber-300" : "text-amber-700"}`}>{fmt(totals.totalCostPatrono)}</td>
                <td className={`px-4 py-3 font-mono text-base border-l-2 ${isDarkMode ? "text-green-400 border-slate-600" : "text-green-600 border-gray-300"}`}>{fmt(totals.net)}</td>
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

      {/* PARÁMETROS LEGALES COLAPSABLES */}
      <div className="mt-6">
        <button onClick={() => setExpandedRules(!expandedRules)} className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${isDarkMode ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"}`}>
          {expandedRules ? <ChevronUp size={13} /> : <ChevronDown size={13} />} Parámetros Legales Aplicados
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

      </> /* fin tab actual */}

      {/* ── MODAL DE DESGLOSE ── */}
      {modalEmp && (() => {
        const emp = modalEmp
        const enteredLate = emp.baseResult.effectiveStart > emp.baseResult.periodStart
        // Cuando se abre desde el historial usa el contexto de esa partida/año
        const empPartida = modalEmpContext?.partida ?? currentPartida
        const empYear    = modalEmpContext?.year    ?? year
        const partidaInfo = PARTIDA_INFO[empPartida - 1]

        const fileBase = `decimo_${emp.firstName}_${emp.lastName}_partida${empPartida}_${empYear}`

        const handleDownloadExcel = async () => {
          const XLSX = await import("xlsx")
          const wb = XLSX.utils.book_new()

          // Hoja 1: Desglose mensual (por columna: cada mes es una columna)
          const months = emp.baseResult.lines.map(l => l.monthLabel)
          const salaries = emp.baseResult.lines.map(l => l.monthlySalary)
          const aportes = emp.baseResult.lines.map(l => l.aporte)
          const wsData = [
            ["Concepto", ...months],
            ["Salario Mensual", ...salaries],
            ["Aporte Décimo", ...aportes],
          ]
          const ws1 = XLSX.utils.aoa_to_sheet(wsData)
          XLSX.utils.book_append_sheet(wb, ws1, "Desglose Mensual")

          // Hoja 2: Resumen de deducciones
          const ws2 = XLSX.utils.aoa_to_sheet([
            ["Concepto", "Monto (USD)"],
            ["Bruto Décimo", emp.calc.grossThirteenth],
            ["SS Empleado", -emp.calc.ssEmp],
            ["ISR", -emp.calc.isr],
            ["Neto Empleado", emp.calc.net],
            ["SS Patrono", emp.calc.ssPat],
            ["Costo Total Patrono", emp.calc.totalCostPatrono],
          ])
          XLSX.utils.book_append_sheet(wb, ws2, "Resumen")

          XLSX.writeFile(wb, `${fileBase}.xlsx`)
        }

        const handleDownloadPDF = async () => {
          const { default: jsPDF } = await import("jspdf")
          const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" })
          const pageW = 215
          const marginL = 20
          const marginR = 20
          const contentW = pageW - marginL - marginR
          let y = 20

          // ── Encabezado ──
          doc.setFontSize(13)
          doc.setFont("helvetica", "bold")
          doc.text("Desglose de Décimo Tercer Mes", marginL, y); y += 7

          doc.setFontSize(9)
          doc.setFont("helvetica", "normal")
          doc.setTextColor(80, 80, 80)
          doc.text(`${emp.firstName} ${emp.lastName}  ·  ${emp.cedula}`, marginL, y); y += 4.5
          doc.text(`Partida ${empPartida} — ${partidaInfo.month} ${empYear}  ·  ${partidaInfo.periodLabel(empYear)}`, marginL, y); y += 4.5
          if (emp.baseResult.effectiveStart > emp.baseResult.periodStart) {
            doc.setTextColor(160, 100, 0)
            doc.text(`Ingresó: ${emp.baseResult.effectiveStart.toLocaleDateString("es-PA")}`, marginL, y); y += 4.5
          }
          doc.setTextColor(0, 0, 0)
          y += 3

          doc.setDrawColor(200, 200, 200)
          doc.line(marginL, y, pageW - marginR, y); y += 6

          // ── Tabla desglose (filas: Mes | Salario | Aporte) ──
          const colMes = 40
          const colSal = (contentW - colMes) / 2

          doc.setFontSize(8)
          doc.setFont("helvetica", "bold")
          doc.setFillColor(245, 245, 245)
          doc.rect(marginL, y - 3.5, contentW, 6, "F")
          doc.text("Mes",             marginL + 2,                y)
          doc.text("Salario Mensual", marginL + colMes + colSal,  y, { align: "right" })
          doc.text("Aporte Décimo",   marginL + contentW,         y, { align: "right" })
          y += 4
          doc.setDrawColor(210, 210, 210)
          doc.line(marginL, y, pageW - marginR, y); y += 3

          doc.setFont("helvetica", "normal")
          doc.setFontSize(8)
          for (const line of emp.baseResult.lines) {
            doc.text(line.monthLabel,         marginL + 2,                y)
            doc.text(fmt(line.monthlySalary), marginL + colMes + colSal,  y, { align: "right" })
            doc.text(fmt(line.aporte),        marginL + contentW,         y, { align: "right" })
            y += 5
          }

          // Fila total bruto
          y += 1
          doc.setDrawColor(180, 180, 180)
          doc.line(marginL, y, pageW - marginR, y); y += 3
          doc.setFont("helvetica", "bold")
          doc.text("Total Bruto", marginL + 2, y)
          doc.text(fmt(emp.calc.grossThirteenth), marginL + contentW, y, { align: "right" })
          y += 8

          // ── Resumen deducciones ──
          doc.setDrawColor(200, 200, 200)
          doc.line(marginL, y, pageW - marginR, y); y += 6

          doc.setFontSize(9)
          doc.setFont("helvetica", "bold")
          doc.text("Resumen de Deducciones", marginL, y); y += 6

          const resumen = [
            { label: "Bruto Décimo",        value: fmt(emp.calc.grossThirteenth), bold: false },
            { label: "(-) SS Empleado",     value: `-${fmt(emp.calc.ssEmp)}`,     bold: false },
            { label: "(-) ISR",             value: `-${fmt(emp.calc.isr)}`,       bold: false },
            { label: "Neto Empleado",       value: fmt(emp.calc.net),             bold: true  },
            { label: "SS Patrono",          value: fmt(emp.calc.ssPat),           bold: false },
            { label: "Costo Total Patrono", value: fmt(emp.calc.totalCostPatrono),bold: false },
          ]
          doc.setFontSize(8.5)
          for (const row of resumen) {
            doc.setFont("helvetica", row.bold ? "bold" : "normal")
            doc.text(row.label, marginL + 4, y)
            doc.text(row.value, pageW - marginR, y, { align: "right" })
            y += 5
          }

          // ── Pie ──
          y += 8
          doc.setFontSize(6.5)
          doc.setFont("helvetica", "normal")
          doc.setTextColor(160, 160, 160)
          doc.text(`Generado el ${new Date().toLocaleDateString("es-PA", { day: "2-digit", month: "long", year: "numeric" })} · FlowPlanilla`, marginL, y)

          doc.save(`${fileBase}.pdf`)
        }

        return (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(2px)" }}
            onClick={() => { setModalEmp(null); setModalEmpContext(null) }}
          >
            <div
              className={`relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden ${isDarkMode ? "bg-slate-900 border border-slate-700" : "bg-white border border-gray-200"}`}
              onClick={e => e.stopPropagation()}
            >
              <div className={`flex items-center justify-between px-6 py-4 border-b ${isDarkMode ? "border-slate-700" : "border-gray-200"}`}>
                <div>
                  <p className={`font-bold text-base ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                    {emp.firstName} {emp.lastName}
                  </p>
                  <p className={`text-xs mt-0.5 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
                    {emp.cedula} · Partida {empPartida} ({partidaInfo.month} {empYear}) · {partidaInfo.periodLabel(empYear)}
                  </p>
                  {enteredLate && (
                    <p className="text-xs text-amber-400 mt-0.5">
                      Ingresó el {emp.baseResult.effectiveStart.toLocaleDateString("es-PA")} — período completo desde {emp.baseResult.periodStart.toLocaleDateString("es-PA")}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => { setModalEmp(null); setModalEmpContext(null) }}
                  className={`p-2 rounded-lg transition-colors ${isDarkMode ? "hover:bg-slate-800 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="overflow-y-auto max-h-[55vh]">
                <table className="w-full text-xs">
                  <thead className={`sticky top-0 ${isDarkMode ? "bg-slate-800 text-gray-500" : "bg-gray-50 text-gray-400"}`}>
                    <tr>
                      <th className="px-5 py-3 text-left font-semibold uppercase tracking-wider">Mes</th>
                      <th className="px-5 py-3 text-left font-semibold uppercase tracking-wider">Salario mensual</th>
                      <th className="px-5 py-3 text-right font-semibold uppercase tracking-wider text-blue-400">Aporte</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDarkMode ? "divide-slate-700/50" : "divide-gray-100"}`}>
                    {emp.baseResult.lines.map((line, idx) => (
                      <tr key={idx} className={isDarkMode ? "hover:bg-slate-800/40" : "hover:bg-gray-50"}>
                        <td className={`px-5 py-2.5 font-medium ${isDarkMode ? "text-slate-300" : "text-gray-700"}`}>{line.monthLabel}</td>
                        <td className="px-5 py-2.5 font-mono text-slate-400">{fmt(line.monthlySalary)}</td>
                        <td className="px-5 py-2.5 font-mono font-semibold text-right text-blue-400">{fmt(line.aporte)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={`border-t px-6 py-4 ${isDarkMode ? "border-slate-700 bg-slate-800/60" : "border-gray-200 bg-gray-50"}`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="grid grid-cols-4 gap-4 flex-1">
                    {[
                      { label: "Bruto",   value: fmt(emp.calc.grossThirteenth), color: isDarkMode ? "text-white" : "text-gray-900" },
                      { label: "SS Emp.", value: `-${fmt(emp.calc.ssEmp)}`,      color: "text-red-400" },
                      { label: "ISR",     value: `-${fmt(emp.calc.isr)}`,        color: "text-red-400" },
                      { label: "Neto",    value: fmt(emp.calc.net),              color: "text-emerald-400" },
                    ].map(item => (
                      <div key={item.label}>
                        <p className="text-[10px] text-slate-500 mb-0.5">{item.label}</p>
                        <p className={`font-mono font-bold text-sm ${item.color}`}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={handleDownloadExcel}
                      className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors"
                    >
                      <FileSpreadsheet size={13} /> Excel
                    </button>
                    <button
                      onClick={handleDownloadPDF}
                      className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors"
                    >
                      <Download size={13} /> PDF
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── MODAL HISTORIAL: desglose de partida de año anterior ── */}
      {historialModal && (() => {
        const { year: hYear, partida: hPart, pago } = historialModal
        const partidaInfo = PARTIDA_INFO[hPart - 1]
        const ssEmpRate = getParam("ss_decimo")?.percentage ?? 7.25
        const ssPatRate = getParam("ss_decimo_patrono")?.percentage ?? 10.75
        const fileBase = `decimo_partida${hPart}_${partidaInfo.month}_${hYear}`

        const handleHistExcel = async () => {
          const XLSX = await import("xlsx")
          const wb = XLSX.utils.book_new()
          const header = ["Empleado", "Cédula", "Sal. Mensual", "Bruto Décimo", "SS Empleado", "ISR", "SS Patrono", "Neto", "Costo Patrono"]
          const rows = historialEmpleados.map(e => [
            `${e.firstName} ${e.lastName}`, e.cedula,
            e.monthlySalary, e.calc.grossThirteenth, e.calc.ssEmp,
            e.calc.isr, e.calc.ssPat, e.calc.net, e.calc.totalCostPatrono,
          ])
          rows.push(["TOTALES", "", historialTotals.gross, historialTotals.gross, historialTotals.ssEmp, historialTotals.isr, historialTotals.ssPat, historialTotals.net, historialTotals.totalCostPatrono])
          const ws = XLSX.utils.aoa_to_sheet([header, ...rows])
          ws["!cols"] = [22, 14, 14, 16, 14, 14, 14, 14, 16].map(w => ({ wch: w }))
          XLSX.utils.book_append_sheet(wb, ws, "Detalle")
          XLSX.writeFile(wb, `${fileBase}.xlsx`)
        }

        const handleHistPDF = async () => {
          const { default: jsPDF } = await import("jspdf")
          const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" })
          const pageW = 279; const marginL = 15; const marginR = 15; const contentW = pageW - marginL - marginR
          let y = 18
          doc.setFontSize(13); doc.setFont("helvetica", "bold")
          doc.text(`Décimo Tercer Mes — Partida ${hPart} (${partidaInfo.month} ${hYear})`, marginL, y); y += 6
          doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(120, 120, 120)
          doc.text(`Período: ${partidaInfo.periodLabel(hYear)}   ·   ${historialEmpleados.length} empleados${pago.paymentDate ? `   ·   Pagada: ${new Date(pago.paymentDate).toLocaleDateString("es-PA")}` : ""}`, marginL, y)
          doc.setTextColor(0, 0, 0); y += 6
          doc.setDrawColor(200, 200, 200); doc.line(marginL, y, pageW - marginR, y); y += 5
          const cols = [
            { label: "Empleado", w: 52, align: "left" as const },
            { label: "Cédula", w: 24, align: "left" as const },
            { label: "Sal. Mensual", w: 26, align: "right" as const },
            { label: "Bruto", w: 24, align: "right" as const },
            { label: "SS Emp.", w: 22, align: "right" as const },
            { label: "ISR", w: 20, align: "right" as const },
            { label: "SS Pat.", w: 22, align: "right" as const },
            { label: "Neto", w: 26, align: "right" as const },
            { label: "Costo Patrono", w: 28, align: "right" as const },
          ]
          doc.setFontSize(7.5); doc.setFont("helvetica", "bold")
          doc.setFillColor(240, 240, 240); doc.rect(marginL, y - 3.5, contentW, 6, "F")
          let x = marginL
          for (const col of cols) { doc.text(col.label, col.align === "right" ? x + col.w - 1 : x + 1, y, { align: col.align }); x += col.w }
          y += 4; doc.setDrawColor(180, 180, 180); doc.line(marginL, y, pageW - marginR, y); y += 3
          doc.setFont("helvetica", "normal"); doc.setFontSize(7)
          for (const emp of historialEmpleados) {
            if (y > 185) { doc.addPage(); y = 18 }
            const vals = [`${emp.firstName} ${emp.lastName}`, emp.cedula, fmt(emp.monthlySalary), fmt(emp.calc.grossThirteenth), fmt(emp.calc.ssEmp), fmt(emp.calc.isr), fmt(emp.calc.ssPat), fmt(emp.calc.net), fmt(emp.calc.totalCostPatrono)]
            x = marginL
            cols.forEach((col, i) => { doc.text(vals[i], col.align === "right" ? x + col.w - 1 : x + 1, y, { align: col.align, maxWidth: col.w - 2 }); x += col.w })
            y += 5
          }
          y += 1; doc.setDrawColor(180,180,180); doc.line(marginL, y, pageW - marginR, y); y += 3
          doc.setFont("helvetica", "bold"); doc.setFontSize(7.5)
          const totVals = [`TOTALES (${historialEmpleados.length})`, "", fmt(historialEmpleados.reduce((s,e)=>s+e.monthlySalary,0)), fmt(historialTotals.gross), fmt(historialTotals.ssEmp), fmt(historialTotals.isr), fmt(historialTotals.ssPat), fmt(historialTotals.net), fmt(historialTotals.totalCostPatrono)]
          x = marginL
          cols.forEach((col, i) => { doc.text(totVals[i], col.align === "right" ? x + col.w - 1 : x + 1, y, { align: col.align }); x += col.w })
          y += 10; doc.setFontSize(6.5); doc.setFont("helvetica","normal"); doc.setTextColor(150,150,150)
          doc.text(`Generado el ${new Date().toLocaleDateString("es-PA", { day:"2-digit", month:"long", year:"numeric" })} · FlowPlanilla`, marginL, y)
          doc.save(`${fileBase}.pdf`)
        }

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(2px)" }}
            onClick={() => setHistorialModal(null)}
          >
            <div
              className={`relative w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden ${isDarkMode ? "bg-slate-900 border border-slate-700" : "bg-white border border-gray-200"}`}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`flex items-center justify-between px-6 py-4 border-b ${isDarkMode ? "border-slate-700" : "border-gray-200"}`}>
                <div>
                  <p className={`font-bold text-base ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                    Partida {hPart} — {partidaInfo.month} {hYear}
                  </p>
                  <p className={`text-xs mt-0.5 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
                    {partidaInfo.periodLabel(hYear)} · {historialEmpleados.length} empleados
                    {pago.paymentDate && <> · Pagada el {new Date(pago.paymentDate).toLocaleDateString("es-PA", { day: "2-digit", month: "short", year: "numeric" })}</>}
                    {pago.notes && <> · <span className="italic">{pago.notes}</span></>}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={handleHistExcel} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors">
                    <FileSpreadsheet size={13} /> Excel
                  </button>
                  <button onClick={handleHistPDF} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors">
                    <Download size={13} /> PDF
                  </button>
                  <button onClick={() => setHistorialModal(null)} className={`p-2 rounded-lg transition-colors ${isDarkMode ? "hover:bg-slate-800 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}>
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Totales */}
              <div className={`px-6 py-3 border-b flex items-center gap-6 flex-wrap ${isDarkMode ? "border-slate-700/60 bg-slate-800/40" : "border-gray-100 bg-gray-50"}`}>
                {[
                  { label: "Bruto",       value: fmt(historialTotals.gross),            color: isDarkMode ? "text-white" : "text-gray-900" },
                  { label: `SS Emp. ${ssEmpRate}%`, value: `-${fmt(historialTotals.ssEmp)}`, color: "text-red-400" },
                  { label: "ISR",         value: `-${fmt(historialTotals.isr)}`,         color: isDarkMode ? "text-blue-400" : "text-blue-600" },
                  { label: `SS Pat. ${ssPatRate}%`, value: fmt(historialTotals.ssPat),   color: isDarkMode ? "text-amber-400" : "text-amber-600" },
                  { label: "Neto",        value: fmt(historialTotals.net),               color: isDarkMode ? "text-green-400" : "text-green-600", large: true },
                  { label: "Monto pagado", value: pago.totalAmount != null ? fmt(pago.totalAmount) : "—", color: isDarkMode ? "text-slate-300" : "text-gray-700" },
                ].map(item => (
                  <div key={item.label} className="shrink-0">
                    <div className={`text-[10px] uppercase font-medium mb-0.5 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>{item.label}</div>
                    <div className={`font-mono font-bold ${"large" in item && item.large ? "text-base" : "text-sm"} ${item.color}`}>{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Tabla empleados */}
              <div className="overflow-y-auto max-h-[55vh]">
                <table className={`w-full text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                  <thead className={`sticky top-0 text-[10px] uppercase font-bold ${isDarkMode ? "bg-slate-900/80 text-gray-500" : "bg-gray-50 text-gray-500"}`}>
                    <tr>
                      <th className="px-4 py-3 text-left">Empleado</th>
                      <th className="px-4 py-3">Sal. Mensual</th>
                      <th className="px-4 py-3">Bruto</th>
                      <th className="px-4 py-3 text-red-400">SS Emp.</th>
                      <th className="px-4 py-3 text-blue-400">ISR</th>
                      <th className={`px-4 py-3 border-l-2 ${isDarkMode ? "border-slate-700 text-amber-400" : "border-gray-200 text-amber-600"}`}>SS Pat.</th>
                      <th className={`px-4 py-3 ${isDarkMode ? "text-amber-300" : "text-amber-700"}`}>Costo Pat.</th>
                      <th className={`px-4 py-3 border-l-2 text-green-400 font-bold ${isDarkMode ? "border-slate-700" : "border-gray-200"}`}>Neto</th>
                      <th className="px-4 py-3 w-10" />
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDarkMode ? "divide-slate-700/50" : "divide-gray-100"}`}>
                    {historialEmpleados.map(emp => (
                      <tr key={emp.id} className={isDarkMode ? "hover:bg-slate-800/20" : "hover:bg-gray-50"}>
                        <td className="px-4 py-3">
                          <div className={`font-medium text-sm ${isDarkMode ? "text-slate-200" : "text-gray-900"}`}>{emp.firstName} {emp.lastName}</div>
                          <div className={`text-[10px] ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>{emp.cedula}</div>
                        </td>
                        <td className="px-4 py-3 font-mono text-sm text-center">{fmt(emp.monthlySalary)}</td>
                        <td className={`px-4 py-3 font-mono font-semibold text-sm text-center ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>{fmt(emp.calc.grossThirteenth)}</td>
                        <td className="px-4 py-3 font-mono text-sm text-center text-red-400/80">-{fmt(emp.calc.ssEmp)}</td>
                        <td className="px-4 py-3 font-mono text-sm text-center text-blue-400/80">-{fmt(emp.calc.isr)}</td>
                        <td className={`px-4 py-3 font-mono text-sm text-center text-amber-400/80 border-l-2 ${isDarkMode ? "border-slate-700" : "border-gray-200"}`}>{fmt(emp.calc.ssPat)}</td>
                        <td className={`px-4 py-3 font-mono text-sm text-center ${isDarkMode ? "text-amber-300" : "text-amber-700"}`}>{fmt(emp.calc.totalCostPatrono)}</td>
                        <td className={`px-4 py-3 font-mono font-bold text-sm text-center border-l-2 ${isDarkMode ? "text-green-400 border-slate-700" : "text-green-600 border-gray-200"}`}>{fmt(emp.calc.net)}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => { setModalEmpContext({ partida: hPart, year: hYear }); setModalEmp(emp) }}
                            title="Ver desglose"
                            className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? "hover:bg-slate-700 text-gray-400 hover:text-blue-400" : "hover:bg-gray-100 text-gray-400 hover:text-blue-600"}`}
                          >
                            <FileSpreadsheet size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className={`font-bold text-xs border-t-2 ${isDarkMode ? "bg-slate-900/40 border-gray-600 text-white" : "bg-gray-100 border-gray-300 text-gray-900"}`}>
                      <td className="px-4 py-3 uppercase tracking-wide">Totales ({historialEmpleados.length})</td>
                      <td />
                      <td className="px-4 py-3 font-mono text-center">{fmt(historialTotals.gross)}</td>
                      <td className="px-4 py-3 font-mono text-center text-red-400">-{fmt(historialTotals.ssEmp)}</td>
                      <td className="px-4 py-3 font-mono text-center text-blue-400">-{fmt(historialTotals.isr)}</td>
                      <td className={`px-4 py-3 font-mono text-center text-amber-400 border-l-2 ${isDarkMode ? "border-slate-700" : "border-gray-200"}`}>{fmt(historialTotals.ssPat)}</td>
                      <td className={`px-4 py-3 font-mono text-center ${isDarkMode ? "text-amber-300" : "text-amber-700"}`}>{fmt(historialTotals.totalCostPatrono)}</td>
                      <td className={`px-4 py-3 font-mono text-base text-center border-l-2 ${isDarkMode ? "text-green-400 border-slate-700" : "text-green-600 border-gray-200"}`}>{fmt(historialTotals.net)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
