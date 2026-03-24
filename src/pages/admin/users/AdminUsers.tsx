"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
import {
  Search, Loader2, AlertTriangle, RefreshCw, UserCircle,
  Shield, Building2,
} from "lucide-react"
import { useTheme } from "../../../context/themeContext"
import { authFetcher } from "../../../services/api"
import PagesHeader from "../../../components/headers/pagesHeader"

const API = import.meta.env.VITE_API_URL as string

interface AdminUser {
  id: string
  username: string
  email: string
  role: string
  isActive: boolean
  createdAt: string
  companies: { company: { id: string; name: string; code: string } }[]
}

const ROLE_COLOR: Record<string, string> = {
  GLOBAL_ADMIN: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  SUPER_ADMIN:  "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
}

export const AdminUsers = () => {
  const { isDarkMode: dark } = useTheme()
  const [search, setSearch]         = useState("")
  const [companyFilter, setCompanyFilter] = useState("ALL")

  const { data, isLoading, error, mutate } = useSWR<AdminUser[]>(
    `${API}/api/admin/users`,
    authFetcher
  )

  // Solo GLOBAL_ADMIN y SUPER_ADMIN
  const topUsers = useMemo(
    () => (data ?? []).filter(u => u.role === "GLOBAL_ADMIN" || u.role === "SUPER_ADMIN"),
    [data]
  )

  // Lista de empresas únicas (de los SUPER_ADMIN)
  const companies = useMemo(() => {
    const map = new Map<string, string>()
    topUsers.forEach(u =>
      u.companies.forEach(uc => map.set(uc.company.id, uc.company.name))
    )
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [topUsers])

  const filtered = topUsers.filter((u) => {
    const matchSearch =
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    const matchCompany =
      companyFilter === "ALL" ||
      u.role === "GLOBAL_ADMIN" ||          // GLOBAL_ADMIN siempre visible
      u.companies.some(uc => uc.company.id === companyFilter)
    return matchSearch && matchCompany
  })

  const text     = dark ? "text-gray-200" : "text-gray-800"
  const sub      = dark ? "text-gray-400" : "text-gray-500"
  const card     = `rounded-xl border transition-colors ${dark ? "bg-slate-800 border-gray-700" : "bg-white border-gray-200"}`
  const inputBase = `flex items-center gap-2 rounded-xl border px-4 py-2 ${dark ? "bg-slate-800 border-gray-700" : "bg-white border-gray-200"}`

  return (
    <div className="space-y-6">
      <PagesHeader title="Administradores" description="Global admins y super admins de cada empresa" />

      <div className="flex flex-wrap items-center gap-3">
        <div className={`${inputBase} flex-1 min-w-48`}>
          <Search size={15} className={sub} />
          <input
            type="text"
            placeholder="Buscar por usuario o email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`flex-1 bg-transparent text-sm outline-none ${text}`}
          />
        </div>

        {/* Filtro por empresa (aplica a SUPER_ADMIN) */}
        <select
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className={`rounded-xl border px-3 py-2 text-sm outline-none ${dark ? "bg-slate-800 border-gray-700 text-gray-200" : "bg-white border-gray-200 text-gray-800"}`}
        >
          <option value="ALL">Todas las empresas</option>
          {companies.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <button
          onClick={() => mutate()}
          className={`p-2.5 rounded-xl border ${dark ? "bg-slate-800 border-gray-700 text-gray-400 hover:text-white" : "bg-white border-gray-200 text-gray-500 hover:text-gray-800"}`}
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 size={16} className="animate-spin" /> Cargando usuarios…
        </div>
      )}
      {error && (
        <div className={`flex items-center gap-2 rounded-xl border p-4 text-sm ${dark ? "bg-red-900/20 border-red-700 text-red-400" : "bg-red-50 border-red-200 text-red-600"}`}>
          <AlertTriangle size={16} /> Error al cargar usuarios.
        </div>
      )}

      <div className={card}>
        <table className="w-full text-sm">
          <thead>
            <tr className={`border-b ${dark ? "border-gray-700" : "border-gray-100"}`}>
              {["Usuario", "Email", "Rol", "Empresa", "Estado", "Creado"].map((h) => (
                <th key={h} className={`text-left px-4 py-3 text-xs font-bold uppercase tracking-wider ${sub}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => (
              <tr key={user.id} className={`border-b last:border-0 ${dark ? "border-gray-700/50 hover:bg-slate-700/40" : "border-gray-50 hover:bg-gray-50"}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${dark ? "bg-slate-700 text-gray-300" : "bg-gray-100 text-gray-600"}`}>
                      {user.username.slice(0, 2).toUpperCase()}
                    </div>
                    <span className={`font-medium ${text}`}>{user.username}</span>
                  </div>
                </td>
                <td className={`px-4 py-3 font-mono text-xs ${sub}`}>{user.email}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border ${ROLE_COLOR[user.role] ?? ""}`}>
                    <Shield size={10} />
                    {user.role === "GLOBAL_ADMIN" ? "Global Admin" : "Super Admin"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {user.role === "GLOBAL_ADMIN" ? (
                    <span className={`text-xs italic ${sub}`}>— Plataforma</span>
                  ) : user.companies.length === 0 ? (
                    <span className={`text-xs ${sub}`}>Sin empresa</span>
                  ) : (
                    <div className="flex flex-col gap-0.5">
                      {user.companies.map((uc) => (
                        <span key={uc.company.id} className={`text-xs flex items-center gap-1 ${sub}`}>
                          <Building2 size={10} /> {uc.company.name}
                          <span className="opacity-50">({uc.company.code})</span>
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium ${user.isActive ? "text-emerald-400" : "text-red-400"}`}>
                    {user.isActive ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className={`px-4 py-3 text-xs ${sub}`}>
                  {new Date(user.createdAt).toLocaleDateString("es-PA")}
                </td>
              </tr>
            ))}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className={`px-4 py-8 text-center text-sm ${sub}`}>
                  <UserCircle size={32} className="mx-auto mb-2 opacity-30" />
                  No se encontraron administradores.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
