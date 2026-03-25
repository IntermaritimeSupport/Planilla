"use client"

import { useState, useMemo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import useSWR from "swr"
import { useCompany } from "../../../../context/routerContext"
import { useTheme } from "../../../../context/themeContext"
import {
  ArrowLeft, Download, CheckCircle, Loader2, ShieldAlert, Clock,
  AlertTriangle, FileText, DollarSign, Calendar,
} from "lucide-react"
import { toast } from "sonner"
import { authFetcher, apiPost } from "../../../../services/api"
import { exportLiquidacionIndividualPDF } from "../../../../utils/exports/exportEngine"
import {
  type LiquidacionEmployee,
  type LiquidacionLegalParam,
  type LiquidacionDesglose,
  type TipoTerminacion,
  calcularLiquidacion,
} from "./liquidacionesCalculation"

// ─────────────────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  `$${(Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtDays = (n: number) => `${Number(n).toFixed(1)} días`

const TIPO_LABELS: Record<TipoTerminacion, { label: string; color: string; icon: React.ReactNode }> = {
  DESPIDO_INJUSTIFICADO: { label: "Despido Injustificado", color: "red", icon: <ShieldAlert size={13} /> },
  RENUNCIA: { label: "Renuncia Voluntaria", color: "amber", icon: <Clock size={13} /> },
  MUTUO_ACUERDO: { label: "Mutuo Acuerdo", color: "blue", icon: <CheckCircle size={13} /> },
  DESPIDO_JUSTIFICADO: { label: "Despido Justificado", color: "purple", icon: <AlertTriangle size={13} /> },
  TERMINACION_CONTRATO: { label: "Terminación de Contrato", color: "orange", icon: <FileText size={13} /> },
}

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
        orange: "border-orange-500 bg-orange-500/10 text-orange-400",
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
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export const LiquidacionEmpleadoPage: React.FC = () => {
  const { employeeId } = useParams<{ employeeId: string }>()
  const navigate = useNavigate()
  const { selectedCompany } = useCompany()
  const { isDarkMode: isDark } = useTheme()

  const [tipo, setTipo] = useState<TipoTerminacion>("DESPIDO_INJUSTIFICADO")
  const [fechaTerm, setFechaTerm] = useState(new Date().toISOString().split("T")[0])
  const [terminating, setTerminating] = useState(false)
  const [diasPendienteOverride, setDiasPendienteOverride] = useState<string>("")

  const { data: employees, isLoading: loadingEmps } = useSWR<LiquidacionEmployee[]>(
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

  const employee = useMemo(
    () => employees?.find(e => e.id === employeeId) ?? null,
    [employees, employeeId]
  )

  const calc = useMemo<LiquidacionDesglose | null>(() => {
    if (!employee || !legalParams) return null
    const diasOverride = diasPendienteOverride !== "" ? Number(diasPendienteOverride) : undefined
    return calcularLiquidacion(employee, tipo, new Date(fechaTerm + "T12:00:00"), legalParams, 0, diasOverride)
  }, [employee, tipo, fechaTerm, legalParams, diasPendienteOverride])

  const loading = loadingEmps || loadingParams

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${isDark ? "bg-slate-900" : "bg-gray-50"}`}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-orange-500" size={40} />
          <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>Cargando datos…</p>
        </div>
      </div>
    )
  }

  if (!employee || !calc) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${isDark ? "bg-slate-900" : "bg-gray-50"}`}>
        <div className="text-center">
          <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>Empleado no encontrado</p>
          <button onClick={() => navigate(-1)} className="mt-4 text-orange-500 text-sm underline">Volver</button>
        </div>
      </div>
    )
  }

  const handleProcesar = async () => {
    if (!window.confirm(
      `¿Confirmar terminación laboral de ${employee.firstName} ${employee.lastName}?\n\nEsta acción cambiará su estado a TERMINADO y dejará de aparecer en nóminas futuras.`
    )) return
    setTerminating(true)
    try {
      await apiPost("/api/payroll/liquidaciones", {
        employeeId: employee.id,
        companyId: selectedCompany?.id,
        tipoTerminacion: tipo,
        fechaTerminacion: new Date(fechaTerm + "T12:00:00").toISOString(),
        previousStatus: employee.status,
        salarioMensual: calc.salarioMensual,
        anosTrabajados: calc.anosTrabajados,
        mesesTrabajados: calc.mesesTrabajados,
        diasTrabajados: calc.diasTrabajados,
        primaAntiguedad: calc.primaAntiguedadBruto,
        preaviso: calc.preaviso,
        vacaciones: calc.vacacionesBruto,
        decimo: calc.decimoProporcionalBruto,
        indemnizacion: calc.indemnizacionBruto,
        salariosPendientes: calc.salariosPendientes,
        totalBruto: calc.totalBruto,
        ss: calc.ss,
        se: calc.se,
        isr: calc.isr,
        totalDeducciones: calc.totalDeducciones,
        totalNeto: calc.totalNeto,
      })
      toast.success(`${employee.firstName} ${employee.lastName} liquidado exitosamente`)
      navigate(-1)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al procesar la liquidación")
    } finally {
      setTerminating(false)
    }
  }

  return (
    <div className={`min-h-screen transition-colors ${isDark ? "bg-slate-900" : "bg-gray-50"}`}>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* ── ENCABEZADO ── */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className={`p-2 rounded-lg transition-colors ${
              isDark ? "hover:bg-slate-800 text-gray-400" : "hover:bg-gray-200 text-gray-600"
            }`}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
              Liquidación — {employee.firstName} {employee.lastName}
            </h1>
            <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>
              {employee.cedula} · {employee.position || "—"} · {selectedCompany?.name}
            </p>
          </div>
        </div>

        {/* ── AVISO LEGAL ── */}
        <div className={`p-4 rounded-xl border flex items-start gap-3 ${
          isDark ? "bg-amber-900/10 border-amber-500/30" : "bg-amber-50 border-amber-300"
        }`}>
          <AlertTriangle className={`shrink-0 mt-0.5 ${isDark ? "text-amber-400" : "text-amber-600"}`} size={16} />
          <p className={`text-xs ${isDark ? "text-amber-200/80" : "text-amber-800"}`}>
            <strong>Revisión legal requerida:</strong> Los cálculos son estimados según el Código de Trabajo de Panamá.
            Confirme con un abogado laboral antes de ejecutar el pago.
          </p>
        </div>

        {/* ── 3 COLUMNAS ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── COLUMNA 1: Configuración ── */}
          <div className={`rounded-xl border p-5 space-y-4 ${
            isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"
          }`}>
            <h4 className={`text-xs font-bold uppercase tracking-widest ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              Configuración
            </h4>

            <div>
              <p className={`text-[10px] font-bold uppercase mb-2 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                Causa de terminación
              </p>
              <TipoSelector value={tipo} onChange={setTipo} isDark={isDark} />
            </div>

            <div>
              <p className={`text-[10px] font-bold uppercase mb-2 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                Fecha efectiva de terminación
              </p>
              <input
                type="date"
                value={fechaTerm}
                onChange={e => setFechaTerm(e.target.value)}
                className={`w-full px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2 focus:ring-orange-500 transition-colors ${
                  isDark
                    ? "bg-slate-900 border-slate-700 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              />
            </div>

            {tipo === "TERMINACION_CONTRATO" && (
              <div>
                <p className={`text-[10px] font-bold uppercase mb-2 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                  Días pendientes de pago (ajuste manual)
                </p>
                <input
                  type="number"
                  min={0}
                  max={31}
                  placeholder={`Auto: ${calc.diasPendientes} días`}
                  value={diasPendienteOverride}
                  onChange={e => setDiasPendienteOverride(e.target.value)}
                  className={`w-full px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2 focus:ring-orange-500 transition-colors ${
                    isDark
                      ? "bg-slate-900 border-slate-700 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                />
                <p className={`text-[10px] mt-1 ${isDark ? "text-gray-600" : "text-gray-400"}`}>
                  Dejar vacío para calcular automáticamente
                </p>
              </div>
            )}

            {/* Base de cálculo */}
            <div className={`p-3 rounded-lg ${isDark ? "bg-slate-900 border border-slate-700" : "bg-gray-50 border border-gray-200"}`}>
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

            {/* Resumen rápido */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[
                { label: "Años", value: `${calc.anosTrabajados}a ${calc.fraccionMeses}m`, icon: <Calendar size={12} /> },
                { label: "Mensual", value: fmt(calc.salarioMensual), icon: <DollarSign size={12} /> },
                { label: "Tipo", value: TIPO_LABELS[tipo].label.split(" ")[0], icon: TIPO_LABELS[tipo].icon },
              ].map(({ label, value, icon }) => (
                <div key={label} className={`p-2 rounded-lg text-center ${isDark ? "bg-slate-900/60" : "bg-gray-100"}`}>
                  <div className={`flex items-center justify-center gap-1 mb-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                    {icon}
                    <span className="text-[9px] uppercase font-bold">{label}</span>
                  </div>
                  <p className={`text-[10px] font-mono font-semibold truncate ${isDark ? "text-white" : "text-gray-900"}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── COLUMNA 2: Conceptos a Pagar ── */}
          <div className={`rounded-xl border p-5 space-y-2 ${
            isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"
          }`}>
            <h4 className={`text-xs font-bold uppercase tracking-widest mb-3 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
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
              disabled={tipo !== "DESPIDO_INJUSTIFICADO" && tipo !== "TERMINACION_CONTRATO"}
            />
            <ConceptoRow
              label="Vacaciones Proporcionales"
              value={calc.vacacionesBruto}
              sub={calc.diasVacYaPagados > 0
                ? `${fmtDays(calc.diasVacaciones)} netos · ${calc.diasVacYaPagados.toFixed(1)}d ya pagados · Art. 54 CT`
                : `${fmtDays(calc.diasVacaciones)} · Art. 54 CT`
              }
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
              disabled={tipo !== "DESPIDO_INJUSTIFICADO" && tipo !== "TERMINACION_CONTRATO"}
            />
            <ConceptoRow
              label="Salarios Pendientes"
              value={calc.salariosPendientes}
              sub={`${calc.diasPendientes} días sin pagar del período actual`}
              isDark={isDark}
              disabled={tipo !== "TERMINACION_CONTRATO"}
            />

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

          {/* ── COLUMNA 3: Deducciones y Neto ── */}
          <div className={`rounded-xl border p-5 space-y-2 ${
            isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"
          }`}>
            <h4 className={`text-xs font-bold uppercase tracking-widest mb-3 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
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

            {/* Botón descargar PDF */}
            <button
              onClick={() => exportLiquidacionIndividualPDF({
                employee: { cedula: employee.cedula, firstName: employee.firstName, lastName: employee.lastName, position: employee.position },
                companyName: selectedCompany?.name ?? "Empresa",
                tipoTerminacion: tipo,
                fechaIngreso: calc.fechaIngreso,
                fechaTerminacion: calc.fechaTerminacion,
                anosTrabajados: calc.anosTrabajados,
                mesesTrabajados: calc.mesesTrabajados,
                diasTrabajados: calc.diasTrabajados,
                salarioMensual: calc.salarioMensual,
                salarioDiario: calc.salarioDiario,
                primaAntiguedadBruto: calc.primaAntiguedadBruto,
                semanasPrimaAntiguedad: calc.semanasPrimaAntiguedad,
                preaviso: calc.preaviso,
                semanasPreaviso: calc.semanasPreaviso,
                vacacionesBruto: calc.vacacionesBruto,
                diasVacaciones: calc.diasVacaciones,
                decimoProporcionalBruto: calc.decimoProporcionalBruto,
                mesesDecimoActual: calc.mesesDecimoActual,
                indemnizacionBruto: calc.indemnizacionBruto,
                totalBruto: calc.totalBruto,
                ss: calc.ss,
                se: calc.se,
                isr: calc.isr,
                totalDeducciones: calc.totalDeducciones,
                totalNeto: calc.totalNeto,
              })}
              className="w-full mt-2 py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Download size={14} /> Descargar Carta de Liquidación
            </button>

            {/* Botón procesar */}
            <button
              onClick={handleProcesar}
              disabled={terminating}
              className="w-full mt-2 py-2.5 px-4 bg-red-700 hover:bg-red-800 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {terminating
                ? <><Loader2 size={14} className="animate-spin" /> Procesando…</>
                : <><CheckCircle size={14} /> Procesar Liquidación</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LiquidacionEmpleadoPage
