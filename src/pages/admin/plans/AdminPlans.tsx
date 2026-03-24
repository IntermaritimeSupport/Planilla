"use client"

import useSWR from "swr"
import { useNavigate } from "react-router-dom"
import {
  ShieldCheck, Users, Building2, Clock, Zap,
  CheckCircle2, ArrowRight, Loader2,
} from "lucide-react"
import { useTheme } from "../../../context/themeContext"
import { authFetcher } from "../../../services/api"
import PagesHeader from "../../../components/headers/pagesHeader"

const API = import.meta.env.VITE_API_URL as string

interface PlanStats {
  plan: string
  count: number
  activeCount: number
}

interface LicenseInfo {
  companyId: string
  companyName: string
  companyCode: string
  isActive: boolean
  employeeCount: number
  userCount: number
  license: {
    plan: string
    maxUsers: number
    maxEmployees: number
    expiresAt: string | null
    isActive: boolean
  } | null
}

const PLANS = [
  {
    value: "TRIAL",
    label: "Trial",
    desc: "Prueba gratuita para explorar la plataforma sin compromiso.",
    color: "from-gray-600 to-gray-700",
    border: "border-gray-600/40",
    badge: "bg-gray-500/20 text-gray-300 border-gray-500/30",
    accent: "text-gray-300",
    features: [
      "Hasta 5 usuarios",
      "Hasta 20 empleados",
      "Módulos básicos",
      "Soporte por email",
    ],
    maxUsers: 5,
    maxEmployees: 20,
  },
  {
    value: "STARTER",
    label: "Starter",
    desc: "Ideal para pequeñas empresas que inician su gestión de nómina.",
    color: "from-blue-600 to-blue-700",
    border: "border-blue-500/40",
    badge: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    accent: "text-blue-300",
    features: [
      "Hasta 15 usuarios",
      "Hasta 100 empleados",
      "Todos los módulos",
      "Reportes básicos",
      "Soporte prioritario",
    ],
    maxUsers: 15,
    maxEmployees: 100,
  },
  {
    value: "PROFESSIONAL",
    label: "Professional",
    desc: "Para empresas en crecimiento con necesidades avanzadas.",
    color: "from-violet-600 to-violet-700",
    border: "border-violet-500/40",
    badge: "bg-violet-500/20 text-violet-300 border-violet-500/30",
    accent: "text-violet-300",
    highlighted: true,
    features: [
      "Hasta 50 usuarios",
      "Hasta 500 empleados",
      "Todos los módulos",
      "Reportes avanzados",
      "API access",
      "Soporte 24/7",
    ],
    maxUsers: 50,
    maxEmployees: 500,
  },
  {
    value: "ENTERPRISE",
    label: "Enterprise",
    desc: "Sin límites operativos para grandes organizaciones.",
    color: "from-amber-500 to-amber-600",
    border: "border-amber-500/40",
    badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    accent: "text-amber-300",
    features: [
      "Usuarios ilimitados",
      "Empleados ilimitados",
      "Todos los módulos",
      "Reportes personalizados",
      "API access completo",
      "Gerente de cuenta dedicado",
      "SLA garantizado",
    ],
    maxUsers: 9999,
    maxEmployees: 99999,
  },
]

