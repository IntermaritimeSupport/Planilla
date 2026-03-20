"use client"

import { useState, useMemo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import useSWR, { mutate } from "swr"
import { authFetcher, apiPatch } from "../../../../services/api"
import { useCompany } from "../../../../context/routerContext"
import { useTheme } from "../../../../context/themeContext"
import {
  type VacacionesEmployee,
  type VacacionesLegalParam,
  calculateEmployeeVacaciones,
} from "./vacacionesCalculation"
import {
  ArrowLeft, Palmtree, Calendar, Clock, DollarSign, CheckCircle,
  AlertTriangle, Loader2, BadgeCheck, Ban, XCircle, Plus,
  ChevronDown, ChevronUp, Info,
} from "lucide-react"
import { toast } from "sonner"

// ─── TIPOS ────────────────────────────────────────────────────────────────────

type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED"
type LeaveType   = "VACATION" | "SICK_LEAVE" | "MATERNITY_LEAVE" | "PERSONAL_LEAVE" | "UNPAID_LEAVE" | "OTHER"

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
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const API_URL = import.meta.env.VITE_API_URL as string

const fmt = (n: number) =>
  `$${(Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("es-PA", { day: "2-digit", month: "short", year: "numeric" })

const STATUS_CFG: Record<LeaveStatus, { label: string; icon: React.ReactNode; cls: (d: boolean) => string }> = {
  PENDING:   { label: "Pendiente",  icon: <Clock size={11} />,       cls: d => d ? "bg-amber-500/20 text-amber-400 border-amber-500/30"      : "bg-amber-100 text-amber-700 border-amber-300" },
  APPROVED:  { label: "Aprobado",   icon: <CheckCircle size={11} />, cls: d => d ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-emerald-100 text-emerald-700 border-emerald-300" },
  REJECTED:  { label: "Rechazado",  icon: <XCircle size={11} />,     cls: d => d ? "bg-red-500/20 text-red-400 border-red-500/30"            : "bg-red-100 text-red-700 border-red-300" },
  CANCELLED: { label: "Cancelado",  icon: <Ban size={11} />,         cls: d => d ? "bg-slate-500/20 text-slate-400 border-slate-500/30"      : "bg-gray-100 text-gray-600 border-gray-300" },
}

const LEAVE_LABELS: Record<LeaveType, string> = {
  VACATION:        "Vacaciones",
  SICK_LEAVE:      "Enfermedad",
  MATERNITY_LEAVE: "Maternidad",
  PERSONAL_LEAVE:  "Personal",
  UNPAID_LEAVE:    "Sin Goce",
  OTHER:           "Otro",
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────

const StatCard: React.FC<{ label: string; value: string; sub?: string; accent?: string; isDark: boolean }> = ({
  label, value, sub, accent = "text-teal-400", isDark,
}) => (
  <div className={`p-4 rounded-xl border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
    <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mb-1">{label}</p>
    <p className={`text-xl font-bold font-mono ${accent}`}>{value}</p>
    {sub && <p className="text-[11px] text-gray-500 mt-1">{sub}</p>}
  </div>
)

// ─── FILA DE PERMISO ─────────────────────────────────────────────────────────

