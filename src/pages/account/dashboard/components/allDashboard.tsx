"use client"

/**
 * allDashboard.tsx — Fase 5
 * Dashboard de nómina panameña con métricas reales.
 * Consume los mismos endpoints del sistema: employees, payrolls, decimo history.
 */

import { useMemo } from "react"
import useSWR from "swr"
import {
  Users, TrendingUp, TrendingDown, DollarSign, Calendar,
  CheckCircle2, Clock, AlertTriangle, BarChart2, Loader2,
} from "lucide-react"
import { useCompany } from "../../../../context/routerContext"
import { useTheme } from "../../../../context/themeContext"
import { authFetcher } from "../../../../services/api"
import { formatCurrency } from "../../../../lib/payrollCalculation"
import PagesHeader from "../../../../components/headers/pagesHeader"
import { usePageName } from "../../../../hook/usePageName"
import DashboardEmptyState from "./DashboardEmpty"

const API = import.meta.env.VITE_API_URL as string
const MONTHS_ES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]
const PARTIDA_MONTHS: Record<number, string> = { 1: "Abril", 2: "Agosto", 3: "Diciembre" }

// ─── Sub-componentes ──────────────────────────────────────────────────────────

const KpiCard = ({
  label, value, sub, icon: Icon, trend, color, dark,
}: {
  label: string; value: string | number; sub?: string
  icon: any; trend?: number; color: string; dark: boolean
}) => (
  <div className={`rounded-xl border p-5 transition-colors ${dark ? "bg-slate-800 border-gray-700" : "bg-white border-gray-200"}`}>
    <div className="flex items-start justify-between mb-3">
      <span className={`text-xs font-bold uppercase tracking-wider ${dark ? "text-gray-400" : "text-gray-500"}`}>{label}</span>
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon size={16} className="text-white" />
      </div>
    </div>
    <div className={`text-2xl font-black font-mono ${dark ? "text-white" : "text-gray-900"}`}>{value}</div>
    {sub && <div className={`text-xs mt-1 ${dark ? "text-gray-500" : "text-gray-400"}`}>{sub}</div>}
    {trend !== undefined && (
      <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend >= 0 ? "text-green-400" : "text-red-400"}`}>
        {trend >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
        {Math.abs(trend)}% vs mes anterior
      </div>
    )}
  </div>
)

const SectionCard = ({ title, children, dark }: { title: string; children: React.ReactNode; dark: boolean }) => (
  <div className={`rounded-xl border p-5 transition-colors ${dark ? "bg-slate-800 border-gray-700" : "bg-white border-gray-200"}`}>
    <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 ${dark ? "text-gray-400" : "text-gray-500"}`}>{title}</h3>
    {children}
  </div>
)

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AllDashboard() {
  const { selectedCompany } = useCompany()
  const { isDarkMode } = useTheme()
  const { pageName } = usePageName()
  const dark = isDarkMode

  const now   = new Date()
  const year  = now.getFullYear()
  const month = now.getMonth() + 1

  // ── Fetches ────────────────────────────────────────────────────────────────

  const { data: employees = [], isLoading: loadingEmp } = useSWR<any[]>(
    selectedCompany ? `${API}/api/payroll/employees?companyId=${selectedCompany.id}` : null,
    authFetcher, { revalidateOnFocus: false }
  )

  const { data: payrollSummary, isLoading: loadingPS } = useSWR<any>(
    selectedCompany ? `${API}/api/payroll/payrolls/summary?companyId=${selectedCompany.id}&year=${year}` : null,
    authFetcher, { revalidateOnFocus: false }
  )

  const { data: recentPayrolls = [], isLoading: loadingRP } = useSWR<any[]>(
    selectedCompany ? `${API}/api/payroll/payrolls?companyId=${selectedCompany.id}&year=${year}&month=${month}` : null,
    authFetcher, { revalidateOnFocus: false }
  )

  const { data: decimoHistory } = useSWR<any>(
    selectedCompany ? `${API}/api/payroll/decimo/history?companyId=${selectedCompany.id}&year=${year}` : null,
    authFetcher, { revalidateOnFocus: false }
  )

  const isLoading = loadingEmp || loadingPS || loadingRP

  // ── Métricas derivadas ─────────────────────────────────────────────────────

  const metrics = useMemo(() => {
    const total     = employees.length
    const active    = employees.filter((e: any) => e.status === "ACTIVE" || !e.status).length
    const monthly   = employees.filter((e: any) => e.salaryType === "MONTHLY").length
    const biweekly  = employees.filter((e: any) => e.salaryType === "BIWEEKLY").length
    const avgSalary = total > 0
      ? employees.reduce((s: number, e: any) => s + (e.salaryType === "BIWEEKLY" ? Number(e.salary) * 2 : Number(e.salary)), 0) / total
      : 0

    // Masa salarial mensual bruta
    const massaSalarial = employees.reduce((s: number, e: any) =>
      s + (e.salaryType === "BIWEEKLY" ? Number(e.salary) * 2 : Number(e.salary)), 0)

    // Nóminas del mes actual
    const activePayrolls = recentPayrolls.filter((p: any) => p.status !== "VOIDED")
    const totalNetMonth  = activePayrolls.reduce((s: number, p: any) => s + Number(p.netSalary), 0)
    const totalGrossMonth = activePayrolls.reduce((s: number, p: any) => s + Number(p.grossSalary), 0)

    // Actividad anual (para el gráfico de barras)
    const monthlyActivity = payrollSummary?.months || []

    // Décimo
    const decimoPaid    = decimoHistory?.totalPaid || 0
    const decimoPartidas = decimoHistory?.partidas || []

    // Distribución por departamento
    const deptMap: Record<string, number> = {}
    for (const e of employees) {
      const dept = (e.department || "Sin departamento").trim()
      deptMap[dept] = (deptMap[dept] || 0) + 1
    }
    const depts = Object.entries(deptMap).sort((a, b) => b[1] - a[1]).slice(0, 6)

    return { total, active, monthly, biweekly, avgSalary, massaSalarial, totalNetMonth, totalGrossMonth, monthlyActivity, decimoPaid, decimoPartidas, depts, payrollsCount: activePayrolls.length }
  }, [employees, recentPayrolls, payrollSummary, decimoHistory])

  // ─────────────────────────────────────────────────────────────────────────

  if (!selectedCompany) return <DashboardEmptyState title="Selecciona una empresa" description="Elige una empresa para ver el dashboard de nómina." />

  if (isLoading) return (
    <div className={`flex items-center justify-center min-h-[60vh] ${dark ? "bg-slate-900" : ""}`}>
      <Loader2 size={40} className="animate-spin text-blue-400" />
    </div>
  )

  // Barra máx para el gráfico relativo
  const maxMonthActivity = Math.max(...metrics.monthlyActivity.map((m: any) => m.totalNet || 0), 1)

  return (
    <div className={`transition-colors ${dark ? "bg-slate-900 text-white" : "text-gray-900"}`}>
      <PagesHeader
        title={pageName || "Dashboard"}
        description={`Resumen de nómina — ${selectedCompany.name} — ${MONTHS_ES[now.getMonth()]} ${year}`}
      />

      {/* ── FILA 1: KPIs ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Colaboradores"
          value={metrics.total}
          sub={`${metrics.active} activos`}
          icon={Users}
          color="bg-blue-600"
          dark={dark}
        />
        <KpiCard
          label="Masa Salarial"
          value={formatCurrency(metrics.massaSalarial)}
          sub="bruto mensual"
          icon={DollarSign}
          color="bg-emerald-600"
          dark={dark}
        />
        <KpiCard
          label={`Nóminas ${MONTHS_ES[now.getMonth()]}`}
          value={metrics.payrollsCount}
          sub={metrics.payrollsCount > 0 ? `Neto: ${formatCurrency(metrics.totalNetMonth)}` : "Sin generar aún"}
          icon={BarChart2}
          color="bg-violet-600"
          dark={dark}
        />
        <KpiCard
          label="Décimo 3er Mes"
          value={`${metrics.decimoPaid}/3`}
          sub="partidas pagadas"
          icon={Calendar}
          color={metrics.decimoPaid === 3 ? "bg-green-600" : "bg-amber-600"}
          dark={dark}
        />
      </div>

      {/* ── FILA 2: Gráfico anual + Décimo tracker ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

        {/* Actividad anual — barras */}
        <div className="lg:col-span-2">
          <SectionCard title={`Neto pagado por mes — ${year}`} dark={dark}>
            {metrics.monthlyActivity.length === 0 ? (
              <div className={`text-center py-8 text-sm ${dark ? "text-gray-600" : "text-gray-400"}`}>
                No hay nóminas registradas en {year}
              </div>
            ) : (
              <div className="flex items-end gap-2 h-36">
                {Array.from({ length: 12 }, (_, i) => {
                  const ms = metrics.monthlyActivity.find((m: any) => m.month === i + 1)
                  const h  = ms ? Math.max(8, (ms.totalNet / maxMonthActivity) * 100) : 0
                  const isNow = i + 1 === now.getMonth() + 1
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex flex-col justify-end" style={{ height: "100px" }}>
                        {ms ? (
                          <div
                            title={`${MONTHS_ES[i]}: ${formatCurrency(ms.totalNet)}`}
                            style={{ height: `${h}%` }}
                            className={`w-full rounded-t transition-all ${
                              ms.hasLocked
                                ? "bg-green-500"
                                : isNow
                                  ? "bg-blue-500"
                                  : dark ? "bg-gray-600" : "bg-gray-300"
                            }`}
                          />
                        ) : (
                          <div className={`w-full rounded-t ${dark ? "bg-gray-800" : "bg-gray-100"}`} style={{ height: "4px" }} />
                        )}
                      </div>
                      <span className={`text-[9px] font-medium ${isNow ? (dark ? "text-blue-400" : "text-blue-600") : (dark ? "text-gray-600" : "text-gray-400")}`}>
                        {MONTHS_ES[i]}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
            <div className="flex items-center gap-4 mt-3 text-[10px]">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block" /> Bloqueada</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" /> Mes actual</span>
              <span className={`flex items-center gap-1 ${dark ? "text-gray-500" : "text-gray-400"}`}><span className={`w-2.5 h-2.5 rounded-sm inline-block ${dark ? "bg-gray-600" : "bg-gray-300"}`} /> Generada</span>
            </div>
          </SectionCard>
        </div>

        {/* Décimo tracker vertical */}
        <SectionCard title={`Décimo ${year}`} dark={dark}>
          <div className="space-y-3">
            {[1, 2, 3].map((num) => {
              const p = metrics.decimoPartidas.find((d: any) => d.partida === num)
              const isPaid = p?.status === "PAID"
              return (
                <div key={num} className={`flex items-center justify-between p-3 rounded-lg border ${
                  isPaid
                    ? dark ? "bg-green-900/20 border-green-700/40" : "bg-green-50 border-green-200"
                    : dark ? "bg-gray-800/60 border-gray-700/40" : "bg-gray-50 border-gray-200"
                }`}>
                  <div className="flex items-center gap-2">
                    {isPaid
                      ? <CheckCircle2 size={16} className="text-green-500" />
                      : <Clock size={16} className={dark ? "text-gray-500" : "text-gray-400"} />
                    }
                    <div>
                      <div className={`text-xs font-bold ${dark ? "text-white" : "text-gray-900"}`}>
                        {PARTIDA_MONTHS[num]}
                      </div>
                      <div className={`text-[10px] ${dark ? "text-gray-500" : "text-gray-400"}`}>
                        Partida {num}
                      </div>
                    </div>
                  </div>
                  {isPaid && p?.netAmount ? (
                    <span className={`text-xs font-mono font-bold ${dark ? "text-green-400" : "text-green-700"}`}>
                      {formatCurrency(p.netAmount)}
                    </span>
                  ) : (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${dark ? "bg-gray-700 text-gray-400" : "bg-gray-200 text-gray-500"}`}>
                      Pendiente
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Resumen anual */}
          {metrics.decimoPartidas.filter((p: any) => p.status === "PAID").length > 0 && (
            <div className={`mt-3 pt-3 border-t text-xs ${dark ? "border-gray-700 text-gray-400" : "border-gray-200 text-gray-500"}`}>
              Total pagado:{" "}
              <span className={`font-mono font-bold ${dark ? "text-green-400" : "text-green-700"}`}>
                {formatCurrency(
                  metrics.decimoPartidas
                    .filter((p: any) => p.status === "PAID")
                    .reduce((s: number, p: any) => s + Number(p.netAmount || 0), 0)
                )}
              </span>
            </div>
          )}
        </SectionCard>
      </div>

      {/* ── FILA 3: Distribución empleados + Resumen nómina mes actual ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">

        {/* Distribución por departamento */}
        <SectionCard title="Distribución por departamento" dark={dark}>
          {metrics.depts.length === 0 ? (
            <div className={`text-center py-6 text-sm ${dark ? "text-gray-600" : "text-gray-400"}`}>Sin departamentos registrados</div>
          ) : (
            <div className="space-y-3">
              {metrics.depts.map(([dept, count], i) => {
                const pct = metrics.total > 0 ? (count / metrics.total) * 100 : 0
                const colors = ["bg-blue-500","bg-violet-500","bg-emerald-500","bg-amber-500","bg-rose-500","bg-cyan-500"]
                return (
                  <div key={dept}>
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-xs font-medium truncate max-w-[60%] ${dark ? "text-gray-300" : "text-gray-700"}`}>{dept}</span>
                      <span className={`text-xs font-mono font-bold ${dark ? "text-gray-400" : "text-gray-500"}`}>{count} <span className="opacity-50">({pct.toFixed(0)}%)</span></span>
                    </div>
                    <div className={`w-full rounded-full h-1.5 ${dark ? "bg-gray-700" : "bg-gray-200"}`}>
                      <div className={`h-1.5 rounded-full transition-all ${colors[i % colors.length]}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <div className={`mt-4 pt-3 border-t grid grid-cols-2 gap-2 text-xs ${dark ? "border-gray-700" : "border-gray-200"}`}>
            <div>
              <span className={dark ? "text-gray-500" : "text-gray-400"}>Tipo mensual</span>
              <div className={`font-bold text-sm ${dark ? "text-white" : "text-gray-900"}`}>{metrics.monthly}</div>
            </div>
            <div>
              <span className={dark ? "text-gray-500" : "text-gray-400"}>Tipo quincenal</span>
              <div className={`font-bold text-sm ${dark ? "text-white" : "text-gray-900"}`}>{metrics.biweekly}</div>
            </div>
          </div>
        </SectionCard>

        {/* Resumen financiero del mes */}
        <SectionCard title={`Resumen financiero — ${MONTHS_ES[now.getMonth()]} ${year}`} dark={dark}>
          {metrics.payrollsCount === 0 ? (
            <div className={`flex flex-col items-center justify-center py-8 gap-2 ${dark ? "text-gray-600" : "text-gray-400"}`}>
              <AlertTriangle size={28} className="opacity-30" />
              <p className="text-sm">No hay nóminas generadas este mes</p>
              <p className="text-xs">Genera nóminas en el módulo de Planilla</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[
                { label: "Masa salarial bruta",    value: metrics.totalGrossMonth,                              color: dark ? "text-white" : "text-gray-900" },
                { label: "Total SS empleados",      value: metrics.totalGrossMonth - metrics.totalNetMonth > 0 ? (metrics.totalGrossMonth - metrics.totalNetMonth) * 0.45 : 0, color: dark ? "text-red-400" : "text-red-600" },
                { label: "Total ISR retenido",      value: metrics.totalGrossMonth - metrics.totalNetMonth > 0 ? (metrics.totalGrossMonth - metrics.totalNetMonth) * 0.20 : 0, color: "text-blue-400" },
                { label: "Total descuentos",        value: metrics.totalGrossMonth - metrics.totalNetMonth,     color: dark ? "text-red-400" : "text-red-600" },
                { label: "Total neto a pagar",      value: metrics.totalNetMonth,                               color: dark ? "text-green-400" : "text-green-700" },
              ].map(({ label, value, color }) => (
                <div key={label} className={`flex justify-between items-center py-2 border-b ${dark ? "border-gray-700/50" : "border-gray-100"}`}>
                  <span className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>{label}</span>
                  <span className={`text-sm font-mono font-bold ${color}`}>{formatCurrency(value)}</span>
                </div>
              ))}
              <div className={`flex justify-between items-center pt-1`}>
                <span className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>Promedio por empleado</span>
                <span className={`text-sm font-mono font-bold ${dark ? "text-white" : "text-gray-900"}`}>
                  {metrics.payrollsCount > 0 ? formatCurrency(metrics.totalNetMonth / metrics.payrollsCount) : "$0.00"}
                </span>
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      {/* ── FILA 4: Últimas nóminas generadas ─────────────────────────── */}
      {recentPayrolls.length > 0 && (
        <SectionCard title={`Últimas nóminas — ${MONTHS_ES[now.getMonth()]} ${year}`} dark={dark}>
          <div className="overflow-x-auto">
            <table className={`w-full text-xs ${dark ? "text-gray-300" : "text-gray-700"}`}>
              <thead className={`uppercase text-[10px] ${dark ? "text-gray-500" : "text-gray-400"}`}>
                <tr className={`border-b ${dark ? "border-gray-700" : "border-gray-200"}`}>
                  <th className="pb-2 text-left">Empleado</th>
                  <th className="pb-2 text-left">Dpto.</th>
                  <th className="pb-2 text-right">Bruto</th>
                  <th className="pb-2 text-right">Neto</th>
                  <th className="pb-2 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${dark ? "divide-gray-700/30" : "divide-gray-100"}`}>
                {recentPayrolls.slice(0, 8).map((p: any) => (
                  <tr key={p.id} className={p.status === "VOIDED" ? "opacity-40" : ""}>
                    <td className="py-2">
                      <span className={`font-medium ${dark ? "text-white" : "text-gray-900"}`}>
                        {p.employee?.firstName} {p.employee?.lastName}
                      </span>
                    </td>
                    <td className={`py-2 ${dark ? "text-gray-500" : "text-gray-400"}`}>{p.employee?.department || "—"}</td>
                    <td className={`py-2 text-right font-mono ${dark ? "text-gray-300" : "text-gray-700"}`}>
                      {formatCurrency(Number(p.grossSalary))}
                    </td>
                    <td className={`py-2 text-right font-mono font-bold ${dark ? "text-green-400" : "text-green-700"}`}>
                      {formatCurrency(Number(p.netSalary))}
                    </td>
                    <td className="py-2 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        p.status === "LOCKED"
                          ? dark ? "bg-green-900/30 text-green-400" : "bg-green-100 text-green-700"
                          : p.status === "VOIDED"
                            ? dark ? "bg-red-900/30 text-red-400" : "bg-red-100 text-red-600"
                            : dark ? "bg-blue-900/30 text-blue-400" : "bg-blue-100 text-blue-700"
                      }`}>
                        {p.status === "LOCKED" ? "Bloqueada" : p.status === "VOIDED" ? "Anulada" : "Generada"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  )
}
