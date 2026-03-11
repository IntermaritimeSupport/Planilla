"use client"

import { authFetcher } from "../../../../services/api"
import { useState, useMemo, useEffect } from "react"
import useSWR from "swr"
import { useNotifications } from "../../../../context/notificationContext"
import { useCompany } from "../../../../context/routerContext"
import { useTheme } from "../../../../context/themeContext"
import { usePageName } from "../../../../hook/usePageName"
import PagesHeader from "../../../../components/headers/pagesHeader"
import {
  Palmtree,
  Clock,
  Calendar,
  Download,
  Search,
  ChevronDown,
  ChevronUp,
  Info,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Users,
} from "lucide-react"
import {
  type VacacionesEmployee,
  type VacacionesLegalParam,
  type VacacionesCalc,
  calculateAllVacaciones,
  calcVacacionesTotals,
} from "./vacacionesCalculation"

// ─────────────────────────────────────────────────────────────────────────────

// authFetcher from services/api (autenticado)

const fmt = (n: number) =>
  `$${(Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtDays = (n: number) =>
  `${(Number(n) || 0).toFixed(1)} días`

// ─────────────────────────────────────────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: VacacionesCalc["status"]; isDark: boolean }> = ({ status, isDark }) => {
  const cfg = {
    disponible: {
      icon: <CheckCircle size={12} />,
      label: "Disponible",
      cls: isDark ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-emerald-100 text-emerald-700 border-emerald-300",
    },
    parcial: {
      icon: <Clock size={12} />,
      label: "Proporcional",
      cls: isDark ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-amber-100 text-amber-700 border-amber-300",
    },
    pendiente: {
      icon: <AlertTriangle size={12} />,
      label: "< 3 meses",
      cls: isDark ? "bg-slate-500/20 text-slate-400 border-slate-500/30" : "bg-gray-100 text-gray-600 border-gray-300",
    },
  }[status]

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${cfg.cls}`}>
      {cfg.icon} {cfg.label}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY CARD
// ─────────────────────────────────────────────────────────────────────────────

