"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
import { authFetcher, apiPatch } from "../../../../services/api"
import { useCompany } from "../../../../context/routerContext"
import { useTheme } from "../../../../context/themeContext"
import {
  Search, CheckCircle, XCircle, Clock, DollarSign,
  Loader2, Users, ChevronDown, ChevronUp, RefreshCw, Calendar,
  BadgeCheck, Ban, ChevronLeft, LayoutList, LayoutGrid, Pencil,
} from "lucide-react"
import { toast } from "sonner"

const API_URL = import.meta.env.VITE_API_URL as string

// ─── TIPOS ────────────────────────────────────────────────────────────────────

type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED"
type LeaveType = "VACATION" | "SICK_LEAVE" | "MATERNITY_LEAVE" | "PERSONAL_LEAVE" | "UNPAID_LEAVE" | "OTHER"

interface LeaveRecord {
  id: string
  employeeId: string
  leaveType: LeaveType
  startDate: string
  endDate: string
  daysRequested: number
  daysApproved: number | null
  reason: string | null
  status: LeaveStatus
  approvedBy: string | null
  approvalDate: string | null
  comments: string | null
  isPaid: boolean
  paidAt: string | null
  createdAt: string
  employee: {
    cedula: string
    firstName: string
    lastName: string
    position: string
    department: string | null
  }
}

interface EmployeeGroup {
  employeeId: string
  cedula: string
  firstName: string
  lastName: string
  position: string
  department: string | null
  leaves: LeaveRecord[]
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const LEAVE_TYPE_LABELS: Record<LeaveType, { label: string; color: string }> = {
  VACATION:        { label: "Vacaciones",  color: "teal"   },
  SICK_LEAVE:      { label: "Enfermedad",  color: "red"    },
  MATERNITY_LEAVE: { label: "Maternidad",  color: "pink"   },
  PERSONAL_LEAVE:  { label: "Personal",    color: "blue"   },
  UNPAID_LEAVE:    { label: "Sin Goce",    color: "amber"  },
  OTHER:           { label: "Otro",        color: "gray"   },
}

const STATUS_CFG: Record<LeaveStatus, { label: string; icon: React.ReactNode; cls: (dark: boolean) => string }> = {
  PENDING:   { label: "Pendiente",  icon: <Clock size={12} />,       cls: d => d ? "bg-amber-500/20 text-amber-400 border-amber-500/30"       : "bg-amber-100 text-amber-700 border-amber-300"   },
  APPROVED:  { label: "Aprobado",   icon: <CheckCircle size={12} />, cls: d => d ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"  : "bg-emerald-100 text-emerald-700 border-emerald-300" },
  REJECTED:  { label: "Rechazado",  icon: <XCircle size={12} />,     cls: d => d ? "bg-red-500/20 text-red-400 border-red-500/30"             : "bg-red-100 text-red-700 border-red-300"         },
  CANCELLED: { label: "Cancelado",  icon: <Ban size={12} />,         cls: d => d ? "bg-slate-500/20 text-slate-400 border-slate-500/30"       : "bg-gray-100 text-gray-600 border-gray-300"      },
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("es-PA", { day: "2-digit", month: "short", year: "numeric" })

// ─── BADGES ───────────────────────────────────────────────────────────────────

const LeaveTypeBadge: React.FC<{ type: LeaveType; isDark: boolean }> = ({ type, isDark }) => {
  const { label, color } = LEAVE_TYPE_LABELS[type]
  const colorMap: Record<string, string> = {
    teal:  isDark ? "bg-teal-500/20 text-teal-400 border-teal-500/30"     : "bg-teal-50 text-teal-700 border-teal-300",
    red:   isDark ? "bg-red-500/20 text-red-400 border-red-500/30"       : "bg-red-50 text-red-700 border-red-300",
    pink:  isDark ? "bg-pink-500/20 text-pink-400 border-pink-500/30"    : "bg-pink-50 text-pink-700 border-pink-300",
    blue:  isDark ? "bg-blue-500/20 text-blue-400 border-blue-500/30"    : "bg-blue-50 text-blue-700 border-blue-300",
    amber: isDark ? "bg-amber-500/20 text-amber-400 border-amber-500/30"  : "bg-amber-50 text-amber-700 border-amber-300",
    gray:  isDark ? "bg-slate-600/40 text-slate-400 border-slate-500/30"  : "bg-gray-100 text-gray-600 border-gray-300",
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${colorMap[color]}`}>
      {label}
    </span>
  )
}

const StatusBadge: React.FC<{ status: LeaveStatus; isDark: boolean }> = ({ status, isDark }) => {
  const { label, icon, cls } = STATUS_CFG[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${cls(isDark)}`}>
      {icon} {label}
    </span>
  )
}

// ─── FILA DE PERMISO ─────────────────────────────────────────────────────────

const LeaveRow: React.FC<{
  leave: LeaveRecord
  isDark: boolean
  onApprove: (id: string) => Promise<void>
  onReject: (id: string) => Promise<void>
  onCancel: (id: string) => Promise<void>
  onPay: (id: string, date: string) => Promise<void>
  loading: string | null
  compact?: boolean
}> = ({ leave, isDark, onApprove, onReject, onCancel, onPay, loading, compact }) => {
  const [open, setOpen] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10))
  const busy = loading === leave.id
  const td = "px-4 py-3 text-sm"