const LeaveRow: React.FC<{
  leave: LeaveRecord
  isDark: boolean
  onApprove: (id: string) => Promise<void>
  onReject: (id: string) => Promise<void>
  onCancel: (id: string) => Promise<void>
  onPay: (id: string, date: string) => Promise<void>
  loading: string | null
}> = ({ leave, isDark, onApprove, onReject, onCancel, onPay, loading }) => {
  const [open, setOpen] = useState(false)
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10))
  const busy = loading === leave.id
  const cfg = STATUS_CFG[leave.status]

  return (
    <>
      <tr
        onClick={() => setOpen(o => !o)}
        className={`cursor-pointer border-b transition-colors ${isDark ? "border-slate-700/50 hover:bg-slate-700/30" : "border-gray-100 hover:bg-gray-50"}`}
      >
        <td className="px-4 py-3 text-sm">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border
            ${isDark ? "bg-teal-500/20 text-teal-400 border-teal-500/30" : "bg-teal-50 text-teal-700 border-teal-300"}`}>
            {LEAVE_LABELS[leave.leaveType]}
          </span>
        </td>
        <td className={`px-4 py-3 text-sm font-mono ${isDark ? "text-slate-300" : "text-gray-700"}`}>
          {fmtDate(leave.startDate)}
        </td>
        <td className={`px-4 py-3 text-sm font-mono ${isDark ? "text-slate-300" : "text-gray-700"}`}>
          {fmtDate(leave.endDate)}
        </td>
        <td className={`px-4 py-3 text-sm font-mono font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
          {leave.daysApproved ?? leave.daysRequested}d
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.cls(isDark)}`}>
            {cfg.icon} {cfg.label}
          </span>
        </td>
        <td className="px-4 py-3">
          {leave.isPaid ? (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border
              ${isDark ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-emerald-100 text-emerald-700 border-emerald-300"}`}>
              <BadgeCheck size={10} /> Pagado {leave.paidAt ? fmtDate(leave.paidAt) : ""}
            </span>
          ) : (
            <span className="text-[10px] text-gray-500">—</span>
          )}
        </td>
        <td className="px-4 py-3 pr-5 text-right">
          {open ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
        </td>
      </tr>

      {open && (
        <tr className={isDark ? "bg-slate-900/40" : "bg-teal-50/40"}>
          <td colSpan={7} className="px-5 py-4">
            <div className="flex flex-wrap gap-3 items-center">
              {/* Motivo */}
              {leave.reason && (
                <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  <span className="font-bold">Motivo:</span> {leave.reason}
                </p>
              )}

              {/* Acciones de estado */}
              {leave.status === "PENDING" && (
                <>
                  <button
                    disabled={busy}
                    onClick={e => { e.stopPropagation(); onApprove(leave.id) }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {busy ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                    Aprobar
                  </button>
                  <button
                    disabled={busy}
                    onClick={e => { e.stopPropagation(); onReject(leave.id) }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    <XCircle size={12} /> Rechazar
                  </button>
                </>
              )}

              {leave.status === "APPROVED" && !leave.isPaid && (
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <input
                    type="date"
                    value={payDate}
                    onChange={e => setPayDate(e.target.value)}
                    className={`text-xs px-2 py-1.5 rounded-lg border outline-none focus:ring-2 focus:ring-teal-500 ${
                      isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-300 text-gray-900"
                    }`}
                  />
                  <button
                    disabled={busy}
                    onClick={() => onPay(leave.id, payDate)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {busy ? <Loader2 size={12} className="animate-spin" /> : <DollarSign size={12} />}
                    Marcar Pagado
                  </button>
                </div>
              )}

              {(leave.status === "PENDING" || leave.status === "APPROVED") && (
                <button
                  disabled={busy}
                  onClick={e => { e.stopPropagation(); onCancel(leave.id) }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors disabled:opacity-50
                    ${isDark ? "border-slate-600 text-slate-400 hover:bg-slate-700" : "border-gray-300 text-gray-600 hover:bg-gray-100"}`}
                >
                  <Ban size={12} /> Cancelar
                </button>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── MODAL NUEVA SOLICITUD ────────────────────────────────────────────────────

const NuevaSolicitudModal: React.FC<{
  employeeId: string
  isDark: boolean
  onClose: () => void
  onCreated: () => void
  existingLeaves: LeaveRecord[]
}> = ({ employeeId, isDark, onClose, onCreated, existingLeaves }) => {
  const [form, setForm] = useState({
    leaveType: "VACATION" as LeaveType,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    reason: "",
  })
  const [saving, setSaving] = useState(false)
  const [overlapError, setOverlapError] = useState<string | null>(null)

  const checkOverlap = (startDate: string, endDate: string) => {
    if (new Date(endDate) < new Date(startDate)) {
      setOverlapError("La fecha de fin no puede ser anterior a la fecha de inicio.")
      return
    }
    const newStart = new Date(startDate).getTime()
    const newEnd   = new Date(endDate).getTime()
    const conflict = existingLeaves.find(l => {
      if (l.status === "CANCELLED" || l.status === "REJECTED") return false
      const s = new Date(l.startDate).getTime()
      const e = new Date(l.endDate).getTime()
      return newStart <= e && newEnd >= s
    })
    if (conflict) {
      setOverlapError(
        `Ya existe un permiso que se superpone: ${new Date(conflict.startDate).toLocaleDateString("es-PA")} — ${new Date(conflict.endDate).toLocaleDateString("es-PA")}`
      )
    } else {
      setOverlapError(null)
    }
  }

  const handleDateChange = (field: "startDate" | "endDate", value: string) => {
    const updated = { ...form, [field]: value }
    // Si cambia inicio y es posterior al fin, ajusta el fin automáticamente
    if (field === "startDate" && value > updated.endDate) {
      updated.endDate = value
    }
    setForm(updated)
    checkOverlap(updated.startDate, updated.endDate)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (overlapError) return
    setSaving(true)
    try {
      const start = new Date(form.startDate)
      const end = new Date(form.endDate)
      const daysRequested = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1)
      const res = await fetch(`${API_URL}/api/payroll/leaves`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("jwt")}`,
        },
        body: JSON.stringify({ ...form, employeeId, daysRequested }),
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success("Solicitud creada")
      onCreated()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear")
    } finally {
      setSaving(false)
    }
  }

  const inputCls = `w-full px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2 focus:ring-teal-500 transition-colors ${
    isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-300 text-gray-900"
  }`
  const labelCls = `block text-[11px] font-bold uppercase tracking-wide mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full max-w-md rounded-2xl border shadow-2xl z-10 ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
        <div className="p-5 border-b flex items-center justify-between border-opacity-20">
          <h3 className={`font-bold text-sm ${isDark ? "text-white" : "text-gray-900"}`}>Nueva Solicitud de Permiso</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-lg leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className={labelCls}>Tipo de Permiso</label>
            <select
              value={form.leaveType}
              onChange={e => setForm(f => ({ ...f, leaveType: e.target.value as LeaveType }))}
              className={inputCls}
            >
              {(Object.keys(LEAVE_LABELS) as LeaveType[]).map(t => (
                <option key={t} value={t}>{LEAVE_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Fecha Inicio</label>
              <input type="date" value={form.startDate} onChange={e => handleDateChange("startDate", e.target.value)} className={inputCls} required />
            </div>
            <div>
              <label className={labelCls}>Fecha Fin</label>
              <input type="date" value={form.endDate} min={form.startDate} onChange={e => handleDateChange("endDate", e.target.value)} className={inputCls} required />
            </div>
          </div>
          {overlapError && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-500/15 border border-red-500/30 text-xs text-red-400">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              {overlapError}
            </div>
          )}
          <div>
            <label className={labelCls}>Motivo (opcional)</label>
            <textarea
              value={form.reason}
              onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              rows={2}
              placeholder="Describe el motivo…"
              className={`${inputCls} resize-none`}
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className={`flex-1 py-2 text-sm font-bold rounded-lg border transition-colors ${isDark ? "border-slate-600 text-slate-300 hover:bg-slate-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}>
              Cancelar
            </button>
            <button type="submit" disabled={saving || !!overlapError} className="flex-1 py-2 text-sm font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {saving && <Loader2 size={14} className="animate-spin" />}
              Crear Solicitud
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export const VacacionesEmpleadoPerfil: React.FC = () => {
  const { employeeId } = useParams<{ employeeId: string }>()
  const navigate = useNavigate()
  const { selectedCompany } = useCompany()
  const { isDarkMode: d } = useTheme()
  const [loading, setLoading] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [filterType, setFilterType] = useState<"ALL" | LeaveType>("ALL")

  // ── DATA ──
  const empKey = selectedCompany && employeeId
    ? `${API_URL}/api/payroll/employees/${employeeId}`
    : null
  const { data: employee } = useSWR<VacacionesEmployee>(empKey, authFetcher)

  const paramsKey = selectedCompany
    ? `${API_URL}/api/system/legal-parameters?companyId=${selectedCompany.id}`
    : null
  const { data: legalParams } = useSWR<VacacionesLegalParam[]>(paramsKey, authFetcher)

  const leavesKey = selectedCompany && employeeId
    ? `${API_URL}/api/payroll/leaves?companyId=${selectedCompany.id}&employeeId=${employeeId}`
    : null
  const { data: leaves, isLoading: loadingLeaves } = useSWR<LeaveRecord[]>(leavesKey, authFetcher)

  // ── CÁLCULO VACACIONES ──
  const calc = useMemo(() => {
    if (!employee || !legalParams) return null
    return calculateEmployeeVacaciones(employee, legalParams)
  }, [employee, legalParams])

  // ── ESTADÍSTICAS DE PERMISOS ──
  // daysEarned = días de vacaciones ganados proporcionales (escala: 30 días/año)
  // daysRequested/daysApproved en permisos = días calendario de vacaciones
  // Ambos están en la misma escala (días de vacaciones)
  const vacLeaves = useMemo(
    () => (leaves ?? []).filter(l => l.leaveType === "VACATION" && l.status !== "CANCELLED" && l.status !== "REJECTED"),
    [leaves]
  )
  const diasTomados = useMemo(
    () => vacLeaves
      .filter(l => l.status === "APPROVED")
      .reduce((s, l) => s + (l.daysApproved ?? l.daysRequested), 0),
    [vacLeaves]
  )
  const diasPagados = useMemo(
    () => vacLeaves
      .filter(l => l.status === "APPROVED" && l.isPaid)
      .reduce((s, l) => s + (l.daysApproved ?? l.daysRequested), 0),
    [vacLeaves]
  )
  // Días disponibles = días ganados proporcionales - días ya tomados (aprobados)
  // nextVacationDays es más preciso: días que corresponden al período actual completo
  const diasDisponibles = useMemo(
    () => Math.max(0, (calc?.nextVacationDays ?? 0) - diasTomados),
    [calc, diasTomados]
  )
  // Monto neto actualizado descontando días tomados
  const montoDisponible = useMemo(() => {
    if (!calc) return 0
    return Math.max(0, diasDisponibles * calc.dailySalary)
  }, [diasDisponibles, calc])

  // ── FILTRO PERMISOS ──
  const filteredLeaves = useMemo(
    () => filterType === "ALL" ? (leaves ?? []) : (leaves ?? []).filter(l => l.leaveType === filterType),
    [leaves, filterType]
  )

  // ── ACCIONES ──
  const refreshLeaves = () => mutate(leavesKey)

  const handleApprove = async (id: string) => {
    setLoading(id)
    try {
      await apiPatch(`/api/payroll/leaves/${id}/approve`, {})
      toast.success("Permiso aprobado")
      refreshLeaves()
    } catch { toast.error("Error al aprobar") } finally { setLoading(null) }
  }

  const handleReject = async (id: string) => {
    setLoading(id)
    try {
      await apiPatch(`/api/payroll/leaves/${id}/reject`, {})
      toast.success("Permiso rechazado")
      refreshLeaves()
    } catch { toast.error("Error al rechazar") } finally { setLoading(null) }
  }

  const handleCancel = async (id: string) => {
    setLoading(id)
    try {
      await apiPatch(`/api/payroll/leaves/${id}/cancel`, {})
      toast.success("Permiso cancelado")
      refreshLeaves()
    } catch { toast.error("Error al cancelar") } finally { setLoading(null) }
  }

  const handlePay = async (id: string, date: string) => {
    setLoading(id)
    try {
      await apiPatch(`/api/payroll/leaves/${id}/pay`, { paidAt: date })
      toast.success("Vacación marcada como pagada")
      refreshLeaves()
    } catch { toast.error("Error al registrar pago") } finally { setLoading(null) }
  }

  // ── LOADING STATE ──
  if (!employee || !calc) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] ${d ? "bg-slate-900" : "bg-gray-50"}`}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-teal-500" size={36} />
          <p className={`text-sm ${d ? "text-gray-400" : "text-gray-600"}`}>Cargando perfil…</p>
        </div>
      </div>
    )
  }

  const statusColor = calc.status === "disponible" ? "text-emerald-500" : calc.status === "parcial" ? "text-amber-500" : "text-slate-400"
  const statusLabel = calc.status === "disponible" ? "Período completo" : calc.status === "parcial" ? "Proporcional" : "< 3 meses"

  return (
    <div className={`transition-colors ${d ? "bg-slate-900" : ""}`}>

      {/* ── HEADER ── */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${
            d ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-gray-200 text-gray-700 hover:bg-gray-50"
          }`}
        >
          <ArrowLeft size={15} /> Volver
        </button>
        <div>
          <h1 className={`text-xl font-bold ${d ? "text-white" : "text-gray-900"}`}>
            Perfil de Vacaciones
          </h1>
          <p className={`text-xs ${d ? "text-gray-500" : "text-gray-500"}`}>
            Detalle individual · {selectedCompany?.name}
          </p>
        </div>
      </div>

      {/* ── TARJETA DE EMPLEADO ── */}
      <div className={`rounded-2xl border p-6 mb-6 ${d ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold
              ${d ? "bg-teal-500/20 text-teal-400" : "bg-teal-100 text-teal-700"}`}>
              {employee.firstName[0]}{employee.lastName[0]}
            </div>
            <div>
              <h2 className={`text-lg font-bold ${d ? "text-white" : "text-gray-900"}`}>
                {employee.firstName} {employee.lastName}
              </h2>
              <p className={`text-sm ${d ? "text-gray-400" : "text-gray-600"}`}>
                {employee.position || "Sin cargo"} · {employee.cedula}
              </p>
              <p className={`text-xs mt-0.5 ${d ? "text-gray-500" : "text-gray-500"}`}>
                Ingreso: {calc.hireDate.toLocaleDateString("es-PA", { day: "2-digit", month: "long", year: "numeric" })}
                &nbsp;·&nbsp;
                {calc.yearsWorked > 0 ? `${calc.yearsWorked} año${calc.yearsWorked !== 1 ? "s" : ""} ` : ""}
                {calc.monthsWorked % 12} mes{(calc.monthsWorked % 12) !== 1 ? "es" : ""}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-xs font-bold uppercase ${d ? "text-gray-500" : "text-gray-500"}`}>Estado Vacaciones</p>
            <p className={`text-lg font-bold ${statusColor}`}>{statusLabel}</p>
            <p className={`text-xs font-mono ${d ? "text-gray-400" : "text-gray-600"}`}>
              {calc.monthsWorked % 12 === 0 && calc.monthsWorked >= 11
                ? "Período completo acumulado"
                : `${calc.monthsWorked % 12} / 11 meses`}
            </p>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="mt-5">
          <div className="flex justify-between items-center mb-1.5">
            <p className={`text-xs font-bold ${d ? "text-gray-400" : "text-gray-600"}`}>
              Progreso hacia período completo (11 meses)
            </p>
            <p className={`text-xs font-mono font-bold ${d ? "text-teal-400" : "text-teal-600"}`}>
              {Math.min(100, Math.round(((calc.monthsWorked % 12 === 0 && calc.monthsWorked >= 11 ? 11 : calc.monthsWorked % 12) / 11) * 100))}%
            </p>
          </div>
          <div className={`h-2 rounded-full overflow-hidden ${d ? "bg-slate-700" : "bg-gray-200"}`}>
            <div
              className={`h-full rounded-full transition-all ${
                calc.status === "disponible" ? "bg-emerald-500" :
                calc.status === "parcial" ? "bg-amber-500" : "bg-slate-500"
              }`}
              style={{ width: `${Math.min(100, ((calc.monthsWorked % 12 === 0 && calc.monthsWorked >= 11 ? 11 : calc.monthsWorked % 12) / 11) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── MÉTRICAS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Días del Período"
          value={`${calc.nextVacationDays} días`}
          sub={calc.status === "disponible" ? "Período completo (30 días)" : `Proporcional · ${calc.monthsWorked % 12}m trabajados`}
          accent={d ? "text-white" : "text-gray-900"}
          isDark={d}
        />
        <StatCard
          label="Días Disponibles"
          value={`${diasDisponibles} días`}
          sub={diasTomados > 0 ? `${diasTomados}d tomados · ${diasPagados}d pagados` : "Sin vacaciones tomadas"}
          accent={diasDisponibles > 0 ? "text-teal-500" : "text-amber-500"}
          isDark={d}
        />
        <StatCard
          label="Salario Diario"
          value={fmt(calc.dailySalary)}
          sub={`Mensual: ${fmt(calc.monthlyBaseSalary)}`}
          accent={d ? "text-slate-200" : "text-gray-800"}
          isDark={d}
        />
        <StatCard
          label="Monto Disponible"
          value={fmt(montoDisponible)}
          sub={diasTomados > 0 ? `Bruto total: ${fmt(calc.grossVacationPay)}` : `SS+SE+ISR: ${fmt(calc.totalDeductions)}`}
          accent="text-emerald-500"
          isDark={d}
        />
      </div>

      {/* ── DESGLOSE CÁLCULO ── */}
      <div className={`rounded-xl border p-5 mb-6 ${d ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
        <div className="flex items-center gap-2 mb-4">
          <Palmtree size={16} className="text-teal-500" />
          <h3 className={`font-bold text-sm ${d ? "text-white" : "text-gray-900"}`}>Desglose del Cálculo</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="space-y-2">
            <div className={`flex justify-between pb-1 border-b ${d ? "border-slate-700 text-gray-400" : "border-gray-100 text-gray-600"}`}>
              <span>Salario mensual</span>
              <span className={`font-bold ${d ? "text-white" : "text-gray-900"}`}>{fmt(calc.monthlyBaseSalary)}</span>
            </div>
            <div className={`flex justify-between pb-1 border-b ${d ? "border-slate-700 text-gray-400" : "border-gray-100 text-gray-600"}`}>
              <span>Salario diario</span>
              <span className={`font-bold ${d ? "text-white" : "text-gray-900"}`}>{fmt(calc.dailySalary)}</span>
            </div>
            <div className={`flex justify-between pb-1 border-b ${d ? "border-slate-700 text-gray-400" : "border-gray-100 text-gray-600"}`}>
              <span>Días ganados</span>
              <span className={`font-bold ${d ? "text-white" : "text-gray-900"}`}>{calc.daysEarned.toFixed(2)}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className={`flex justify-between pb-1 border-b ${d ? "border-slate-700 text-gray-400" : "border-gray-100 text-gray-600"}`}>
              <span>Bruto vacaciones</span>
              <span className={`font-bold ${d ? "text-white" : "text-gray-900"}`}>{fmt(calc.grossVacationPay)}</span>
            </div>
            <div className="flex justify-between pb-1 border-b border-red-500/20">
              <span className="text-red-400">– SS (9.75%)</span>
              <span className="font-bold text-red-400">-{fmt(calc.ss)}</span>
            </div>
            <div className="flex justify-between pb-1 border-b border-red-500/20">
              <span className="text-red-400">– SE (1.25%)</span>
              <span className="font-bold text-red-400">-{fmt(calc.se)}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between pb-1 border-b border-blue-500/20">
              <span className="text-blue-400">– ISR</span>
              <span className="font-bold text-blue-400">-{fmt(calc.isr)}</span>
            </div>
            <div className={`flex justify-between pb-1 border-b ${d ? "border-slate-700 text-gray-400" : "border-gray-100 text-gray-600"}`}>
              <span>Total deducciones</span>
              <span className="font-bold text-red-400">-{fmt(calc.totalDeductions)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-400 font-bold">NETO</span>
              <span className="font-bold text-emerald-400">{fmt(calc.netVacationPay)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── HISTORIAL DE PERMISOS ── */}
      <div className={`rounded-xl border overflow-hidden ${d ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
        {/* Header */}
        <div className={`p-4 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-3 ${d ? "border-slate-700" : "border-gray-200"}`}>
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-teal-500" />
            <h3 className={`font-bold text-sm ${d ? "text-white" : "text-gray-900"}`}>Historial de Permisos</h3>
            <span className={`text-xs ${d ? "text-gray-500" : "text-gray-500"}`}>({filteredLeaves.length})</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filtro tipo */}
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value as "ALL" | LeaveType)}
              className={`text-xs px-3 py-1.5 rounded-lg border outline-none focus:ring-2 focus:ring-teal-500 ${
                d ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-300 text-gray-900"
              }`}
            >
              <option value="ALL">Todos los tipos</option>
              {(Object.keys(LEAVE_LABELS) as LeaveType[]).map(t => (
                <option key={t} value={t}>{LEAVE_LABELS[t]}</option>
              ))}
            </select>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg transition-colors"
            >
              <Plus size={13} /> Nueva Solicitud
            </button>
          </div>
        </div>

        {/* Resumen vacaciones pagadas */}
        {diasPagados > 0 && (
          <div className={`px-5 py-3 border-b flex items-center gap-2 text-xs ${d ? "border-slate-700 bg-emerald-900/20" : "border-gray-100 bg-emerald-50"}`}>
            <BadgeCheck size={14} className="text-emerald-500" />
            <span className={d ? "text-emerald-400" : "text-emerald-700"}>
              <strong>{diasPagados} días</strong> de vacaciones ya pagados en el historial
            </span>
          </div>
        )}

        {/* Tabla */}
        {loadingLeaves ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={28} className="animate-spin text-teal-500" />
          </div>
        ) : filteredLeaves.length === 0 ? (
          <div className={`text-center py-14 ${d ? "text-gray-600" : "text-gray-400"}`}>
            <Calendar className="mx-auto mb-3 opacity-30" size={28} />
            <p className="text-sm">Sin permisos registrados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className={`w-full text-left ${d ? "text-gray-300" : "text-gray-700"}`}>
              <thead className={`text-[10px] uppercase font-bold tracking-wider ${d ? "bg-slate-900/50 text-gray-500" : "bg-gray-50 text-gray-500"}`}>
                <tr>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Inicio</th>
                  <th className="px-4 py-3">Fin</th>
                  <th className="px-4 py-3">Días</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Pago</th>
                  <th className="px-4 py-3 pr-5" />
                </tr>
              </thead>
              <tbody>
                {filteredLeaves.map(leave => (
                  <LeaveRow
                    key={leave.id}
                    leave={leave}
                    isDark={d}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onCancel={handleCancel}
                    onPay={handlePay}
                    loading={loading}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        {filteredLeaves.length > 0 && (
          <div className={`px-5 py-3 border-t text-xs flex justify-between items-center ${d ? "border-slate-700 text-gray-500" : "border-gray-100 text-gray-500"}`}>
            <span>{filteredLeaves.length} registro{filteredLeaves.length !== 1 ? "s" : ""}</span>
            <span className="font-mono">
              Tomados: <strong className={d ? "text-white" : "text-gray-800"}>{diasTomados}d</strong>
              &nbsp;·&nbsp;
              Pagados: <strong className="text-emerald-500">{diasPagados}d</strong>
              &nbsp;·&nbsp;
              Disponibles: <strong className="text-teal-400">{diasDisponibles.toFixed(1)}d</strong>
            </span>
          </div>
        )}
      </div>

      {/* ── NOTA ── */}
      <div className={`mt-5 p-4 rounded-xl border flex items-start gap-3 ${d ? "bg-slate-800/50 border-slate-700" : "bg-blue-50 border-blue-200"}`}>
        <Info size={14} className={`mt-0.5 shrink-0 ${d ? "text-blue-400" : "text-blue-500"}`} />
        <p className={`text-xs ${d ? "text-gray-400" : "text-gray-600"}`}>
          Los días tomados y marcados como pagados aquí se descuentan automáticamente del cálculo de días disponibles
          y se reflejan en la <strong>liquidación</strong> del colaborador.
        </p>
      </div>

      {/* ── MODAL ── */}
      {showModal && employee && (
        <NuevaSolicitudModal
          employeeId={employee.id}
          isDark={d}
          existingLeaves={leaves ?? []}
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); refreshLeaves() }}
        />
      )}
    </div>
  )
}
