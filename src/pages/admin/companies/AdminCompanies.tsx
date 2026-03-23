"use client"

import { useState } from "react"
import useSWR from "swr"
import {
  Building2, Users, Search, Loader2, AlertTriangle,
  RefreshCw, CheckCircle2, XCircle, Plus, X, ChevronRight,
  UserPlus, Power,
} from "lucide-react"
import { useTheme } from "../../../context/themeContext"
import { authFetcher, apiPost, apiPatch } from "../../../services/api"
import PagesHeader from "../../../components/headers/pagesHeader"

const API = import.meta.env.VITE_API_URL as string

interface Company {
  id: string
  code: string
  name: string
  ruc: string
  email: string
  phone: string
  isActive: boolean
  createdAt: string
  _count?: { employees: number; users: number }
}

const EMPTY_FORM = {
  name: "", ruc: "", email: "", phone: "", address: "",
  superAdminEmail: "", superAdminUsername: "", superAdminPassword: "",
  superAdminFirstName: "", superAdminLastName: "",
}

const EMPTY_SA_FORM = {
  email: "", username: "", password: "", firstName: "", lastName: "",
}

export const AdminCompanies = () => {
  const { isDarkMode: dark } = useTheme()
  const [search, setSearch]         = useState("")
  const [selected, setSelected]     = useState<Company | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showSA, setShowSA]         = useState(false)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [saForm, setSaForm]         = useState(EMPTY_SA_FORM)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState("")

  const { data, isLoading, error: fetchError, mutate } = useSWR<Company[]>(
    `${API}/api/admin/companies`,
    authFetcher
  )

  const companies = data ?? []
  const filtered = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      (c.ruc ?? "").toLowerCase().includes(search.toLowerCase())
  )

  // ── Estilos ────────────────────────────────────────────────────────────────
  const card   = `rounded-xl border transition-colors ${dark ? "bg-slate-800 border-gray-700" : "bg-white border-gray-200"}`
  const text   = dark ? "text-gray-200" : "text-gray-800"
  const sub    = dark ? "text-gray-400" : "text-gray-500"
  const input  = `w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors ${dark ? "bg-slate-700 border-gray-600 text-gray-100 placeholder-gray-500 focus:border-indigo-500" : "bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-indigo-500"}`
  const label  = `block text-xs font-bold uppercase tracking-wider mb-1 ${sub}`
  const overlay = "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
  const modal  = `relative w-full max-w-lg rounded-2xl shadow-2xl p-6 ${dark ? "bg-slate-900 border border-gray-700" : "bg-white border border-gray-200"}`

  // ── Crear empresa ──────────────────────────────────────────────────────────
  const handleCreate = async () => {
    setError("")
    if (!form.name.trim()) { setError("El nombre es obligatorio."); return }
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        name: form.name, ruc: form.ruc, email: form.email,
        phone: form.phone, address: form.address,
      }
      if (form.superAdminEmail && form.superAdminUsername && form.superAdminPassword) {
        body.superAdmin = {
          email:     form.superAdminEmail,
          username:  form.superAdminUsername,
          password:  form.superAdminPassword,
          firstName: form.superAdminFirstName,
          lastName:  form.superAdminLastName,
        }
      }
      await apiPost(`/api/admin/companies`, body)
      await mutate()
      setShowCreate(false)
      setForm(EMPTY_FORM)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al crear empresa.")
    } finally {
      setSaving(false)
    }
  }

  // ── Asignar SUPER_ADMIN a empresa existente ────────────────────────────────
  const handleAssignSA = async () => {
    setError("")
    if (!saForm.email || !saForm.username || !saForm.password) {
      setError("Email, usuario y contraseña son obligatorios.")
      return
    }
    setSaving(true)
    try {
      await apiPost(`/api/admin/companies/${selected!.id}/super-admin`, saForm)
      await mutate()
      setShowSA(false)
      setSaForm(EMPTY_SA_FORM)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al asignar super admin.")
    } finally {
      setSaving(false)
    }
  }

  // ── Toggle activo/inactivo ─────────────────────────────────────────────────
  const handleToggle = async (company: Company) => {
    try {
      await apiPatch(`/api/admin/companies/${company.id}/toggle`)
      await mutate()
      if (selected?.id === company.id) {
        setSelected((prev) => prev ? { ...prev, isActive: !prev.isActive } : null)
      }
    } catch { /* ignora */ }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PagesHeader title="Empresas" subtitle="Crea y administra las empresas de la plataforma" />

      {/* Barra de herramientas */}
      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-2 flex-1 rounded-xl border px-4 py-2 ${dark ? "bg-slate-800 border-gray-700" : "bg-white border-gray-200"}`}>
          <Search size={15} className={sub} />
          <input
            type="text"
            placeholder="Buscar por nombre, código o RUC…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`flex-1 bg-transparent text-sm outline-none ${text}`}
          />
        </div>
        <button onClick={() => mutate()} className={`p-2.5 rounded-xl border ${dark ? "bg-slate-800 border-gray-700 text-gray-400 hover:text-white" : "bg-white border-gray-200 text-gray-500 hover:text-gray-800"}`}>
          <RefreshCw size={15} />
        </button>
        <button
          onClick={() => { setShowCreate(true); setError("") }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors"
        >
          <Plus size={15} /> Nueva empresa
        </button>
      </div>

      {isLoading && <div className="flex items-center gap-2 text-sm text-gray-400"><Loader2 size={16} className="animate-spin" /> Cargando…</div>}
      {fetchError && (
        <div className={`flex items-center gap-2 rounded-xl border p-4 text-sm ${dark ? "bg-red-900/20 border-red-700 text-red-400" : "bg-red-50 border-red-200 text-red-600"}`}>
          <AlertTriangle size={16} /> Error al cargar empresas.
        </div>
      )}

      {/* Grid de empresas */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((company) => (
          <div key={company.id} className={`${card} p-5`}>
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-lg ${dark ? "bg-indigo-500/20" : "bg-indigo-50"}`}>
                <Building2 size={18} className="text-indigo-500" />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggle(company)}
                  title={company.isActive ? "Desactivar" : "Activar"}
                  className={`p-1 rounded-lg transition-colors ${dark ? "hover:bg-slate-700" : "hover:bg-gray-100"}`}
                >
                  <Power size={14} className={company.isActive ? "text-emerald-400" : "text-gray-400"} />
                </button>
                {company.isActive
                  ? <CheckCircle2 size={16} className="text-emerald-400" />
                  : <XCircle size={16} className="text-red-400" />}
              </div>
            </div>

            <div className={`font-bold text-sm truncate ${text}`}>{company.name}</div>
            <div className={`text-xs mt-0.5 font-mono ${sub}`}>{company.code} · RUC {company.ruc || "—"}</div>

            <div className="flex items-center gap-4 mt-3">
              <span className={`text-xs flex items-center gap-1 ${sub}`}>
                <Users size={12} /> {company._count?.employees ?? "?"} empleados
              </span>
              <span className={`text-xs ${sub}`}>{company._count?.users ?? "?"} usuarios</span>
            </div>

            {/* Acciones */}
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-700/30">
              <button
                onClick={() => { setSelected(company); setShowSA(true); setError("") }}
                className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${dark ? "bg-slate-700 hover:bg-slate-600 text-gray-300" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}
              >
                <UserPlus size={11} /> Asignar admin
              </button>
              <button
                onClick={() => setSelected(company)}
                className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${dark ? "bg-slate-700 hover:bg-slate-600 text-gray-300" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}
              >
                <ChevronRight size={11} /> Detalle
              </button>
            </div>
          </div>
        ))}

        {!isLoading && filtered.length === 0 && (
          <div className={`col-span-3 rounded-xl border p-10 text-center ${dark ? "border-gray-700 text-gray-500" : "border-gray-200 text-gray-400"}`}>
            <Building2 size={32} className="mx-auto mb-2 opacity-20" />
            No hay empresas. Crea la primera con "Nueva empresa".
          </div>
        )}
      </div>

      {/* ── Modal: Crear empresa ─────────────────────────────────────────────── */}
      {showCreate && (
        <div className={overlay} onClick={() => setShowCreate(false)}>
          <div className={modal} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className={`font-bold text-base ${text}`}>Nueva empresa</h2>
              <button onClick={() => setShowCreate(false)} className={`p-1.5 rounded-lg ${dark ? "hover:bg-slate-700 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}><X size={18} /></button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* Datos empresa */}
              <div className={`rounded-xl border p-4 space-y-3 ${dark ? "border-gray-700 bg-slate-800/50" : "border-gray-100 bg-gray-50"}`}>
                <p className={`text-xs font-bold uppercase tracking-wider ${sub}`}>Datos de la empresa</p>
                <div>
                  <label className={label}>Nombre *</label>
                  <input className={input} placeholder="Nombre de la empresa" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={label}>RUC</label>
                    <input className={input} placeholder="8-888-8888" value={form.ruc} onChange={(e) => setForm({ ...form, ruc: e.target.value })} />
                  </div>
                  <div>
                    <label className={label}>Teléfono</label>
                    <input className={input} placeholder="507-xxx-xxxx" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className={label}>Email</label>
                  <input className={input} type="email" placeholder="empresa@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <label className={label}>Dirección</label>
                  <input className={input} placeholder="Ciudad de Panamá" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
              </div>

              {/* SUPER_ADMIN opcional */}
              <div className={`rounded-xl border p-4 space-y-3 ${dark ? "border-indigo-500/30 bg-indigo-500/5" : "border-indigo-100 bg-indigo-50/50"}`}>
                <p className={`text-xs font-bold uppercase tracking-wider text-indigo-400`}>Super Admin (opcional)</p>
                <p className={`text-xs ${sub}`}>Si lo dejas vacío, podrás asignarlo después desde la tarjeta de la empresa.</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={label}>Nombre</label>
                    <input className={input} placeholder="Carlos" value={form.superAdminFirstName} onChange={(e) => setForm({ ...form, superAdminFirstName: e.target.value })} />
                  </div>
                  <div>
                    <label className={label}>Apellido</label>
                    <input className={input} placeholder="Sánchez" value={form.superAdminLastName} onChange={(e) => setForm({ ...form, superAdminLastName: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className={label}>Usuario</label>
                  <input className={input} placeholder="superadmin_empresa" value={form.superAdminUsername} onChange={(e) => setForm({ ...form, superAdminUsername: e.target.value })} />
                </div>
                <div>
                  <label className={label}>Email</label>
                  <input className={input} type="email" placeholder="admin@empresa.com" value={form.superAdminEmail} onChange={(e) => setForm({ ...form, superAdminEmail: e.target.value })} />
                </div>
                <div>
                  <label className={label}>Contraseña</label>
                  <input className={input} type="password" placeholder="Mínimo 8 caracteres" value={form.superAdminPassword} onChange={(e) => setForm({ ...form, superAdminPassword: e.target.value })} />
                </div>
              </div>
            </div>

            {error && (
              <p className="mt-3 text-xs text-red-400 flex items-center gap-1"><AlertTriangle size={13} /> {error}</p>
            )}

            <div className="flex items-center justify-end gap-3 mt-5">
              <button onClick={() => setShowCreate(false)} className={`px-4 py-2 rounded-xl text-sm font-medium ${dark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-800"}`}>Cancelar</button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-bold transition-colors"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Crear empresa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Asignar SUPER_ADMIN ───────────────────────────────────────── */}
      {showSA && selected && (
        <div className={overlay} onClick={() => setShowSA(false)}>
          <div className={modal} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className={`font-bold text-base ${text}`}>Asignar Super Admin</h2>
                <p className={`text-xs mt-0.5 ${sub}`}>{selected.name}</p>
              </div>
              <button onClick={() => setShowSA(false)} className={`p-1.5 rounded-lg ${dark ? "hover:bg-slate-700 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}><X size={18} /></button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label}>Nombre</label>
                  <input className={input} placeholder="Carlos" value={saForm.firstName} onChange={(e) => setSaForm({ ...saForm, firstName: e.target.value })} />
                </div>
                <div>
                  <label className={label}>Apellido</label>
                  <input className={input} placeholder="Sánchez" value={saForm.lastName} onChange={(e) => setSaForm({ ...saForm, lastName: e.target.value })} />
                </div>
              </div>
              <div>
                <label className={label}>Usuario *</label>
                <input className={input} placeholder="superadmin_empresa" value={saForm.username} onChange={(e) => setSaForm({ ...saForm, username: e.target.value })} />
              </div>
              <div>
                <label className={label}>Email *</label>
                <input className={input} type="email" placeholder="admin@empresa.com" value={saForm.email} onChange={(e) => setSaForm({ ...saForm, email: e.target.value })} />
              </div>
              <div>
                <label className={label}>Contraseña *</label>
                <input className={input} type="password" placeholder="Mínimo 8 caracteres" value={saForm.password} onChange={(e) => setSaForm({ ...saForm, password: e.target.value })} />
              </div>
            </div>

            {error && (
              <p className="mt-3 text-xs text-red-400 flex items-center gap-1"><AlertTriangle size={13} /> {error}</p>
            )}

            <div className="flex items-center justify-end gap-3 mt-5">
              <button onClick={() => setShowSA(false)} className={`px-4 py-2 rounded-xl text-sm font-medium ${dark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-800"}`}>Cancelar</button>
              <button
                onClick={handleAssignSA}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-bold transition-colors"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                Asignar admin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Panel lateral detalle ─────────────────────────────────────────────── */}
      {selected && !showSA && (
        <div className={`fixed inset-y-0 right-0 w-80 shadow-2xl z-30 flex flex-col ${dark ? "bg-slate-900 border-l border-gray-700" : "bg-white border-l border-gray-200"}`}>
          <div className={`flex items-center justify-between px-5 py-4 border-b ${dark ? "border-gray-700" : "border-gray-200"}`}>
            <span className={`font-bold text-sm ${text}`}>Detalle</span>
            <button onClick={() => setSelected(null)} className={`p-1.5 rounded-lg ${dark ? "hover:bg-slate-700 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}><X size={16} /></button>
          </div>
          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            <Row label="Empresa"    value={selected.name}       dark={dark} />
            <Row label="Código"     value={selected.code}       dark={dark} />
            <Row label="RUC"        value={selected.ruc || "—"} dark={dark} />
            <Row label="Email"      value={selected.email || "—"} dark={dark} />
            <Row label="Teléfono"   value={selected.phone || "—"} dark={dark} />
            <Row label="Empleados"  value={String(selected._count?.employees ?? "?")} dark={dark} />
            <Row label="Usuarios"   value={String(selected._count?.users ?? "?")} dark={dark} />
            <Row label="Estado"     value={selected.isActive ? "Activa" : "Inactiva"} dark={dark} />
            <Row label="Creada"     value={new Date(selected.createdAt).toLocaleDateString("es-PA")} dark={dark} />
            <button
              onClick={() => { setShowSA(true); setError("") }}
              className="w-full flex items-center justify-center gap-2 mt-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors"
            >
              <UserPlus size={14} /> Asignar Super Admin
            </button>
            <button
              onClick={() => handleToggle(selected)}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${selected.isActive ? "bg-red-500/20 hover:bg-red-500/30 text-red-400" : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400"}`}
            >
              <Power size={14} /> {selected.isActive ? "Desactivar empresa" : "Activar empresa"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const Row = ({ label, value, dark }: { label: string; value: string; dark: boolean }) => (
  <div>
    <div className={`text-xs uppercase font-bold tracking-wider mb-0.5 ${dark ? "text-gray-500" : "text-gray-400"}`}>{label}</div>
    <div className={`text-sm ${dark ? "text-gray-200" : "text-gray-800"}`}>{value}</div>
  </div>
)
