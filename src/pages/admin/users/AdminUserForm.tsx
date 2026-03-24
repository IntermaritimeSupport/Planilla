"use client"

import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import useSWR from "swr"
import { ArrowLeft, Loader2, UserCircle, Save, Eye, EyeOff } from "lucide-react"
import { useTheme } from "../../../context/themeContext"
import { authFetcher, apiPost, apiPut } from "../../../services/api"

const API = import.meta.env.VITE_API_URL as string

interface AdminUser {
  id: string
  username: string
  email: string
  role: string
  isActive: boolean
  companies: { company: { id: string; name: string; code: string } }[]
}

interface Company {
  id: string
  name: string
  code: string
  isActive: boolean
}

const ROLES = [
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "GLOBAL_ADMIN", label: "Global Admin" },
]

export const AdminUserForm = () => {
  const { isDarkMode: dark } = useTheme()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)

  const { data: user, isLoading: loadingUser } = useSWR<AdminUser>(
    isEdit ? `${API}/api/admin/users/${id}` : null,
    authFetcher
  )
  const { data: companies } = useSWR<Company[]>(`${API}/api/admin/companies`, authFetcher)

  const [form, setForm] = useState({
    username: "", email: "", password: "", role: "SUPER_ADMIN", isActive: true,
  })
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([])
  const [showPass, setShowPass] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState("")

  useEffect(() => {
    if (user) {
      setForm({ username: user.username, email: user.email, password: "", role: user.role, isActive: user.isActive })
      setSelectedCompanies(user.companies.map(uc => uc.company.id))
    }
  }, [user])

  const isSuperAdmin = form.role === "SUPER_ADMIN"

  const toggleCompany = (cid: string) =>
    setSelectedCompanies(prev => prev.includes(cid) ? prev.filter(x => x !== cid) : [...prev, cid])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!form.username.trim() || !form.email.trim()) { setError("Usuario y email son obligatorios."); return }
    if (!isEdit && !form.password) { setError("La contraseña es obligatoria al crear."); return }
    setSaving(true)
    try {
      const payload: any = { ...form, ...(isSuperAdmin && { companyIds: selectedCompanies }) }
      if (!payload.password) delete payload.password
      if (isEdit) {
        await apiPut(`/api/admin/users/${id}`, payload)
      } else {
        await apiPost("/api/admin/users", payload)
      }
      navigate("/admin/users")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.")
    } finally {
      setSaving(false)
    }
  }

  const card  = `rounded-xl border p-6 ${dark ? "bg-slate-800 border-gray-700" : "bg-white border-gray-200"}`
  const label = `block text-xs font-semibold uppercase tracking-wider mb-1.5 ${dark ? "text-gray-400" : "text-gray-500"}`
  const input = `w-full rounded-lg border px-3 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 ${dark ? "bg-slate-900 border-gray-600 text-white placeholder-gray-500" : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"}`

  if (isEdit && loadingUser) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="animate-spin text-violet-500" size={28} />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-2">

      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin/users")}
          className={`p-2 rounded-lg transition-colors ${dark ? "hover:bg-slate-700 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <UserCircle size={20} className="text-violet-500" />
          <h1 className={`text-xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>
            {isEdit ? "Editar Usuario Admin" : "Nuevo Usuario Admin"}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Datos del usuario */}
        <div className={card}>
          <h2 className={`text-sm font-bold uppercase tracking-wider mb-4 ${dark ? "text-gray-300" : "text-gray-700"}`}>
            Datos del Usuario
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={label}>Usuario *</label>
              <input className={input} value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="nombre_usuario" required />
            </div>
            <div>
              <label className={label}>Email *</label>
              <input className={input} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="usuario@email.com" required />
            </div>
            <div>
              <label className={label}>{isEdit ? "Nueva Contraseña" : "Contraseña *"}</label>
              <div className="relative">
                <input
                  className={input + " pr-10"}
                  type={showPass ? "text" : "password"}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder={isEdit ? "Dejar vacío para no cambiar" : "••••••••"}
                />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div>
              <label className={label}>Rol *</label>
              <select className={input} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <input type="checkbox" id="isActive" checked={form.isActive}
                onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                className="w-4 h-4 accent-violet-600" />
              <label htmlFor="isActive" className={`text-sm ${dark ? "text-gray-300" : "text-gray-700"}`}>
                Usuario activo
              </label>
            </div>
          </div>
        </div>

        {/* Empresas asignadas (solo Super Admin) */}
        {isSuperAdmin && (
          <div className={card}>
            <h2 className={`text-sm font-bold uppercase tracking-wider mb-1 ${dark ? "text-gray-300" : "text-gray-700"}`}>
              Empresas Asignadas
            </h2>
            <p className={`text-xs mb-4 ${dark ? "text-gray-500" : "text-gray-400"}`}>
              Opcional. Si no se asigna empresa, el usuario creará la suya desde el onboarding al iniciar sesión.
            </p>
            {!companies ? (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Loader2 size={14} className="animate-spin" /> Cargando empresas…
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {companies.map(c => (
                  <label key={c.id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                      selectedCompanies.includes(c.id)
                        ? dark ? "bg-violet-600/20 border border-violet-500/40" : "bg-violet-50 border border-violet-200"
                        : dark ? "bg-slate-700/40 border border-transparent hover:bg-slate-700" : "bg-gray-50 border border-transparent hover:bg-gray-100"
                    }`}>
                    <input type="checkbox" checked={selectedCompanies.includes(c.id)}
                      onChange={() => toggleCompany(c.id)}
                      className="w-4 h-4 accent-violet-600" />
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm font-medium ${dark ? "text-gray-200" : "text-gray-800"}`}>{c.name}</span>
                      <span className={`ml-2 text-xs font-mono ${dark ? "text-gray-500" : "text-gray-400"}`}>{c.code}</span>
                    </div>
                    {!c.isActive && (
                      <span className="text-xs text-red-400 font-medium">Inactiva</span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            <span>⚠</span> {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={() => navigate("/admin/users")}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${dark ? "border-gray-600 text-gray-300 hover:bg-slate-700" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
            Cancelar
          </button>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {isEdit ? "Guardar cambios" : "Crear usuario"}
          </button>
        </div>
      </form>
    </div>
  )
}
