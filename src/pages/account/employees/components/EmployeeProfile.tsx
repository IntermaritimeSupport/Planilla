"use client"

import { useState } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import useSWR from "swr"
import { authFetcher } from "../../../../services/api"
import { useCompany } from "../../../../context/routerContext"
import { useTheme } from "../../../../context/themeContext"
import {
  ArrowLeft, User, Palmtree, FileText, DollarSign, Activity,
  Receipt, TrendingUp, Loader2, Building2, Phone, Calendar,
  CreditCard, Briefcase, Clock, CheckCircle, XCircle, Ban,
  AlertTriangle, ChevronUp, ChevronDown, Gift,
} from "lucide-react"

const API_URL = import.meta.env.VITE_API_URL as string

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmt = (n: number | string) =>
  `$${(Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtDate = (d: string | Date | null | undefined) => {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("es-PA", { day: "2-digit", month: "short", year: "numeric" })
}

type EmployeeStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "TERMINATED" | "MATERNITY_LEAVE"
type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED"
type LeaveType = "VACATION" | "SICK_LEAVE" | "MATERNITY_LEAVE" | "PERSONAL_LEAVE" | "UNPAID_LEAVE" | "OTHER"
type ContractType = "INDEFINIDO" | "TEMPORAL" | "PRUEBA" | "OBRA" | string

const STATUS_CFG: Record<EmployeeStatus, { label: string; color: string }> = {
  ACTIVE:         { label: "Activo",           color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  INACTIVE:       { label: "Inactivo",         color: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
  SUSPENDED:      { label: "Suspendido",       color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  TERMINATED:     { label: "Terminado",        color: "bg-red-500/20 text-red-400 border-red-500/30" },
  MATERNITY_LEAVE:{ label: "Lic. Maternidad",  color: "bg-pink-500/20 text-pink-400 border-pink-500/30" },
}

const LEAVE_STATUS: Record<LeaveStatus, { label: string; icon: React.ReactNode; color: string }> = {
  PENDING:   { label: "Pendiente", icon: <Clock size={11} />,        color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  APPROVED:  { label: "Aprobado",  icon: <CheckCircle size={11} />,  color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  REJECTED:  { label: "Rechazado", icon: <XCircle size={11} />,      color: "bg-red-500/20 text-red-400 border-red-500/30" },
  CANCELLED: { label: "Cancelado", icon: <Ban size={11} />,          color: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
}

const LEAVE_TYPE_LABEL: Record<LeaveType, string> = {
  VACATION:       "Vacaciones",
  SICK_LEAVE:     "Enfermedad",
  MATERNITY_LEAVE:"Maternidad",
  PERSONAL_LEAVE: "Personal",
  UNPAID_LEAVE:   "Sin pago",
  OTHER:          "Otro",
}

const PAYROLL_STATUS: Record<string, { label: string; color: string }> = {
  DRAFT:     { label: "Borrador",  color: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
  APPROVED:  { label: "Aprobado",  color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  CANCELLED: { label: "Anulado",   color: "bg-red-500/20 text-red-400 border-red-500/30" },
  PENDING:   { label: "Pendiente", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
}

const getAvatarColor = (name: string) => {
  const colors = ["bg-violet-600","bg-blue-600","bg-emerald-600","bg-orange-600","bg-pink-600","bg-indigo-600","bg-teal-600","bg-red-600"]
  return colors[(name?.length || 0) % colors.length]
}

// ─── Tab type ────────────────────────────────────────────────────────────────

type Tab = "info" | "vacaciones" | "contrato" | "liquidacion" | "estado" | "nominas" | "salarios" | "decimos"

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "info",        label: "Información",        icon: <User size={15} /> },
  { id: "vacaciones",  label: "Vacaciones",         icon: <Palmtree size={15} /> },
  { id: "contrato",    label: "Contrato",           icon: <FileText size={15} /> },
  { id: "nominas",     label: "Nóminas",            icon: <Receipt size={15} /> },
  { id: "salarios",    label: "Historial Salarial", icon: <TrendingUp size={15} /> },
  { id: "decimos",     label: "Décimos",            icon: <Gift size={15} /> },
  { id: "liquidacion", label: "Liquidación",        icon: <DollarSign size={15} /> },
  { id: "estado",      label: "Estado",             icon: <Activity size={15} /> },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function Badge({ label, color, icon }: { label: string; color: string; icon?: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${color}`}>
      {icon}{label}
    </span>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</h3>
      {children}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-slate-700/50 last:border-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-sm font-medium text-right max-w-[60%]">{value || "—"}</span>
    </div>
  )
}

// ─── Tab: Información ─────────────────────────────────────────────────────────

function TabInfo({ emp, dark }: { emp: any; dark: boolean }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className={`rounded-xl border p-5 space-y-0.5 ${dark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
        <Section title="Datos personales">
          <InfoRow label="Nombre completo" value={`${emp.firstName} ${emp.lastName}`} />
          <InfoRow label="Cédula" value={emp.cedula} />
          <InfoRow label="Email" value={<a href={`mailto:${emp.email}`} className="text-violet-400 hover:underline">{emp.email}</a>} />
          <InfoRow label="Teléfono" value={emp.phoneNumber} />
        </Section>
      </div>
      <div className={`rounded-xl border p-5 space-y-0.5 ${dark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
        <Section title="Datos laborales">
          <InfoRow label="Puesto" value={emp.position} />
          <InfoRow label="Departamento" value={emp.department} />
          <InfoRow label="Fecha de ingreso" value={fmtDate(emp.hireDate)} />
          <InfoRow label="Tipo de salario" value={emp.salaryType === "MONTHLY" ? "Mensual" : "Quincenal"} />
          <InfoRow label="Salario" value={<span className="text-emerald-400 font-semibold">{fmt(emp.salary)}</span>} />
          <InfoRow label="Estado" value={<Badge label={STATUS_CFG[emp.status as EmployeeStatus]?.label ?? emp.status} color={STATUS_CFG[emp.status as EmployeeStatus]?.color ?? ""} />} />
        </Section>
      </div>
      {(emp.bankName || emp.bankAccount) && (
        <div className={`rounded-xl border p-5 md:col-span-2 ${dark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
          <Section title="Datos bancarios">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-0">
              <InfoRow label="Banco" value={emp.bankName} />
              <InfoRow label="Cuenta" value={emp.bankAccount} />
              <InfoRow label="Tipo" value={emp.bankAccountType} />
            </div>
          </Section>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Vacaciones ──────────────────────────────────────────────────────────

function TabVacaciones({ employeeId, companyId, dark }: { employeeId: string; companyId: string; dark: boolean }) {
  const { data, isLoading } = useSWR<any>(
    `${API_URL}/api/payroll/leaves?employeeId=${employeeId}&companyId=${companyId}`,
    authFetcher
  )
  const leaves: any[] = Array.isArray(data) ? data : (data?.data ?? [])

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-4">
      {leaves.length === 0 ? (
        <EmptyState icon={<Palmtree size={28} />} label="Sin solicitudes de ausencia" />
      ) : (
        <div className={`rounded-xl border overflow-hidden ${dark ? "border-slate-700" : "border-gray-200"}`}>
          <table className="w-full text-sm">
            <thead className={dark ? "bg-slate-800" : "bg-gray-50"}>
              <tr>
                {["Tipo","Inicio","Fin","Días","Estado","Pagado"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/40">
              {leaves.map((l: any) => {
                const st = LEAVE_STATUS[l.status as LeaveStatus]
                return (
                  <tr key={l.id} className={`transition-colors ${dark ? "hover:bg-slate-800/50" : "hover:bg-gray-50"}`}>
                    <td className="px-4 py-3">{LEAVE_TYPE_LABEL[l.leaveType as LeaveType] ?? l.leaveType}</td>
                    <td className="px-4 py-3 text-slate-400">{fmtDate(l.startDate)}</td>
                    <td className="px-4 py-3 text-slate-400">{fmtDate(l.endDate)}</td>
                    <td className="px-4 py-3 font-medium">{l.daysApproved ?? l.daysRequested}</td>
                    <td className="px-4 py-3">
                      {st ? <Badge label={st.label} color={st.color} icon={st.icon} /> : l.status}
                    </td>
                    <td className="px-4 py-3">
                      {l.isPaid
                        ? <Badge label="Pagado" color="bg-emerald-500/20 text-emerald-400 border-emerald-500/30" icon={<CheckCircle size={11}/>} />
                        : <Badge label="Pendiente" color="bg-slate-500/20 text-slate-400 border-slate-500/30" />
                      }
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Contrato ────────────────────────────────────────────────────────────

function TabContrato({ emp, dark }: { emp: any; dark: boolean }) {
  const contractLabels: Record<ContractType, string> = {
    INDEFINIDO: "Indefinido",
    TEMPORAL:   "Temporal",
    PRUEBA:     "Período de prueba",
    OBRA:       "Por obra",
  }

  const hireDate = emp.hireDate ? new Date(emp.hireDate) : null
  const now = new Date()
  let yearsService = 0
  let monthsService = 0
  if (hireDate) {
    yearsService = Math.floor((now.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    monthsService = Math.floor(((now.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44))) % 12
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className={`rounded-xl border p-5 ${dark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
        <Section title="Detalles del contrato">
          <InfoRow label="Tipo de contrato" value={contractLabels[emp.contractType as ContractType] ?? emp.contractType ?? "No especificado"} />
          <InfoRow label="Fecha de ingreso" value={fmtDate(emp.hireDate)} />
          <InfoRow label="Antigüedad" value={`${yearsService} años, ${monthsService} meses`} />
          <InfoRow label="Puesto" value={emp.position} />
          <InfoRow label="Departamento" value={emp.department} />
        </Section>
      </div>
      <div className={`rounded-xl border p-5 ${dark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
        <Section title="Condiciones salariales">
          <InfoRow label="Salario base" value={<span className="text-emerald-400 font-semibold">{fmt(emp.salary)}</span>} />
          <InfoRow label="Tipo de pago" value={emp.salaryType === "MONTHLY" ? "Mensual" : "Quincenal"} />
          <InfoRow label="Estado actual" value={<Badge label={STATUS_CFG[emp.status as EmployeeStatus]?.label ?? emp.status} color={STATUS_CFG[emp.status as EmployeeStatus]?.color ?? ""} />} />
        </Section>
      </div>
    </div>
  )
}

// ─── Tab: Nóminas ─────────────────────────────────────────────────────────────

function TabNominas({ employeeId, companyId, hireDate, dark }: { employeeId: string; companyId: string; hireDate: string | null | undefined; dark: boolean }) {
  const { data, isLoading } = useSWR<any>(
    hireDate
      ? `${API_URL}/api/payroll/payrolls?employeeId=${employeeId}&companyId=${companyId}`
      : null,
    authFetcher
  )
  const payrolls: any[] = Array.isArray(data) ? data : (data?.data ?? data?.payrolls ?? [])

  if (!hireDate) return (
    <NoHireDateWarning label="No se pueden mostrar las nóminas porque el empleado no tiene fecha de ingreso registrada." dark={dark} />
  )

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-4">
      {payrolls.length === 0 ? (
        <EmptyState icon={<Receipt size={28} />} label="Sin nóminas registradas" />
      ) : (
        <div className={`rounded-xl border overflow-hidden ${dark ? "border-slate-700" : "border-gray-200"}`}>
          <table className="w-full text-sm">
            <thead className={dark ? "bg-slate-800" : "bg-gray-50"}>
              <tr>
                {["Período","Tipo","Salario Bruto","Deducciones","Neto","Estado"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/40">
              {payrolls.map((p: any) => {
                const st = PAYROLL_STATUS[p.status] ?? { label: p.status, color: "bg-slate-500/20 text-slate-400 border-slate-500/30" }

                // Calcular rango exacto de días desde payPeriod + quincena
                const run = p.payrollRun
                const quincena: number = run?.quincena ?? p.quincena ?? 0
                const baseDate = p.payPeriod ? new Date(p.payPeriod) : (run?.periodDate ? new Date(run.periodDate) : null)
                let rangeLabel = "—"
                if (baseDate) {
                  const yr  = baseDate.getFullYear()
                  const mo  = baseDate.getMonth() // 0-based
                  if (quincena === 1) {
                    // del 1 al 15
                    const start = new Date(yr, mo, 1)
                    const end   = new Date(yr, mo, 15)
                    rangeLabel  = `${fmtDate(start)} – ${fmtDate(end)}`
                  } else if (quincena === 2) {
                    // del 16 al último día del mes
                    const start   = new Date(yr, mo, 16)
                    const lastDay = new Date(yr, mo + 1, 0).getDate()
                    const end     = new Date(yr, mo, lastDay)
                    rangeLabel    = `${fmtDate(start)} – ${fmtDate(end)}`
                  } else {
                    // Mensual — todo el mes
                    const start   = new Date(yr, mo, 1)
                    const lastDay = new Date(yr, mo + 1, 0).getDate()
                    const end     = new Date(yr, mo, lastDay)
                    rangeLabel    = `${fmtDate(start)} – ${fmtDate(end)}`
                  }
                }

                return (
                  <tr key={p.id} className={`transition-colors ${dark ? "hover:bg-slate-800/50" : "hover:bg-gray-50"}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-xs">{rangeLabel}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {quincena === 1 ? "1ra quincena" : quincena === 2 ? "2da quincena" : "Mensual"}
                        {p.payrollType && p.payrollType !== "REGULAR" && ` · ${p.payrollType}`}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{p.payrollType ?? "—"}</td>
                    <td className="px-4 py-3 font-medium">{fmt(p.grossSalary ?? p.totalGross ?? 0)}</td>
                    <td className="px-4 py-3 text-red-400">{fmt(p.totalDeductions ?? 0)}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-400">{fmt(p.netSalary ?? p.totalNet ?? 0)}</td>
                    <td className="px-4 py-3"><Badge label={st.label} color={st.color} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Historial Salarial ──────────────────────────────────────────────────

function TabSalarios({ employeeId, dark }: { employeeId: string; dark: boolean }) {
  const { data, isLoading } = useSWR<any>(
    `${API_URL}/api/payroll/employees/${employeeId}/salary-history`,
    authFetcher
  )
  const history: any[] = data?.history ?? []

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-4">
      {history.length === 0 ? (
        <EmptyState icon={<TrendingUp size={28} />} label="Sin cambios salariales registrados" />
      ) : (
        <div className="space-y-3">
          {history.map((h: any, i: number) => {
            const prev = history[i + 1]?.newSalary ?? h.previousSalary
            const diff = Number(h.newSalary) - Number(prev ?? h.previousSalary ?? 0)
            const up = diff >= 0
            return (
              <div key={h.id} className={`rounded-xl border p-4 flex items-center gap-4 ${dark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${up ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                  {up ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{fmt(h.newSalary)}</span>
                    {h.previousSalary != null && (
                      <span className="text-xs text-slate-400">antes: {fmt(h.previousSalary)}</span>
                    )}
                    <span className={`text-xs font-medium ${up ? "text-emerald-400" : "text-red-400"}`}>
                      {up ? "+" : ""}{fmt(diff)}
                    </span>
                  </div>
                  {h.reason && <p className="text-xs text-slate-400 mt-0.5 truncate">{h.reason}</p>}
                </div>
                <div className="text-xs text-slate-500 shrink-0">{fmtDate(h.effectiveDate ?? h.createdAt)}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Tab: Liquidación ─────────────────────────────────────────────────────────

function TabLiquidacion({ employeeId, companyId, dark }: { employeeId: string; companyId: string; dark: boolean }) {
  const { data, isLoading } = useSWR<any>(
    `${API_URL}/api/payroll/liquidaciones?companyId=${companyId}`,
    authFetcher
  )
  const all: any[] = Array.isArray(data) ? data : (data?.data ?? [])
  const liquidaciones = all.filter((l: any) => l.employeeId === employeeId)

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-4">
      {liquidaciones.length === 0 ? (
        <EmptyState icon={<DollarSign size={28} />} label="Sin liquidaciones registradas" />
      ) : (
        <div className="space-y-4">
          {liquidaciones.map((liq: any) => (
            <div key={liq.id} className={`rounded-xl border overflow-hidden ${dark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
              <div className={`flex items-center justify-between px-5 py-3 border-b ${dark ? "border-slate-700 bg-slate-800/80" : "border-gray-100 bg-gray-50"}`}>
                <div>
                  <span className="font-semibold text-sm">{liq.tipoTerminacion ?? "Terminación"}</span>
                  <span className="ml-3 text-xs text-slate-400">{fmtDate(liq.fechaTerminacion)}</span>
                </div>
                {liq.revertedAt
                  ? <Badge label="Revertida" color="bg-amber-500/20 text-amber-400 border-amber-500/30" />
                  : <Badge label="Procesada" color="bg-emerald-500/20 text-emerald-400 border-emerald-500/30" />
                }
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-y divide-slate-700/40">
                {[
                  { label: "Prima antigüedad", value: liq.primaAntiguedad },
                  { label: "Preaviso",          value: liq.preaviso },
                  { label: "Vacaciones",        value: liq.vacaciones },
                  { label: "Décimo",            value: liq.decimo },
                  { label: "Indemnización",     value: liq.indemnizacion },
                  { label: "Salarios pend.",    value: liq.salariosPendientes },
                  { label: "Total bruto",       value: liq.totalBruto },
                  { label: "Total neto",        value: liq.totalNeto },
                ].map(item => (
                  <div key={item.label} className="p-4">
                    <p className="text-xs text-slate-400 mb-1">{item.label}</p>
                    <p className={`font-semibold text-sm ${item.label === "Total neto" ? "text-emerald-400" : ""}`}>
                      {fmt(item.value ?? 0)}
                    </p>
                  </div>
                ))}
              </div>
              {liq.notes && (
                <div className={`px-5 py-3 border-t text-sm text-slate-400 ${dark ? "border-slate-700" : "border-gray-100"}`}>
                  {liq.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Tab: Décimos ─────────────────────────────────────────────────────────────

function getMonthlySalary(salary: number, salaryType: string): number {
  return salaryType === "BIWEEKLY" ? salary * 2 : salary
}

function getPartidaRange(part: 1 | 2 | 3, year: number): { start: Date; end: Date } {
  if (part === 1) return { start: new Date(year - 1, 11, 16), end: new Date(year, 3, 15, 23, 59, 59, 999) }
  if (part === 2) return { start: new Date(year, 3, 16),      end: new Date(year, 7, 15, 23, 59, 59, 999) }
  return             { start: new Date(year, 7, 16),           end: new Date(year, 11, 15, 23, 59, 59, 999) }
}

const MONTH_NAMES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]

interface DecimoLineItem {
  monthLabel: string   // "Ene 2025"
  daysWorked: number
  daysInMonth: number
  monthlySalary: number
  aporte: number       // (monthlySalary / daysInMonth) * daysWorked
}

interface DecimoBaseResult {
  gross: number
  lines: DecimoLineItem[]
  effectiveStart: Date
  periodStart: Date
  periodEnd: Date
}

/** Redondea una fecha al inicio de la quincena en que cae (1 o 16 del mes) */
function toQuincenaStart(d: Date): Date {
  return d.getDate() <= 15
    ? new Date(d.getFullYear(), d.getMonth(), 1)
    : new Date(d.getFullYear(), d.getMonth(), 16)
}

// Calcula la base bruta proporcional con desglose línea a línea por mes
function calcDecimoBase(emp: any, part: 1 | 2 | 3, year: number): DecimoBaseResult {
  const { start: pStart, end: pEnd } = getPartidaRange(part, year)
  // La fecha de ingreso aplica desde el inicio de su quincena
  const hireRaw = emp.hireDate ? new Date(emp.hireDate) : null
  const hireQuincena = hireRaw ? toQuincenaStart(hireRaw) : null
  const effectiveStart = hireQuincena && hireQuincena > pStart ? hireQuincena : pStart

  if (effectiveStart > pEnd) return { gross: 0, lines: [], effectiveStart, periodStart: pStart, periodEnd: pEnd }

  type Seg = { from: Date; salary: number; salaryType: string }
  const history: any[] = (emp.salaryHistory ?? []).slice().sort(
    (a: any, b: any) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime()
  )

  const segments: Seg[] = []
  if (history.length === 0) {
    segments.push({ from: effectiveStart, salary: Number(emp.salary), salaryType: emp.salaryType })
  } else {
    const firstChange = history[0]
    const firstChangeQuincena = toQuincenaStart(new Date(firstChange.effectiveDate))
    if (firstChangeQuincena > effectiveStart) {
      segments.push({ from: effectiveStart, salary: Number(firstChange.previousSalary), salaryType: firstChange.previousType })
    }
    for (let i = 0; i < history.length; i++) {
      const change = history[i]
      const changeQuincena = toQuincenaStart(new Date(change.effectiveDate))
      if (changeQuincena > pEnd) break
      const segStart = changeQuincena < effectiveStart ? effectiveStart : changeQuincena
      segments.push({ from: segStart, salary: Number(change.newSalary), salaryType: change.newType })
    }
  }

  const lines: DecimoLineItem[] = []
  let base = 0

  for (let i = 0; i < segments.length; i++) {
    const segEndDate = i + 1 < segments.length
      ? (() => { const d = new Date(segments[i + 1].from); d.setDate(d.getDate() - 1); return d })()
      : pEnd
    const segEnd = segEndDate
    const s = segments[i].from < effectiveStart ? effectiveStart : segments[i].from
    const e = segEnd > pEnd ? pEnd : segEnd
    if (s > e) continue
    const monthlySal = getMonthlySalary(segments[i].salary, segments[i].salaryType)
    let cursor = new Date(s.getFullYear(), s.getMonth(), 1)
    while (cursor <= e) {
      const monthEnd   = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
      const daysInMonth = monthEnd.getDate()
      const workStart  = s > cursor ? s : cursor
      const workEnd    = e < monthEnd ? e : monthEnd
      const daysWorked = workEnd.getDate() - workStart.getDate() + 1
      const aporte     = (monthlySal / daysInMonth) * daysWorked
      base += aporte
      lines.push({
        monthLabel: `${MONTH_NAMES[cursor.getMonth()]} ${cursor.getFullYear()}`,
        daysWorked,
        daysInMonth,
        monthlySalary: monthlySal,
        aporte,
      })
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    }
  }

  return { gross: Number(base.toFixed(4)), lines, effectiveStart, periodStart: pStart, periodEnd: pEnd }
}

// Aplica deducciones sobre la base bruta proporcional
function calcDecimoPartida(
  grossBase: number,
  ssEmpRate: number,
  ssPatRate: number,
  legalParams: any[]
): { gross: number; ssEmp: number; ssPat: number; isr: number; net: number } {
  const gross  = Number(grossBase.toFixed(2))
  const ssEmp  = Number((gross * (ssEmpRate / 100)).toFixed(2))
  const ssPat  = Number((gross * (ssPatRate / 100)).toFixed(2))

  const isrBrackets = legalParams
    .filter((p: any) => p.category === "isr" && p.status === "active" && p.percentage > 0)
    .sort((a: any, b: any) => (a.minRange ?? 0) - (b.minRange ?? 0))
  const primerTramo = isrBrackets[0]
  const exentoAnual = primerTramo?.minRange ?? 11000
  const tasaISR     = (primerTramo?.percentage ?? 15) / 100
  const montoExento = Number((exentoAnual / 39).toFixed(6))
  const isr         = Number((Math.max(0, (gross - montoExento) * tasaISR)).toFixed(2))

  const net = Number((gross - ssEmp - isr).toFixed(2))
  return { gross, ssEmp, ssPat, isr, net }
}

const PARTIDA_LABELS = ["", "1ra Partida (Abril)", "2da Partida (Agosto)", "3ra Partida (Diciembre)"]
const PARTIDA_PERIOD: Array<string | ((y: number) => string)> = [
  "",
  (y: number) => `16 Dic ${y-1} – 15 Abr ${y}`,
  (y: number) => `16 Abr ${y} – 15 Ago ${y}`,
  (y: number) => `16 Ago ${y} – 15 Dic ${y}`,
]
const getPartidaPeriodLabel = (partida: number, year: number): string => {
  const fn = PARTIDA_PERIOD[partida]
  return typeof fn === "function" ? fn(year) : fn
}

function TabDecimos({ emp, companyId, dark }: { emp: any; companyId: string; dark: boolean }) {
  const currentYear = new Date().getFullYear()
  const years = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4]
  const [selectedYear, setSelectedYear] = useState(currentYear)

  if (!emp.hireDate) return (
    <NoHireDateWarning label="No se pueden calcular los décimos porque el empleado no tiene fecha de ingreso registrada." dark={dark} />
  )

  // Mismos endpoints que AllDecimo.tsx
  const { data: legalParams, isLoading: loadingParams } = useSWR<any[]>(
    `${API_URL}/api/system/legal-decimo-parameters?companyId=${companyId}`,
    authFetcher
  )
  const { data: history, isLoading: loadingHistory } = useSWR<any>(
    `${API_URL}/api/payroll/decimo/history?companyId=${companyId}&year=${selectedYear}`,
    authFetcher
  )

  if (loadingParams || loadingHistory) return <LoadingSpinner />

  const params     = legalParams ?? []
  const ssEmpRate  = params.find((p: any) => p.key === "ss_decimo"         && p.status === "active")?.percentage ?? 7.25
  const ssPatRate  = params.find((p: any) => p.key === "ss_decimo_patrono" && p.status === "active")?.percentage ?? 10.75

  const isActiveInPartida = (partida: 1 | 2 | 3): boolean => {
    const { end } = getPartidaRange(partida, selectedYear)
    return new Date(emp.hireDate) <= end
  }

  const partidasHistory: any[] = history?.partidas ?? []

  return (
    <div className="space-y-5">
      {/* Selector de año */}
      <div className="flex items-center gap-2 flex-wrap">
        {years.map(y => (
          <button
            key={y}
            onClick={() => setSelectedYear(y)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
              selectedYear === y
                ? "bg-violet-600 border-violet-600 text-white"
                : dark
                  ? "border-slate-600 text-slate-400 hover:border-violet-500 hover:text-white"
                  : "border-gray-300 text-gray-500 hover:border-violet-500 hover:text-violet-600"
            }`}
          >
            {y}
          </button>
        ))}
      </div>

      {/* Partidas */}
      <div className="space-y-3">
        {([1, 2, 3] as const).map(partida => {
          const active = isActiveInPartida(partida)
          const hist   = partidasHistory.find((p: any) => p.partida === partida)
          const paid   = hist?.status === "PAID"

          if (!active) return (
            <div key={partida} className={`rounded-xl border px-5 py-4 flex items-center gap-3 opacity-50 ${dark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
              <div className="w-10 h-10 rounded-full bg-slate-500/20 text-slate-400 flex items-center justify-center text-sm font-bold shrink-0">
                {partida}
              </div>
              <div>
                <p className="font-medium text-sm">{PARTIDA_LABELS[partida]}</p>
                <p className="text-xs text-slate-400">{getPartidaPeriodLabel(partida, selectedYear)} · No aplica (ingresó después)</p>
              </div>
            </div>
          )

          const baseResult = calcDecimoBase(emp, partida, selectedYear)
          const calc = calcDecimoPartida(baseResult.gross, ssEmpRate, ssPatRate, params)

          return (
            <div key={partida} className={`rounded-xl border overflow-hidden ${dark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
              {/* Header de partida */}
              <div className={`flex items-center justify-between px-5 py-3 border-b ${dark ? "border-slate-700" : "border-gray-100"}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${paid ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
                    {partida}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{PARTIDA_LABELS[partida]}</p>
                    <p className="text-xs text-slate-400">{getPartidaPeriodLabel(partida, selectedYear)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {paid && hist?.paymentDate && (
                    <span className="text-xs text-slate-400">Pagado el {fmtDate(hist.paymentDate)}</span>
                  )}
                  <Badge
                    label={paid ? "Pagado" : "Pendiente"}
                    color={paid
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                    }
                    icon={paid ? <CheckCircle size={11} /> : <Clock size={11} />}
                  />
                </div>
              </div>
              {/* Desglose totales */}
              <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-y divide-slate-700/30">
                {[
                  { label: "Bruto",        value: calc.gross,  accent: false },
                  { label: "SS Empleado",  value: calc.ssEmp,  accent: false },
                  { label: "SS Patronal",  value: calc.ssPat,  accent: false },
                  { label: "ISR",          value: calc.isr,    accent: false },
                  { label: "Neto",         value: calc.net,    accent: true  },
                ].map(item => (
                  <div key={item.label} className="p-4">
                    <p className="text-xs text-slate-400 mb-1">{item.label}</p>
                    <p className={`font-semibold text-sm ${item.accent ? "text-emerald-400" : ""}`}>{fmt(item.value)}</p>
                  </div>
                ))}
              </div>
              {/* Desglose por mes */}
              {baseResult.lines.length > 0 && (
                <div className={`border-t ${dark ? "border-slate-700" : "border-gray-100"}`}>
                  <div className={`px-5 py-2 flex items-center gap-2 ${dark ? "bg-slate-900/30" : "bg-gray-50"}`}>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Desglose por mes
                    </p>
                    {baseResult.effectiveStart > baseResult.periodStart && (
                      <span className="text-[10px] text-amber-400 font-medium">
                        · Ingresó el {baseResult.effectiveStart.toLocaleDateString("es-PA")} (período inicia {baseResult.periodStart.toLocaleDateString("es-PA")})
                      </span>
                    )}
                  </div>
                  <div className={`overflow-x-auto`}>
                    <table className="w-full text-xs">
                      <thead className={dark ? "bg-slate-900/40 text-slate-500" : "bg-gray-50 text-gray-400"}>
                        <tr>
                          <th className="px-5 py-2 text-left font-semibold uppercase tracking-wider">Mes</th>
                          <th className="px-5 py-2 text-left font-semibold uppercase tracking-wider">Días trabajados</th>
                          <th className="px-5 py-2 text-left font-semibold uppercase tracking-wider">Salario mensual</th>
                          <th className="px-5 py-2 text-left font-semibold uppercase tracking-wider">Fórmula</th>
                          <th className="px-5 py-2 text-right font-semibold uppercase tracking-wider text-violet-400">Aporte</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${dark ? "divide-slate-700/50" : "divide-gray-100"}`}>
                        {baseResult.lines.map((line, idx) => (
                          <tr key={idx} className={dark ? "hover:bg-slate-700/20" : "hover:bg-gray-50"}>
                            <td className={`px-5 py-2 font-medium ${dark ? "text-slate-300" : "text-gray-700"}`}>{line.monthLabel}</td>
                            <td className="px-5 py-2 font-mono text-slate-400">
                              {line.daysWorked === line.daysInMonth
                                ? <span className="text-emerald-400">{line.daysWorked} / {line.daysInMonth} (completo)</span>
                                : <span className="text-amber-400">{line.daysWorked} / {line.daysInMonth}</span>
                              }
                            </td>
                            <td className="px-5 py-2 font-mono text-slate-400">{fmt(line.monthlySalary)}</td>
                            <td className="px-5 py-2 font-mono text-slate-500 text-[10px]">
                              {fmt(line.monthlySalary)} ÷ {line.daysInMonth} × {line.daysWorked}
                            </td>
                            <td className="px-5 py-2 font-mono font-semibold text-right text-violet-400">{fmt(line.aporte)}</td>
                          </tr>
                        ))}
                        <tr className={`font-bold ${dark ? "bg-slate-900/40" : "bg-gray-50"}`}>
                          <td colSpan={4} className="px-5 py-2 text-slate-400 text-xs uppercase tracking-wider">Total bruto</td>
                          <td className="px-5 py-2 font-mono text-right text-violet-400">{fmt(calc.gross)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {hist?.notes && (
                <div className={`px-5 py-2 border-t text-xs text-slate-400 ${dark ? "border-slate-700" : "border-gray-100"}`}>
                  {hist.notes}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-xs text-slate-500">
        Cálculo basado en salario {emp.salaryType === "BIWEEKLY" ? "quincenal" : "mensual"} ({fmt(Number(emp.salary))})
        · Fecha de ingreso: {fmtDate(emp.hireDate)}
        · SS empleado {ssEmpRate}% · SS patronal {ssPatRate}%
      </p>
    </div>
  )
}

// ─── Tab: Estado ──────────────────────────────────────────────────────────────

function TabEstado({ emp, dark }: { emp: any; dark: boolean }) {
  const cfg = STATUS_CFG[emp.status as EmployeeStatus]
  return (
    <div className="space-y-6 max-w-xl">
      <div className={`rounded-xl border p-5 ${dark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
        <Section title="Estado actual">
          <div className="flex items-center gap-3 py-2">
            <Badge label={cfg?.label ?? emp.status} color={cfg?.color ?? ""} />
          </div>
          {emp.inactivityReason && (
            <InfoRow label="Motivo" value={emp.inactivityReason} />
          )}
          {emp.maternityStartDate && (
            <InfoRow label="Inicio licencia" value={fmtDate(emp.maternityStartDate)} />
          )}
          {emp.maternityEndDate && (
            <InfoRow label="Fin licencia" value={fmtDate(emp.maternityEndDate)} />
          )}
          <InfoRow label="Ingreso al sistema" value={fmtDate(emp.createdAt)} />
        </Section>
      </div>
    </div>
  )
}

// ─── Shared components ────────────────────────────────────────────────────────

function NoHireDateWarning({ label, dark }: { label: string; dark: boolean }) {
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-4 ${dark ? "bg-amber-500/10 border-amber-500/30" : "bg-amber-50 border-amber-200"}`}>
      <AlertTriangle size={18} className="text-amber-400 mt-0.5 shrink-0" />
      <p className="text-sm text-amber-400">{label}</p>
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center py-16">
      <Loader2 size={22} className="animate-spin text-violet-400" />
    </div>
  )
}

function EmptyState({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
      {icon}
      <p className="text-sm">{label}</p>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EmployeeProfile() {
  const { id: employeeId } = useParams<{ id: string }>()
  const { selectedCompany } = useCompany()
  const { isDarkMode: dark } = useTheme()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>("info")

  const { data: emp, isLoading } = useSWR<any>(
    employeeId ? `${API_URL}/api/payroll/employees/${employeeId}` : null,
    authFetcher
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={28} className="animate-spin text-violet-400" />
      </div>
    )
  }

  if (!emp) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-500">
        <AlertTriangle size={28} />
        <p className="text-sm">Empleado no encontrado</p>
        <button onClick={() => navigate(-1)} className="text-violet-400 text-sm hover:underline">Volver</button>
      </div>
    )
  }

  const initials = `${emp.firstName?.[0] ?? ""}${emp.lastName?.[0] ?? ""}`.toUpperCase()
  const avatarColor = getAvatarColor(`${emp.firstName}${emp.lastName}`)
  const companyId = selectedCompany?.id ?? emp.companyId

  return (
    <div className={`min-h-screen ${dark ? "bg-slate-900 text-white" : "bg-gray-50 text-gray-900"}`}>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className={`p-2 rounded-lg transition-colors ${dark ? "hover:bg-slate-800" : "hover:bg-gray-200"}`}
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${avatarColor}`}>
              {initials}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold truncate">{emp.firstName} {emp.lastName}</h1>
              <div className="flex items-center gap-2 text-sm text-slate-400 flex-wrap">
                <span className="flex items-center gap-1"><Briefcase size={13} />{emp.position}</span>
                {emp.department && <span className="flex items-center gap-1"><Building2 size={13} />{emp.department}</span>}
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Badge
                label={STATUS_CFG[emp.status as EmployeeStatus]?.label ?? emp.status}
                color={STATUS_CFG[emp.status as EmployeeStatus]?.color ?? ""}
              />
              <Link
                to={`/${selectedCompany?.code}/employees/edit/${emp.id}`}
                className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium transition-colors"
              >
                Editar
              </Link>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: <DollarSign size={16} className="text-emerald-400" />, label: "Salario", value: fmt(emp.salary) },
            { icon: <Calendar size={16} className="text-blue-400" />, label: "Ingreso", value: fmtDate(emp.hireDate) },
            { icon: <CreditCard size={16} className="text-violet-400" />, label: "Cédula", value: emp.cedula || "—" },
            { icon: <Phone size={16} className="text-amber-400" />, label: "Teléfono", value: emp.phoneNumber || "—" },
          ].map(stat => (
            <div key={stat.label} className={`rounded-xl border p-4 ${dark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
              <div className="flex items-center gap-2 mb-1">
                {stat.icon}
                <span className="text-xs text-slate-400">{stat.label}</span>
              </div>
              <p className="font-semibold text-sm truncate">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className={`rounded-xl border overflow-hidden ${dark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200"}`}>
          {/* Tab bar */}
          <div className={`flex border-b overflow-x-auto scrollbar-none ${dark ? "border-slate-700" : "border-gray-200"}`}>
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                  tab === t.id
                    ? "border-violet-500 text-violet-400"
                    : `border-transparent ${dark ? "text-slate-400 hover:text-slate-200" : "text-gray-500 hover:text-gray-700"}`
                }`}
              >
                {t.icon}{t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-5">
            {tab === "info"        && <TabInfo emp={emp} dark={dark} />}
            {tab === "vacaciones"  && <TabVacaciones employeeId={emp.id} companyId={companyId} dark={dark} />}
            {tab === "contrato"    && <TabContrato emp={emp} dark={dark} />}
            {tab === "nominas"     && <TabNominas employeeId={emp.id} companyId={companyId} hireDate={emp.hireDate} dark={dark} />}
            {tab === "salarios"    && <TabSalarios employeeId={emp.id} dark={dark} />}
            {tab === "decimos"     && <TabDecimos emp={emp} companyId={companyId} dark={dark} />}
            {tab === "liquidacion" && <TabLiquidacion employeeId={emp.id} companyId={companyId} dark={dark} />}
            {tab === "estado"      && <TabEstado emp={emp} dark={dark} />}
          </div>
        </div>
      </div>
    </div>
  )
}
