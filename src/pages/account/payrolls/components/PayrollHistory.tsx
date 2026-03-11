"use client"

/**
 * PayrollHistory.tsx — Fase 3
 * Historial de nóminas generadas con filtros por año/mes y estados.
 */

import { useState, useMemo } from "react"
import useSWR, { mutate } from "swr"
import {
  Calendar, Search, Lock, Unlock, FileX, Eye,
  ChevronUp, Users, TrendingUp, Loader2, AlertCircle,
} from "lucide-react"
import { useTheme } from "../../../../context/themeContext"
import { useCompany } from "../../../../context/routerContext"
import { authFetcher, getToken } from "../../../../services/api"
import { formatCurrency } from "../../../../lib/payrollCalculation"

// ─── Tipos ────────────────────────────────────────────────────────────────────

type PayrollStatus = "GENERATED" | "LOCKED" | "VOIDED" | "PENDING"

interface PayrollRecord {
  id: string
  employeeId: string
  payPeriod: string
  paymentDate: string
  baseSalary: number
  grossSalary: number
  totalDeductions: number
  netSalary: number
  workingDays: number
  salaryType: string
  payrollType: string
  status: PayrollStatus
  employee: {
    id: string
    firstName: string
    lastName: string
    cedula: string
    department?: string
    position?: string
    salaryType: string
  }
  deductions: { type: string; description: string; amount: number }[]
  allowances: { type: string; description: string; amount: number }[]
}

interface MonthSummary {
  month: number
  year: number
  count: number
  totalGross: number
  totalNet: number
  statuses: string[]
  hasLocked: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MONTHS_ES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
]

const STATUS_CONFIG: Record<PayrollStatus, { label: string; cls: string; dark: string }> = {
  GENERATED: {
    label: "Generada",
    cls:   "bg-blue-100 text-blue-700 border-blue-300",
    dark:  "bg-blue-900/30 text-blue-300 border-blue-700",
  },
  LOCKED: {
    label: "Bloqueada",
    cls:   "bg-green-100 text-green-700 border-green-300",
    dark:  "bg-green-900/30 text-green-300 border-green-700",
  },
  VOIDED: {
    label: "Anulada",
    cls:   "bg-red-100 text-red-600 border-red-300",
    dark:  "bg-red-900/30 text-red-400 border-red-700",
  },
  PENDING: {
    label: "Pendiente",
    cls:   "bg-amber-100 text-amber-700 border-amber-300",
    dark:  "bg-amber-900/30 text-amber-300 border-amber-700",
  },
}

