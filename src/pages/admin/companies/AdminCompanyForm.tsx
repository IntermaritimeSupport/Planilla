"use client"

import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import useSWR from "swr"
import { ArrowLeft, Loader2, Building2, Save, ShieldCheck, Key, ExternalLink } from "lucide-react"
import { useTheme } from "../../../context/themeContext"
import { authFetcher, apiPost, apiPut } from "../../../services/api"

const API = import.meta.env.VITE_API_URL as string

interface LicenseData {
  plan: string
  maxUsers: number
  maxEmployees: number
  startsAt: string
  expiresAt: string | null
  isActive: boolean
}

interface LicenseInfo {
  companyId: string
  license: LicenseData | null
  employeeCount: number
  userCount: number
}

interface CompanyDetail {
  id: string
  code: string
  name: string
  ruc: string | null
  email: string | null
  phone: string | null
  address: string | null
  isActive: boolean
  _count?: { employees: number; users: number }
}

const PLAN_COLOR: Record<string, string> = {
  TRIAL:        "bg-gray-500/20 text-gray-400 border-gray-500/30",
  STARTER:      "bg-blue-500/20 text-blue-400 border-blue-500/30",
  PROFESSIONAL: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  ENTERPRISE:   "bg-amber-500/20 text-amber-400 border-amber-500/30",
}

const EMPTY = { name: "", ruc: "", email: "", phone: "", address: "" }
const EMPTY_SA = { email: "", username: "", password: "", firstName: "", lastName: "" }

