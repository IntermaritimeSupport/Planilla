"use client"

// ─────────────────────────────────────────────────────────────────────────────
// AllComprobantes.tsx
// Lista de nóminas guardadas con botones de envío de comprobantes
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo } from "react"
import useSWR from "swr"
import { useCompany } from "../../../context/routerContext"
import { useTheme } from "../../../context/themeContext"
import { fetcher } from "../../../utils/apiFetcher"
import PagesHeader from "../../../components/headers/pagesHeader"
import { VoucherSender, VoucherSenderBulk } from "../../../components/payroll/VoucherSender"
import {
  Mail, Calendar, ChevronDown, Search,
  AlertCircle, Users, CheckCircle,
} from "lucide-react"

const { VITE_API_URL } = import.meta.env

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface SavedPayroll {
  id: string
  payrollNumber: string
  payPeriod: string
  paymentDate: string
  payrollType: string
  baseSalary: number
  grossSalary: number
  netSalary: number
  totalDeductions: number
  status: string
  payrollRunId?: string
  employee: {
    id: string
    cedula: string
    firstName: string
    lastName: string
    email?: string | null
  }
  company: { id: string; name: string }
  payrollRun?: { id: string; periodDate: string; quincena: number; status: string }
}

interface RunGroup {
  runId: string
  label: string
  quincena: number
  status: string
  payrolls: SavedPayroll[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  `$${(Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtMonth = (d: string) =>
  new Date(d).toLocaleDateString("es-PA", { year: "numeric", month: "long" })

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Borrador",
  APPROVED: "Aprobada",
  PAID: "Pagada",
  REJECTED: "Rechazada",
}

// ─────────────────────────────────────────────────────────────────────────────
export const AllComprobantes: React.FC = () => {
  const { selectedCompany } = useCompany()
  const { isDarkMode } = useTheme()
  const [activeRunId, setActiveRunId] = useState<string>("")
  const [showPicker, setShowPicker] = useState(false)
  const [search, setSearch] = useState("")
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4500)
  }

  // ── Cargar nóminas guardadas ──────────────────────────────────────────────
  const { data: payrolls, isLoading } = useSWR<SavedPayroll[]>(
    selectedCompany
      ? `${VITE_API_URL}/api/payroll/payrolls?companyId=${selectedCompany.id}`
      : null,
    fetcher
  )

  // ── Agrupar por payrollRun ────────────────────────────────────────────────
  const runs = useMemo<RunGroup[]>(() => {
    if (!payrolls) return []
    const map = new Map<string, RunGroup>()
    payrolls.forEach(p => {
      const key = p.payrollRunId || p.id
      if (!map.has(key)) {
        const q = p.payrollRun?.quincena ?? 0
        const label = `${fmtMonth(p.payrollRun?.periodDate || p.payPeriod)} · ${
          q === 1 ? "1ra Quincena" : q === 2 ? "2da Quincena" : "Mensual"
        }`
        map.set(key, {
          runId: key,
          label,
          quincena: q,
          status: p.payrollRun?.status || p.status,
          payrolls: [],
        })
      }
      map.get(key)!.payrolls.push(p)
    })
    return [...map.values()].sort((a, b) =>
      (b.payrolls[0]?.payPeriod || "").localeCompare(a.payrolls[0]?.payPeriod || "")
    )
  }, [payrolls])

  const activeRun = runs.find(r => r.runId === activeRunId) || runs[0]

  // ── Filtrar por búsqueda ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!activeRun) return []
    const q = search.toLowerCase()
    if (!q) return activeRun.payrolls
    return activeRun.payrolls.filter(p =>
      `${p.employee.firstName} ${p.employee.lastName}`.toLowerCase().includes(q) ||
      p.employee.cedula.includes(q) ||
      (p.employee.email || "").toLowerCase().includes(q)
    )
  }, [activeRun, search])

  const withEmail = activeRun?.payrolls.filter(p => p.employee.email).length ?? 0
  const payrollIds = activeRun?.payrolls.map(p => p.id) ?? []

  const dark = isDarkMode

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center min-h-[60vh] ${dark ? "bg-gray-900" : "bg-gray-50"}`}>
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500" />
      </div>
    )
  }

  return (
    <div
      className={`min-h-screen transition-colors ${dark ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}
      onClick={() => showPicker && setShowPicker(false)}
    >
      <div className="p-6 max-w-full">

        {/* Toast */}
        {toast && (
          <div
            className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border text-sm font-semibold pointer-events-none ${
              toast.ok
                ? dark
                  ? "bg-green-900/90 border-green-700 text-green-200"
                  : "bg-green-50 border-green-300 text-green-800"
                : dark
                ? "bg-red-900/90 border-red-700 text-red-200"
                : "bg-red-50 border-red-300 text-red-800"
            }`}
          >
            {toast.ok ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
            {toast.msg}
          </div>
        )}

        {/* Header + botón masivo */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <PagesHeader
            title="Comprobantes de Pago"
            description="Envía comprobantes por email — individual o a toda la planilla de una vez"
          />
          {activeRun && (
            <div className="mt-1 shrink-0">
              <VoucherSenderBulk
                payrollIds={payrollIds}
                totalEmployees={activeRun.payrolls.length}
                totalWithEmail={withEmail}
                isDark={dark}
                onComplete={r =>
                  showToast(r.message || `${r.sent} enviados`, r.failed === 0)
                }
              />
            </div>
          )}
        </div>

        {/* Selector de período */}
        {runs.length > 0 && (
          <div
            className="relative w-fit mb-6"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowPicker(v => !v)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                dark
                  ? "bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                  : "bg-white border-gray-200 text-gray-900 hover:bg-gray-50"
              }`}
            >
              <Calendar size={15} className="text-indigo-400" />
              <span>{activeRun?.label || "Seleccionar período"}</span>
              <ChevronDown
                size={14}
                className={`transition-transform ${showPicker ? "rotate-180" : ""}`}
              />
            </button>

            {showPicker && (
              <div
                className={`absolute top-full mt-1.5 left-0 w-80 rounded-2xl border shadow-2xl z-50 overflow-hidden ${
                  dark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-100"
                }`}
              >
                <div
                  className={`px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest border-b ${
                    dark ? "border-slate-800 text-slate-500" : "border-gray-100 text-gray-400"
                  }`}
                >
                  Seleccionar período
                </div>
                <div className="p-1.5 max-h-64 overflow-y-auto">
                  {runs.map(run => (
                    <button
                      key={run.runId}
                      onClick={() => { setActiveRunId(run.runId); setShowPicker(false) }}
                      className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-left text-sm transition-all ${
                        activeRun?.runId === run.runId
                          ? dark
                            ? "bg-indigo-600/20 text-indigo-300"
                            : "bg-indigo-50 text-indigo-700"
                          : dark
                          ? "text-slate-300 hover:bg-slate-800"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-sm">{run.label}</p>
                        <p className={`text-[11px] mt-0.5 ${dark ? "text-slate-500" : "text-gray-400"}`}>
                          {run.payrolls.length} empleados
                        </p>
                      </div>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                          run.status === "APPROVED" || run.status === "PAID"
                            ? "bg-green-500/15 text-green-400"
                            : dark
                            ? "bg-slate-800 text-slate-500"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {STATUS_LABEL[run.status] || run.status}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Estadísticas */}
        {activeRun && (
          <div className="flex gap-3 mb-5 flex-wrap">
            {[
              { label: "En esta planilla", value: activeRun.payrolls.length, color: "text-blue-400", icon: <Users size={14} /> },
              { label: "Con email registrado", value: withEmail, color: "text-green-400", icon: <CheckCircle size={14} /> },
              { label: "Sin email", value: activeRun.payrolls.length - withEmail, color: "text-amber-400", icon: <AlertCircle size={14} /> },
            ].map(s => (
              <div
                key={s.label}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border ${
                  dark ? "bg-slate-800/60 border-slate-700" : "bg-white border-gray-200"
                }`}
              >
                <span className={s.color}>{s.icon}</span>
                <div>
                  <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
                  <p className={`text-[11px] ${dark ? "text-slate-500" : "text-gray-400"}`}>{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Búsqueda */}
        {activeRun && (
          <div className={`relative mb-4 max-w-sm`}>
            <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${dark ? "text-slate-500" : "text-gray-400"}`} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, cédula o email…"
              className={`w-full pl-9 pr-4 py-2 text-sm rounded-xl border outline-none transition-colors ${
                dark
                  ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500"
                  : "bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-indigo-400"
              }`}
            />
          </div>
        )}

        {/* Tabla / empty state */}
        {!activeRun ? (
          <div
            className={`flex flex-col items-center justify-center py-28 rounded-2xl border ${
              dark ? "border-slate-800 bg-slate-900/40" : "border-gray-200 bg-white"
            }`}
          >
            <Mail size={52} className={dark ? "text-slate-700" : "text-gray-300"} />
            <p className={`mt-4 text-lg font-semibold ${dark ? "text-slate-400" : "text-gray-500"}`}>
              Sin nóminas generadas aún
            </p>
            <p className={`mt-1 text-sm ${dark ? "text-slate-600" : "text-gray-400"}`}>
              Genera una planilla desde Nómina para ver los comprobantes aquí
            </p>
          </div>
        ) : (
          <div
            className={`rounded-2xl border overflow-hidden ${
              dark ? "border-slate-700 bg-slate-900/50" : "border-gray-200 bg-white"
            }`}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr
                    className={`text-[11px] font-bold uppercase tracking-wider ${
                      dark ? "bg-slate-800 text-slate-400" : "bg-gray-50 text-gray-500"
                    }`}
                  >
                    <th className="px-5 py-3.5 text-left">Empleado</th>
                    <th className="px-4 py-3.5 text-left">Cédula</th>
                    <th className="px-4 py-3.5 text-left">Correo electrónico</th>
                    <th className="px-4 py-3.5 text-right">Bruto</th>
                    <th className="px-4 py-3.5 text-right">Deducciones</th>
                    <th className="px-4 py-3.5 text-right text-green-400">Neto</th>
                    <th className="px-4 py-3.5 text-center">Estado</th>
                    <th className="px-4 py-3.5 text-center">Comprobante</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => (
                    <tr
                      key={p.id}
                      className={`border-b transition-colors ${
                        dark
                          ? `border-slate-800 ${i % 2 ? "bg-slate-800/20" : ""} hover:bg-slate-700/30`
                          : `border-gray-100 ${i % 2 ? "bg-gray-50/50" : ""} hover:bg-indigo-50/30`
                      }`}
                    >
                      {/* Empleado */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                            {p.employee.firstName[0]}{p.employee.lastName[0]}
                          </div>
                          <span className={`font-semibold ${dark ? "text-white" : "text-gray-900"}`}>
                            {p.employee.firstName} {p.employee.lastName}
                          </span>
                        </div>
                      </td>

                      {/* Cédula */}
                      <td className={`px-4 py-3 font-mono text-xs ${dark ? "text-slate-400" : "text-gray-500"}`}>
                        {p.employee.cedula}
                      </td>

                      {/* Email */}
                      <td className={`px-4 py-3 text-xs ${
                        p.employee.email
                          ? dark ? "text-slate-300" : "text-gray-700"
                          : "text-amber-400"
                      }`}>
                        {p.employee.email || <span className="italic opacity-60">Sin email</span>}
                      </td>

                      {/* Montos */}
                      <td className={`px-4 py-3 text-right ${dark ? "text-slate-300" : "text-gray-700"}`}>
                        {fmt(p.grossSalary)}
                      </td>
                      <td className="px-4 py-3 text-right text-red-400">
                        ({fmt(p.totalDeductions)})
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-green-400">
                        {fmt(p.netSalary)}
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                            p.status === "APPROVED" || p.status === "PAID"
                              ? "bg-green-500/15 text-green-400"
                              : dark
                              ? "bg-slate-700 text-slate-400"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {STATUS_LABEL[p.status] || p.status}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          <VoucherSender
                            payrollId={p.id}
                            employeeName={`${p.employee.firstName} ${p.employee.lastName}`}
                            employeeEmail={p.employee.email}
                            isDark={dark}
                            variant="icon"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filtered.length === 0 && (
                <div className={`text-center py-16 ${dark ? "text-slate-500" : "text-gray-400"}`}>
                  <Search size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">
                    {search
                      ? `Sin resultados para "${search}"`
                      : "Sin nóminas en este período"}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default AllComprobantes
