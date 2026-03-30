"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import useSWR, { mutate as globalMutate } from "swr"
import {
  ShieldCheck, Building2, Users, UserCheck, Calendar, ArrowLeft,
  Plus, X, Loader2, CheckCircle2, XCircle, AlertTriangle, Clock,
  ChevronRight, Lock, Zap,
} from "lucide-react"
import { authFetcher, apiPost } from "../../../services/api"
import Images from "../../../assets"

const API = import.meta.env.VITE_API_URL as string

/* ── Interfaces ── */
interface LicenseData {
  plan: string
  maxCompanies: number
  maxUsers: number
  maxEmployees: number
  startsAt: string
  expiresAt: string | null
  isActive: boolean
  notes: string | null
}

interface CompanyItem {
  id: string
  name: string
  code: string
  isActive: boolean
  userCount: number
  employeeCount: number
}

interface MyLicenseResponse {
  license: LicenseData | null
  usage: { companyCount: number; totalUsers: number; totalEmployees: number }
  companies: CompanyItem[]
}

/* ── Helpers ── */
const PLAN_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  TRIAL:        { label: "Trial",        color: "text-gray-400",   bg: "bg-gray-500/15",   border: "border-gray-500/30" },
  STARTER:      { label: "Starter",      color: "text-blue-400",   bg: "bg-blue-500/15",   border: "border-blue-500/30" },
  PROFESSIONAL: { label: "Professional", color: "text-violet-400", bg: "bg-violet-500/15", border: "border-violet-500/30" },
  ENTERPRISE:   { label: "Enterprise",   color: "text-amber-400",  bg: "bg-amber-500/15",  border: "border-amber-500/30" },
}

