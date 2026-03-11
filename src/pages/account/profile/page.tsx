"use client"

import { authFetcher } from "../../../services/api"
import useSWR from "swr"
import { useTheme } from "../../../context/themeContext"
import { UsuarioFull } from "../../../utils/usuarioFull"
import Loader from "../../../components/loaders/loader.tsx"
import {
  Building2, Calendar, Mail, Phone, Shield, User,
  CheckCircle, XCircle, Clock, Hash, Briefcase,
} from "lucide-react"

const { VITE_API_URL } = import.meta.env

interface ProfilePageProps {
  userId: string
}

const ROLE_CFG: Record<string, { label: string; color: string }> = {
  SUPER_ADMIN: { label: "Super Admin", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  ADMIN:       { label: "Admin",       color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  MODERATOR:   { label: "Moderador",   color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  USER:        { label: "Usuario",     color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
}

const fmtDate = (d?: string) => {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("es-PA", { day: "2-digit", month: "long", year: "numeric" })
}

const daysSince = (d?: string) => {
  if (!d) return 0
  return Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000)
}

export default function ProfilePage({ userId }: ProfilePageProps) {
  const { isDarkMode } = useTheme()
  const { data, error, isLoading } = useSWR<UsuarioFull>(
    userId ? `${VITE_API_URL}/api/users/profile/${userId}` : null,
    authFetcher
  )

  if (isLoading) return <Loader />

  if (error || !data) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? "bg-slate-900 text-slate-400" : "bg-gray-50 text-gray-500"}`}>
        <p className="text-sm">Error al cargar el perfil.</p>
      </div>
    )
  }

  const u = data
  const roleCfg = ROLE_CFG[u.role] ?? ROLE_CFG.USER
  const initials = (u.person?.fullName || u.username || "U")
    .split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
  const accountDays = daysSince(u.createdAt)

  const card = `rounded-xl border p-5 ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`
  const label = `text-[10px] uppercase font-bold tracking-widest mb-1 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`
  const val = `text-sm font-medium ${isDarkMode ? "text-slate-200" : "text-gray-800"}`
  const sub = `text-[11px] ${isDarkMode ? "text-gray-500" : "text-gray-400"}`

  return (
    <div className={`min-h-screen transition-colors ${isDarkMode ? "bg-slate-900" : "bg-gray-50"}`}>
      <div className="max-w-5xl mx-auto p-6 space-y-6">

        {/* ── HEADER ── */}
        <div className={`${card} flex flex-col md:flex-row items-start md:items-center gap-5`}>
          {/* Avatar */}
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-black flex-shrink-0 ${isDarkMode ? "bg-teal-500/20 text-teal-400" : "bg-teal-100 text-teal-700"}`}>
            {initials}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className={`text-xl font-bold truncate ${isDarkMode ? "text-white" : "text-gray-900"}`}>
              {u.person?.fullName || u.username}
            </h1>
            <p className={`text-sm mt-0.5 truncate ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              {u.person?.position || "Sin cargo asignado"} · {u.person?.department?.name || "Sin departamento"}
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${roleCfg.color}`}>
                <Shield size={11} /> {roleCfg.label}
              </span>
              {u.isActive ? (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${isDarkMode ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-emerald-50 text-emerald-700 border-emerald-300"}`}>
                  <CheckCircle size={11} /> Activo
                </span>
              ) : (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${isDarkMode ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-red-50 text-red-700 border-red-300"}`}>
                  <XCircle size={11} /> Inactivo
                </span>
              )}
            </div>
          </div>

          {/* Stats rápidas */}
          <div className="flex gap-4 flex-shrink-0">
            {[
              { label: "Empresas",    value: u.companies?.length ?? 0,  accent: "text-teal-500"  },
              { label: "Días activo", value: accountDays,                accent: isDarkMode ? "text-slate-200" : "text-gray-800" },
            ].map(({ label: l, value, accent }) => (
              <div key={l} className={`text-center p-3 rounded-xl ${isDarkMode ? "bg-slate-700/50" : "bg-gray-50 border border-gray-200"}`}>
                <p className={`text-2xl font-black font-mono ${accent}`}>{value}</p>
                <p className={`text-[10px] uppercase font-bold mt-0.5 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>{l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── GRID PRINCIPAL ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Información de cuenta */}
          <div className={card}>
            <div className={`flex items-center gap-2 mb-4 ${isDarkMode ? "text-teal-400" : "text-teal-600"}`}>
              <User size={16} />
              <h2 className={`text-sm font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>Cuenta</h2>
            </div>
            <div className="space-y-4">
              <div>
                <p className={label}>Usuario</p>
                <p className={`${val} font-mono`}>@{u.username}</p>
              </div>
              <div>
                <p className={label}>Código de usuario</p>
                <p className={`${val} font-mono text-teal-500`}>{u.person?.userCode || "—"}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className={label}>Nombre</p>
                  <p className={val}>{u.person?.firstName || "—"}</p>
                </div>
                <div>
                  <p className={label}>Apellido</p>
                  <p className={val}>{u.person?.lastName || "—"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contacto */}
          <div className={card}>
            <div className={`flex items-center gap-2 mb-4 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}>
              <Mail size={16} />
              <h2 className={`text-sm font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>Contacto</h2>
            </div>
            <div className="space-y-4">
              <div>
                <p className={label}>Email principal</p>
                <div className="flex items-center gap-2">
                  <Mail size={12} className={isDarkMode ? "text-gray-500" : "text-gray-400"} />
                  <p className={val}>{u.email || "—"}</p>
                </div>
              </div>
              <div>
                <p className={label}>Email de contacto</p>
                <div className="flex items-center gap-2">
                  <Mail size={12} className={isDarkMode ? "text-gray-500" : "text-gray-400"} />
                  <p className={val}>{u.person?.contactEmail || "—"}</p>
                </div>
              </div>
              <div>
                <p className={label}>Teléfono</p>
                <div className="flex items-center gap-2">
                  <Phone size={12} className={isDarkMode ? "text-gray-500" : "text-gray-400"} />
                  <p className={val}>{u.person?.phoneNumber || "—"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Profesional */}
          <div className={card}>
            <div className={`flex items-center gap-2 mb-4 ${isDarkMode ? "text-purple-400" : "text-purple-600"}`}>
              <Briefcase size={16} />
              <h2 className={`text-sm font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>Información Profesional</h2>
            </div>
            <div className="space-y-4">
              <div>
                <p className={label}>Posición</p>
                <p className={val}>{u.person?.position || "—"}</p>
              </div>
              <div>
                <p className={label}>Departamento</p>
                <p className={val}>{u.person?.department?.name || "—"}</p>
              </div>
              <div>
                <p className={label}>Rol del sistema</p>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${roleCfg.color}`}>
                  <Shield size={11} /> {roleCfg.label}
                </span>
              </div>
            </div>
          </div>

          {/* Sistema */}
          <div className={card}>
            <div className={`flex items-center gap-2 mb-4 ${isDarkMode ? "text-amber-400" : "text-amber-600"}`}>
              <Clock size={16} />
              <h2 className={`text-sm font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>Actividad del Sistema</h2>
            </div>
            <div className="space-y-4">
              <div>
                <p className={label}>Miembro desde</p>
                <div className="flex items-center gap-2">
                  <Calendar size={12} className={isDarkMode ? "text-gray-500" : "text-gray-400"} />
                  <p className={val}>{fmtDate(u.createdAt)}</p>
                </div>
                <p className={`${sub} mt-0.5`}>{accountDays} días activo</p>
              </div>
              <div>
                <p className={label}>Última actualización</p>
                <p className={val}>{fmtDate(u.updatedAt)}</p>
              </div>
              <div>
                <p className={label}>ID de cuenta</p>
                <p className={`${val} font-mono text-xs truncate`}>{u.id}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── EMPRESAS ── */}
        {u.companies && u.companies.length > 0 && (
          <div className={card}>
            <div className={`flex items-center gap-2 mb-4 ${isDarkMode ? "text-teal-400" : "text-teal-600"}`}>
              <Building2 size={16} />
              <h2 className={`text-sm font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                Empresas asignadas <span className={`font-mono ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>({u.companies.length})</span>
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {u.companies.map((uc: any, i: number) => (
                <div key={i} className={`p-4 rounded-xl border ${isDarkMode ? "bg-slate-700/40 border-slate-600" : "bg-gray-50 border-gray-200"}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>{uc.company.name}</p>
                      <p className={`text-[10px] font-mono mt-0.5 ${isDarkMode ? "text-teal-400" : "text-teal-600"}`}>{uc.company.code}</p>
                    </div>
                    <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      uc.company.isActive
                        ? isDarkMode ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-emerald-50 text-emerald-700 border-emerald-300"
                        : isDarkMode ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-red-50 text-red-700 border-red-300"
                    }`}>
                      {uc.company.isActive ? <CheckCircle size={9} /> : <XCircle size={9} />}
                      {uc.company.isActive ? "Activa" : "Inactiva"}
                    </span>
                  </div>
                  <div className={`space-y-1 text-[11px] ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
                    {uc.company.email && (
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail size={10} className="flex-shrink-0" />
                        <span className="truncate">{uc.company.email}</span>
                      </div>
                    )}
                    {uc.company.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone size={10} className="flex-shrink-0" />
                        <span>{uc.company.phone}</span>
                      </div>
                    )}
                    {uc.company.ruc && (
                      <div className="flex items-center gap-1.5">
                        <Hash size={10} className="flex-shrink-0" />
                        <span>RUC: {uc.company.ruc}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
