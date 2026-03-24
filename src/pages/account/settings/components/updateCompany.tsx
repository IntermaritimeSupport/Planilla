"use client"
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useTheme } from "../../../../context/themeContext"
import { useCompany } from "../../../../context/routerContext"
import { ArrowLeft, Building2, Save, Loader2, CheckCircle2, AlertTriangle } from "lucide-react"

const VITE_API_URL = import.meta.env.VITE_API_URL

export default function UpdateCompany() {
  const navigate              = useNavigate()
  const { id }                = useParams()
  const { isDarkMode: dark }  = useTheme()
  const { selectedCompany }   = useCompany()
  const isEdit                = Boolean(id)

  const [name, setName]       = useState("")
  const [code, setCode]       = useState("")
  const [ruc, setRuc]         = useState("")
  const [email, setEmail]     = useState("")
  const [phone, setPhone]     = useState("")
  const [address, setAddress] = useState("")
  const [isActive, setActive] = useState(true)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError]     = useState("")

  useEffect(() => {
    if (!id) return
    const token = localStorage.getItem("jwt") || ""
    setLoading(true)
    fetch(`${VITE_API_URL}/api/companies/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => { if (!r.ok) throw new Error("Error al cargar la empresa"); return r.json() })
      .then(data => {
        setName(data.name || "")
        setCode(data.code || "")
        setRuc(data.ruc || "")
        setEmail(data.email || "")
        setPhone(data.phone || "")
        setAddress(data.address || "")
        setActive(data.isActive ?? true)
      })
      .catch(e => { setError(e.message); setTimeout(() => navigate(-1), 2000) })
      .finally(() => setLoading(false))
  }, [id])

  const handleSave = async () => {
    setError("")
    if (!name.trim()) { setError("El nombre es obligatorio."); return }
    const token = localStorage.getItem("jwt") || ""
    setLoading(true)
    try {
      // Crear: usar /setup para que se vincule al usuario autenticado automáticamente
      const url    = isEdit ? `${VITE_API_URL}/api/companies/${id}` : `${VITE_API_URL}/api/companies/setup`
      const method = isEdit ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim(), ruc, email, phone, address, isActive, departments: [] }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || "Error al guardar la empresa")
      }
      const data = await res.json()
      setSuccess(true)
      // Tras crear, guardar en localStorage y recargar para que el contexto se actualice
      if (!isEdit) {
        localStorage.setItem("selectedCompany", JSON.stringify(data))
        setTimeout(() => { window.location.href = `/${data.code}/settings/all` }, 1000)
      } else {
        setTimeout(() => navigate(`/${selectedCompany?.code || ""}/settings/all`), 1200)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar.")
    } finally {
      setLoading(false)
    }
  }

  const inputCls = `w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-violet-500 ${
    dark
      ? "bg-slate-900 border-gray-700 text-white placeholder-gray-600"
      : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
  }`
  const labelCls = `block text-xs font-semibold uppercase tracking-wider mb-1.5 ${dark ? "text-gray-400" : "text-gray-500"}`

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
          <Building2 size={20} className="text-violet-500" />
          <div>
            <h1 className={`text-xl font-bold leading-tight ${dark ? "text-white" : "text-gray-900"}`}>
              {isEdit ? "Editar empresa" : "Nueva empresa"}
            </h1>
            <p className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>
              {isEdit ? "Modifica los datos de la empresa." : "Completa los datos de tu empresa."}
            </p>
          </div>
        </div>
      </div>

      {loading && !name ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-violet-500" />
        </div>
      ) : (
        <div className={`rounded-2xl border p-6 space-y-5 ${dark ? "bg-slate-800 border-gray-700" : "bg-white border-gray-200"}`}>

          {/* Nombre */}
          <div>
            <label className={labelCls}>Nombre *</label>
            <input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="Mi Empresa S.A." autoFocus={!isEdit} />
          </div>

          {/* Código (solo lectura en edición) */}
          {isEdit && (
            <div>
              <label className={labelCls}>Código</label>
              <div className={`flex items-center px-4 py-2.5 rounded-xl border text-sm font-mono ${dark ? "bg-slate-900 border-gray-700 text-gray-400" : "bg-gray-50 border-gray-200 text-gray-500"}`}>
                {code}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>RUC</label>
              <input className={inputCls} value={ruc} onChange={e => setRuc(e.target.value)} placeholder="123456-2-123456" />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input className={inputCls} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="empresa@correo.com" />
            </div>
            <div>
              <label className={labelCls}>Teléfono</label>
              <input className={inputCls} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+507 000-0000" />
            </div>
            <div>
              <label className={labelCls}>Dirección</label>
              <input className={inputCls} value={address} onChange={e => setAddress(e.target.value)} placeholder="Ciudad, País" />
            </div>
          </div>

          {isEdit && (
            <div className={`flex items-center gap-3 pt-1 border-t ${dark ? "border-gray-700" : "border-gray-100"}`}>
              <input
                type="checkbox"
                id="compActive"
                checked={isActive}
                onChange={e => setActive(e.target.checked)}
                className="w-4 h-4 accent-violet-600"
              />
              <label htmlFor="compActive" className={`text-sm ${dark ? "text-gray-300" : "text-gray-700"}`}>
                Empresa activa
              </label>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
          <CheckCircle2 size={14} /> {isEdit ? "Empresa actualizada." : "Empresa creada."} Redirigiendo…
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
          onClick={handleSave}
          disabled={loading || success}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
        >
          {loading
            ? <><Loader2 size={15} className="animate-spin" /> Guardando…</>
            : <><Save size={15} /> {isEdit ? "Guardar cambios" : "Crear empresa"}</>
          }
        </button>
      </div>

    </div>
  )
}