export const AdminCompanyForm = () => {
  const { isDarkMode: dark } = useTheme()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)

  const { data: company, isLoading } = useSWR<CompanyDetail>(
    isEdit ? `${API}/api/admin/companies/${id}` : null,
    authFetcher
  )

  const { data: allLicenses } = useSWR<LicenseInfo[]>(
    isEdit ? `${API}/api/admin/licenses` : null,
    authFetcher
  )
  const licenseInfo = allLicenses?.find(l => l.companyId === id)

  const [form, setForm]         = useState(EMPTY)
  const [superAdmin, setSA]     = useState(EMPTY_SA)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState("")

  useEffect(() => {
    if (company) {
      setForm({
        name:    company.name,
        ruc:     company.ruc ?? "",
        email:   company.email ?? "",
        phone:   company.phone ?? "",
        address: company.address ?? "",
      })
    }
  }, [company])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!form.name.trim()) { setError("El nombre es obligatorio."); return }
    setSaving(true)
    try {
      if (isEdit) {
        await apiPut(`/api/admin/companies/${id}`, { name: form.name, ruc: form.ruc, email: form.email, phone: form.phone, address: form.address })
      } else {
        const payload: any = { ...form }
        if (superAdmin.email && superAdmin.username && superAdmin.password) {
          payload.superAdmin = superAdmin
        }
        await apiPost("/api/admin/companies", payload)
      }
      navigate("/admin/companies")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.")
    } finally {
      setSaving(false)
    }
  }

  const card  = `rounded-xl border p-6 ${dark ? "bg-slate-800 border-gray-700" : "bg-white border-gray-200"}`
  const label = `block text-xs font-semibold uppercase tracking-wider mb-1.5 ${dark ? "text-gray-400" : "text-gray-500"}`
  const input = `w-full rounded-lg border px-3 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 ${dark ? "bg-slate-900 border-gray-600 text-white placeholder-gray-500" : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"}`

  if (isEdit && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="animate-spin text-violet-500" size={28} />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-2">

      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin/companies")}
          className={`p-2 rounded-lg transition-colors ${dark ? "hover:bg-slate-700 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <Building2 size={20} className="text-violet-500" />
          <h1 className={`text-xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>
            {isEdit ? "Editar Empresa" : "Nueva Empresa"}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Datos básicos */}
        <div className={card}>
          <h2 className={`text-sm font-bold uppercase tracking-wider mb-4 ${dark ? "text-gray-300" : "text-gray-700"}`}>
            Datos de la Empresa
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={label}>Nombre *</label>
              <input className={input} value={form.name} onChange={e => set("name", e.target.value)} placeholder="Nombre de la empresa" required />
            </div>
            <div>
              <label className={label}>RUC</label>
              <input className={input} value={form.ruc} onChange={e => set("ruc", e.target.value)} placeholder="123456-2-123456" />
            </div>
            <div>
              <label className={label}>Email</label>
              <input className={input} type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="empresa@email.com" />
            </div>
            <div>
              <label className={label}>Teléfono</label>
              <input className={input} value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+507 000-0000" />
            </div>
            <div>
              <label className={label}>Dirección</label>
              <input className={input} value={form.address} onChange={e => set("address", e.target.value)} placeholder="Ciudad, País" />
            </div>
          </div>
        </div>

        {/* Licencia */}
        {isEdit && (
          <div className={card}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-sm font-bold uppercase tracking-wider ${dark ? "text-gray-300" : "text-gray-700"}`}>
                Licencia
              </h2>
              {licenseInfo?.license && (
                <button
                  type="button"
                  onClick={() => navigate(`/admin/licenses/edit/${id}`)}
                  className="flex items-center gap-1.5 text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors"
                >
                  <ExternalLink size={12} /> Editar licencia
                </button>
              )}
            </div>

            {licenseInfo?.license ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${PLAN_COLOR[licenseInfo.license.plan] ?? PLAN_COLOR.TRIAL}`}>
                    <Key size={10} /> {licenseInfo.license.plan}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${licenseInfo.license.isActive ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                    {licenseInfo.license.isActive ? "Activa" : "Inactiva"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Usuarios", current: licenseInfo.userCount, max: licenseInfo.license.maxUsers },
                    { label: "Empleados", current: licenseInfo.employeeCount, max: licenseInfo.license.maxEmployees },
                  ].map(({ label: l, current, max }) => (
                    <div key={l} className={`rounded-lg border p-3 ${dark ? "bg-slate-900 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                      <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${dark ? "text-gray-500" : "text-gray-400"}`}>{l}</p>
                      <p className={`text-lg font-black font-mono ${dark ? "text-white" : "text-gray-900"}`}>
                        {current} <span className={`text-sm font-medium ${dark ? "text-gray-500" : "text-gray-400"}`}>/ {max}</span>
                      </p>
                      <div className="mt-1.5 h-1 rounded-full bg-gray-700 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${current / max > 0.9 ? "bg-red-500" : current / max > 0.7 ? "bg-amber-500" : "bg-emerald-500"}`}
                          style={{ width: `${Math.min(100, (current / max) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {licenseInfo.license.expiresAt && (() => {
                  const days = Math.ceil((new Date(licenseInfo.license.expiresAt!).getTime() - Date.now()) / 86400000)
                  return days < 30 ? (
                    <p className={`text-xs ${days < 0 ? "text-red-400" : "text-amber-400"}`}>
                      {days < 0 ? "✕ Licencia expirada" : `⚠ Vence en ${days} días`}
                    </p>
                  ) : null
                })()}
              </div>
            ) : (
              <div className={`flex flex-col items-center gap-3 py-6 rounded-xl border-2 border-dashed ${dark ? "border-gray-700" : "border-gray-200"}`}>
                <ShieldCheck size={28} className="text-gray-500 opacity-50" />
                <p className={`text-sm ${dark ? "text-gray-500" : "text-gray-400"}`}>Sin licencia configurada</p>
                <button
                  type="button"
                  onClick={() => navigate(`/admin/licenses/edit/${id}`)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors"
                >
                  <ShieldCheck size={14} /> Configurar licencia
                </button>
              </div>
            )}
          </div>
        )}

        {/* Super Admin solo en creación */}
        {!isEdit && (
          <div className={card}>
            <h2 className={`text-sm font-bold uppercase tracking-wider mb-1 ${dark ? "text-gray-300" : "text-gray-700"}`}>
              Super Admin <span className={`normal-case font-normal ${dark ? "text-gray-500" : "text-gray-400"}`}>(opcional)</span>
            </h2>
            <p className={`text-xs mb-4 ${dark ? "text-gray-500" : "text-gray-400"}`}>
              Si completas email, usuario y contraseña se creará el administrador de esta empresa.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={label}>Email</label>
                <input className={input} type="email" value={superAdmin.email} onChange={e => setSA(s => ({ ...s, email: e.target.value }))} placeholder="admin@empresa.com" />
              </div>
              <div>
                <label className={label}>Usuario</label>
                <input className={input} value={superAdmin.username} onChange={e => setSA(s => ({ ...s, username: e.target.value }))} placeholder="admin_empresa" />
              </div>
              <div>
                <label className={label}>Contraseña</label>
                <input className={input} type="password" value={superAdmin.password} onChange={e => setSA(s => ({ ...s, password: e.target.value }))} placeholder="••••••••" />
              </div>
              <div>
                <label className={label}>Nombre</label>
                <input className={input} value={superAdmin.firstName} onChange={e => setSA(s => ({ ...s, firstName: e.target.value }))} placeholder="Nombre" />
              </div>
              <div>
                <label className={label}>Apellido</label>
                <input className={input} value={superAdmin.lastName} onChange={e => setSA(s => ({ ...s, lastName: e.target.value }))} placeholder="Apellido" />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            <span>⚠</span> {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={() => navigate("/admin/companies")}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${dark ? "border-gray-600 text-gray-300 hover:bg-slate-700" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
            Cancelar
          </button>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {isEdit ? "Guardar cambios" : "Crear empresa"}
          </button>
        </div>
      </form>
    </div>
  )
}
