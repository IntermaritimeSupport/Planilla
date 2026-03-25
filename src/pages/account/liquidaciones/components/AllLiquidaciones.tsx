"use client"

import { useState, useMemo, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import useSWR from "swr"
import { useNotifications } from "../../../../context/notificationContext"
import { useCompany } from "../../../../context/routerContext"
import { useTheme } from "../../../../context/themeContext"
import { usePageName } from "../../../../hook/usePageName"
import PagesHeader from "../../../../components/headers/pagesHeader"
import {
  FileText, Search, AlertTriangle,
  CheckCircle, Info, Loader2, Calculator, Users,
  Calendar, DollarSign, Clock, ShieldAlert, RotateCcw, History,
  ArrowRight,
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
import { authFetcher, apiPut, apiPost } from "../../../../services/api"

// interface PaidLeave { employeeId: string; leaveType: string; isPaid: boolean; daysApproved: number | null; daysRequested: number }
import { toast } from "sonner"

// ─────────────────────────────────────────────────────────────────────────────

interface LiquidacionRecord {
  id: string
  employeeId: string
  tipoTerminacion: string
  fechaTerminacion: string
  previousStatus: string
  salarioMensual: number
  anosTrabajados: number
  mesesTrabajados: number
  diasTrabajados: number
  primaAntiguedad: number
  preaviso: number
  vacaciones: number
  decimo: number
  indemnizacion: number
  salariosPendientes: number
  totalBruto: number
  ss: number
  se: number
  isr: number
  totalDeducciones: number
  totalNeto: number
  revertedAt: string | null
  revertedBy: string | null
  notes: string | null
  createdAt: string
  employee: { id: string; firstName: string; lastName: string; cedula: string; position: string }
}

const fmt = (n: number) =>
  `$${(Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const TIPO_LABELS: Record<TipoTerminacion, { label: string; color: string; icon: React.ReactNode }> = {
  DESPIDO_INJUSTIFICADO: { label: "Despido Injustificado", color: "red", icon: <ShieldAlert size={13} /> },
  RENUNCIA: { label: "Renuncia Voluntaria", color: "amber", icon: <Clock size={13} /> },
  MUTUO_ACUERDO: { label: "Mutuo Acuerdo", color: "blue", icon: <CheckCircle size={13} /> },
  DESPIDO_JUSTIFICADO: { label: "Despido Justificado", color: "purple", icon: <AlertTriangle size={13} /> },
  TERMINACION_CONTRATO: { label: "Terminación de Contrato", color: "orange", icon: <FileText size={13} /> },
}


// ─────────────────────────────────────────────────────────────────────────────
// FILA DE EMPLEADO — navega a la página de liquidación
// ─────────────────────────────────────────────────────────────────────────────

const EmpleadoRow: React.FC<{
  employee: LiquidacionEmployee
  legalParams: LiquidacionLegalParam[]
  isDark: boolean
  companyCode: string
}> = ({ employee, legalParams, isDark, companyCode }) => {
  const navigate = useNavigate()

  const calc = useMemo<LiquidacionDesglose>(() => {
    return calcularLiquidacion(employee, "DESPIDO_INJUSTIFICADO", new Date(), legalParams, 0)
  }, [employee, legalParams])

  const td = "px-4 py-3 text-sm"

  return (
    <tr
      onClick={() => navigate(`/${companyCode}/liquidaciones/procesar/${employee.id}`)}
      className={`cursor-pointer border-b transition-colors ${
        isDark ? "border-slate-700/50 hover:bg-slate-700/20" : "border-gray-100 hover:bg-gray-50"
      }`}
    >
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
      <td className={`${td} font-mono ${isDark ? "text-slate-300" : "text-gray-700"}`}>
        {calc.anosTrabajados > 0 ? `${calc.anosTrabajados}a ` : ""}
        {calc.fraccionMeses}m
      </td>
      <td className={`${td} font-mono ${isDark ? "text-slate-300" : "text-gray-700"}`}>
        {fmt(calc.salarioMensual)}
      </td>
      <td className={`${td} font-mono ${isDark ? "text-slate-200" : "text-gray-800"}`}>
        {fmt(calc.totalBruto)}
      </td>
      <td className={`${td} font-mono font-bold text-emerald-500`}>
        {fmt(calc.totalNeto)}
      </td>
      <td className={`${td} pr-6 text-right`}>
        <ArrowRight size={16} className={isDark ? "text-gray-400" : "text-gray-500"} />
      </td>
    </tr>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export const AllLiquidaciones: React.FC = () => {
  const { selectedCompany } = useCompany()
  const { isDarkMode } = useTheme()
  const { pageName } = usePageName()
  const { addNotification } = useNotifications()

  useEffect(() => {
    addNotification({
      id: "liquidaciones-legal-warning",
      type: "warning",
      title: "Revisión legal requerida",
      message: "Los cálculos de liquidación son estimados. Confirme con un abogado laboral antes de ejecutar pagos.",
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [search, setSearch] = useState("")
  const [terminatedIds, setTerminatedIds] = useState<Set<string>>(new Set())
  const [revertingId, setRevertingId] = useState<string | null>(null)
  const [revertingStatusId, setRevertingStatusId] = useState<string | null>(null)
  // const [filterTipo, setFilterTipo] = useState<TipoTerminacion | "todos">("todos")

  // ── DATA ──
  const { data: employees, isLoading: loadingEmps, mutate: mutateEmployees } = useSWR<LiquidacionEmployee[]>(
    selectedCompany
      ? `${import.meta.env.VITE_API_URL}/api/payroll/employees?companyId=${selectedCompany.id}`
      : null,
    authFetcher
  )

  const { data: legalParams, isLoading: loadingParams } = useSWR<LiquidacionLegalParam[]>(
    selectedCompany
      ? `${import.meta.env.VITE_API_URL}/api/system/legal-parameters?companyId=${selectedCompany.id}`
      : null,
    authFetcher
  )

  const { data: liquidacionesHistory, mutate: mutateLiquidaciones } = useSWR<LiquidacionRecord[]>(
    selectedCompany
      ? `${import.meta.env.VITE_API_URL}/api/payroll/liquidaciones?companyId=${selectedCompany.id}`
      : null,
    authFetcher
  )

  // ── EMPLEADOS ACTIVOS FILTRADOS ──
  const activeEmployees = useMemo(() => {
    if (!employees) return []
    return employees.filter(e =>
      (e.status === "ACTIVE" || e.status === "SUSPENDED") && !terminatedIds.has(e.id)
    )
  }, [employees, terminatedIds])

  // ── EMPLEADOS TERMINADOS (para revertir error) ──
  const terminatedEmployees = useMemo(() => {
    if (!employees) return []
    return employees.filter(e => e.status === "TERMINATED")
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
          <strong>Instrucciones:</strong> Haz clic en un colaborador para abrir su calculadora de liquidación individual.
          Podrás configurar la causa de terminación, la fecha efectiva y descargar la carta de liquidación.
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
                <th className="px-4 py-3">Bruto Est.</th>
                <th className="px-4 py-3 text-emerald-500">Neto Est.</th>
                <th className="px-4 py-3 pr-6" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className={`text-center py-16 ${isDarkMode ? "text-gray-600" : "text-gray-400"}`}>
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
                    companyCode={selectedCompany?.code ?? ""}
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

      {/* ── EMPLEADOS TERMINADOS (revertir error) ── */}
      {terminatedEmployees.length > 0 && (
        <div className={`mt-8 rounded-xl border overflow-hidden shadow-xl ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
          <div className={`p-4 border-b flex items-center gap-3 ${isDarkMode ? "border-slate-700" : "border-gray-200"}`}>
            <RotateCcw className="text-amber-500" size={18} />
            <div>
              <h3 className={`font-bold text-sm ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                Empleados Terminados
              </h3>
              <p className={`text-[10px] ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
                Usa "Revertir" si liquidaste a alguien por error — restaura su estado a ACTIVO
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className={`w-full text-left text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
              <thead className={`text-[10px] uppercase font-bold tracking-wider ${isDarkMode ? "bg-slate-900/50 text-gray-500" : "bg-gray-50 text-gray-500"}`}>
                <tr>
                  <th className="px-5 py-3">Colaborador</th>
                  <th className="px-4 py-3">Cargo</th>
                  <th className="px-4 py-3">Salario</th>
                  <th className="px-4 py-3 pr-5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? "divide-slate-700" : "divide-gray-100"}`}>
                {terminatedEmployees.map(emp => (
                  <tr key={emp.id} className={isDarkMode ? "hover:bg-slate-700/20" : "hover:bg-gray-50"}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isDarkMode ? "bg-slate-700 text-gray-400" : "bg-gray-100 text-gray-600"}`}>
                          {emp.firstName[0]}{emp.lastName[0]}
                        </div>
                        <div>
                          <p className={`font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                            {emp.firstName} {emp.lastName}
                          </p>
                          <p className={`text-[10px] ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
                            {emp.cedula}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                      {emp.position || "—"}
                    </td>
                    <td className={`px-4 py-3 font-mono text-xs ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                      {fmt(Number(emp.salary))}
                    </td>
                    <td className="px-4 py-3 pr-5 text-right">
                      <button
                        disabled={revertingStatusId === emp.id}
                        onClick={async () => {
                          if (!window.confirm(`¿Revertir terminación de ${emp.firstName} ${emp.lastName}?\n\nEl empleado volverá a estado ACTIVO.`)) return
                          setRevertingStatusId(emp.id)
                          try {
                            await apiPut(`/api/payroll/employees/${emp.id}/status`, { status: "ACTIVE" })
                            toast.success(`${emp.firstName} ${emp.lastName} restaurado a ACTIVO`)
                            mutateEmployees()
                            mutateLiquidaciones()
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : "Error al revertir")
                          } finally {
                            setRevertingStatusId(null)
                          }
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                          isDarkMode
                            ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                            : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {revertingStatusId === emp.id
                          ? <Loader2 size={12} className="animate-spin" />
                          : <RotateCcw size={12} />
                        }
                        Revertir a Activo
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── HISTORIAL DE LIQUIDACIONES ── */}
      {liquidacionesHistory && liquidacionesHistory.length > 0 && (
        <div className={`mt-8 rounded-xl border overflow-hidden shadow-xl ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
          <div className={`p-4 border-b flex items-center gap-3 ${isDarkMode ? "border-slate-700" : "border-gray-200"}`}>
            <History className="text-orange-500" size={18} />
            <h3 className={`font-bold text-sm ${isDarkMode ? "text-white" : "text-gray-900"}`}>
              Historial de Liquidaciones
            </h3>
            <span className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
              ({liquidacionesHistory.length})
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className={`w-full text-left text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
              <thead className={`text-[10px] uppercase font-bold tracking-wider ${isDarkMode ? "bg-slate-900/50 text-gray-500" : "bg-gray-50 text-gray-500"}`}>
                <tr>
                  <th className="px-5 py-3">Colaborador</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Bruto</th>
                  <th className="px-4 py-3 text-emerald-500">Neto</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 pr-5" />
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? "divide-slate-700" : "divide-gray-100"}`}>
                {liquidacionesHistory.map(liq => (
                  <tr key={liq.id} className={`${isDarkMode ? "hover:bg-slate-700/20" : "hover:bg-gray-50"} ${liq.revertedAt ? "opacity-50" : ""}`}>
                    <td className="px-5 py-3">
                      <p className={`font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                        {liq.employee.firstName} {liq.employee.lastName}
                      </p>
                      <p className={`text-[10px] ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
                        {liq.employee.cedula} · {liq.employee.position}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold ${isDarkMode ? "text-orange-400" : "text-orange-600"}`}>
                        {TIPO_LABELS[liq.tipoTerminacion as TipoTerminacion]?.label ?? liq.tipoTerminacion}
                      </span>
                    </td>
                    <td className={`px-4 py-3 font-mono text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                      {new Date(liq.fechaTerminacion).toLocaleDateString("es-PA")}
                    </td>
                    <td className={`px-4 py-3 font-mono ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>
                      {fmt(liq.totalBruto)}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-emerald-500">
                      {fmt(liq.totalNeto)}
                    </td>
                    <td className="px-4 py-3">
                      {liq.revertedAt ? (
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${isDarkMode ? "bg-slate-700 text-gray-400" : "bg-gray-100 text-gray-500"}`}>
                          Revertida · {new Date(liq.revertedAt).toLocaleDateString("es-PA")}
                        </span>
                      ) : (
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${isDarkMode ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-700"}`}>
                          Procesada
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 pr-5 text-right">
                      {!liq.revertedAt && (
                        <button
                          disabled={revertingId === liq.id}
                          onClick={async () => {
                            if (!window.confirm(`¿Revertir liquidación de ${liq.employee.firstName} ${liq.employee.lastName}?\n\nEl empleado volverá al estado "${liq.previousStatus}".`)) return
                            setRevertingId(liq.id)
                            try {
                              await apiPost(`/api/payroll/liquidaciones/${liq.id}/revert`, {})
                              toast.success("Liquidación revertida. El empleado fue restaurado.")
                              mutateLiquidaciones()
                            } catch (err) {
                              toast.error(err instanceof Error ? err.message : "Error al revertir")
                            } finally {
                              setRevertingId(null)
                            }
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                            isDarkMode
                              ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                              : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {revertingId === liq.id
                            ? <Loader2 size={12} className="animate-spin" />
                            : <RotateCcw size={12} />
                          }
                          Revertir
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
