"use client"

import useSWR from "swr"
import {
  Building2, Users, ReceiptText, TrendingUp, ShieldCheck,
  Loader2, AlertTriangle,
} from "lucide-react"
import { useTheme } from "../../../context/themeContext"
import { authFetcher } from "../../../services/api"
import PagesHeader from "../../../components/headers/pagesHeader"

const API = import.meta.env.VITE_API_URL as string

const KpiCard = ({
  label, value, sub, icon: Icon, color, dark,
}: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; color: string; dark: boolean
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
  </div>
)

export const AdminOverview = () => {
  const { isDarkMode: dark } = useTheme()

  const { data: stats, isLoading, error } = useSWR<{
    totalCompanies: number
    totalUsers: number
    totalEmployees: number
    totalPayrolls: number
  }>(
    `${API}/api/admin/stats`,
    authFetcher
  )

  const base = `rounded-xl border p-5 transition-colors ${dark ? "bg-slate-800 border-gray-700" : "bg-white border-gray-200"}`

  return (
    <div className="space-y-6">
      <PagesHeader title="Panel de Administración" description="Vista global de la plataforma FlowPlanilla" />

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 size={16} className="animate-spin" /> Cargando estadísticas…
        </div>
      )}

      {error && (
        <div className={`flex items-center gap-2 rounded-xl border p-4 text-sm ${dark ? "bg-red-900/20 border-red-700 text-red-400" : "bg-red-50 border-red-200 text-red-600"}`}>
          <AlertTriangle size={16} /> Error al cargar estadísticas del sistema.
        </div>
      )}

      {stats && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <KpiCard label="Empresas" value={stats.totalCompanies ?? 0} sub="tenants activos" icon={Building2} color="bg-indigo-500" dark={dark} />
            <KpiCard label="Usuarios" value={stats.totalUsers ?? 0} sub="en todo el sistema" icon={Users} color="bg-blue-500" dark={dark} />
            <KpiCard label="Empleados" value={stats.totalEmployees ?? 0} sub="registrados" icon={TrendingUp} color="bg-emerald-500" dark={dark} />
            <KpiCard label="Nóminas" value={stats.totalPayrolls ?? 0} sub="generadas" icon={ReceiptText} color="bg-amber-500" dark={dark} />
          </div>

          <div className={base}>
            <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 ${dark ? "text-gray-400" : "text-gray-500"}`}>
              Estado de la Plataforma
            </h3>
            <div className="flex items-center gap-3">
              <ShieldCheck size={18} className="text-emerald-400" />
              <span className={`text-sm ${dark ? "text-gray-200" : "text-gray-700"}`}>
                Sistema operando con normalidad — modo independiente activo
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
