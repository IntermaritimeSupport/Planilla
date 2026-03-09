"use client"

import { useState, useMemo, useCallback } from "react"
import useSWR from "swr"
import { useCompany } from "../../../../context/routerContext"
import { useTheme } from "../../../../context/themeContext"
import { usePageName } from "../../../../hook/usePageName"
import PagesHeader from "../../../../components/headers/pagesHeader"
import {
  FileText, Search, ChevronDown, ChevronUp, AlertTriangle,
  CheckCircle, Info, Loader2, Calculator, Download, Users,
  Calendar, DollarSign, Clock, ShieldAlert,
} from "lucide-react"
import { ExportButtons } from "../../../../components/exports/ExportButtons"
import { exportLiquidacionesExcel, exportLiquidacionesPDF } from "../../../../utils/exports/exportEngine"
import {
  type LiquidacionEmployee,
  type LiquidacionLegalParam,
  type LiquidacionDesglose,
  type TipoTerminacion,
  calcularLiquidacion,
} from "./liquidacionesCalculation"

// ─────────────────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then(r => r.json())

const fmt = (n: number) =>
  `$${(Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtDays = (n: number) => `${Number(n).toFixed(1)} días`

const TIPO_LABELS: Record<TipoTerminacion, { label: string; color: string; icon: React.ReactNode }> = {
  DESPIDO_INJUSTIFICADO: { label: "Despido Injustificado", color: "red", icon: <ShieldAlert size={13} /> },
  RENUNCIA: { label: "Renuncia Voluntaria", color: "amber", icon: <Clock size={13} /> },
  MUTUO_ACUERDO: { label: "Mutuo Acuerdo", color: "blue", icon: <CheckCircle size={13} /> },
  DESPIDO_JUSTIFICADO: { label: "Despido Justificado", color: "purple", icon: <AlertTriangle size={13} /> },
}

// ─────────────────────────────────────────────────────────────────────────────
// CONCEPTO ROW — fila de desglose
// ─────────────────────────────────────────────────────────────────────────────

const ConceptoRow: React.FC<{
  label: string; value: number; sub?: string; isDark: boolean
  highlight?: boolean; negative?: boolean; disabled?: boolean
}> = ({ label, value, sub, isDark, highlight, negative, disabled }) => {
  if (disabled) return null
  return (
    <div className={`flex justify-between items-center py-2.5 px-4 rounded-lg ${
      highlight
        ? isDark ? "bg-emerald-900/20 border border-emerald-500/30" : "bg-emerald-50 border border-emerald-200"
        : negative
        ? isDark ? "bg-red-900/10" : "bg-red-50"
        : isDark ? "bg-slate-800/50" : "bg-gray-50"
    }`}>
      <div>
        <p className={`text-xs font-semibold ${isDark ? "text-slate-300" : "text-gray-700"}`}>{label}</p>
        {sub && <p className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-500"}`}>{sub}</p>}
      </div>
      <p className={`font-mono font-bold text-sm ${
        highlight ? "text-emerald-500"
        : negative ? "text-red-400"
        : isDark ? "text-white" : "text-gray-900"
      }`}>
        {negative ? "-" : ""}{fmt(value)}
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// BADGE TIPO
// ─────────────────────────────────────────────────────────────────────────────

const TipoBadge: React.FC<{ tipo: TipoTerminacion; isDark: boolean }> = ({ tipo, isDark }) => {
  const cfg = TIPO_LABELS[tipo]
  const colorMap: Record<string, string> = {
    red: isDark ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-red-100 text-red-700 border-red-300",
    amber: isDark ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-amber-100 text-amber-700 border-amber-300",
    blue: isDark ? "bg-blue-500/20 text-blue-400 border-blue-500/30" : "bg-blue-100 text-blue-700 border-blue-300",
    purple: isDark ? "bg-purple-500/20 text-purple-400 border-purple-500/30" : "bg-purple-100 text-purple-700 border-purple-300",
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${colorMap[cfg.color]}`}>
      {cfg.icon} {cfg.label}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SELECTOR DE TIPO DE TERMINACIÓN
// ─────────────────────────────────────────────────────────────────────────────

const TipoSelector: React.FC<{
  value: TipoTerminacion; onChange: (v: TipoTerminacion) => void; isDark: boolean
}> = ({ value, onChange, isDark }) => (
  <div className="grid grid-cols-2 gap-2">
    {(Object.keys(TIPO_LABELS) as TipoTerminacion[]).map(tipo => {
      const cfg = TIPO_LABELS[tipo]
      const active = value === tipo
      const colorActive: Record<string, string> = {
        red: "border-red-500 bg-red-500/10 text-red-400",
        amber: "border-amber-500 bg-amber-500/10 text-amber-400",
        blue: "border-blue-500 bg-blue-500/10 text-blue-400",
        purple: "border-purple-500 bg-purple-500/10 text-purple-400",
      }
      return (
        <button
          key={tipo}
          onClick={() => onChange(tipo)}
          className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-semibold transition-all text-left ${
            active
              ? colorActive[cfg.color]
              : isDark
              ? "border-slate-700 text-gray-400 hover:border-slate-600 hover:bg-slate-800"
              : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
          }`}
        >
          {cfg.icon} {cfg.label}
        </button>
      )
    })}
  </div>
)

