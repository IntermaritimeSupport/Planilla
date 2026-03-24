"use client"

import { useState } from "react"
import useSWR from "swr"
import {
  ShieldCheck, Search, Loader2, AlertTriangle,
  RefreshCw, CheckCircle2, XCircle, Key, Pencil, Clock, Building2, Users,
} from "lucide-react"
import { useTheme } from "../../../context/themeContext"
import { authFetcher } from "../../../services/api"
import PagesHeader from "../../../components/headers/pagesHeader"
import { useNavigate } from "react-router-dom"

const API = import.meta.env.VITE_API_URL as string

interface LicenseData {
  plan: string
  maxCompanies: number
  maxUsers: number
  maxEmployees: number
  startsAt: string
  expiresAt: string | null
  isActive: boolean
}

interface LicenseInfo {
  userId: string
  username: string
  email: string
  fullName: string
  isActive: boolean
  createdAt: string
  companyCount: number
  totalEmployees: number
  totalUsers: number
  companies: { id: string; name: string; code: string; isActive: boolean }[]
  license: LicenseData | null
}

const PLAN_COLOR: Record<string, string> = {
  TRIAL:        "bg-gray-500/20 text-gray-400 border-gray-500/30",
  STARTER:      "bg-blue-500/20 text-blue-400 border-blue-500/30",
  PROFESSIONAL: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  ENTERPRISE:   "bg-amber-500/20 text-amber-400 border-amber-500/30",
}

export const AdminLicenses = () => {
  const { isDarkMode: dark } = useTheme()
  const navigate = useNavigate()
  const [search, setSearch] = useState("")

  const { data, isLoading, error, mutate } = useSWR<LicenseInfo[]>(
    `${API}/api/admin/licenses`,
    authFetcher
  )

  const licenses = data ?? []
  const filtered = licenses.filter(
    (l) =>
      l.fullName.toLowerCase().includes(search.toLowerCase()) ||
      l.email.toLowerCase().includes(search.toLowerCase()) ||
      l.username.toLowerCase().includes(search.toLowerCase())
  )

  const text = dark ? "text-gray-200" : "text-gray-800"
  const sub  = dark ? "text-gray-400" : "text-gray-500"
  const card = `rounded-xl border transition-colors ${dark ? "bg-slate-800 border-gray-700" : "bg-white border-gray-200"}`

  const activeLicenses = licenses.filter((l) => l.license?.isActive).length

  return (
    <div className="space-y-6">
      <PagesHeader title="Licencias" description="Licencias por cuenta SUPER ADMIN" />

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total cuentas", value: licenses.length, icon: ShieldCheck, color: "bg-indigo-500" },
          { label: "Activas",       value: activeLicenses,  icon: CheckCircle2, color: "bg-emerald-500" },
          { label: "Inactivas",     value: licenses.length - activeLicenses, icon: XCircle, color: "bg-red-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`${card} p-5`}>
            <div className="flex items-start justify-between mb-3">
              <span className={`text-xs font-bold uppercase tracking-wider ${sub}`}>{label}</span>
              <div className={`p-2 rounded-lg ${color}`}><Icon size={14} className="text-white" /></div>
            </div>
            <div className={`text-2xl font-black font-mono ${text}`}>{value}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-2 flex-1 rounded-xl border px-4 py-2 ${dark ? "bg-slate-800 border-gray-700" : "bg-white border-gray-200"}`}>
          <Search size={15} className={sub} />
          <input
            type="text"
            placeholder="Buscar cuenta…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`flex-1 bg-transparent text-sm outline-none ${text}`}
          />
        </div>
        <button onClick={() => mutate()} className={`p-2.5 rounded-xl border ${dark ? "bg-slate-800 border-gray-700 text-gray-400 hover:text-white" : "bg-white border-gray-200 text-gray-500 hover:text-gray-800"}`}>
          <RefreshCw size={15} />
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 size={16} className="animate-spin" /> Cargando licencias…
        </div>
      )}
      {error && (
        <div className={`flex items-center gap-2 rounded-xl border p-4 text-sm ${dark ? "bg-red-900/20 border-red-700 text-red-400" : "bg-red-50 border-red-200 text-red-600"}`}>
          <AlertTriangle size={16} /> Error al cargar licencias.
        </div>
      )}

      <div className={card}>
        <table className="w-full text-sm">
          <thead>
            <tr className={`border-b ${dark ? "border-gray-700" : "border-gray-100"}`}>
              {["Cuenta", "Plan", "Empresas", "Usuarios / Emp.", "Vencimiento", "Estado", ""].map((h) => (
                <th key={h} className={`text-left px-4 py-3 text-xs font-bold uppercase tracking-wider ${sub}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((lic) => {
              const plan     = lic.license?.plan ?? "SIN PLAN"
              const expiresAt = lic.license?.expiresAt
              const daysLeft  = expiresAt
                ? Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000)
                : null
              const licActive = lic.license?.isActive ?? false

              return (
                <tr key={lic.userId} className={`border-b last:border-0 ${dark ? "border-gray-700/50 hover:bg-slate-700/40" : "border-gray-50 hover:bg-gray-50"}`}>
                  {/* Cuenta */}
                  <td className="px-4 py-3">
                    <p className={`font-semibold text-sm ${text}`}>{lic.fullName || lic.username}</p>
                    <p className={`text-xs ${sub}`}>{lic.email}</p>
                  </td>

                  {/* Plan */}
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border ${PLAN_COLOR[plan] ?? PLAN_COLOR.TRIAL}`}>
                      <Key size={10} /> {plan}
                    </span>
                  </td>

                  {/* Empresas */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Building2 size={12} className={sub} />
                      <span className={`text-xs font-mono ${text}`}>
                        {lic.companyCount}
                        {lic.license && <span className={sub}> / {lic.license.maxCompanies}</span>}
                      </span>
                    </div>
                  </td>

                  {/* Usuarios / Empleados */}
                  <td className={`px-4 py-3 text-xs ${sub}`}>
                    {lic.license ? (
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1">
                          <Users size={10} />
                          <span>{lic.totalUsers} / {lic.license.maxUsers} usr.</span>
                        </div>
                        <p>{lic.totalEmployees} / {lic.license.maxEmployees} emp.</p>
                      </div>
                    ) : (
                      <span className="italic">Sin límites</span>
                    )}
                  </td>

                  {/* Vencimiento */}
                  <td className="px-4 py-3 text-xs">
                    {daysLeft === null ? (
                      <span className={sub}>Sin fecha</span>
                    ) : daysLeft < 0 ? (
                      <span className="text-red-400 font-medium flex items-center gap-1"><XCircle size={11} /> Expirada</span>
                    ) : daysLeft <= 30 ? (
                      <span className="text-amber-400 font-medium flex items-center gap-1"><Clock size={11} /> {daysLeft}d</span>
                    ) : (
                      <span className={`${sub} flex items-center gap-1`}><Clock size={11} /> {daysLeft}d</span>
                    )}
                  </td>

                  {/* Estado */}
                  <td className="px-4 py-3">
                    {lic.license ? (
                      licActive
                        ? <span className="text-xs font-medium text-emerald-400 flex items-center gap-1"><CheckCircle2 size={12} /> Activa</span>
                        : <span className="text-xs font-medium text-red-400 flex items-center gap-1"><XCircle size={12} /> Inactiva</span>
                    ) : (
                      <span className={`text-xs italic ${sub}`}>Sin licencia</span>
                    )}
                  </td>

                  {/* Acción */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(`/admin/licenses/edit/${lic.userId}`)}
                      className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${dark ? "bg-slate-700 hover:bg-slate-600 text-gray-300" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}
                    >
                      <Pencil size={11} /> {lic.license ? "Editar" : "Configurar"}
                    </button>
                  </td>
                </tr>
              )
            })}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className={`px-4 py-8 text-center text-sm ${sub}`}>
                  <ShieldCheck size={32} className="mx-auto mb-2 opacity-30" />
                  No se encontraron cuentas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