const StatusBadge = ({ status, isDark }: { status: PayrollStatus; isDark: boolean }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
      isDark ? cfg.dark : cfg.cls
    }`}>
      {status === "LOCKED"    && <Lock    size={9} />}
      {status === "GENERATED" && <TrendingUp size={9} />}
      {status === "VOIDED"    && <FileX   size={9} />}
      {cfg.label}
    </span>
  )
}

// ─── Componente ───────────────────────────────────────────────────────────────

const API_URL = import.meta.env.VITE_API_URL as string

export default function PayrollHistory() {
  const { isDarkMode } = useTheme()
  const { selectedCompany } = useCompany()

  const currentYear = new Date().getFullYear()
  const [selectedYear,  setSelectedYear]  = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
  const [statusFilter,  setStatusFilter]  = useState<string>("ALL")
  const [search,        setSearch]        = useState("")
  const [expandedId,    setExpandedId]    = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [notification,  setNotification]  = useState<{ type: "success" | "error"; text: string } | null>(null)

  // ── Fetch summary (lista de meses con actividad) ──────────────────────────
  const { data: summaryData } = useSWR<{ year: number; months: MonthSummary[] }>(
    selectedCompany
      ? `${API_URL}/api/payroll/payrolls/summary?companyId=${selectedCompany.id}&year=${selectedYear}`
      : null,
    authFetcher,
    { revalidateOnFocus: false }
  )

  // ── Fetch historial detallado ─────────────────────────────────────────────
  const historyUrl = selectedCompany
    ? `${API_URL}/api/payroll/payrolls?companyId=${selectedCompany.id}&year=${selectedYear}${
        selectedMonth ? `&month=${selectedMonth}` : ""
      }${statusFilter !== "ALL" ? `&status=${statusFilter}` : ""}`
    : null

  const { data: payrolls = [], isLoading, error, mutate: mutateHistory } = useSWR<PayrollRecord[]>(
    historyUrl,
    authFetcher,
    { revalidateOnFocus: false }
  )

  // ── Filtro por búsqueda de empleado ──────────────────────────────────────
  const filtered = useMemo(() => {
    if (!search.trim()) return payrolls
    const q = search.toLowerCase()
    return payrolls.filter(p =>
      `${p.employee.firstName} ${p.employee.lastName}`.toLowerCase().includes(q) ||
      p.employee.cedula.includes(q) ||
      p.employee.department?.toLowerCase().includes(q)
    )
  }, [payrolls, search])

  // ── Agrupar por período (mes + quincena) ──────────────────────────────────
  const grouped = useMemo(() => {
    const map: Record<string, PayrollRecord[]> = {}
    for (const p of filtered) {
      const d = new Date(p.payPeriod)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${p.workingDays}`
      if (!map[key]) map[key] = []
      map[key].push(p)
    }
    // Ordenar por fecha desc
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a))
  }, [filtered])

  const notify = (type: "success" | "error", text: string) => {
    setNotification({ type, text })
    setTimeout(() => setNotification(null), 4000)
  }

  // ── Acción: bloquear/desbloquear ──────────────────────────────────────────
  const handleLock = async (payrollId: string, lock: boolean) => {
    setActionLoading(payrollId)
    try {
      const token = getToken()
      const res = await fetch(`${API_URL}/api/payroll/payrolls/${payrollId}/lock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ lock }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      notify("success", lock ? "Nómina bloqueada correctamente" : "Nómina desbloqueada")
      mutateHistory()
      mutate(historyUrl)
    } catch (e: any) {
      notify("error", e.message || "Error al cambiar estado")
    } finally {
      setActionLoading(null)
    }
  }

  // ── Acción: anular ────────────────────────────────────────────────────────
  const handleVoid = async (payrollId: string) => {
    if (!confirm("¿Seguro que deseas anular esta nómina? Podrás regenerarla luego.")) return
    setActionLoading(payrollId)
    try {
      const token = getToken()
      const res = await fetch(`${API_URL}/api/payroll/payrolls/${payrollId}/void`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error((await res.json()).error)
      notify("success", "Nómina anulada")
      mutateHistory()
    } catch (e: any) {
      notify("error", e.message || "Error al anular")
    } finally {
      setActionLoading(null)
    }
  }

  // ── Render header de grupo ────────────────────────────────────────────────
  const renderGroupHeader = (key: string, records: PayrollRecord[]) => {
    const [year, month, days] = key.split("-")
    const m   = parseInt(month) - 1
    const d   = parseInt(days)
    const label = d === 30
      ? `${MONTHS_ES[m]} ${year} — Mensual`
      : d === 15
        ? `${MONTHS_ES[m]} ${year} — Quincena`
        : `${MONTHS_ES[m]} ${year}`

    const totalNet   = records.reduce((s, r) => s + Number(r.netSalary),   0)
    const totalGross = records.reduce((s, r) => s + Number(r.grossSalary), 0)
    const statuses   = [...new Set(records.map(r => r.status))]
    const allLocked  = records.every(r => r.status === "LOCKED")

    return (
      <div className={`flex items-center justify-between px-5 py-3 rounded-t-xl border-b font-semibold text-sm ${
        isDarkMode
          ? "bg-slate-800 border-gray-700 text-white"
          : "bg-gray-100 border-gray-200 text-gray-800"
      }`}>
        <div className="flex items-center gap-3">
          <Calendar size={15} className={isDarkMode ? "text-blue-400" : "text-blue-600"} />
          <span>{label}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
            isDarkMode ? "bg-gray-700 text-gray-300" : "bg-white text-gray-600"
          }`}>
            {records.length} colaboradores
          </span>
          {statuses.map(s => (
            <StatusBadge key={s} status={s as PayrollStatus} isDark={isDarkMode} />
          ))}
        </div>
        <div className="flex items-center gap-6 text-xs">
          <span className={isDarkMode ? "text-gray-400" : "text-gray-500"}>
            Bruto: <span className="font-mono font-bold">{formatCurrency(totalGross)}</span>
          </span>
          <span className={isDarkMode ? "text-green-300" : "text-green-700"}>
            Neto: <span className="font-mono font-bold">{formatCurrency(totalNet)}</span>
          </span>
          {allLocked ? (
            <span className={`text-xs ${isDarkMode ? "text-green-400" : "text-green-600"} flex items-center gap-1`}>
              <Lock size={11} /> Cerrada
            </span>
          ) : (
            <span className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
              Abierta
            </span>
          )}
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER PRINCIPAL
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Notificación flotante */}
      {notification && (
        <div className={`fixed bottom-5 right-5 z-50 p-4 rounded-xl shadow-2xl border text-sm font-medium ${
          notification.type === "success"
            ? isDarkMode ? "bg-green-900 border-green-600 text-green-200" : "bg-green-100 border-green-400 text-green-800"
            : isDarkMode ? "bg-red-900 border-red-600 text-red-200"       : "bg-red-100 border-red-400 text-red-800"
        }`}>
          {notification.type === "success" ? "✅ " : "❌ "}{notification.text}
        </div>
      )}

      {/* ── FILTROS ─────────────────────────────────────────────────────── */}
      <div className={`rounded-xl border p-5 flex flex-wrap gap-4 items-end transition-colors ${
        isDarkMode ? "bg-slate-800 border-gray-700" : "bg-white border-gray-200"
      }`}>
        {/* Año */}
        <div>
          <label className={`block text-xs font-bold uppercase mb-1.5 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            Año
          </label>
          <select
            value={selectedYear}
            onChange={(e) => { setSelectedYear(Number(e.target.value)); setSelectedMonth(null) }}
            className={`rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isDarkMode ? "bg-gray-700 border border-gray-600 text-white" : "bg-white border border-gray-300 text-gray-900"
            }`}
          >
            {[currentYear, currentYear - 1, currentYear - 2].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Mes */}
        <div>
          <label className={`block text-xs font-bold uppercase mb-1.5 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            Mes
          </label>
          <select
            value={selectedMonth ?? ""}
            onChange={(e) => setSelectedMonth(e.target.value ? Number(e.target.value) : null)}
            className={`rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isDarkMode ? "bg-gray-700 border border-gray-600 text-white" : "bg-white border border-gray-300 text-gray-900"
            }`}
          >
            <option value="">Todos los meses</option>
            {MONTHS_ES.map((m, i) => {
              const hasActivity = summaryData?.months?.some(s => s.month === i + 1)
              return (
                <option key={i} value={i + 1}>
                  {m}{hasActivity ? " ●" : ""}
                </option>
              )
            })}
          </select>
        </div>

        {/* Estado */}
        <div>
          <label className={`block text-xs font-bold uppercase mb-1.5 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            Estado
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isDarkMode ? "bg-gray-700 border border-gray-600 text-white" : "bg-white border border-gray-300 text-gray-900"
            }`}
          >
            <option value="ALL">Todos los estados</option>
            <option value="GENERATED">Generadas</option>
            <option value="LOCKED">Bloqueadas</option>
            <option value="VOIDED">Anuladas</option>
          </select>
        </div>

        {/* Buscador */}
        <div className="flex-1 min-w-[200px]">
          <label className={`block text-xs font-bold uppercase mb-1.5 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            Buscar colaborador
          </label>
          <div className="relative">
            <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? "text-gray-400" : "text-gray-400"}`} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nombre, cédula, departamento..."
              className={`w-full pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDarkMode ? "bg-gray-700 border border-gray-600 text-white placeholder:text-gray-500"
                           : "bg-white border border-gray-300 text-gray-900 placeholder:text-gray-400"
              }`}
            />
          </div>
        </div>

        {/* Contadores */}
        <div className="ml-auto flex items-center gap-4 text-xs">
          <span className={isDarkMode ? "text-gray-400" : "text-gray-500"}>
            <span className="font-bold text-lg">{filtered.length}</span> registros
          </span>
          {summaryData?.months && (
            <span className={isDarkMode ? "text-gray-400" : "text-gray-500"}>
              <span className="font-bold text-lg">{summaryData.months.length}</span> meses con actividad
            </span>
          )}
        </div>
      </div>

      {/* ── RESUMEN ANUAL (barra de meses) ─────────────────────────────── */}
      {summaryData?.months && summaryData.months.length > 0 && (
        <div className={`rounded-xl border p-4 transition-colors ${
          isDarkMode ? "bg-slate-800 border-gray-700" : "bg-white border-gray-200"
        }`}>
          <p className={`text-xs font-bold uppercase mb-3 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            Actividad {selectedYear}
          </p>
          <div className="flex flex-wrap gap-2">
            {summaryData.months.map((ms) => (
              <button
                key={ms.month}
                onClick={() => setSelectedMonth(selectedMonth === ms.month ? null : ms.month)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  selectedMonth === ms.month
                    ? isDarkMode ? "bg-blue-600 text-white border-blue-500" : "bg-blue-600 text-white border-blue-600"
                    : ms.hasLocked
                      ? isDarkMode ? "bg-green-900/30 text-green-300 border-green-700" : "bg-green-100 text-green-700 border-green-300"
                      : isDarkMode ? "bg-gray-700 text-gray-300 border-gray-600" : "bg-gray-100 text-gray-700 border-gray-200"
                }`}
              >
                {MONTHS_ES[ms.month - 1].slice(0, 3)}
                <span className="ml-1 opacity-60">{ms.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── CUERPO PRINCIPAL ────────────────────────────────────────────── */}
      {isLoading && (
        <div className="flex items-center justify-center py-20 gap-3">
          <Loader2 size={24} className="animate-spin text-blue-400" />
          <span className={isDarkMode ? "text-gray-400" : "text-gray-500"}>Cargando historial...</span>
        </div>
      )}

      {error && !isLoading && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border ${
          isDarkMode ? "bg-red-900/20 text-red-400 border-red-800" : "bg-red-50 text-red-700 border-red-200"
        }`}>
          <AlertCircle size={18} />
          <span className="text-sm">Error al cargar el historial. Intenta de nuevo.</span>
        </div>
      )}

      {!isLoading && !error && filtered.length === 0 && (
        <div className={`flex flex-col items-center justify-center py-20 gap-3 ${
          isDarkMode ? "text-gray-600" : "text-gray-400"
        }`}>
          <Users size={48} className="opacity-20" />
          <p className="font-medium">No hay nóminas registradas para los filtros seleccionados</p>
          <p className="text-xs text-center">
            Genera una nómina en la pestaña "Nueva Nómina" y aparecerá aquí.
          </p>
        </div>
      )}

      {/* Grupos de nóminas por período */}
      {!isLoading && !error && grouped.map(([key, records]) => (
        <div key={key} className={`rounded-xl border overflow-hidden transition-colors ${
          isDarkMode ? "border-gray-700" : "border-gray-200"
        }`}>
          {renderGroupHeader(key, records)}

          {/* Tabla */}
          <div className="overflow-x-auto">
            <table className={`w-full text-xs ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
              <thead className={`uppercase text-[10px] tracking-wider ${
                isDarkMode ? "bg-slate-900/50 text-gray-500" : "bg-gray-50 text-gray-400"
              }`}>
                <tr>
                  <th className="px-4 py-2.5 text-left">Colaborador</th>
                  <th className="px-4 py-2.5 text-left">Departamento</th>
                  <th className="px-4 py-2.5 text-left">Período</th>
                  <th className="px-4 py-2.5 text-right">Bruto</th>
                  <th className="px-4 py-2.5 text-right">Descuentos</th>
                  <th className="px-4 py-2.5 text-right text-green-400">Neto</th>
                  <th className="px-4 py-2.5 text-center">Estado</th>
                  <th className="px-4 py-2.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? "divide-gray-700/40" : "divide-gray-100"}`}>
                {records.map((p) => {
                  const isExpanded = expandedId === p.id
                  const periodDate = new Date(p.payPeriod)
                  const periodLabel = p.workingDays === 30
                    ? `${MONTHS_ES[periodDate.getMonth()]} ${periodDate.getFullYear()}`
                    : `${p.workingDays === 15
                        ? (periodDate.getDate() <= 15 ? "1–15" : "16–31")
                        : ""
                      } ${MONTHS_ES[periodDate.getMonth()]} ${periodDate.getFullYear()}`
                  const isActioning = actionLoading === p.id

                  return (
                    <>
                      <tr
                        key={p.id}
                        className={`transition-colors ${
                          p.status === "VOIDED"
                            ? isDarkMode ? "opacity-40" : "opacity-40"
                            : isDarkMode ? "hover:bg-slate-700/30" : "hover:bg-gray-50"
                        }`}
                      >
                        {/* Empleado */}
                        <td className="px-4 py-3">
                          <div className={`font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                            {p.employee.firstName} {p.employee.lastName}
                          </div>
                          <div className={`text-[10px] ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                            {p.employee.cedula}
                          </div>
                        </td>

                        {/* Departamento */}
                        <td className={`px-4 py-3 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                          {p.employee.department || "—"}
                        </td>

                        {/* Período */}
                        <td className="px-4 py-3">
                          <span className={`text-[10px] px-2 py-1 rounded font-medium ${
                            isDarkMode ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"
                          }`}>
                            {periodLabel}
                          </span>
                        </td>

                        {/* Bruto */}
                        <td className={`px-4 py-3 text-right font-mono ${isDarkMode ? "text-gray-200" : "text-gray-800"}`}>
                          {formatCurrency(Number(p.grossSalary))}
                        </td>

                        {/* Descuentos */}
                        <td className={`px-4 py-3 text-right font-mono ${isDarkMode ? "text-red-400" : "text-red-600"}`}>
                          -{formatCurrency(Number(p.totalDeductions))}
                        </td>

                        {/* Neto */}
                        <td className={`px-4 py-3 text-right font-mono font-bold ${
                          isDarkMode ? "text-green-400" : "text-green-700"
                        }`}>
                          {formatCurrency(Number(p.netSalary))}
                        </td>

                        {/* Estado */}
                        <td className="px-4 py-3 text-center">
                          <StatusBadge status={p.status} isDark={isDarkMode} />
                        </td>

                        {/* Acciones */}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Ver detalles */}
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : p.id)}
                              className={`p-1.5 rounded transition-colors ${
                                isDarkMode
                                  ? "text-blue-400 hover:bg-blue-900/40"
                                  : "text-blue-600 hover:bg-blue-100"
                              }`}
                              title="Ver desglose"
                            >
                              {isExpanded ? <ChevronUp size={13} /> : <Eye size={13} />}
                            </button>

                            {/* Bloquear / desbloquear */}
                            {p.status !== "VOIDED" && (
                              <button
                                onClick={() => handleLock(p.id, p.status !== "LOCKED")}
                                disabled={isActioning}
                                className={`p-1.5 rounded transition-colors disabled:opacity-40 ${
                                  p.status === "LOCKED"
                                    ? isDarkMode ? "text-amber-400 hover:bg-amber-900/40" : "text-amber-600 hover:bg-amber-100"
                                    : isDarkMode ? "text-green-400 hover:bg-green-900/40" : "text-green-600 hover:bg-green-100"
                                }`}
                                title={p.status === "LOCKED" ? "Desbloquear nómina" : "Bloquear nómina"}
                              >
                                {isActioning
                                  ? <Loader2 size={13} className="animate-spin" />
                                  : p.status === "LOCKED" ? <Unlock size={13} /> : <Lock size={13} />
                                }
                              </button>
                            )}

                            {/* Anular */}
                            {p.status === "GENERATED" && (
                              <button
                                onClick={() => handleVoid(p.id)}
                                disabled={isActioning}
                                className={`p-1.5 rounded transition-colors disabled:opacity-40 ${
                                  isDarkMode
                                    ? "text-red-400 hover:bg-red-900/40"
                                    : "text-red-500 hover:bg-red-100"
                                }`}
                                title="Anular nómina"
                              >
                                <FileX size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Fila expandida con desglose */}
                      {isExpanded && (
                        <tr key={`${p.id}-detail`}>
                          <td colSpan={8} className={`px-8 py-4 ${
                            isDarkMode ? "bg-slate-900/50" : "bg-gray-50/80"
                          }`}>
                            <div className="grid grid-cols-2 gap-6">
                              {/* Ingresos */}
                              <div>
                                <p className={`text-[10px] uppercase font-bold mb-2 ${
                                  isDarkMode ? "text-gray-500" : "text-gray-400"
                                }`}>
                                  Ingresos
                                </p>
                                <div className="space-y-1">
                                  <div className="flex justify-between text-xs">
                                    <span className={isDarkMode ? "text-gray-400" : "text-gray-600"}>Salario Base</span>
                                    <span className="font-mono font-medium">{formatCurrency(Number(p.baseSalary))}</span>
                                  </div>
                                  {p.allowances.map((a, i) => (
                                    <div key={i} className="flex justify-between text-xs">
                                      <span className={isDarkMode ? "text-gray-400" : "text-gray-500"}>{a.description}</span>
                                      <span className="font-mono text-green-400">+{formatCurrency(Number(a.amount))}</span>
                                    </div>
                                  ))}
                                  <div className={`flex justify-between text-xs font-bold pt-1 border-t ${
                                    isDarkMode ? "border-gray-700" : "border-gray-200"
                                  }`}>
                                    <span>Bruto</span>
                                    <span className="font-mono">{formatCurrency(Number(p.grossSalary))}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Deducciones */}
                              <div>
                                <p className={`text-[10px] uppercase font-bold mb-2 ${
                                  isDarkMode ? "text-gray-500" : "text-gray-400"
                                }`}>
                                  Deducciones
                                </p>
                                <div className="space-y-1">
                                  {p.deductions.map((d, i) => (
                                    <div key={i} className="flex justify-between text-xs">
                                      <span className={isDarkMode ? "text-gray-400" : "text-gray-500"}>{d.description}</span>
                                      <span className="font-mono text-red-400">-{formatCurrency(Number(d.amount))}</span>
                                    </div>
                                  ))}
                                  <div className={`flex justify-between text-xs font-bold pt-1 border-t ${
                                    isDarkMode ? "border-gray-700" : "border-gray-200"
                                  }`}>
                                    <span className={isDarkMode ? "text-green-300" : "text-green-700"}>Neto a Pagar</span>
                                    <span className={`font-mono ${isDarkMode ? "text-green-300" : "text-green-700"}`}>
                                      {formatCurrency(Number(p.netSalary))}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>

              {/* Totales del grupo */}
              <tfoot>
                <tr className={`text-xs font-bold ${
                  isDarkMode ? "bg-slate-800 border-t border-gray-700" : "bg-gray-100 border-t border-gray-200"
                }`}>
                  <td colSpan={3} className={`px-4 py-2.5 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                    Totales del período ({records.filter(r => r.status !== "VOIDED").length} activos)
                  </td>
                  <td className={`px-4 py-2.5 text-right font-mono ${isDarkMode ? "text-gray-200" : "text-gray-800"}`}>
                    {formatCurrency(records.filter(r => r.status !== "VOIDED").reduce((s, r) => s + Number(r.grossSalary), 0))}
                  </td>
                  <td className={`px-4 py-2.5 text-right font-mono ${isDarkMode ? "text-red-400" : "text-red-600"}`}>
                    -{formatCurrency(records.filter(r => r.status !== "VOIDED").reduce((s, r) => s + Number(r.totalDeductions), 0))}
                  </td>
                  <td className={`px-4 py-2.5 text-right font-mono ${isDarkMode ? "text-green-400" : "text-green-700"}`}>
                    {formatCurrency(records.filter(r => r.status !== "VOIDED").reduce((s, r) => s + Number(r.netSalary), 0))}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}