// ─────────────────────────────────────────────────────────────────────────────
// DETALLE EXPANDIBLE POR EMPLEADO
// ─────────────────────────────────────────────────────────────────────────────

const EmpleadoRow: React.FC<{
  employee: LiquidacionEmployee
  legalParams: LiquidacionLegalParam[]
  isDark: boolean
}> = ({ employee, legalParams, isDark }) => {
  const [open, setOpen] = useState(false)
  const [tipo, setTipo] = useState<TipoTerminacion>("DESPIDO_INJUSTIFICADO")
  const [fechaTerm, setFechaTerm] = useState(new Date().toISOString().split("T")[0])

  const calc = useMemo<LiquidacionDesglose>(() => {
    return calcularLiquidacion(employee, tipo, new Date(fechaTerm + "T12:00:00"), legalParams)
  }, [employee, tipo, fechaTerm, legalParams])

  const td = "px-4 py-3 text-sm"

  return (
    <>
      <tr
        onClick={() => setOpen(o => !o)}
        className={`cursor-pointer border-b transition-colors ${
          isDark ? "border-slate-700/50 hover:bg-slate-700/20" : "border-gray-100 hover:bg-gray-50"
        }`}
      >
        {/* Empleado */}
        <td className={`${td} pl-6`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
              isDark ? "bg-orange-500/20 text-orange-400" : "bg-orange-100 text-orange-700"
            }`}>
              {employee.firstName[0]}{employee.lastName[0]}
            </div>
            <div>
              <p className={`font-semibold text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                {employee.firstName} {employee.lastName}
              </p>
              <p className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                {employee.cedula} · {employee.position || "—"}
              </p>
            </div>
          </div>
        </td>

        {/* Antigüedad */}
        <td className={`${td} font-mono ${isDark ? "text-slate-300" : "text-gray-700"}`}>
          {calc.anosTrabajados > 0 ? `${calc.anosTrabajados}a ` : ""}
          {calc.fraccionMeses}m
        </td>

        {/* Salario mensual */}
        <td className={`${td} font-mono ${isDark ? "text-slate-300" : "text-gray-700"}`}>
          {fmt(calc.salarioMensual)}
        </td>

        {/* Tipo (mini badge) */}
        <td className={td}>
          <TipoBadge tipo={tipo} isDark={isDark} />
        </td>

        {/* Bruto */}
        <td className={`${td} font-mono ${isDark ? "text-slate-200" : "text-gray-800"}`}>
          {fmt(calc.totalBruto)}
        </td>

        {/* Neto */}
        <td className={`${td} font-mono font-bold text-emerald-500`}>
          {fmt(calc.totalNeto)}
        </td>

        {/* Chevron */}
        <td className={`${td} pr-6 text-right`}>
          {open
            ? <ChevronUp size={16} className={isDark ? "text-gray-400" : "text-gray-500"} />
            : <ChevronDown size={16} className={isDark ? "text-gray-400" : "text-gray-500"} />
          }
        </td>
      </tr>

      {/* ── PANEL EXPANDIDO ── */}
      {open && (
        <tr className={isDark ? "bg-slate-900/50" : "bg-orange-50/40"}>
          <td colSpan={7} className="px-6 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* ── COLUMNA 1: Configuración ── */}
              <div className="space-y-4">
                <h4 className={`text-xs font-bold uppercase tracking-widest ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  Configuración
                </h4>

                {/* Tipo de terminación */}
                <div>
                  <p className={`text-[10px] font-bold uppercase mb-2 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                    Causa de terminación
                  </p>
                  <TipoSelector value={tipo} onChange={setTipo} isDark={isDark} />
                </div>

                {/* Fecha de terminación */}
                <div>
                  <p className={`text-[10px] font-bold uppercase mb-2 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                    Fecha efectiva de terminación
                  </p>
                  <input
                    type="date"
                    value={fechaTerm}
                    onChange={e => setFechaTerm(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    className={`w-full px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2 focus:ring-orange-500 transition-colors ${
                      isDark
                        ? "bg-slate-800 border-slate-700 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                  />
                </div>

                {/* Datos de cálculo */}
                <div className={`p-3 rounded-lg ${isDark ? "bg-slate-800 border border-slate-700" : "bg-white border border-gray-200"}`}>
                  <p className={`text-[10px] font-bold uppercase mb-2 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                    Base de cálculo
                  </p>
                  <div className={`space-y-1 text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    <div className="flex justify-between">
                      <span>Ingreso</span>
                      <span className="font-mono">{calc.fechaIngreso.toLocaleDateString("es-PA")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Días trabajados</span>
                      <span className="font-mono">{calc.diasTrabajados.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Salario diario</span>
                      <span className="font-mono">{fmt(calc.salarioDiario)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Salario semanal</span>
                      <span className="font-mono">{fmt(calc.salarioSemanal)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── COLUMNA 2: Conceptos brutos ── */}
              <div className="space-y-2">
                <h4 className={`text-xs font-bold uppercase tracking-widest ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  Conceptos a Pagar
                </h4>

                <ConceptoRow
                  label="Prima de Antigüedad"
                  value={calc.primaAntiguedadBruto}
                  sub={`${calc.semanasPrimaAntiguedad} sem. · Art. 224 CT`}
                  isDark={isDark}
                />
                <ConceptoRow
                  label="Preaviso"
                  value={calc.preaviso}
                  sub={`${calc.semanasPreaviso} sem. · Art. 683 CT`}
                  isDark={isDark}
                  disabled={tipo !== "DESPIDO_INJUSTIFICADO"}
                />
                <ConceptoRow
                  label="Vacaciones Proporcionales"
                  value={calc.vacacionesBruto}
                  sub={`${fmtDays(calc.diasVacaciones)} · Art. 54 CT`}
                  isDark={isDark}
                />
                <ConceptoRow
                  label="Décimo Proporcional"
                  value={calc.decimoProporcionalBruto}
                  sub={`${calc.mesesDecimoActual} meses en período · Ley 44/1995`}
                  isDark={isDark}
                />
                <ConceptoRow
                  label="Indemnización"
                  value={calc.indemnizacionBruto}
                  sub={`${calc.anosTrabajados} años · Art. 225 CT`}
                  isDark={isDark}
                  disabled={tipo !== "DESPIDO_INJUSTIFICADO"}
                />

                {/* Subtotal bruto */}
                <div className={`flex justify-between items-center py-2 px-4 rounded-lg border-t-2 mt-1 ${
                  isDark ? "border-slate-600" : "border-gray-200"
                }`}>
                  <p className={`text-xs font-bold uppercase ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    Total Bruto
                  </p>
                  <p className={`font-mono font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                    {fmt(calc.totalBruto)}
                  </p>
                </div>
              </div>

              {/* ── COLUMNA 3: Deducciones + Neto ── */}
              <div className="space-y-2">
                <h4 className={`text-xs font-bold uppercase tracking-widest ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  Deducciones y Neto
                </h4>

                <ConceptoRow
                  label="Seguro Social (9.75%)"
                  value={calc.ss}
                  sub="Empleado · Art. 63 Ley 51/2005"
                  isDark={isDark}
                  negative
                />
                <ConceptoRow
                  label="Seguro Educativo (1.25%)"
                  value={calc.se}
                  sub="Empleado · D.L. 14 de 1994"
                  isDark={isDark}
                  negative
                />
                <ConceptoRow
                  label="ISR"
                  value={calc.isr}
                  sub="Código Fiscal Art. 700"
                  isDark={isDark}
                  negative
                />

                {/* Total deducciones */}
                <div className={`flex justify-between items-center py-2 px-4 rounded-lg ${
                  isDark ? "bg-red-900/10" : "bg-red-50"
                }`}>
                  <p className={`text-xs font-bold ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    Total Deducciones
                  </p>
                  <p className="font-mono font-bold text-red-400">
                    -{fmt(calc.totalDeducciones)}
                  </p>
                </div>

                {/* NETO FINAL */}
                <div className={`flex justify-between items-center py-4 px-4 rounded-xl border-2 mt-2 ${
                  isDark
                    ? "bg-emerald-900/20 border-emerald-500/40"
                    : "bg-emerald-50 border-emerald-300"
                }`}>
                  <div>
                    <p className={`text-[10px] uppercase font-bold ${isDark ? "text-emerald-400/70" : "text-emerald-700/70"}`}>
                      Total a Pagar
                    </p>
                    <p className={`text-[10px] ${isDark ? "text-emerald-400/50" : "text-emerald-600/60"}`}>
                      Neto de liquidación
                    </p>
                  </div>
                  <p className="font-mono font-bold text-2xl text-emerald-500">
                    {fmt(calc.totalNeto)}
                  </p>
                </div>

                {/* Botón guardar */}
                <button
                  onClick={e => e.stopPropagation()}
                  className="w-full mt-2 py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Download size={14} /> Descargar Carta de Liquidación
                </button>
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

export const AllLiquidaciones: React.FC = () => {
  const { selectedCompany } = useCompany()
  const { isDarkMode } = useTheme()
  const { pageName } = usePageName()

  const [search, setSearch] = useState("")
  const [filterTipo, setFilterTipo] = useState<TipoTerminacion | "todos">("todos")

  // ── DATA ──
  const { data: employees, isLoading: loadingEmps } = useSWR<LiquidacionEmployee[]>(
    selectedCompany
      ? `${import.meta.env.VITE_API_URL}/api/payroll/employees?companyId=${selectedCompany.id}`
      : null,
    fetcher
  )

  const { data: legalParams, isLoading: loadingParams } = useSWR<LiquidacionLegalParam[]>(
    selectedCompany
      ? `${import.meta.env.VITE_API_URL}/api/system/legal-parameters?companyId=${selectedCompany.id}`
      : null,
    fetcher
  )

  // ── EMPLEADOS ACTIVOS FILTRADOS ──
  const activeEmployees = useMemo(() => {
    if (!employees) return []
    return employees.filter(e =>
      e.status === "ACTIVE" || e.status === "SUSPENDED"
    )
  }, [employees])

  const filtered = useMemo(() => {
    return activeEmployees.filter(emp => {
      const name = `${emp.firstName} ${emp.lastName}`.toLowerCase()
      return name.includes(search.toLowerCase()) || emp.cedula.includes(search)
    })
  }, [activeEmployees, search])

  // ── LOADING ──
  if (loadingEmps || loadingParams) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${isDarkMode ? "bg-slate-900" : "bg-gray-50"}`}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-orange-500" size={40} />
          <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>Cargando colaboradores…</p>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className={`transition-colors ${isDarkMode ? "bg-slate-900" : ""}`}>

      <div className="flex items-start justify-between gap-4 mb-0">
        <PagesHeader
          title={`${pageName} — Liquidaciones`}
          description="Cálculo de prestaciones laborales · Código de Trabajo de Panamá"
          onExport={() => {}}
        />
        <div className="shrink-0 mt-1">
          <ExportButtons
            label="Exportar todos"
            onExcel={() => {
              const rows = activeEmployees.map(emp => {
                const calc = calcularLiquidacion(emp, "DESPIDO_INJUSTIFICADO", new Date(), legalParams || [])
                return {
                  cedula: emp.cedula, firstName: emp.firstName, lastName: emp.lastName,
                  position: emp.position, hireDate: calc.fechaIngreso,
                  fechaTerminacion: calc.fechaTerminacion,
                  tipoTerminacion: calc.tipoTerminacion,
                  anosTrabajados: calc.anosTrabajados, mesesTrabajados: calc.mesesTrabajados,
                  salarioMensual: calc.salarioMensual,
                  primaAntiguedadBruto: calc.primaAntiguedadBruto, preaviso: calc.preaviso,
                  vacacionesBruto: calc.vacacionesBruto, decimoProporcionalBruto: calc.decimoProporcionalBruto,
                  indemnizacionBruto: calc.indemnizacionBruto, totalBruto: calc.totalBruto,
                  ss: calc.ss, se: calc.se, isr: calc.isr, totalNeto: calc.totalNeto,
                }
              })
              exportLiquidacionesExcel({ rows, companyName: selectedCompany?.name ?? "Empresa" })
            }}
            onPDF={() => {
              const rows = activeEmployees.map(emp => {
                const calc = calcularLiquidacion(emp, "DESPIDO_INJUSTIFICADO", new Date(), legalParams || [])
                return {
                  cedula: emp.cedula, firstName: emp.firstName, lastName: emp.lastName,
                  position: emp.position, hireDate: calc.fechaIngreso,
                  fechaTerminacion: calc.fechaTerminacion,
                  tipoTerminacion: calc.tipoTerminacion,
                  anosTrabajados: calc.anosTrabajados, mesesTrabajados: calc.mesesTrabajados,
                  salarioMensual: calc.salarioMensual,
                  primaAntiguedadBruto: calc.primaAntiguedadBruto, preaviso: calc.preaviso,
                  vacacionesBruto: calc.vacacionesBruto, decimoProporcionalBruto: calc.decimoProporcionalBruto,
                  indemnizacionBruto: calc.indemnizacionBruto, totalBruto: calc.totalBruto,
                  ss: calc.ss, se: calc.se, isr: calc.isr, totalNeto: calc.totalNeto,
                }
              })
              exportLiquidacionesPDF({ rows, companyName: selectedCompany?.name ?? "Empresa" })
            }}
            isDark={isDarkMode}
            disabled={activeEmployees.length === 0}
          />
        </div>
      </div>

      {/* ── RESUMEN LEGAL ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { icon: <DollarSign size={16} />, label: "Prima de Antigüedad", sub: "1 sem/año · Art. 224", color: "orange" },
          { icon: <Clock size={16} />, label: "Preaviso", sub: "1–3 sem · Art. 683", color: "amber" },
          { icon: <Calendar size={16} />, label: "Vacaciones", sub: "Proporcional · Art. 54", color: "teal" },
          { icon: <ShieldAlert size={16} />, label: "Indemnización", sub: "Despido injust. · Art. 225", color: "red" },
        ].map(({ icon, label, sub, color }) => (
          <div key={label} className={`p-4 rounded-xl border flex items-center gap-3 ${
            isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"
          }`}>
            <div className={`p-2.5 rounded-full bg-${color}-500/10 text-${color}-${isDarkMode ? "400" : "600"}`}>
              {icon}
            </div>
            <div>
              <p className={`text-xs font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>{label}</p>
              <p className={`text-[10px] ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── AVISO IMPORTANTE ── */}
      <div className={`mb-6 p-4 rounded-xl border flex items-start gap-3 ${
        isDarkMode ? "bg-amber-900/10 border-amber-500/30" : "bg-amber-50 border-amber-300"
      }`}>
        <Info className={`shrink-0 mt-0.5 ${isDarkMode ? "text-amber-400" : "text-amber-600"}`} size={16} />
        <p className={`text-xs ${isDarkMode ? "text-amber-200/80" : "text-amber-800"}`}>
          <strong>Instrucciones:</strong> Haz clic en cualquier colaborador para expandir su calculadora de liquidación.
          Selecciona la causa de terminación y la fecha efectiva para obtener el cálculo detallado con todos los conceptos legales aplicables.
        </p>
      </div>

      {/* ── TABLA ── */}
      <div className={`rounded-xl border overflow-hidden shadow-xl ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>

        {/* Header */}
        <div className={`p-4 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
          isDarkMode ? "border-slate-700" : "border-gray-200"
        }`}>
          <div className="flex items-center gap-3">
            <FileText className="text-orange-500" size={20} />
            <h3 className={`font-bold text-sm ${isDarkMode ? "text-white" : "text-gray-900"}`}>
              Colaboradores Activos
            </h3>
            <span className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
              ({filtered.length})
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
                className={`w-full pl-9 pr-4 py-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-orange-500 transition-colors ${
                  isDarkMode
                    ? "bg-slate-900 border border-slate-700 text-white placeholder-gray-600"
                    : "bg-gray-100 border border-gray-300 text-gray-900 placeholder-gray-400"
                }`}
              />
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className={`w-full text-left ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
            <thead className={`text-[10px] uppercase font-bold tracking-wider ${
              isDarkMode ? "bg-slate-900/50 text-gray-500" : "bg-gray-50 text-gray-500"
            }`}>
              <tr>
                <th className="px-6 py-3">Colaborador</th>
                <th className="px-4 py-3">Antigüedad</th>
                <th className="px-4 py-3">Salario Mensual</th>
                <th className="px-4 py-3">Tipo Terminación</th>
                <th className="px-4 py-3">Bruto</th>
                <th className="px-4 py-3 text-emerald-500">Neto</th>
                <th className="px-4 py-3 pr-6" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className={`text-center py-16 ${isDarkMode ? "text-gray-600" : "text-gray-400"}`}>
                    <Users className="mx-auto mb-3 opacity-30" size={32} />
                    <p className="text-sm">No se encontraron colaboradores</p>
                  </td>
                </tr>
              ) : (
                filtered.map(emp => (
                  <EmpleadoRow
                    key={emp.id}
                    employee={emp}
                    legalParams={legalParams || []}
                    isDark={isDarkMode}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── TABLA DE REFERENCIA LEGAL ── */}
      <div className={`mt-6 rounded-xl border overflow-hidden ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
        <div className={`px-5 py-3 border-b flex items-center gap-2 ${isDarkMode ? "border-slate-700" : "border-gray-200"}`}>
          <Calculator size={15} className={isDarkMode ? "text-gray-400" : "text-gray-500"} />
          <h4 className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
            Tabla de Referencia — Indemnización (Art. 225)
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className={`w-full text-xs ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
            <thead className={`${isDarkMode ? "bg-slate-900/40 text-gray-500" : "bg-gray-50 text-gray-500"} uppercase`}>
              <tr>
                <th className="px-5 py-3">Antigüedad</th>
                <th className="px-5 py-3">Prima (Art. 224)</th>
                <th className="px-5 py-3">Preaviso (Art. 683)</th>
                <th className="px-5 py-3">Indemnización (Art. 225)</th>
                <th className="px-5 py-3">Aplica en…</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? "divide-slate-700" : "divide-gray-100"}`}>
              {[
                ["< 2 años", "1 sem/año + fracción ≥ 3m", "1 semana", "3.4 sem/año proporcional", "Despido injustificado"],
                ["2–5 años", "1 sem/año + fracción ≥ 3m", "2 semanas", "3.4 sem × 2 + años extra × 4.4", "Despido injustificado"],
                ["5–10 años", "1 sem/año + fracción ≥ 3m", "3 semanas", "3.4 sem × 2 + años extra × 4.4", "Despido injustificado"],
                ["> 10 años", "1 sem/año + fracción ≥ 3m", "3 semanas", "6 semanas por año (tope)", "Despido injustificado"],
              ].map(([ant, prima, prev, ind, aplica]) => (
                <tr key={ant} className={`${isDarkMode ? "hover:bg-slate-700/20" : "hover:bg-gray-50"}`}>
                  <td className="px-5 py-3 font-semibold">{ant}</td>
                  <td className="px-5 py-3">{prima}</td>
                  <td className="px-5 py-3">{prev}</td>
                  <td className="px-5 py-3">{ind}</td>
                  <td className={`px-5 py-3 ${isDarkMode ? "text-orange-400" : "text-orange-600"}`}>{aplica}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── NOTA LEGAL ── */}
      <div className={`mt-4 p-4 rounded-xl border flex items-start gap-4 ${isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-blue-50 border-blue-200"}`}>
        <Info className={`mt-0.5 shrink-0 ${isDarkMode ? "text-blue-400" : "text-blue-500"}`} size={16} />
        <div className={`text-xs space-y-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
          <p className="font-bold">Conceptos que aplican según causa de terminación</p>
          <p>• <strong>Despido injustificado:</strong> prima + preaviso + vacaciones + décimo + indemnización</p>
          <p>• <strong>Renuncia / Despido justificado / Mutuo acuerdo:</strong> prima + vacaciones + décimo (sin preaviso ni indemnización)</p>
          <p>• La <strong>prima de antigüedad</strong> es irrenunciable y se paga en todos los casos (Art. 224).</p>
          <p>• Deducciones aplicadas: SS empleado (9.75%), Seguro Educativo (1.25%) e ISR proporcional sobre el total bruto.</p>
        </div>
      </div>

    </div>
  )
}
