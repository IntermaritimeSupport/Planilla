"use client"

import { useState } from "react"
import { Building2, Loader2, CheckSquare, Square, ChevronRight, LogOut } from "lucide-react"
import { useTheme } from "../../context/themeContext"
import { apiPost } from "../../services/api"
import useUser from "../../hook/useUser"
import Images from "../../assets"

const COMMON_DEPARTMENTS = [
  { name: "Recursos Humanos",       emoji: "👥" },
  { name: "Contabilidad",           emoji: "📊" },
  { name: "Administración",         emoji: "🏢" },
  { name: "Operaciones",            emoji: "⚙️" },
  { name: "Tecnología",             emoji: "💻" },
  { name: "Ventas",                 emoji: "📈" },
  { name: "Marketing",              emoji: "📣" },
  { name: "Logística",              emoji: "🚚" },
  { name: "Mantenimiento",          emoji: "🔧" },
  { name: "Seguridad",              emoji: "🛡️" },
  { name: "Atención al Cliente",    emoji: "🎧" },
  { name: "Legal",                  emoji: "⚖️" },
]

export default function SetupCompany() {
  const { isDarkMode: dark } = useTheme()
  const { logout } = useUser()

  const [step, setStep]           = useState<1 | 2>(1)
  const [name, setName]           = useState("")
  const [ruc, setRuc]             = useState("")
  const [email, setEmail]         = useState("")
  const [phone, setPhone]         = useState("")
  const [address, setAddress]     = useState("")
  const [selected, setSelected]   = useState<Set<string>>(
    new Set(["Recursos Humanos", "Contabilidad", "Administración"])
  )
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState("")

  const toggle = (dept: string) =>
    setSelected(prev => {
      const next = new Set(prev)
      next.has(dept) ? next.delete(dept) : next.add(dept)
      return next
    })

  const handleCreate = async () => {
    setError("")
    setSaving(true)
    try {
      const company = await apiPost("/api/companies/setup", {
        name: name.trim(),
        ruc:  ruc  || undefined,
        email: email || undefined,
        phone: phone || undefined,
        address: address || undefined,
        departments: Array.from(selected),
      })

      // Guardar empresa en localStorage para que el contexto la pique
      const created = company as { code: string }
      localStorage.setItem("selectedCompany", JSON.stringify(created))
      // Forzar recarga para que SWR de my-companies se reinicie y el contexto se actualice
      window.location.href = `/${created.code}/dashboard/all`
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear la empresa.")
      setSaving(false)
    }
  }

  const input = `w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-violet-500 ${
    dark
      ? "bg-slate-900 border-gray-700 text-white placeholder-gray-600"
      : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
  }`

  const label = `block text-xs font-semibold uppercase tracking-wider mb-1.5 ${dark ? "text-gray-400" : "text-gray-500"}`

  return (
    <div className={`min-h-screen flex ${dark ? "bg-slate-900" : "bg-[#f5f5f7]"}`}>

      {/* ── Panel izquierdo — branding ───────────────────────────────────── */}
      <div className="hidden lg:flex w-[400px] shrink-0 bg-[#1c1c2e] flex-col justify-between p-10 relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-600/40">
            <img src={Images.logo} alt="FlowPlanilla" className="w-5 h-5 select-none" />
          </div>
          <span className="text-white font-bold text-base tracking-tight">FlowPlanilla</span>
        </div>

        <div className="relative z-10 space-y-5">
          <p className="text-slate-400 text-xs uppercase tracking-widest font-semibold">Configuración inicial</p>
          <h2 className="text-3xl font-bold text-white leading-snug">
            Crea tu empresa<br />
            <span className="text-violet-400">en minutos</span>
          </h2>
          <div className="space-y-3">
            {[
              { n: 1, label: "Datos de la empresa",    active: step === 1 },
              { n: 2, label: "Departamentos iniciales", active: step === 2 },
            ].map(s => (
              <div key={s.n} className={`flex items-center gap-3 transition-opacity ${s.active ? "opacity-100" : "opacity-40"}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${s.active ? "bg-violet-600 text-white" : "bg-slate-700 text-gray-400"}`}>
                  {s.n}
                </div>
                <span className={`text-sm ${s.active ? "text-white font-semibold" : "text-slate-400"}`}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-slate-600 text-xs">© {new Date().getFullYear()} FlowPlanilla</p>
      </div>

      {/* ── Panel derecho ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg space-y-6">

          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building2 size={20} className="text-violet-500" />
              <h1 className={`text-2xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>
                {step === 1 ? "Tu empresa" : "Departamentos"}
              </h1>
            </div>
            <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
              {step === 1
                ? "Completa los datos de tu empresa. Solo el nombre es obligatorio."
                : "Selecciona los departamentos con los que quieres empezar. Puedes agregar más luego."
              }
            </p>
          </div>

          {/* ── PASO 1: Datos de empresa ─────────────────────────────────── */}
          {step === 1 && (
            <div className={`rounded-2xl border p-6 space-y-4 ${dark ? "bg-slate-800 border-gray-700" : "bg-white border-gray-200"}`}>
              <div>
                <label className={label}>Nombre de la empresa *</label>
                <input
                  className={input}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ej: Mi Empresa S.A."
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={label}>RUC</label>
                  <input className={input} value={ruc} onChange={e => setRuc(e.target.value)} placeholder="123456-2-123456" />
                </div>
                <div>
                  <label className={label}>Email</label>
                  <input className={input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="empresa@correo.com" />
                </div>
                <div>
                  <label className={label}>Teléfono</label>
                  <input className={input} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+507 000-0000" />
                </div>
                <div>
                  <label className={label}>Dirección</label>
                  <input className={input} value={address} onChange={e => setAddress(e.target.value)} placeholder="Ciudad, País" />
                </div>
              </div>
            </div>
          )}

          {/* ── PASO 2: Departamentos ────────────────────────────────────── */}
          {step === 2 && (
            <div className={`rounded-2xl border p-6 ${dark ? "bg-slate-800 border-gray-700" : "bg-white border-gray-200"}`}>
              <div className="flex items-center justify-between mb-4">
                <p className={`text-xs font-semibold uppercase tracking-wider ${dark ? "text-gray-400" : "text-gray-500"}`}>
                  {selected.size} seleccionados
                </p>
                <button
                  onClick={() => setSelected(new Set(COMMON_DEPARTMENTS.map(d => d.name)))}
                  className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  Seleccionar todos
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {COMMON_DEPARTMENTS.map(dept => {
                  const isOn = selected.has(dept.name)
                  return (
                    <button
                      key={dept.name}
                      onClick={() => toggle(dept.name)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all ${
                        isOn
                          ? dark
                            ? "bg-violet-600/20 border-violet-500 text-white"
                            : "bg-violet-50 border-violet-400 text-violet-900"
                          : dark
                            ? "bg-slate-900 border-gray-700 text-gray-400 hover:border-gray-500"
                            : "bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {isOn
                        ? <CheckSquare size={15} className="text-violet-500 shrink-0" />
                        : <Square size={15} className="shrink-0 opacity-40" />
                      }
                      <span className="text-xs font-medium leading-tight">{dept.emoji} {dept.name}</span>
                    </button>
                  )
                })}
              </div>
              {selected.size === 0 && (
                <p className="text-xs text-amber-400 mt-3 text-center">
                  Puedes continuar sin departamentos y crearlos luego en Settings.
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              ⚠ {error}
            </div>
          )}

          {/* Acciones */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => logout()}
              className={`flex items-center gap-1.5 text-sm transition-colors ${dark ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"}`}
            >
              <LogOut size={14} /> Cerrar sesión
            </button>

            <div className="flex items-center gap-3">
              {step === 2 && (
                <button
                  onClick={() => setStep(1)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${dark ? "border-gray-600 text-gray-300 hover:bg-slate-700" : "border-gray-300 text-gray-600 hover:bg-gray-100"}`}
                >
                  Atrás
                </button>
              )}
              {step === 1 ? (
                <button
                  disabled={!name.trim()}
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
                >
                  Siguiente <ChevronRight size={15} />
                </button>
              ) : (
                <button
                  disabled={saving}
                  onClick={handleCreate}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
                >
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Building2 size={15} />}
                  {saving ? "Creando..." : "Crear empresa"}
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
