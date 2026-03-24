"use client"
import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useTheme } from "../../../../context/themeContext"
import { useCompany } from "../../../../context/routerContext"
import {
  ArrowLeft, FolderOpen, Save, Loader2, CheckCircle2,
  AlertTriangle, CheckSquare, Square, Plus, X, Building2,
} from "lucide-react"

const VITE_API_URL = import.meta.env.VITE_API_URL

const COMMON_DEPARTMENTS = [
  { name: "Recursos Humanos",    emoji: "👥" },
  { name: "Contabilidad",        emoji: "📊" },
  { name: "Administración",      emoji: "🏢" },
  { name: "Operaciones",         emoji: "⚙️" },
  { name: "Tecnología",          emoji: "💻" },
  { name: "Ventas",              emoji: "📈" },
  { name: "Marketing",           emoji: "📣" },
  { name: "Logística",           emoji: "🚚" },
  { name: "Mantenimiento",       emoji: "🔧" },
  { name: "Seguridad",           emoji: "🛡️" },
  { name: "Atención al Cliente", emoji: "🎧" },
  { name: "Legal",               emoji: "⚖️" },
]

export function UpdateDepartment() {
  const navigate        = useNavigate()
  const [searchParams]  = useSearchParams()
  const { isDarkMode: dark } = useTheme()
  const { companies }   = useCompany()

  const id               = searchParams.get("id")
  const companyIdFromUrl = searchParams.get("companyId")
  const isEdit           = Boolean(id)

  // ── Edit mode state ──────────────────────────────────────────────────────
  const [editName, setEditName]   = useState("")
  const [editDesc, setEditDesc]   = useState("")
  const [editActive, setEditActive] = useState(true)

  // ── Create mode state ────────────────────────────────────────────────────
  const [companyId, setCompanyId] = useState(companyIdFromUrl || "")
  const [selected, setSelected]   = useState<Set<string>>(new Set())
  const [customName, setCustomName] = useState("")
  const [customDesc, setCustomDesc] = useState("")
  const [showCustom, setShowCustom] = useState(false)

  const [loading, setLoading]     = useState(false)
  const [success, setSuccess]     = useState(false)
  const [error, setError]         = useState("")

  // Cuando carguen las empresas tomar la primera si no hay selección
  useEffect(() => {
    if (!companyId && companies && companies.length > 0) {
      setCompanyId(companies[0].id)
    }
  }, [companies])

  // Cargar departamento en modo edición
  useEffect(() => {
    if (!id) return
    const token = localStorage.getItem("jwt") || ""
    setLoading(true)
    fetch(`${VITE_API_URL}/api/departments/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => { if (!r.ok) throw new Error("No se pudo cargar el departamento"); return r.json() })
      .then(data => {
        setEditName(data.name || "")
        setEditDesc(data.description || "")
        setEditActive(data.isActive ?? true)
        setCompanyId(data.companyId || companyIdFromUrl || "")
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  const toggle = (name: string) =>
    setSelected(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })

  // ── Guardar edición ──────────────────────────────────────────────────────
  const handleEdit = async () => {
    setError("")
    if (!editName.trim()) { setError("El nombre es obligatorio."); return }
    const token = localStorage.getItem("jwt") || ""
    setLoading(true)
    try {
      const res = await fetch(`${VITE_API_URL}/api/departments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: editName.trim(), description: editDesc.trim(), companyId, isActive: editActive }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || "Error al guardar")
      }
      setSuccess(true)
      setTimeout(() => navigate(-1), 1200)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar.")
    } finally {
      setLoading(false)
    }
  }

  // ── Guardar creación (múltiples) ─────────────────────────────────────────
  const handleCreate = async () => {
    setError("")
    const names = Array.from(selected)
    if (customName.trim()) names.push(customName.trim())
    if (names.length === 0) { setError("Selecciona al menos un departamento o escribe uno personalizado."); return }
    if (!companyId)         { setError("Debes seleccionar una empresa."); return }

    const token = localStorage.getItem("jwt") || ""
    setLoading(true)
    try {
      await Promise.all(
        names.map(name =>
          fetch(`${VITE_API_URL}/api/departments/create`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              name,
              description: name === customName.trim() ? customDesc.trim() : "",
              companyId,
              isActive: true,
            }),
          }).then(r => { if (!r.ok) throw new Error(`Error al crear "${name}"`) })
        )
      )
      setSuccess(true)
      setTimeout(() => navigate(-1), 1200)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al crear.")
    } finally {
      setLoading(false)
    }
  }

  // ── Estilos ──────────────────────────────────────────────────────────────
  const inputCls = `w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-violet-500 ${
    dark
      ? "bg-slate-900 border-gray-700 text-white placeholder-gray-600"
      : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
  }`
  const labelCls = `block text-xs font-semibold uppercase tracking-wider mb-1.5 ${dark ? "text-gray-400" : "text-gray-500"}`
  const sub      = dark ? "text-gray-400" : "text-gray-500"

  // Filtrar departamentos que ya existen (basado en los de la empresa actual)
  const existingNames = new Set(
    (companies?.find(c => c.id === companyId) as any)?.departments?.map((d: any) => d.name) ?? []
  )
  const availableCommon = COMMON_DEPARTMENTS.filter(d => !existingNames.has(d.name))

  return (
    <div className="w-full max-w-2xl mx-auto py-6 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className={`p-2 rounded-lg transition-colors ${dark ? "hover:bg-slate-700 text-gray-400" : "hover:bg-gray-200 text-gray-500"}`}
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <FolderOpen size={20} className="text-violet-500" />
          <div>
            <h1 className={`text-xl font-bold leading-tight ${dark ? "text-white" : "text-gray-900"}`}>
              {isEdit ? "Editar departamento" : "Agregar departamentos"}
            </h1>
            <p className={`text-xs ${sub}`}>
              {isEdit ? "Modifica los datos del departamento." : "Selecciona uno o más, o crea uno personalizado."}
            </p>
          </div>
        </div>
      </div>

      {loading && !editName && !isEdit ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-violet-500" />
        </div>
      ) : isEdit ? (
        /* ── MODO EDICIÓN ─────────────────────────────────────────────────── */
        <div className={`rounded-2xl border p-6 space-y-5 ${dark ? "bg-slate-800 border-gray-700" : "bg-white border-gray-200"}`}>
          <div>
            <label className={labelCls}>Nombre *</label>
            <input className={inputCls} value={editName} onChange={e => setEditName(e.target.value)} placeholder="Ej: Recursos Humanos" autoFocus />
          </div>
          <div>
            <label className={labelCls}>Descripción <span className={`normal-case font-normal ${sub}`}>(opcional)</span></label>
            <textarea className={inputCls + " resize-none"} rows={3} value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Descripción del departamento…" />
          </div>
          <div className={`flex items-center gap-3 pt-1 border-t ${dark ? "border-gray-700" : "border-gray-100"}`}>
            <input type="checkbox" id="deptActive" checked={editActive} onChange={e => setEditActive(e.target.checked)} className="w-4 h-4 accent-violet-600" />
            <label htmlFor="deptActive" className={`text-sm ${dark ? "text-gray-300" : "text-gray-700"}`}>Departamento activo</label>
          </div>
        </div>
      ) : (
        /* ── MODO CREACIÓN ────────────────────────────────────────────────── */
        <div className="space-y-4">

          {/* Banner empresa destino */}
          {(() => {
            const target = companies?.find(c => c.id === companyId)
            if (!companies || companies.length === 0) {
              return (
                <div className={`flex items-start gap-3 p-4 rounded-xl border ${dark ? "bg-amber-500/10 border-amber-500/30 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold">Primero crea una empresa</p>
                    <p className="text-xs mt-0.5 opacity-80">Debes tener al menos una empresa creada antes de poder agregar departamentos.</p>
                  </div>
                </div>
              )
            }
            if (companies.length > 1) {
              return (
                <div className={`rounded-2xl border p-5 ${dark ? "bg-slate-800 border-gray-700" : "bg-white border-gray-200"}`}>
                  <label className={labelCls}>¿A qué empresa se asignan? *</label>
                  <select className={inputCls} value={companyId} onChange={e => setCompanyId(e.target.value)}>
                    <option value="">Selecciona una empresa…</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                  </select>
                  {target && (
                    <p className={`text-xs mt-2 flex items-center gap-1.5 ${dark ? "text-gray-400" : "text-gray-500"}`}>
                      <Building2 size={11} /> Los departamentos se crearán en <span className="font-semibold">{target.name}</span>
                    </p>
                  )}
                </div>
              )
            }
            // Una sola empresa — mostrar banner informativo
            return (
              <div className={`flex items-center gap-3 p-4 rounded-xl border ${dark ? "bg-slate-800 border-gray-700" : "bg-white border-gray-200"}`}>
                <div className={`p-2 rounded-lg ${dark ? "bg-indigo-500/20" : "bg-indigo-50"}`}>
                  <Building2 size={14} className="text-indigo-500" />
                </div>
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-wider ${dark ? "text-gray-400" : "text-gray-500"}`}>Se crearán en</p>
                  <p className={`text-sm font-bold ${dark ? "text-white" : "text-gray-900"}`}>{target?.name}</p>
                </div>
                <span className={`ml-auto text-xs font-mono px-2 py-0.5 rounded-md ${dark ? "bg-slate-700 text-gray-400" : "bg-gray-100 text-gray-500"}`}>{target?.code}</span>
              </div>
            )
          })()}

          {/* Departamentos comunes */}
          <div className={`rounded-2xl border p-5 ${dark ? "bg-slate-800 border-gray-700" : "bg-white border-gray-200"}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className={`text-sm font-bold ${dark ? "text-white" : "text-gray-900"}`}>Departamentos comunes</p>
                <p className={`text-xs mt-0.5 ${sub}`}>{selected.size} seleccionados</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelected(new Set(availableCommon.map(d => d.name)))}
                  className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${dark ? "bg-slate-700 hover:bg-slate-600 text-gray-300" : "bg-gray-100 hover:bg-gray-200 text-gray-600"}`}
                >
                  Todos
                </button>
                {selected.size > 0 && (
                  <button
                    onClick={() => setSelected(new Set())}
                    className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${dark ? "bg-slate-700 hover:bg-slate-600 text-gray-400" : "bg-gray-100 hover:bg-gray-200 text-gray-500"}`}
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>

            {availableCommon.length === 0 ? (
              <p className={`text-xs text-center py-4 ${sub}`}>Todos los departamentos comunes ya están creados.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {availableCommon.map(dept => {
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
                        ? <CheckSquare size={14} className="text-violet-500 shrink-0" />
                        : <Square size={14} className="shrink-0 opacity-40" />
                      }
                      <span className="text-xs font-medium leading-tight truncate">{dept.emoji} {dept.name}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Departamento personalizado */}
          <div className={`rounded-2xl border ${dark ? "bg-slate-800 border-gray-700" : "bg-white border-gray-200"}`}>
            <button
              onClick={() => setShowCustom(s => !s)}
              className={`w-full flex items-center justify-between px-5 py-4 text-sm font-semibold transition-colors ${dark ? "text-gray-300 hover:text-white" : "text-gray-700 hover:text-gray-900"}`}
            >
              <span className="flex items-center gap-2">
                <Plus size={15} className="text-violet-500" /> Agregar uno personalizado
              </span>
              {showCustom && <X size={14} className={sub} />}
            </button>

            {showCustom && (
              <div className="px-5 pb-5 space-y-4 border-t border-gray-700/30">
                <div className="pt-4">
                  <label className={labelCls}>Nombre *</label>
                  <input
                    className={inputCls}
                    value={customName}
                    onChange={e => setCustomName(e.target.value)}
                    placeholder="Nombre del departamento"
                    autoFocus
                  />
                </div>
                <div>
                  <label className={labelCls}>Descripción <span className={`normal-case font-normal ${sub}`}>(opcional)</span></label>
                  <input
                    className={inputCls}
                    value={customDesc}
                    onChange={e => setCustomDesc(e.target.value)}
                    placeholder="Descripción del departamento"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
          <CheckCircle2 size={14} /> {isEdit ? "Departamento actualizado." : "Departamentos creados."} Redirigiendo…
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${dark ? "border-gray-600 text-gray-300 hover:bg-slate-700" : "border-gray-300 text-gray-600 hover:bg-gray-100"}`}
        >
          Cancelar
        </button>
        <button
          onClick={isEdit ? handleEdit : handleCreate}
          disabled={loading || success || (!isEdit && !companyId)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
        >
          {loading
            ? <><Loader2 size={15} className="animate-spin" /> Guardando…</>
            : <><Save size={15} /> {isEdit ? "Guardar cambios" : `Crear${selected.size + (customName.trim() ? 1 : 0) > 1 ? ` (${selected.size + (customName.trim() ? 1 : 0)})` : ""}`}</>
          }
        </button>
      </div>

    </div>
  )
}