function UsageBar({ used, max, color = "bg-blue-500" }: { used: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min((used / max) * 100, 100) : 0
  const danger = pct >= 90
  const warn   = pct >= 70
  return (
    <div className="w-full bg-slate-700/40 rounded-full h-1.5 mt-1.5">
      <div
        className={`h-1.5 rounded-full transition-all ${danger ? "bg-red-500" : warn ? "bg-amber-500" : color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase()
}

const AVATAR_COLORS = ["bg-violet-600","bg-blue-600","bg-emerald-600","bg-orange-500","bg-pink-600","bg-teal-600"]
function getAvatarColor(name: string) {
  let h = 0; for (const c of name) h = name.charCodeAt(0) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

/* ══════════════════════════════════════════════════════════════════
   COMPONENTE
══════════════════════════════════════════════════════════════════ */
export const MyLicense: React.FC = () => {
  const navigate = useNavigate()

  const { data, isLoading, error } = useSWR<MyLicenseResponse>(
    `${API}/api/user/my-license`,
    authFetcher
  )

  /* Modal crear empresa */
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: "", ruc: "", email: "", phone: "", address: "" })
  const [saving, setSaving] = useState(false)
  const [createError, setCreateError] = useState("")

  const license  = data?.license ?? null
  const usage    = data?.usage   ?? { companyCount: 0, totalUsers: 0, totalEmployees: 0 }
  const companies = data?.companies ?? []

  const daysLeft = license?.expiresAt
    ? Math.ceil((new Date(license.expiresAt).getTime() - Date.now()) / 86400000)
    : null

  const isExpired  = daysLeft !== null && daysLeft < 0
  const isWarning  = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30
  const planMeta   = PLAN_META[license?.plan ?? "TRIAL"] ?? PLAN_META.TRIAL

  const canCreate  = license && license.isActive && !isExpired
    && usage.companyCount < license.maxCompanies

  /* Crear empresa */
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    setCreateError("")
    try {
      await apiPost("/api/user/my-companies", {
        name:    form.name.trim(),
        ruc:     form.ruc.trim()     || undefined,
        email:   form.email.trim()   || undefined,
        phone:   form.phone.trim()   || undefined,
        address: form.address.trim() || undefined,
      })
      setShowCreate(false)
      setForm({ name: "", ruc: "", email: "", phone: "", address: "" })
      globalMutate(`${API}/api/user/my-license`)
      // También refrescar lista de empresas en el contexto global
      globalMutate((key: unknown) => typeof key === "string" && key.includes("/companies"), undefined, { revalidate: true })
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Error al crear la empresa.")
    } finally {
      setSaving(false)
    }
  }

  /* ── Render ── */
  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white flex flex-col">

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-600/40">
            <img src={Images.logo} alt="FlowPlanilla" className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm tracking-tight text-white">FlowPlanilla</span>
        </div>
        <button
          onClick={() => navigate("/select-company")}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={15} /> Mis empresas
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center px-4 py-10">
        <div className="w-full max-w-2xl space-y-6">

          {/* Título */}
          <div>
            <h1 className="text-2xl font-bold text-white">Mi Licencia</h1>
            <p className="text-sm text-gray-400 mt-0.5">Administra tus empresas y recursos dentro de tu plan</p>
          </div>

          {isLoading && (
            <div className="flex items-center gap-3 text-gray-500 py-10">
              <Loader2 size={20} className="animate-spin" /> Cargando licencia…
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertTriangle size={16} /> Error al cargar la licencia. Intenta de nuevo.
            </div>
          )}

          {!isLoading && !error && (
            <>
              {/* Plan card */}
              {license ? (
                <div className={`rounded-2xl border p-6 ${planMeta.bg} ${planMeta.border}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <ShieldCheck size={16} className={planMeta.color} />
                        <span className={`text-xs font-bold uppercase tracking-wider ${planMeta.color}`}>
                          Plan {planMeta.label}
                        </span>
                      </div>
                      <p className="text-white font-bold text-xl">Licencia activa</p>
                    </div>

                    {/* Estado vencimiento */}
                    <div className="text-right flex-shrink-0">
                      {isExpired ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
                          <XCircle size={11} /> Expirada
                        </span>
                      ) : isWarning ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          <Clock size={11} /> Vence en {daysLeft}d
                        </span>
                      ) : daysLeft !== null ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 size={11} /> {daysLeft}d restantes
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 size={11} /> Sin expiración
                        </span>
                      )}
                      {license.expiresAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          {isExpired ? "Venció" : "Vence"} {new Date(license.expiresAt).toLocaleDateString("es-PA", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Métricas de uso */}
                  <div className="grid grid-cols-3 gap-4 mt-6">
                    {/* Empresas */}
                    <div>
                      <div className="flex items-center justify-between text-xs text-gray-400 mb-0.5">
                        <span className="flex items-center gap-1"><Building2 size={11} /> Empresas</span>
                        <span className={`font-mono font-bold ${usage.companyCount >= license.maxCompanies ? "text-red-400" : "text-white"}`}>
                          {usage.companyCount}/{license.maxCompanies}
                        </span>
                      </div>
                      <UsageBar used={usage.companyCount} max={license.maxCompanies} color="bg-violet-500" />
                    </div>
                    {/* Usuarios */}
                    <div>
                      <div className="flex items-center justify-between text-xs text-gray-400 mb-0.5">
                        <span className="flex items-center gap-1"><Users size={11} /> Usuarios</span>
                        <span className={`font-mono font-bold ${usage.totalUsers >= license.maxUsers ? "text-red-400" : "text-white"}`}>
                          {usage.totalUsers}/{license.maxUsers}
                        </span>
                      </div>
                      <UsageBar used={usage.totalUsers} max={license.maxUsers} color="bg-blue-500" />
                    </div>
                    {/* Empleados */}
                    <div>
                      <div className="flex items-center justify-between text-xs text-gray-400 mb-0.5">
                        <span className="flex items-center gap-1"><UserCheck size={11} /> Empleados</span>
                        <span className={`font-mono font-bold ${usage.totalEmployees >= license.maxEmployees ? "text-red-400" : "text-white"}`}>
                          {usage.totalEmployees}/{license.maxEmployees}
                        </span>
                      </div>
                      <UsageBar used={usage.totalEmployees} max={license.maxEmployees} color="bg-emerald-500" />
                    </div>
                  </div>

                  {license.notes && (
                    <p className="text-xs text-gray-500 mt-4 pt-4 border-t border-white/5 italic">{license.notes}</p>
                  )}
                </div>
              ) : (
                /* Sin licencia */
                <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center space-y-3">
                  <ShieldCheck size={36} className="mx-auto text-gray-600" />
                  <p className="font-semibold text-gray-300">Sin licencia asignada</p>
                  <p className="text-sm text-gray-500">Contacta al administrador para activar tu cuenta.</p>
                </div>
              )}

              {/* Botón crear empresa */}
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Mis empresas <span className="text-gray-600 font-normal normal-case">({companies.length})</span>
                </h2>
                {canCreate ? (
                  <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors shadow-md shadow-violet-600/20"
                  >
                    <Plus size={14} /> Nueva empresa
                  </button>
                ) : license && (
                  <span className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Lock size={12} />
                    {isExpired ? "Licencia expirada" : !license.isActive ? "Licencia inactiva" : "Límite alcanzado"}
                  </span>
                )}
              </div>

              {/* Lista de empresas */}
              <div className="space-y-2">
                {companies.length === 0 ? (
                  <div className="flex flex-col items-center py-12 gap-3 rounded-2xl border border-white/5 bg-white/[0.02] text-center">
                    <Building2 size={32} className="text-gray-700" />
                    <p className="text-sm text-gray-500">No tienes empresas creadas aún.</p>
                    {canCreate && (
                      <button
                        onClick={() => setShowCreate(true)}
                        className="mt-1 text-xs text-violet-400 hover:text-violet-300 font-medium transition-colors"
                      >
                        Crear primera empresa →
                      </button>
                    )}
                  </div>
                ) : (
                  companies.map(c => (
                    <div
                      key={c.id}
                      className={`group flex items-center gap-4 px-4 py-4 rounded-xl border transition-all ${
                        c.isActive
                          ? "bg-white/[0.03] border-white/8 hover:bg-white/[0.06] hover:border-violet-500/30 cursor-pointer"
                          : "bg-white/[0.01] border-white/5 opacity-50 cursor-not-allowed"
                      }`}
                      onClick={() => c.isActive && (window.location.href = `/${c.code}/dashboard/all`)}
                    >
                      {/* Avatar */}
                      <div className={`w-10 h-10 rounded-xl ${c.isActive ? getAvatarColor(c.name) : "bg-gray-700"} flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm`}>
                        {c.isActive ? getInitials(c.name) : <Lock size={14} />}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold text-sm truncate ${c.isActive ? "text-white" : "text-gray-500 line-through"}`}>
                          {c.name}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-gray-500 font-mono">{c.code}</span>
                          <span className="text-xs text-gray-600 flex items-center gap-1">
                            <Users size={9} /> {c.userCount} usuarios
                          </span>
                          <span className="text-xs text-gray-600 flex items-center gap-1">
                            <UserCheck size={9} /> {c.employeeCount} empleados
                          </span>
                        </div>
                      </div>

                      {/* Estado / flecha */}
                      {c.isActive ? (
                        <ChevronRight size={16} className="text-gray-600 group-hover:text-violet-400 transition-colors flex-shrink-0" />
                      ) : (
                        <span className="text-xs text-red-500 flex-shrink-0">Inactiva</span>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Alerta si la licencia no está activa */}
              {license && (!license.isActive || isExpired) && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
                  <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">
                      {isExpired ? "Tu licencia ha expirado" : "Tu licencia está inactiva"}
                    </p>
                    <p className="text-xs text-amber-400/70 mt-0.5">
                      Las empresas asociadas pueden estar desactivadas. Contacta al administrador para renovar tu plan.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* ── Modal crear empresa ── */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowCreate(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[#1a1a2e] border border-white/10 shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-violet-400" />
                <h3 className="font-bold text-white">Nueva empresa</h3>
              </div>
              <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Uso restante */}
            {license && (
              <div className="px-6 py-3 bg-violet-600/10 border-b border-violet-500/10">
                <p className="text-xs text-violet-300">
                  Usarás <strong>{usage.companyCount + 1} de {license.maxCompanies}</strong> empresas disponibles en tu licencia {PLAN_META[license.plan]?.label}.
                </p>
              </div>
            )}

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                  Nombre de la empresa <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Empresa S.A."
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">RUC</label>
                  <input
                    type="text"
                    placeholder="Ej. 8-123-456"
                    value={form.ruc}
                    onChange={e => setForm(f => ({ ...f, ruc: e.target.value }))}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Teléfono</label>
                  <input
                    type="text"
                    placeholder="Ej. 6000-0000"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Email</label>
                <input
                  type="email"
                  placeholder="contacto@empresa.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Dirección</label>
                <input
                  type="text"
                  placeholder="Ciudad de Panamá, Panamá"
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {createError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  <AlertTriangle size={14} /> {createError}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20 text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !form.name.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Crear empresa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