const SummaryCard: React.FC<{
  label: string; value: string; sub?: string; accent?: string; isDark: boolean
}> = ({ label, value, sub, accent = "text-blue-400", isDark }) => (
  <div className={`p-5 rounded-xl border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
    <p className={`text-[10px] uppercase font-bold tracking-widest mb-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
      {label}
    </p>
    <p className={`text-2xl font-bold font-mono ${accent}`}>{value}</p>
    {sub && <p className={`text-[11px] mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>{sub}</p>}
  </div>
)

// ─────────────────────────────────────────────────────────────────────────────
// DETAIL DRAWER (fila expandible)
// ─────────────────────────────────────────────────────────────────────────────

const DetailRow: React.FC<{ calc: VacacionesCalc; isDark: boolean }> = ({ calc, isDark }) => {
  const [open, setOpen] = useState(false)

  const progressPct = Math.min(100, (calc.monthsWorked / 11) * 100)

  const td = `px-4 py-3 text-sm`

  return (
    <>
      <tr
        onClick={() => setOpen(o => !o)}
        className={`cursor-pointer border-b transition-colors ${
          isDark ? "border-slate-700/50 hover:bg-slate-700/30" : "border-gray-100 hover:bg-gray-50"
        }`}
      >
        {/* Empleado */}
        <td className={`${td} pl-6`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
              ${isDark ? "bg-teal-500/20 text-teal-400" : "bg-teal-100 text-teal-700"}`}>
              {calc.employee.firstName[0]}{calc.employee.lastName[0]}
            </div>
            <div>
              <p className={`font-semibold text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                {calc.employee.firstName} {calc.employee.lastName}
              </p>
              <p className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                {calc.employee.cedula} · {calc.employee.position || "—"}
              </p>
            </div>
          </div>
        </td>

        {/* Antigüedad */}
        <td className={td}>
          <div>
            <p className={`font-mono text-sm ${isDark ? "text-slate-300" : "text-gray-700"}`}>
              {calc.yearsWorked > 0 ? `${calc.yearsWorked}a ` : ""}{calc.monthsWorked % 12}m
            </p>
            {/* Barra de progreso hacia los 11 meses */}
            <div className={`mt-1 h-1.5 w-24 rounded-full overflow-hidden ${isDark ? "bg-slate-700" : "bg-gray-200"}`}>
              <div
                className="h-full rounded-full bg-teal-500 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </td>

        {/* Días ganados */}
        <td className={`${td} font-mono font-semibold ${isDark ? "text-slate-200" : "text-gray-800"}`}>
          {fmtDays(calc.daysEarned)}
        </td>

        {/* Salario diario */}
        <td className={`${td} font-mono ${isDark ? "text-slate-400" : "text-gray-600"}`}>
          {fmt(calc.dailySalary)}
        </td>

        {/* Bruto */}
        <td className={`${td} font-mono ${isDark ? "text-slate-200" : "text-gray-800"}`}>
          {fmt(calc.grossVacationPay)}
        </td>

        {/* Neto */}
        <td className={`${td} font-mono font-bold text-emerald-500`}>
          {fmt(calc.netVacationPay)}
        </td>

        {/* Estado */}
        <td className={td}>
          <StatusBadge status={calc.status} isDark={isDark} />
        </td>

        {/* Expandir */}
        <td className={`${td} pr-6 text-right`}>
          {open
            ? <ChevronUp size={16} className={isDark ? "text-gray-400" : "text-gray-500"} />
            : <ChevronDown size={16} className={isDark ? "text-gray-400" : "text-gray-500"} />
          }
        </td>
      </tr>

      {/* ── DETALLE EXPANDIDO ── */}
      {open && (
        <tr className={isDark ? "bg-slate-900/40" : "bg-teal-50/60"}>
          <td colSpan={8} className="px-6 py-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

              {/* Fecha de ingreso */}
              <div className={`p-4 rounded-lg border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
                <p className={`text-[10px] uppercase font-bold mb-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                  Fecha de Ingreso
                </p>
                <p className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                  {calc.hireDate.toLocaleDateString("es-PA", { day: "2-digit", month: "long", year: "numeric" })}
                </p>
                <p className={`text-[10px] mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                  {calc.daysWorked.toLocaleString()} días calendario
                </p>
              </div>

              {/* Salario mensual */}
              <div className={`p-4 rounded-lg border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
                <p className={`text-[10px] uppercase font-bold mb-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                  Salario Mensual
                </p>
                <p className={`font-semibold font-mono ${isDark ? "text-white" : "text-gray-900"}`}>
                  {fmt(calc.monthlyBaseSalary)}
                </p>
                <p className={`text-[10px] mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                  Diario: {fmt(calc.dailySalary)}
                </p>
              </div>

              {/* Desglose de deducciones */}
              <div className={`p-4 rounded-lg border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
                <p className={`text-[10px] uppercase font-bold mb-2 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                  Deducciones
                </p>
                <div className="space-y-1 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className={isDark ? "text-gray-400" : "text-gray-600"}>SS (9.75%)</span>
                    <span className="text-red-400">-{fmt(calc.ss)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isDark ? "text-gray-400" : "text-gray-600"}>Seg. Educ. (1.25%)</span>
                    <span className="text-red-400">-{fmt(calc.se)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isDark ? "text-gray-400" : "text-gray-600"}>ISR</span>
                    <span className="text-blue-400">-{fmt(calc.isr)}</span>
                  </div>
                  <div className={`flex justify-between pt-1 border-t font-bold ${isDark ? "border-slate-700" : "border-gray-200"}`}>
                    <span className={isDark ? "text-gray-300" : "text-gray-700"}>Total</span>
                    <span className={isDark ? "text-white" : "text-gray-900"}>-{fmt(calc.totalDeductions)}</span>
                  </div>
                </div>
              </div>

              {/* Próximo período */}
              <div className={`p-4 rounded-lg border ${
                calc.status === "disponible"
                  ? isDark ? "bg-emerald-900/20 border-emerald-500/30" : "bg-emerald-50 border-emerald-300"
                  : isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"
              }`}>
                <p className={`text-[10px] uppercase font-bold mb-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                  Próximo Período
                </p>
                <p className={`text-2xl font-bold font-mono ${
                  calc.status === "disponible" ? "text-emerald-500" : isDark ? "text-slate-300" : "text-gray-700"
                }`}>
                  {calc.nextVacationDays} días
                </p>
                <p className={`text-[10px] mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                  {calc.status === "disponible"
                    ? "✓ Período completo disponible"
                    : `Faltan ${Math.max(0, 11 - calc.monthsWorked)} meses para completar`}
                </p>
              </div>

            </div>

            {/* Barra de progreso detallada */}
            <div className={`mt-4 p-4 rounded-lg border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
              <div className="flex justify-between items-center mb-2">
                <p className={`text-xs font-bold ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Progreso hacia período completo (11 meses)
                </p>
                <p className={`text-xs font-mono font-bold ${isDark ? "text-teal-400" : "text-teal-600"}`}>
                  {Math.min(100, Math.round((calc.monthsWorked / 11) * 100))}%
                </p>
              </div>
              <div className={`h-2 rounded-full overflow-hidden ${isDark ? "bg-slate-700" : "bg-gray-200"}`}>
                <div
                  className={`h-full rounded-full transition-all ${
                    calc.status === "disponible" ? "bg-emerald-500" :
                    calc.status === "parcial" ? "bg-amber-500" : "bg-slate-500"
                  }`}
                  style={{ width: `${Math.min(100, (calc.monthsWorked / 11) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className={`text-[10px] ${isDark ? "text-gray-600" : "text-gray-400"}`}>Ingreso</span>
                <span className={`text-[10px] ${isDark ? "text-gray-600" : "text-gray-400"}`}>11 meses (período completo)</span>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export const AllVacaciones: React.FC = () => {
  const { selectedCompany } = useCompany()
  const { isDarkMode } = useTheme()
  const { pageName } = usePageName()
  const { addNotification } = useNotifications()

  useEffect(() => {
    addNotification({
      id: "vacaciones-legal-info",
      type: "info",
      title: "Base legal: Vacaciones",
      message: "Art. 54-60 Código de Trabajo: 30 días por cada 11 meses. Deducciones: SS 9.75%, SE 1.25%, ISR.",
      href: undefined,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState<"todos" | "disponible" | "parcial" | "pendiente">("todos")

  // ── DATA ──
  const { data: employees, isLoading: loadingEmps } = useSWR<VacacionesEmployee[]>(
    selectedCompany
      ? `${import.meta.env.VITE_API_URL}/api/payroll/employees?companyId=${selectedCompany.id}`
      : null, authFetcher)

  const { data: legalParams, isLoading: loadingParams } = useSWR<VacacionesLegalParam[]>(
    selectedCompany
      ? `${import.meta.env.VITE_API_URL}/api/system/legal-parameters?companyId=${selectedCompany.id}`
      : null, authFetcher)

  // ── CÁLCULOS ──
  const allCalcs = useMemo(() => {
    if (!employees || !legalParams) return []
    return calculateAllVacaciones(employees, legalParams)
  }, [employees, legalParams])

  const totals = useMemo(() => calcVacacionesTotals(allCalcs), [allCalcs])

  // ── FILTROS ──
  const filtered = useMemo(() => {
    return allCalcs.filter(c => {
      const name = `${c.employee.firstName} ${c.employee.lastName}`.toLowerCase()
      const matchSearch = name.includes(search.toLowerCase()) || c.employee.cedula.includes(search)
      const matchStatus = filterStatus === "todos" || c.status === filterStatus
      return matchSearch && matchStatus
    })
  }, [allCalcs, search, filterStatus])

  // ── CONTADORES POR STATUS ──
  const counts = useMemo(() => ({
    disponible: allCalcs.filter(c => c.status === "disponible").length,
    parcial: allCalcs.filter(c => c.status === "parcial").length,
    pendiente: allCalcs.filter(c => c.status === "pendiente").length,
  }), [allCalcs])

  // ── LOADING ──
  if (loadingEmps || loadingParams) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${isDarkMode ? "bg-slate-900" : "bg-gray-50"}`}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-teal-500" size={40} />
          <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>Calculando vacaciones…</p>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className={`transition-colors ${isDarkMode ? "bg-slate-900" : ""}`}>

      <PagesHeader
        title={`${pageName} — Vacaciones`}
        description="Cálculo proporcional · Ley panameña Art. 54-60 Código de Trabajo"
        onExport={() => {}}
      />

      {/* ── TARJETAS DE RESUMEN ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <SummaryCard
          label="Empleados Activos"
          value={String(totals.totalEmpleados)}
          sub={`${counts.disponible} con período completo`}
          accent={isDarkMode ? "text-white" : "text-gray-900"}
          isDark={isDarkMode}
        />
        <SummaryCard
          label="Total Días Ganados"
          value={fmtDays(totals.totalDiasGanados)}
          sub="Base: 30 días/año (Art. 54)"
          accent="text-teal-500"
          isDark={isDarkMode}
        />
        <SummaryCard
          label="Total Bruto"
          value={fmt(totals.totalBruto)}
          sub={`SS: ${fmt(totals.totalSS)} · SE: ${fmt(totals.totalSE)}`}
          accent={isDarkMode ? "text-slate-200" : "text-gray-800"}
          isDark={isDarkMode}
        />
        <SummaryCard
          label="Total Neto a Pagar"
          value={fmt(totals.totalNeto)}
          sub={`ISR retenido: ${fmt(totals.totalISR)}`}
          accent="text-emerald-500"
          isDark={isDarkMode}
        />
      </div>

      {/* ── FILTROS DE ESTADO ── */}
      <div className="flex flex-wrap gap-3 mb-6">
        {(["todos", "disponible", "parcial", "pendiente"] as const).map(s => {
          const count = s === "todos" ? allCalcs.length : counts[s]
          const active = filterStatus === s
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${
                active
                  ? s === "disponible" ? "bg-emerald-600 border-emerald-500 text-white"
                  : s === "parcial" ? "bg-amber-500 border-amber-400 text-white"
                  : s === "pendiente" ? "bg-slate-600 border-slate-500 text-white"
                  : isDarkMode ? "bg-teal-600 border-teal-500 text-white" : "bg-teal-600 border-teal-500 text-white"
                  : isDarkMode
                  ? "bg-slate-800 border-slate-700 text-gray-400 hover:border-slate-600"
                  : "bg-white border-gray-300 text-gray-600 hover:border-gray-400"
              }`}
            >
              {s === "todos" ? "Todos" : s === "disponible" ? "Disponibles" : s === "parcial" ? "Proporcional" : "< 3 meses"}
              <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] ${active ? "bg-white/20" : isDarkMode ? "bg-slate-700" : "bg-gray-100"}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── TABLA PRINCIPAL ── */}
      <div className={`rounded-xl border overflow-hidden shadow-xl ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>

        {/* Header de tabla con buscador */}
        <div className={`p-4 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${isDarkMode ? "border-slate-700" : "border-gray-200"}`}>
          <div className="flex items-center gap-3">
            <Palmtree className="text-teal-500" size={20} />
            <h3 className={`font-bold text-sm ${isDarkMode ? "text-white" : "text-gray-900"}`}>
              Detalle por Colaborador
            </h3>
            <span className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
              ({filtered.length} de {allCalcs.length})
            </span>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-72">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`} size={15} />
              <input
                type="text"
                placeholder="Buscar por nombre o cédula…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className={`w-full pl-9 pr-4 py-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-teal-500 transition-colors ${
                  isDarkMode
                    ? "bg-slate-900 border border-slate-700 text-white placeholder-gray-600"
                    : "bg-gray-100 border border-gray-300 text-gray-900 placeholder-gray-400"
                }`}
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg transition-colors">
              <Download size={14} /> Exportar
            </button>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className={`w-full text-left ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
            <thead className={`text-[10px] uppercase font-bold tracking-wider ${isDarkMode ? "bg-slate-900/50 text-gray-500" : "bg-gray-50 text-gray-500"}`}>
              <tr>
                <th className="px-6 py-3">Colaborador</th>
                <th className="px-4 py-3">Antigüedad</th>
                <th className="px-4 py-3">Días Ganados</th>
                <th className="px-4 py-3">Salario Diario</th>
                <th className="px-4 py-3">Bruto</th>
                <th className="px-4 py-3 text-emerald-500">Neto</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 pr-6" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className={`text-center py-16 ${isDarkMode ? "text-gray-600" : "text-gray-400"}`}>
                    <Users className="mx-auto mb-3 opacity-30" size={32} />
                    <p className="text-sm">No se encontraron colaboradores</p>
                  </td>
                </tr>
              ) : (
                filtered.map(calc => (
                  <DetailRow key={calc.employeeId} calc={calc} isDark={isDarkMode} />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer con totales */}
        {filtered.length > 0 && (
          <div className={`px-6 py-4 border-t flex flex-col md:flex-row justify-between items-center gap-3 ${isDarkMode ? "border-slate-700 bg-slate-900/30" : "border-gray-100 bg-gray-50"}`}>
            <p className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
              {filtered.length} colaborador{filtered.length !== 1 ? "es" : ""} · Calculado al {new Date().toLocaleDateString("es-PA")}
            </p>
            <div className="flex items-center gap-6 text-xs font-mono">
              <span className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
                Bruto: <strong className={isDarkMode ? "text-white" : "text-gray-900"}>
                  {fmt(filtered.reduce((s, c) => s + c.grossVacationPay, 0))}
                </strong>
              </span>
              <span className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
                Neto: <strong className="text-emerald-500">
                  {fmt(filtered.reduce((s, c) => s + c.netVacationPay, 0))}
                </strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── NOTA LEGAL ── */}
      <div className={`mt-6 p-4 rounded-xl border flex items-start gap-4 ${isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-blue-50 border-blue-200"}`}>
        <Info className={`mt-0.5 shrink-0 ${isDarkMode ? "text-blue-400" : "text-blue-500"}`} size={16} />
        <div className={`text-xs space-y-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
          <p className="font-bold">Base legal: Código de Trabajo de Panamá, Artículos 54 al 60</p>
          <p>• <strong>30 días calendario</strong> por cada 11 meses de trabajo continuo (período completo).</p>
          <p>• Empleados con menos de 11 meses: <strong>pago proporcional</strong> = (días_trabajados / 365) × 30.</p>
          <p>• Deducciones sobre el pago bruto de vacaciones: SS empleado (9.75%), Seguro Educativo (1.25%) e ISR proporcional.</p>
          <p>• El Seguro Educativo del <strong>patrono (1.5%)</strong> y SS patronal (12.25%) también aplican, pero se reflejan en el módulo SIPE.</p>
        </div>
      </div>

      {/* ── NOTA CALENDARIO ── */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: <Calendar size={14} />, title: "Período de Cómputo", body: "Inicia en la fecha de ingreso del colaborador. Cada 11 meses consecutivos genera derecho a 30 días.", color: "teal" },
          { icon: <Clock size={14} />, title: "Proporcional", body: "Si el colaborador no completa los 11 meses, se paga en proporción a los días trabajados.", color: "amber" },
          { icon: <CheckCircle size={14} />, title: "Disfrute vs. Pago", body: "El colaborador puede disfrutar las vacaciones o recibir el pago en efectivo. Ambas opciones aplican los mismos descuentos.", color: "emerald" },
        ].map(({ icon, title, body, color }) => (
          <div key={title} className={`p-4 rounded-xl border transition-colors ${
            isDarkMode ? "bg-slate-800/40 border-slate-700" : `bg-${color}-50 border-${color}-200`
          }`}>
            <div className={`flex items-center gap-2 mb-2 text-${color}-${isDarkMode ? "400" : "600"}`}>
              {icon}
              <h5 className="text-xs font-bold uppercase">{title}</h5>
            </div>
            <p className={`text-[11px] ${isDarkMode ? "text-gray-400" : "text-gray-700"}`}>{body}</p>
          </div>
        ))}
      </div>

    </div>
  )
}
