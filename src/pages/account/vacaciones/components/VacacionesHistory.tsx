"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
import { authFetcher, apiPatch } from "../../../../services/api"
import { useCompany } from "../../../../context/routerContext"
import { useTheme } from "../../../../context/themeContext"
import {
  Palmtree, Search, CheckCircle, XCircle, Clock, DollarSign,
  Loader2, Users, ChevronDown, ChevronUp, RefreshCw, Calendar,
  BadgeCheck, Ban,
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

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const LEAVE_TYPE_LABELS: Record<LeaveType, { label: string; color: string }> = {
  VACATION:        { label: "Vacaciones",       color: "teal"   },
  SICK_LEAVE:      { label: "Enfermedad",        color: "red"    },
  MATERNITY_LEAVE: { label: "Maternidad",        color: "pink"   },
  PERSONAL_LEAVE:  { label: "Personal",          color: "blue"   },
  UNPAID_LEAVE:    { label: "Sin Goce",          color: "amber"  },
  OTHER:           { label: "Otro",              color: "gray"   },
}

const STATUS_CFG: Record<LeaveStatus, { label: string; icon: React.ReactNode; cls: (dark: boolean) => string }> = {
  PENDING:   { label: "Pendiente",   icon: <Clock size={12} />,      cls: d => d ? "bg-amber-500/20 text-amber-400 border-amber-500/30"   : "bg-amber-100 text-amber-700 border-amber-300"   },
  APPROVED:  { label: "Aprobado",    icon: <CheckCircle size={12} />, cls: d => d ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-emerald-100 text-emerald-700 border-emerald-300" },
  REJECTED:  { label: "Rechazado",   icon: <XCircle size={12} />,    cls: d => d ? "bg-red-500/20 text-red-400 border-red-500/30"         : "bg-red-100 text-red-700 border-red-300"         },
  CANCELLED: { label: "Cancelado",   icon: <Ban size={12} />,        cls: d => d ? "bg-slate-500/20 text-slate-400 border-slate-500/30"   : "bg-gray-100 text-gray-600 border-gray-300"      },
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("es-PA", { day: "2-digit", month: "short", year: "numeric" })

// ─── BADGES ───────────────────────────────────────────────────────────────────

const LeaveTypeBadge: React.FC<{ type: LeaveType; isDark: boolean }> = ({ type, isDark }) => {
  const { label, color } = LEAVE_TYPE_LABELS[type]
  const colorMap: Record<string, string> = {
    teal:  isDark ? "bg-teal-500/20 text-teal-400 border-teal-500/30"   : "bg-teal-50 text-teal-700 border-teal-300",
    red:   isDark ? "bg-red-500/20 text-red-400 border-red-500/30"     : "bg-red-50 text-red-700 border-red-300",
    pink:  isDark ? "bg-pink-500/20 text-pink-400 border-pink-500/30"  : "bg-pink-50 text-pink-700 border-pink-300",
    blue:  isDark ? "bg-blue-500/20 text-blue-400 border-blue-500/30"  : "bg-blue-50 text-blue-700 border-blue-300",
    amber: isDark ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-amber-50 text-amber-700 border-amber-300",
    gray:  isDark ? "bg-slate-600/40 text-slate-400 border-slate-500/30" : "bg-gray-100 text-gray-600 border-gray-300",
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

// ─── FILA ─────────────────────────────────────────────────────────────────────

const LeaveRow: React.FC<{
  leave: LeaveRecord
  isDark: boolean
  onApprove: (id: string) => Promise<void>
  onReject: (id: string) => Promise<void>
  onPay: (id: string) => Promise<void>
  loading: string | null
}> = ({ leave, isDark, onApprove, onReject, onPay, loading }) => {
  const [open, setOpen] = useState(false)
  const busy = loading === leave.id
  const td = "px-4 py-3 text-sm"

  return (
    <>
      <tr
        onClick={() => setOpen(o => !o)}
        className={`cursor-pointer border-b transition-colors ${isDark ? "border-slate-700/50 hover:bg-slate-700/30" : "border-gray-100 hover:bg-gray-50"}`}
      >
        {/* Empleado */}
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

        {/* Tipo */}
        <td className={td}><LeaveTypeBadge type={leave.leaveType} isDark={isDark} /></td>

        {/* Período */}
        <td className={`${td} font-mono text-xs`}>
          <div className={isDark ? "text-slate-300" : "text-gray-700"}>
            <p>{fmtDate(leave.startDate)}</p>
            <p className={isDark ? "text-slate-500" : "text-gray-400"}>→ {fmtDate(leave.endDate)}</p>
          </div>
        </td>

        {/* Días */}
        <td className={`${td} font-mono font-semibold text-center ${isDark ? "text-slate-200" : "text-gray-800"}`}>
          {leave.daysApproved ?? leave.daysRequested}
          {leave.daysApproved !== null && leave.daysApproved !== leave.daysRequested && (
            <span className={`block text-[10px] ${isDark ? "text-slate-500" : "text-gray-400"}`}>
              (sol. {leave.daysRequested})
            </span>
          )}
        </td>

        {/* Estado */}
        <td className={td}><StatusBadge status={leave.status} isDark={isDark} /></td>

        {/* Pagado */}
        <td className={td}>
          {leave.isPaid ? (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${isDark ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-emerald-50 text-emerald-700 border-emerald-300"}`}>
              <DollarSign size={10} /> Pagado
            </span>
          ) : leave.status === "APPROVED" ? (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${isDark ? "bg-slate-600/40 text-slate-400 border-slate-500/30" : "bg-gray-100 text-gray-500 border-gray-300"}`}>
              Pendiente pago
            </span>
          ) : (
            <span className={`text-[11px] ${isDark ? "text-slate-600" : "text-gray-400"}`}>—</span>
          )}
        </td>

        {/* Acciones */}
        <td className={`${td} pr-6`} onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-1.5 justify-end">
            {leave.status === "PENDING" && (
              <>
                <button
                  disabled={busy}
                  onClick={() => onApprove(leave.id)}
                  className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
                  title="Aprobar"
                >
                  {busy ? <Loader2 size={12} className="animate-spin" /> : <BadgeCheck size={12} />}
                </button>
                <button
                  disabled={busy}
                  onClick={() => onReject(leave.id)}
                  className="p-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
                  title="Rechazar"
                >
                  <XCircle size={12} />
                </button>
              </>
            )}
            {leave.status === "APPROVED" && !leave.isPaid && (
              <button
                disabled={busy}
                onClick={() => onPay(leave.id)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold transition-colors disabled:opacity-50"
                title="Marcar como pagado"
              >
                {busy ? <Loader2 size={11} className="animate-spin" /> : <DollarSign size={11} />}
                Pagar
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
          <td colSpan={7} className="px-6 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className={`p-3 rounded-lg border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
                <p className={`text-[10px] uppercase font-bold mb-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>Motivo</p>
                <p className={isDark ? "text-slate-300" : "text-gray-700"}>{leave.reason || "—"}</p>
              </div>
              <div className={`p-3 rounded-lg border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
                <p className={`text-[10px] uppercase font-bold mb-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>Aprobado por</p>
                <p className={isDark ? "text-slate-300" : "text-gray-700"}>{leave.approvedBy || "—"}</p>
                {leave.approvalDate && (
                  <p className={`text-[10px] mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>{fmtDate(leave.approvalDate)}</p>
                )}
              </div>
              <div className={`p-3 rounded-lg border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
                <p className={`text-[10px] uppercase font-bold mb-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>Comentarios</p>
                <p className={isDark ? "text-slate-300" : "text-gray-700"}>{leave.comments || "—"}</p>
              </div>
              <div className={`p-3 rounded-lg border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
                <p className={`text-[10px] uppercase font-bold mb-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>Fecha de pago</p>
                <p className={isDark ? "text-slate-300" : "text-gray-700"}>{leave.paidAt ? fmtDate(leave.paidAt) : "—"}</p>
                <p className={`text-[10px] mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
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

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export const VacacionesHistory: React.FC = () => {
  const { selectedCompany } = useCompany()
  const { isDarkMode } = useTheme()

  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState<"ALL" | LeaveStatus>("ALL")
  const [filterType, setFilterType] = useState<"ALL" | LeaveType>("ALL")
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const url = selectedCompany?.id && selectedCompany.id !== "na"
    ? `${API_URL}/api/payroll/leaves?companyId=${selectedCompany.id}`
    : null

  const { data: leaves, isLoading, mutate } = useSWR<LeaveRecord[]>(url, authFetcher)

  const filtered = useMemo(() => {
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

  const handleApprove = async (id: string) => {
    setLoadingId(id)
    try {
      await apiPatch(`/api/payroll/leaves/${id}/approve`, { approvedBy: "Admin" })
      toast.success("Permiso aprobado correctamente")
      mutate()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al aprobar")
    } finally {
      setLoadingId(null)
    }
  }

  const handleReject = async (id: string) => {
    setLoadingId(id)
    try {
      await apiPatch(`/api/payroll/leaves/${id}/reject`, {})
      toast.success("Permiso rechazado")
      mutate()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al rechazar")
    } finally {
      setLoadingId(null)
    }
  }

  const handlePay = async (id: string) => {
    setLoadingId(id)
    try {
      await apiPatch(`/api/payroll/leaves/${id}/pay`)
      toast.success("Permiso marcado como pagado")
      mutate()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al marcar como pagado")
    } finally {
      setLoadingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-24 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
        <Loader2 className="animate-spin mr-3 text-teal-500" size={28} />
        <span className="text-sm">Cargando historial…</span>
      </div>
    )
  }

  return (
    <div>
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
        {/* Por estado */}
        <div className="flex flex-wrap gap-2">
          {(["ALL", "PENDING", "APPROVED", "REJECTED", "CANCELLED"] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                filterStatus === s
                  ? isDarkMode ? "bg-teal-600 border-teal-500 text-white" : "bg-teal-600 border-teal-500 text-white"
                  : isDarkMode ? "bg-slate-800 border-slate-700 text-gray-400" : "bg-white border-gray-300 text-gray-600"
              }`}
            >
              {s === "ALL" ? "Todos" : STATUS_CFG[s].label}
            </button>
          ))}
        </div>

        {/* Por tipo */}
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value as "ALL" | LeaveType)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border outline-none ${
            isDarkMode ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-white border-gray-300 text-gray-700"
          }`}
        >
          <option value="ALL">Todos los tipos</option>
          {(Object.keys(LEAVE_TYPE_LABELS) as LeaveType[]).map(t => (
            <option key={t} value={t}>{LEAVE_TYPE_LABELS[t].label}</option>
          ))}
        </select>
      </div>

      {/* Tabla */}
      <div className={`rounded-xl border overflow-hidden shadow-lg ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
        {/* Header tabla */}
        <div className={`p-4 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${isDarkMode ? "border-slate-700" : "border-gray-200"}`}>
          <div className="flex items-center gap-3">
            <Calendar className="text-teal-500" size={18} />
            <h3 className={`font-bold text-sm ${isDarkMode ? "text-white" : "text-gray-900"}`}>
              Historial de Permisos y Vacaciones
            </h3>
            <span className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
              ({filtered.length} de {leaves?.length ?? 0})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`} size={14} />
              <input
                type="text"
                placeholder="Buscar por nombre o cédula…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className={`pl-9 pr-4 py-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-teal-500 w-64 ${
                  isDarkMode ? "bg-slate-900 border border-slate-700 text-white placeholder-gray-600" : "bg-gray-100 border border-gray-300 text-gray-900 placeholder-gray-400"
                }`}
              />
            </div>
            <button
              onClick={() => mutate()}
              className={`p-2 rounded-lg transition-colors ${isDarkMode ? "text-slate-400 hover:text-white hover:bg-slate-700" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"}`}
              title="Recargar"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className={`w-full text-left ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
            <thead className={`text-[10px] uppercase font-bold tracking-wider ${isDarkMode ? "bg-slate-900/50 text-gray-500" : "bg-gray-50 text-gray-500"}`}>
              <tr>
                <th className="px-6 py-3">Colaborador</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Período</th>
                <th className="px-4 py-3 text-center">Días</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Pago</th>
                <th className="px-4 py-3 pr-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className={`text-center py-16 ${isDarkMode ? "text-gray-600" : "text-gray-400"}`}>
                    <Users className="mx-auto mb-3 opacity-30" size={32} />
                    <p className="text-sm">No se encontraron registros</p>
                  </td>
                </tr>
              ) : (
                filtered.map(l => (
                  <LeaveRow
                    key={l.id}
                    leave={l}
                    isDark={isDarkMode}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onPay={handlePay}
                    loading={loadingId}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className={`px-6 py-3 border-t text-xs ${isDarkMode ? "border-slate-700 bg-slate-900/30 text-gray-500" : "border-gray-100 bg-gray-50 text-gray-500"}`}>
            {filtered.length} registro{filtered.length !== 1 ? "s" : ""} · {counts.paid} pagado{counts.paid !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  )
}
