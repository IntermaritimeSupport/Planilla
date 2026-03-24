"use client"

import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import useSWR from "swr"
import { ArrowLeft, Loader2, ShieldCheck, Save, Calendar, Building2, Users } from "lucide-react"
import { useTheme } from "../../../context/themeContext"
import { authFetcher, apiPut } from "../../../services/api"

const API = import.meta.env.VITE_API_URL as string

const PLANS = [
  { value: "TRIAL",        label: "Trial",        desc: "Prueba gratuita limitada",         color: "text-gray-400" },
  { value: "STARTER",      label: "Starter",      desc: "Pequeñas empresas",                color: "text-blue-400" },
  { value: "PROFESSIONAL", label: "Professional", desc: "Empresas en crecimiento",           color: "text-violet-400" },
  { value: "ENTERPRISE",   label: "Enterprise",   desc: "Sin límites operativos",            color: "text-amber-400" },
]

interface LicenseData {
  id: string
  userId: string
  plan: string
  maxCompanies: number
  maxUsers: number
  maxEmployees: number
  startsAt: string
  expiresAt: string | null
  isActive: boolean
  notes: string | null
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

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return ""
  return iso.slice(0, 10)
}

export const AdminLicenseForm = () => {
  const { isDarkMode: dark } = useTheme()
  const navigate = useNavigate()
  const { userId } = useParams<{ userId: string }>()

  const { data, isLoading } = useSWR<LicenseInfo[]>(`${API}/api/admin/licenses`, authFetcher)

  const account = data?.find(l => l.userId === userId)
  const lic     = account?.license

  const oneYearFromNow = () => {
    const d = new Date()
    d.setFullYear(d.getFullYear() + 1)
    return toDateInput(d.toISOString())
  }

  const [form, setForm] = useState({
    plan: "TRIAL", maxCompanies: 1, maxUsers: 5, maxEmployees: 20,
    startsAt: toDateInput(new Date().toISOString()),
    expiresAt: oneYearFromNow(),
    isActive: true, notes: "",
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState("")

  useEffect(() => {
    if (lic) {
      setForm({
        plan:         lic.plan,
        maxCompanies: lic.maxCompanies,
        maxUsers:     lic.maxUsers,
        maxEmployees: lic.maxEmployees,
        startsAt:     toDateInput(lic.startsAt),
        expiresAt:    toDateInput(lic.expiresAt),
        isActive:     lic.isActive,
        notes:        lic.notes ?? "",
      })
    }
  }, [lic])

  const set = (k: string, v: string | number | boolean) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSaving(true)
    try {
      await apiPut(`/api/admin/licenses/${userId}`, {
        ...form,
        expiresAt: form.expiresAt || null,
      })
      navigate("/admin/licenses")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.")
    } finally {
      setSaving(false)
    }
  }

  const card  = `rounded-xl border p-6 ${dark ? "bg-slate-800 border-gray-700" : "bg-white border-gray-200"}`
  const label = `block text-xs font-semibold uppercase tracking-wider mb-1.5 ${dark ? "text-gray-400" : "text-gray-500"}`
  const input = `w-full rounded-lg border px-3 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 ${dark ? "bg-slate-900 border-gray-600 text-white placeholder-gray-500" : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"}`

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="animate-spin text-violet-500" size={28} />
      </div>
    )
  }

  if (!account) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-gray-400">
        Cuenta no encontrada.
      </div>
    )
  }

  const daysLeft = form.expiresAt
    ? Math.ceil((new Date(form.expiresAt).getTime() - Date.now()) / 86400000)
    : null

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-2">

      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin/licenses")}
          className={`p-2 rounded-lg transition-colors ${dark ? "hover:bg-slate-700 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <ShieldCheck size={20} className="text-violet-500" />
          <div>
            <h1 className={`text-xl font-bold leading-tight ${dark ? "text-white" : "text-gray-900"}`}>
              Licencia — {account.fullName || account.username}
            </h1>
            <p className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>{account.email}</p>
          </div>
        </div>
      </div>

      {/* Resumen actual */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Empresas",   value: `${account.companyCount} / ${form.maxCompanies}`, icon: Building2 },
          { label: "Empleados",  value: `${account.totalEmployees} / ${form.maxEmployees}`, icon: Users },
          { label: "Usuarios",   value: `${account.totalUsers} / ${form.maxUsers}`, icon: Users },
          { label: "Vence en",   value: daysLeft !== null ? (daysLeft < 0 ? "Expirada" : `${daysLeft}d`) : "Sin fecha", icon: null },
        ].map(({ label: l, value }) => (
          <div key={l} className={`rounded-xl border p-4 ${dark ? "bg-slate-800 border-gray-700" : "bg-white border-gray-200"}`}>
            <p className={`text-xs font-semibold uppercase tracking-wider ${dark ? "text-gray-400" : "text-gray-500"}`}>{l}</p>
            <p className={`text-lg font-black font-mono mt-1 ${dark ? "text-white" : "text-gray-900"}`}>{value}</p>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Plan */}
        <div className={card}>
          <h2 className={`text-sm font-bold uppercase tracking-wider mb-4 ${dark ? "text-gray-300" : "text-gray-700"}`}>
            Tipo de Plan
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {PLANS.map(p => (
              <button
                key={p.value} type="button"
                onClick={() => set("plan", p.value)}
                className={`flex flex-col gap-1 p-4 rounded-xl border text-left transition-all ${
                  form.plan === p.value
                    ? dark ? "border-violet-500 bg-violet-600/20" : "border-violet-400 bg-violet-50"
                    : dark ? "border-gray-700 hover:border-gray-500" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <span className={`text-sm font-bold ${p.color}`}>{p.label}</span>
                <span className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>{p.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Límites */}
        <div className={card}>
          <h2 className={`text-sm font-bold uppercase tracking-wider mb-4 ${dark ? "text-gray-300" : "text-gray-700"}`}>
            Límites de Uso
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={label}>Máx. Empresas</label>
              <input className={input} type="number" min={1} max={999}
                value={form.maxCompanies}
                onChange={e => set("maxCompanies", parseInt(e.target.value) || 1)} />
            </div>
            <div>
              <label className={label}>Máx. Usuarios</label>
              <input className={input} type="number" min={1} max={9999}
                value={form.maxUsers}
                onChange={e => set("maxUsers", parseInt(e.target.value) || 1)} />
            </div>
            <div>
              <label className={label}>Máx. Empleados</label>
              <input className={input} type="number" min={1} max={99999}
                value={form.maxEmployees}
                onChange={e => set("maxEmployees", parseInt(e.target.value) || 1)} />
            </div>
          </div>
        </div>

        {/* Vigencia */}
        <div className={card}>
          <h2 className={`text-sm font-bold uppercase tracking-wider mb-4 ${dark ? "text-gray-300" : "text-gray-700"}`}>
            Vigencia
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Inicio</label>
              <div className="relative">
                <input className={input + " pr-9"} type="date"
                  value={form.startsAt}
                  onChange={e => set("startsAt", e.target.value)} />
                <Calendar size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className={label}>Vencimiento <span className={`normal-case font-normal ${dark ? "text-gray-500" : "text-gray-400"}`}>(opcional)</span></label>
              <div className="relative">
                <input className={input + " pr-9"} type="date"
                  value={form.expiresAt}
                  onChange={e => set("expiresAt", e.target.value)} />
                <Calendar size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              {daysLeft !== null && daysLeft < 30 && daysLeft >= 0 && (
                <p className="text-xs text-amber-400 mt-1">⚠ Vence en {daysLeft} días</p>
              )}
              {daysLeft !== null && daysLeft < 0 && (
                <p className="text-xs text-red-400 mt-1">✕ Licencia expirada</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <input type="checkbox" id="licActive" checked={form.isActive}
              onChange={e => set("isActive", e.target.checked)}
              className="w-4 h-4 accent-violet-600" />
            <label htmlFor="licActive" className={`text-sm ${dark ? "text-gray-300" : "text-gray-700"}`}>
              Licencia activa
            </label>
          </div>
        </div>

        {/* Notas */}
        <div className={card}>
          <label className={label}>Notas internas</label>
          <textarea
            className={input + " resize-none"}
            rows={3}
            value={form.notes}
            onChange={e => set("notes", e.target.value)}
            placeholder="Observaciones, acuerdos especiales…"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            <span>⚠</span> {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={() => navigate("/admin/licenses")}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${dark ? "border-gray-600 text-gray-300 hover:bg-slate-700" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
            Cancelar
          </button>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Guardar licencia
          </button>
        </div>
      </form>
    </div>
  )
}