  return (
    <>
      <tr
        onClick={() => setOpen(o => !o)}
        className={`cursor-pointer border-b transition-colors ${isDark ? "border-slate-700/50 hover:bg-slate-700/30" : "border-gray-100 hover:bg-gray-50"}`}
      >
        {/* Empleado (sólo en modo lista global) */}
        {!compact && (
          <td className={`${td} pl-6`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isDark ? "bg-teal-500/20 text-teal-400" : "bg-teal-100 text-teal-700"}`}>
                {leave.employee.firstName[0]}{leave.employee.lastName[0]}
              </div>
              <div>
                <p className={`font-semibold text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                  {leave.employee.firstName} {leave.employee.lastName}
                </p>
                <p className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                  {leave.employee.cedula} · {leave.employee.position}
                </p>
              </div>
            </div>
          </td>
        )}

        {/* Tipo */}
        <td className={compact ? "px-3 py-2.5 text-sm" : td}>
          <LeaveTypeBadge type={leave.leaveType} isDark={isDark} />
        </td>

        {/* Período */}
        <td className={`${compact ? "px-3 py-2.5" : td} font-mono text-xs`}>
          <div className={isDark ? "text-slate-300" : "text-gray-700"}>
            <p>{fmtDate(leave.startDate)}</p>
            <p className={isDark ? "text-slate-500" : "text-gray-400"}>→ {fmtDate(leave.endDate)}</p>
          </div>
        </td>

        {/* Días */}
        <td className={`${compact ? "px-3 py-2.5" : td} font-mono font-semibold text-center ${isDark ? "text-slate-200" : "text-gray-800"}`}>
          {leave.daysApproved ?? leave.daysRequested}
          {leave.daysApproved !== null && leave.daysApproved !== leave.daysRequested && (
            <span className={`block text-[10px] ${isDark ? "text-slate-500" : "text-gray-400"}`}>(sol. {leave.daysRequested})</span>
          )}
        </td>

        {/* Estado */}
        <td className={compact ? "px-3 py-2.5 text-sm" : td}>
          <StatusBadge status={leave.status} isDark={isDark} />
        </td>

        {/* Pagado */}
        <td className={compact ? "px-3 py-2.5 text-sm" : td}>
          {leave.isPaid ? (
            <div>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${isDark ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-emerald-50 text-emerald-700 border-emerald-300"}`}>
                <DollarSign size={10} /> Pagado
              </span>
              {leave.paidAt && (
                <p className={`text-[10px] mt-0.5 font-mono ${isDark ? "text-gray-500" : "text-gray-400"}`}>{fmtDate(leave.paidAt)}</p>
              )}
            </div>
          ) : leave.status === "APPROVED" ? (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${isDark ? "bg-slate-600/40 text-slate-400 border-slate-500/30" : "bg-gray-100 text-gray-500 border-gray-300"}`}>
              Pendiente pago
            </span>
          ) : (
            <span className={`text-[11px] ${isDark ? "text-slate-600" : "text-gray-400"}`}>—</span>
          )}
        </td>

        {/* Acciones */}
        <td className={`${compact ? "px-3 py-2.5" : td} pr-4`} onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-1.5 justify-end flex-wrap">
            {/* Botón pagar (solo APPROVED + no pagado) */}
            {leave.status === "APPROVED" && !leave.isPaid && !editMode && (
              showDatePicker ? (
                <div className="flex items-center gap-1">
                  <input
                    type="date"
                    value={payDate}
                    onChange={e => setPayDate(e.target.value)}
                    className={`px-2 py-1 rounded-lg text-[11px] border outline-none focus:ring-1 focus:ring-teal-500 ${isDark ? "bg-slate-700 border-slate-600 text-slate-200" : "bg-white border-gray-300 text-gray-800"}`}
                  />
                  <button
                    disabled={busy || !payDate}
                    onClick={async () => { await onPay(leave.id, payDate); setShowDatePicker(false) }}
                    className="flex items-center gap-0.5 px-2 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold transition-colors disabled:opacity-50"
                  >
                    {busy ? <Loader2 size={11} className="animate-spin" /> : <DollarSign size={11} />}
                    OK
                  </button>
                  <button
                    onClick={() => setShowDatePicker(false)}
                    className={`p-1 rounded text-[11px] transition-colors ${isDark ? "text-slate-500 hover:text-slate-300" : "text-gray-400 hover:text-gray-600"}`}
                  >✕</button>
                </div>
              ) : (
                <button
                  disabled={busy}
                  onClick={() => setShowDatePicker(true)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold transition-colors disabled:opacity-50"
                  title="Marcar como pagado"
                >
                  <DollarSign size={11} /> Pagar
                </button>
              )
            )}

            {/* Panel editar estado */}
            {editMode ? (
              <div className="flex items-center gap-1">
                {leave.status !== "APPROVED" && (
                  <button
                    disabled={busy}
                    onClick={async () => { await onApprove(leave.id); setEditMode(false) }}
                    className="flex items-center gap-0.5 px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-colors disabled:opacity-50"
                    title="Aprobar"
                  >
                    {busy ? <Loader2 size={11} className="animate-spin" /> : <BadgeCheck size={11} />}
                    Aprobar
                  </button>
                )}
                {leave.status !== "REJECTED" && (
                  <button
                    disabled={busy}
                    onClick={async () => { await onReject(leave.id); setEditMode(false) }}
                    className="flex items-center gap-0.5 px-2 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold transition-colors disabled:opacity-50"
                    title="Rechazar"
                  >
                    <XCircle size={11} /> Rechazar
                  </button>
                )}
                {leave.status !== "CANCELLED" && (
                  <button
                    disabled={busy}
                    onClick={async () => { await onCancel(leave.id); setEditMode(false) }}
                    className={`flex items-center gap-0.5 px-2 py-1 rounded-lg text-[11px] font-bold transition-colors disabled:opacity-50 ${isDark ? "bg-slate-600 hover:bg-slate-500 text-slate-200" : "bg-gray-200 hover:bg-gray-300 text-gray-700"}`}
                    title="Cancelar permiso"
                  >
                    <Ban size={11} /> Cancelar
                  </button>
                )}
                <button
                  onClick={() => setEditMode(false)}
                  className={`p-1 rounded text-[11px] transition-colors ${isDark ? "text-slate-500 hover:text-slate-300" : "text-gray-400 hover:text-gray-600"}`}
                >✕</button>
              </div>
            ) : (
              <button
                onClick={() => { setShowDatePicker(false); setEditMode(true) }}
                className={`p-1.5 rounded-lg transition-colors ${isDark ? "text-slate-500 hover:text-teal-400 hover:bg-slate-700" : "text-gray-400 hover:text-teal-600 hover:bg-gray-100"}`}
                title="Editar estado"
              >
                <Pencil size={12} />
              </button>
            )}

            <button onClick={() => setOpen(o => !o)} className={`p-1 rounded ${isDark ? "text-slate-500 hover:text-slate-300" : "text-gray-400 hover:text-gray-600"}`}>
              {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </td>
      </tr>

      {/* Detalle expandido */}
      {open && (
        <tr className={isDark ? "bg-slate-900/40" : "bg-teal-50/40"}>
          <td colSpan={compact ? 6 : 7} className="px-6 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {/* Fecha de salida */}
              <div className={`p-3 rounded-lg border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
                <p className={`text-[10px] uppercase font-bold mb-1 ${isDark ? "text-teal-500" : "text-teal-600"}`}>Fecha de Salida</p>
                <p className={`font-mono font-semibold ${isDark ? "text-slate-200" : "text-gray-800"}`}>{fmtDate(leave.startDate)}</p>
                <p className={`text-[10px] mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>Inicio del permiso</p>
              </div>
              {/* Fecha de regreso */}
              <div className={`p-3 rounded-lg border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
                <p className={`text-[10px] uppercase font-bold mb-1 ${isDark ? "text-blue-500" : "text-blue-600"}`}>Fecha de Ingreso</p>
                <p className={`font-mono font-semibold ${isDark ? "text-slate-200" : "text-gray-800"}`}>{fmtDate(leave.endDate)}</p>
                <p className={`text-[10px] mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                  {leave.daysApproved ?? leave.daysRequested} días tomados
                </p>
              </div>
              {/* Pago */}
              <div className={`p-3 rounded-lg border ${
                leave.isPaid
                  ? isDark ? "bg-emerald-900/20 border-emerald-700/50" : "bg-emerald-50 border-emerald-200"
                  : isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"
              }`}>
                <p className={`text-[10px] uppercase font-bold mb-1 ${leave.isPaid ? (isDark ? "text-emerald-400" : "text-emerald-600") : isDark ? "text-gray-500" : "text-gray-500"}`}>
                  Pago
                </p>
                {leave.isPaid ? (
                  <>
                    <p className={`font-semibold ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>✓ Pagado</p>
                    {leave.paidAt && (
                      <p className={`font-mono text-[10px] mt-0.5 ${isDark ? "text-emerald-500" : "text-emerald-600"}`}>{fmtDate(leave.paidAt)}</p>
                    )}
                  </>
                ) : (
                  <p className={isDark ? "text-slate-400" : "text-gray-500"}>Pendiente</p>
                )}
              </div>
              {/* Observaciones */}
              <div className={`p-3 rounded-lg border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
                <p className={`text-[10px] uppercase font-bold mb-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>Observaciones</p>
                <p className={isDark ? "text-slate-300" : "text-gray-700"}>{leave.reason || "—"}</p>
                {leave.comments && (
                  <p className={`text-[10px] mt-1 italic ${isDark ? "text-gray-500" : "text-gray-400"}`}>{leave.comments}</p>
                )}
                <p className={`text-[10px] mt-1 ${isDark ? "text-gray-600" : "text-gray-400"}`}>
                  Solicitud: {fmtDate(leave.createdAt)}
                </p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── VISTA POR EMPLEADO ───────────────────────────────────────────────────────

const EmployeeDetailView: React.FC<{
  group: EmployeeGroup
  isDark: boolean
  onBack: () => void
  onApprove: (id: string) => Promise<void>
  onReject: (id: string) => Promise<void>
  onCancel: (id: string) => Promise<void>
  onPay: (id: string, date: string) => Promise<void>
  loadingId: string | null
  onRefresh: () => void
}> = ({ group, isDark, onBack, onApprove, onReject, onCancel, onPay, loadingId, onRefresh }) => {
  const [filterStatus, setFilterStatus] = useState<"ALL" | LeaveStatus>("ALL")
  const [filterType, setFilterType] = useState<"ALL" | LeaveType>("ALL")

  const filtered = useMemo(() => {
    return group.leaves.filter(l => {
      const matchStatus = filterStatus === "ALL" || l.status === filterStatus
      const matchType = filterType === "ALL" || l.leaveType === filterType
      return matchStatus && matchType
    })
  }, [group.leaves, filterStatus, filterType])

  const totals = useMemo(() => ({
    total:    group.leaves.length,
    approved: group.leaves.filter(l => l.status === "APPROVED").length,
    pending:  group.leaves.filter(l => l.status === "PENDING").length,
    paid:     group.leaves.filter(l => l.isPaid).length,
    daysApproved: group.leaves.filter(l => l.status === "APPROVED").reduce((s, l) => s + (l.daysApproved ?? l.daysRequested), 0),
    daysPaid:     group.leaves.filter(l => l.isPaid).reduce((s, l) => s + (l.daysApproved ?? l.daysRequested), 0),
  }), [group.leaves])

  const card = `rounded-xl border p-4 ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={onBack}
          className={`p-2 rounded-lg transition-colors ${isDark ? "text-slate-400 hover:text-white hover:bg-slate-700" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"}`}
        >
          <ChevronLeft size={18} />
        </button>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 ${isDark ? "bg-teal-500/20 text-teal-400" : "bg-teal-100 text-teal-700"}`}>
          {group.firstName[0]}{group.lastName[0]}
        </div>
        <div>
          <h2 className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
            {group.firstName} {group.lastName}
          </h2>
          <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>
            {group.cedula} · {group.position} {group.department ? `· ${group.department}` : ""}
          </p>
        </div>
        <button
          onClick={onRefresh}
          className={`ml-auto p-2 rounded-lg transition-colors ${isDark ? "text-slate-400 hover:text-white hover:bg-slate-700" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"}`}
          title="Recargar"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Stats del empleado */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        {[
          { label: "Total Solicitudes", value: totals.total,        accent: isDark ? "text-slate-200" : "text-gray-800" },
          { label: "Aprobadas",          value: totals.approved,    accent: "text-emerald-500" },
          { label: "Pendientes",         value: totals.pending,     accent: "text-amber-500" },
          { label: "Días Aprobados",     value: totals.daysApproved, accent: "text-blue-500" },
          { label: "Días Pagados",       value: totals.daysPaid,    accent: "text-teal-500" },
        ].map(({ label, value, accent }) => (
          <div key={label} className={card}>
            <p className={`text-[10px] uppercase font-bold tracking-widest mb-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>{label}</p>
            <p className={`text-2xl font-black font-mono ${accent}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(["ALL", "PENDING", "APPROVED", "REJECTED", "CANCELLED"] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
              filterStatus === s
                ? "bg-teal-600 border-teal-500 text-white"
                : isDark ? "bg-slate-800 border-slate-700 text-gray-400" : "bg-white border-gray-300 text-gray-600"
            }`}
          >
            {s === "ALL" ? "Todos" : STATUS_CFG[s].label}
          </button>
        ))}
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value as "ALL" | LeaveType)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border outline-none ${isDark ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-white border-gray-300 text-gray-700"}`}
        >
          <option value="ALL">Todos los tipos</option>
          {(Object.keys(LEAVE_TYPE_LABELS) as LeaveType[]).map(t => (
            <option key={t} value={t}>{LEAVE_TYPE_LABELS[t].label}</option>
          ))}
        </select>
      </div>

      {/* Tabla */}
      <div className={`rounded-xl border overflow-hidden shadow-lg ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
        <div className="overflow-x-auto">
          <table className={`w-full text-left ${isDark ? "text-gray-300" : "text-gray-700"}`}>
            <thead className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? "bg-slate-900/50 text-gray-500" : "bg-gray-50 text-gray-500"}`}>
              <tr>
                <th className="px-3 py-3">Tipo</th>
                <th className="px-3 py-3">Salida / Regreso</th>
                <th className="px-3 py-3 text-center">Días</th>
                <th className="px-3 py-3">Estado</th>
                <th className="px-3 py-3">Pago</th>
                <th className="px-3 py-3 pr-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className={`text-center py-12 ${isDark ? "text-gray-600" : "text-gray-400"}`}>
                    <Calendar className="mx-auto mb-2 opacity-30" size={28} />
                    <p className="text-sm">Sin registros</p>
                  </td>
                </tr>
              ) : (
                filtered.map(l => (
                  <LeaveRow
                    key={l.id}
                    leave={l}
                    isDark={isDark}
                    onApprove={onApprove}
                    onReject={onReject}
                    onCancel={onCancel}
                    onPay={onPay}
                    loading={loadingId}
                    compact
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className={`px-4 py-2.5 border-t text-xs ${isDark ? "border-slate-700 bg-slate-900/30 text-gray-500" : "border-gray-100 bg-gray-50 text-gray-500"}`}>
            {filtered.length} registro{filtered.length !== 1 ? "s" : ""} · {totals.paid} pagado{totals.paid !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── LISTA DE EMPLEADOS ───────────────────────────────────────────────────────

const EmployeeListView: React.FC<{
  groups: EmployeeGroup[]
  isDark: boolean
  search: string
  onSearch: (v: string) => void
  onSelect: (g: EmployeeGroup) => void
}> = ({ groups, isDark, search, onSearch, onSelect }) => {
  const card = `rounded-xl border cursor-pointer transition-all p-4 ${isDark ? "bg-slate-800 border-slate-700 hover:border-teal-500/50 hover:bg-slate-700/60" : "bg-white border-gray-200 hover:border-teal-400 hover:shadow-md"}`

  return (
    <div>
      {/* Buscador */}
      <div className="relative mb-5">
        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? "text-gray-500" : "text-gray-400"}`} size={15} />
        <input
          type="text"
          placeholder="Buscar colaborador…"
          value={search}
          onChange={e => onSearch(e.target.value)}
          className={`w-full pl-9 pr-4 py-2.5 text-sm rounded-xl outline-none focus:ring-2 focus:ring-teal-500 ${isDark ? "bg-slate-800 border border-slate-700 text-white placeholder-gray-600" : "bg-white border border-gray-200 text-gray-900 placeholder-gray-400"}`}
        />
      </div>

      {groups.length === 0 ? (
        <div className={`text-center py-16 ${isDark ? "text-gray-600" : "text-gray-400"}`}>
          <Users className="mx-auto mb-3 opacity-30" size={32} />
          <p className="text-sm">No se encontraron colaboradores</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {groups.map(g => {
            const pending  = g.leaves.filter(l => l.status === "PENDING").length
            const approved = g.leaves.filter(l => l.status === "APPROVED").length
            const paid     = g.leaves.filter(l => l.isPaid).length
            const daysTotal = g.leaves.filter(l => l.status === "APPROVED").reduce((s, l) => s + (l.daysApproved ?? l.daysRequested), 0)

            return (
              <div key={g.employeeId} className={card} onClick={() => onSelect(g)}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 ${isDark ? "bg-teal-500/20 text-teal-400" : "bg-teal-100 text-teal-700"}`}>
                    {g.firstName[0]}{g.lastName[0]}
                  </div>
                  <div className="min-w-0">
                    <p className={`font-semibold text-sm truncate ${isDark ? "text-white" : "text-gray-900"}`}>{g.firstName} {g.lastName}</p>
                    <p className={`text-[10px] truncate ${isDark ? "text-gray-500" : "text-gray-500"}`}>{g.cedula} · {g.position}</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-1.5 text-center">
                  {[
                    { label: "Total", value: g.leaves.length, color: isDark ? "text-slate-300" : "text-gray-700" },
                    { label: "Pend.", value: pending,  color: "text-amber-500" },
                    { label: "Apro.", value: approved, color: "text-emerald-500" },
                    { label: "Días",  value: daysTotal, color: "text-blue-500" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className={`rounded-lg py-1.5 ${isDark ? "bg-slate-700/50" : "bg-gray-50"}`}>
                      <p className={`text-xs font-bold font-mono ${color}`}>{value}</p>
                      <p className={`text-[9px] uppercase ${isDark ? "text-gray-600" : "text-gray-400"}`}>{label}</p>
                    </div>
                  ))}
                </div>
                {paid > 0 && (
                  <p className={`mt-2 text-[10px] font-semibold ${isDark ? "text-teal-400" : "text-teal-600"}`}>
                    ✓ {paid} permiso{paid !== 1 ? "s" : ""} pagado{paid !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export const VacacionesHistory: React.FC = () => {
  const { selectedCompany } = useCompany()
  const { isDarkMode } = useTheme()

  const [mode, setMode] = useState<"list" | "byEmployee">("list")
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeGroup | null>(null)
  const [search, setSearch] = useState("")
  const [empSearch, setEmpSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState<"ALL" | LeaveStatus>("ALL")
  const [filterType, setFilterType] = useState<"ALL" | LeaveType>("ALL")
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const url = selectedCompany?.id && selectedCompany.id !== "na"
    ? `${API_URL}/api/payroll/leaves?companyId=${selectedCompany.id}`
    : null

  const { data: leaves, isLoading, mutate } = useSWR<LeaveRecord[]>(url, authFetcher)

  // ── Agrupación por empleado ──
  const employeeGroups = useMemo<EmployeeGroup[]>(() => {
    if (!leaves) return []
    const map = new Map<string, EmployeeGroup>()
    for (const l of leaves) {
      if (!map.has(l.employeeId)) {
        map.set(l.employeeId, {
          employeeId: l.employeeId,
          cedula: l.employee.cedula,
          firstName: l.employee.firstName,
          lastName: l.employee.lastName,
          position: l.employee.position,
          department: l.employee.department,
          leaves: [],
        })
      }
      map.get(l.employeeId)!.leaves.push(l)
    }
    return Array.from(map.values()).sort((a, b) =>
      `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`)
    )
  }, [leaves])

  const filteredGroups = useMemo(() => {
    if (!empSearch) return employeeGroups
    const q = empSearch.toLowerCase()
    return employeeGroups.filter(g =>
      `${g.firstName} ${g.lastName}`.toLowerCase().includes(q) || g.cedula.includes(q)
    )
  }, [employeeGroups, empSearch])

  // ── Lista global filtrada ──
  const filteredList = useMemo(() => {
    if (!leaves) return []
    return leaves.filter(l => {
      const name = `${l.employee.firstName} ${l.employee.lastName}`.toLowerCase()
      const matchSearch = name.includes(search.toLowerCase()) || l.employee.cedula.includes(search)
      const matchStatus = filterStatus === "ALL" || l.status === filterStatus
      const matchType = filterType === "ALL" || l.leaveType === filterType
      return matchSearch && matchStatus && matchType
    })
  }, [leaves, search, filterStatus, filterType])

  const counts = useMemo(() => ({
    PENDING:   leaves?.filter(l => l.status === "PENDING").length  ?? 0,
    APPROVED:  leaves?.filter(l => l.status === "APPROVED").length ?? 0,
    REJECTED:  leaves?.filter(l => l.status === "REJECTED").length ?? 0,
    CANCELLED: leaves?.filter(l => l.status === "CANCELLED").length ?? 0,
    paid:      leaves?.filter(l => l.isPaid).length ?? 0,
  }), [leaves])

  // ── Acciones ──
  const handleApprove = async (id: string) => {
    setLoadingId(id)
    try {
      await apiPatch(`/api/payroll/leaves/${id}/approve`, { approvedBy: "Admin" })
      toast.success("Permiso aprobado")
      mutate()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Error al aprobar") }
    finally { setLoadingId(null) }
  }

  const handleReject = async (id: string) => {
    setLoadingId(id)
    try {
      await apiPatch(`/api/payroll/leaves/${id}/reject`, {})
      toast.success("Permiso rechazado")
      mutate()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Error al rechazar") }
    finally { setLoadingId(null) }
  }

  const handleCancel = async (id: string) => {
    setLoadingId(id)
    try {
      await apiPatch(`/api/payroll/leaves/${id}/cancel`, {})
      toast.success("Permiso cancelado")
      mutate()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Error al cancelar") }
    finally { setLoadingId(null) }
  }

  const handlePay = async (id: string, date: string) => {
    setLoadingId(id)
    try {
      await apiPatch(`/api/payroll/leaves/${id}/pay`, { paidAt: date })
      toast.success("Permiso marcado como pagado")
      mutate()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Error al marcar como pagado") }
    finally { setLoadingId(null) }
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-24 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
        <Loader2 className="animate-spin mr-3 text-teal-500" size={28} />
        <span className="text-sm">Cargando historial…</span>
      </div>
    )
  }

  // ── Vista por empleado seleccionado ──
  if (mode === "byEmployee" && selectedEmployee) {
    const refreshedGroup = employeeGroups.find(g => g.employeeId === selectedEmployee.employeeId) ?? selectedEmployee
    return (
      <EmployeeDetailView
        group={refreshedGroup}
        isDark={isDarkMode}
        onBack={() => setSelectedEmployee(null)}
        onApprove={handleApprove}
        onReject={handleReject}
        onCancel={handleCancel}
        onPay={handlePay}
        loadingId={loadingId}
        onRefresh={() => mutate()}
      />
    )
  }

  return (
    <div>
      {/* Modo toggle */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className={`flex items-center gap-1 p-1 rounded-xl w-fit ${isDarkMode ? "bg-slate-800" : "bg-white border border-gray-200"}`}>
          <button
            onClick={() => setMode("list")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${mode === "list" ? "bg-teal-600 text-white shadow" : isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-gray-500 hover:text-gray-700"}`}
          >
            <LayoutList size={15} /> Lista Global
          </button>
          <button
            onClick={() => setMode("byEmployee")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${mode === "byEmployee" ? "bg-teal-600 text-white shadow" : isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-gray-500 hover:text-gray-700"}`}
          >
            <LayoutGrid size={15} /> Por Empleado
          </button>
        </div>

        {mode === "list" && (
          <button
            onClick={() => mutate()}
            className={`p-2 rounded-lg transition-colors ${isDarkMode ? "text-slate-400 hover:text-white hover:bg-slate-700" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"}`}
            title="Recargar"
          >
            <RefreshCw size={15} />
          </button>
        )}
      </div>

      {/* ── MODO: POR EMPLEADO ── */}
      {mode === "byEmployee" && (
        <EmployeeListView
          groups={filteredGroups}
          isDark={isDarkMode}
          search={empSearch}
          onSearch={setEmpSearch}
          onSelect={g => setSelectedEmployee(g)}
        />
      )}

      {/* ── MODO: LISTA GLOBAL ── */}
      {mode === "list" && (
        <>
          {/* Tarjetas de resumen */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {[
              { label: "Pendientes",  value: counts.PENDING,   accent: "text-amber-500",   bg: isDarkMode ? "bg-amber-500/10" : "bg-amber-50" },
              { label: "Aprobados",   value: counts.APPROVED,  accent: "text-emerald-500", bg: isDarkMode ? "bg-emerald-500/10" : "bg-emerald-50" },
              { label: "Rechazados",  value: counts.REJECTED,  accent: "text-red-500",     bg: isDarkMode ? "bg-red-500/10" : "bg-red-50" },
              { label: "Cancelados",  value: counts.CANCELLED, accent: isDarkMode ? "text-slate-400" : "text-gray-500", bg: isDarkMode ? "bg-slate-700/40" : "bg-gray-100" },
              { label: "Pagados",     value: counts.paid,      accent: "text-teal-500",    bg: isDarkMode ? "bg-teal-500/10" : "bg-teal-50" },
            ].map(({ label, value, accent, bg }) => (
              <div key={label} className={`p-4 rounded-xl border ${isDarkMode ? "border-slate-700" : "border-gray-200"} ${bg}`}>
                <p className={`text-[10px] uppercase font-bold tracking-widest mb-1 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>{label}</p>
                <p className={`text-2xl font-bold font-mono ${accent}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-3 mb-5">
            <div className="flex flex-wrap gap-2">
              {(["ALL", "PENDING", "APPROVED", "REJECTED", "CANCELLED"] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                    filterStatus === s
                      ? "bg-teal-600 border-teal-500 text-white"
                      : isDarkMode ? "bg-slate-800 border-slate-700 text-gray-400" : "bg-white border-gray-300 text-gray-600"
                  }`}
                >
                  {s === "ALL" ? "Todos" : STATUS_CFG[s].label}
                </button>
              ))}
            </div>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value as "ALL" | LeaveType)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border outline-none ${isDarkMode ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-white border-gray-300 text-gray-700"}`}
            >
              <option value="ALL">Todos los tipos</option>
              {(Object.keys(LEAVE_TYPE_LABELS) as LeaveType[]).map(t => (
                <option key={t} value={t}>{LEAVE_TYPE_LABELS[t].label}</option>
              ))}
            </select>
          </div>

          {/* Tabla */}
          <div className={`rounded-xl border overflow-hidden shadow-lg ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
            <div className={`p-4 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${isDarkMode ? "border-slate-700" : "border-gray-200"}`}>
              <div className="flex items-center gap-3">
                <Calendar className="text-teal-500" size={18} />
                <h3 className={`font-bold text-sm ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                  Historial de Permisos y Vacaciones
                </h3>
                <span className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
                  ({filteredList.length} de {leaves?.length ?? 0})
                </span>
              </div>
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`} size={14} />
                <input
                  type="text"
                  placeholder="Buscar por nombre o cédula…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className={`pl-9 pr-4 py-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-teal-500 w-64 ${isDarkMode ? "bg-slate-900 border border-slate-700 text-white placeholder-gray-600" : "bg-gray-100 border border-gray-300 text-gray-900 placeholder-gray-400"}`}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className={`w-full text-left ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                <thead className={`text-[10px] uppercase font-bold tracking-wider ${isDarkMode ? "bg-slate-900/50 text-gray-500" : "bg-gray-50 text-gray-500"}`}>
                  <tr>
                    <th className="px-6 py-3">Colaborador</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Salida / Regreso</th>
                    <th className="px-4 py-3 text-center">Días</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Pago</th>
                    <th className="px-4 py-3 pr-6 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className={`text-center py-16 ${isDarkMode ? "text-gray-600" : "text-gray-400"}`}>
                        <Users className="mx-auto mb-3 opacity-30" size={32} />
                        <p className="text-sm">No se encontraron registros</p>
                      </td>
                    </tr>
                  ) : (
                    filteredList.map(l => (
                      <LeaveRow
                        key={l.id}
                        leave={l}
                        isDark={isDarkMode}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        onCancel={handleCancel}
                        onPay={handlePay}
                        loading={loadingId}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {filteredList.length > 0 && (
              <div className={`px-6 py-3 border-t text-xs ${isDarkMode ? "border-slate-700 bg-slate-900/30 text-gray-500" : "border-gray-100 bg-gray-50 text-gray-500"}`}>
                {filteredList.length} registro{filteredList.length !== 1 ? "s" : ""} · {counts.paid} pagado{counts.paid !== 1 ? "s" : ""}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