export const AdminPlans = () => {
  const { isDarkMode: dark } = useTheme()
  const navigate = useNavigate()

  const { data: licenses, isLoading } = useSWR<LicenseInfo[]>(
    `${API}/api/admin/licenses`,
    authFetcher
  )

  const text = dark ? "text-gray-200" : "text-gray-800"
  const sub  = dark ? "text-gray-400" : "text-gray-500"

  // Calcular cuántas empresas hay por plan
  const planStats: Record<string, PlanStats> = {}
  for (const p of PLANS) {
    planStats[p.value] = { plan: p.value, count: 0, activeCount: 0 }
  }
  if (licenses) {
    for (const l of licenses) {
      const plan = l.license?.plan ?? "TRIAL"
      if (planStats[plan]) {
        planStats[plan].count++
        if (l.license?.isActive && l.isActive) planStats[plan].activeCount++
      }
    }
  }

  return (
    <div className="space-y-8">
      <PagesHeader
        title="Planes"
        description="Planes disponibles y distribución de empresas"
      />

      {/* KPIs rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {PLANS.map((p) => {
          const stat = planStats[p.value]
          return (
            <div
              key={p.value}
              className={`rounded-xl border p-4 ${dark ? "bg-slate-800 border-gray-700" : "bg-white border-gray-200"}`}
            >
              <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border mb-3 ${p.badge}`}>
                {p.label}
              </span>
              {isLoading ? (
                <Loader2 size={16} className="animate-spin text-gray-500 mt-1" />
              ) : (
                <>
                  <p className={`text-2xl font-black font-mono ${text}`}>{stat.count}</p>
                  <p className={`text-xs mt-0.5 ${sub}`}>{stat.activeCount} activas</p>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Cards de planes */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {PLANS.map((p) => (
          <div
            key={p.value}
            className={`relative rounded-2xl border overflow-hidden flex flex-col ${
              p.highlighted
                ? dark ? "border-violet-500/60 shadow-lg shadow-violet-900/20" : "border-violet-400/60 shadow-lg shadow-violet-100"
                : dark ? `${p.border}` : `border-gray-200`
            } ${dark ? "bg-slate-800" : "bg-white"}`}
          >
            {p.highlighted && (
              <div className="absolute top-3 right-3">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-violet-600 text-white">Popular</span>
              </div>
            )}

            {/* Header con gradiente */}
            <div className={`bg-gradient-to-br ${p.color} p-5`}>
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck size={18} className="text-white/80" />
                <h3 className="text-lg font-black text-white">{p.label}</h3>
              </div>
              <p className="text-xs text-white/70 leading-relaxed">{p.desc}</p>
            </div>

            {/* Límites */}
            <div className={`flex gap-3 px-5 py-3 border-b ${dark ? "border-gray-700" : "border-gray-100"}`}>
              <div className="flex items-center gap-1.5">
                <Users size={13} className={sub} />
                <span className={`text-xs font-semibold ${text}`}>
                  {p.maxUsers >= 9999 ? "Ilimitado" : `${p.maxUsers} usr.`}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Building2 size={13} className={sub} />
                <span className={`text-xs font-semibold ${text}`}>
                  {p.maxEmployees >= 99999 ? "Ilimitado" : `${p.maxEmployees} emp.`}
                </span>
              </div>
            </div>

            {/* Features */}
            <div className="px-5 py-4 flex-1 space-y-2">
              {p.features.map((f) => (
                <div key={f} className="flex items-start gap-2">
                  <CheckCircle2 size={13} className={`mt-0.5 flex-shrink-0 ${p.accent}`} />
                  <span className={`text-xs leading-relaxed ${dark ? "text-gray-300" : "text-gray-600"}`}>{f}</span>
                </div>
              ))}
            </div>

            {/* Empresas en este plan */}
            {!isLoading && planStats[p.value].count > 0 && (
              <div className={`px-5 py-3 border-t ${dark ? "border-gray-700 bg-slate-900/50" : "border-gray-100 bg-gray-50"}`}>
                <p className={`text-xs ${sub}`}>
                  <span className={`font-bold ${text}`}>{planStats[p.value].count}</span> empresa{planStats[p.value].count !== 1 ? "s" : ""} en este plan
                  {planStats[p.value].activeCount < planStats[p.value].count && (
                    <span className="text-amber-400 ml-1">
                      ({planStats[p.value].count - planStats[p.value].activeCount} inactiva{planStats[p.value].count - planStats[p.value].activeCount !== 1 ? "s" : ""})
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* Acción */}
            <div className="px-5 pb-5 pt-3">
              <button
                onClick={() => navigate("/admin/licenses")}
                className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all ${
                  p.highlighted
                    ? "bg-violet-600 hover:bg-violet-700 text-white"
                    : dark
                      ? "bg-slate-700 hover:bg-slate-600 text-gray-200"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
              >
                Ver empresas <ArrowRight size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Tabla de empresas por expiración */}
      <div>
        <h2 className={`text-sm font-bold uppercase tracking-wider mb-3 ${sub}`}>
          Próximas a vencer
        </h2>
        <div className={`rounded-xl border overflow-hidden ${dark ? "bg-slate-800 border-gray-700" : "bg-white border-gray-200"}`}>
          <table className="w-full text-sm">
            <thead>
              <tr className={`border-b ${dark ? "border-gray-700" : "border-gray-100"}`}>
                {["Empresa", "Plan", "Usuarios", "Empleados", "Vence en"].map((h) => (
                  <th key={h} className={`text-left px-4 py-3 text-xs font-bold uppercase tracking-wider ${sub}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center">
                    <Loader2 size={20} className="animate-spin text-violet-500 mx-auto" />
                  </td>
                </tr>
              ) : (() => {
                const expiring = (licenses ?? [])
                  .filter(l => l.license?.expiresAt)
                  .map(l => ({
                    ...l,
                    daysLeft: Math.ceil(
                      (new Date(l.license!.expiresAt!).getTime() - Date.now()) / 86400000
                    ),
                  }))
                  .filter(l => l.daysLeft <= 60)
                  .sort((a, b) => a.daysLeft - b.daysLeft)

                if (expiring.length === 0) {
                  return (
                    <tr>
                      <td colSpan={5} className={`px-4 py-8 text-center text-sm ${sub}`}>
                        <Clock size={28} className="mx-auto mb-2 opacity-30" />
                        Ninguna licencia vence en los próximos 60 días.
                      </td>
                    </tr>
                  )
                }

                return expiring.map((l) => {
                  const plan = PLANS.find(p => p.value === l.license?.plan)
                  return (
                    <tr
                      key={l.companyId}
                      className={`border-b last:border-0 cursor-pointer ${
                        dark ? "border-gray-700/50 hover:bg-slate-700/40" : "border-gray-50 hover:bg-gray-50"
                      }`}
                      onClick={() => navigate(`/admin/licenses/edit/${l.companyId}`)}
                    >
                      <td className="px-4 py-3">
                        <p className={`font-medium text-sm ${text}`}>{l.companyName}</p>
                        <p className={`text-xs font-mono ${sub}`}>{l.companyCode}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full border ${plan?.badge ?? ""}`}>
                          {l.license?.plan ?? "—"}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-xs ${sub}`}>
                        {l.userCount} / {l.license?.maxUsers}
                      </td>
                      <td className={`px-4 py-3 text-xs ${sub}`}>
                        {l.employeeCount} / {l.license?.maxEmployees}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-1 text-xs font-semibold ${
                          l.daysLeft < 0 ? "text-red-400" :
                          l.daysLeft <= 7 ? "text-red-400" :
                          l.daysLeft <= 30 ? "text-amber-400" :
                          sub
                        }`}>
                          <Zap size={11} />
                          {l.daysLeft < 0 ? "Expirada" : `${l.daysLeft}d`}
                        </span>
                      </td>
                    </tr>
                  )
                })
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
