"use client"

import React, { useState } from "react"
import { Edit2, Trash2, Plus, Users, Building2, FolderOpen, Settings, Search, ChevronDown, ChevronUp } from "lucide-react"
import { useCompany } from "../../../../context/routerContext"
import { useTheme } from "../../../../context/themeContext"
import Loader from "../../../../components/loaders/loader"
import { useNavigate } from "react-router-dom"
import useSWR from "swr"
import { authFetcher } from "../../../../services/api"

const VITE_API_URL = import.meta.env?.VITE_API_URL || "http://localhost:3000"

type SettingsTab = "general" | "users" | "companies" | "departments"

interface Department {
  id: string
  name: string
  description?: string
  isActive: boolean
  companyId: string
  company?: { name: string }
}

interface CompanyFull {
  id: string
  name: string
  code: string
  address?: string
  phone?: string
  email?: string
  ruc?: string
  logoUrl?: string
  isActive: boolean
  departments?: Department[]
  _count?: { users: number; equipments: number; maintenances: number; departments: number }
}

interface UserFull {
  id: string
  username: string
  email: string
  role: string
  isActive: boolean
  companyId: string | null
  person?: {
    firstName: string
    lastName: string
    position: string
    department?: { name: string } | null
  }
}

const getInitials = (name: string) =>
  name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?"

const AVATAR_COLORS = ["bg-blue-600", "bg-green-600", "bg-purple-600", "bg-orange-600", "bg-pink-600", "bg-indigo-600", "bg-teal-600"]
const avatarColor = (name: string) => AVATAR_COLORS[name?.length % AVATAR_COLORS.length] || "bg-gray-600"

export default function AllSettingsPage() {
  const { isDarkMode } = useTheme()
  const { selectedCompany } = useCompany()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<SettingsTab>("general")
  const [search, setSearch] = useState("")
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ type: "company" | "dept" | "user"; id: string; companyId?: string } | null>(null)

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: companies, isLoading: loadingCompanies, mutate: mutateCompanies } =
    useSWR<CompanyFull[]>(`${VITE_API_URL}/api/companies/all`, authFetcher)

  const { data: users, isLoading: loadingUsers, mutate: mutateUsers } =
    useSWR<UserFull[]>(
      selectedCompany ? `${VITE_API_URL}/api/users/full/${selectedCompany.id}` : null,
      authFetcher
    )

  const allDepts = companies?.flatMap(c =>
    (c.departments || []).map(d => ({ ...d, company: { name: c.name } }))
  ) || []

  // ── Filtered data ─────────────────────────────────────────────────────────
  const q = search.toLowerCase()
  const filteredCompanies = (companies || []).filter(c =>
    c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)
  )
  const filteredUsers = (users || []).filter(u =>
    u.username?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) ||
    u.person?.firstName?.toLowerCase().includes(q) || u.person?.lastName?.toLowerCase().includes(q)
  )
  const filteredDepts = allDepts.filter(d =>
    d.name.toLowerCase().includes(q) || d.company?.name.toLowerCase().includes(q)
  )

  // ── Actions ───────────────────────────────────────────────────────────────
  const deleteCompany = async (id: string) => {
    const token = localStorage.getItem("jwt")
    const res = await fetch(`${VITE_API_URL}/api/companies/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` },
    })
    if (res.ok) { mutateCompanies(); setShowDeleteConfirm(null) }
  }

  const deleteDept = async (deptId: string) => {
    const token = localStorage.getItem("jwt")
    const res = await fetch(`${VITE_API_URL}/api/departments/${deptId}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` },
    })
    if (res.ok) { mutateCompanies(); setShowDeleteConfirm(null) }
  }

  const deleteUser = async (id: string) => {
    const token = localStorage.getItem("jwt")
    const res = await fetch(`${VITE_API_URL}/api/users/delete/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` },
    })
    if (res.ok) { mutateUsers(); setShowDeleteConfirm(null) }
  }

  const handleConfirmDelete = () => {
    if (!showDeleteConfirm) return
    if (showDeleteConfirm.type === "company") deleteCompany(showDeleteConfirm.id)
    else if (showDeleteConfirm.type === "dept") deleteDept(showDeleteConfirm.id)
    else if (showDeleteConfirm.type === "user") deleteUser(showDeleteConfirm.id)
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  const bg = isDarkMode ? "bg-slate-900 text-white" : "bg-gray-50 text-gray-900"
  const card = isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"
  const rowHover = isDarkMode ? "hover:bg-slate-700/30" : "hover:bg-gray-50"
  const divider = isDarkMode ? "divide-slate-700" : "divide-gray-100"
  const txt2 = isDarkMode ? "text-gray-400" : "text-gray-500"

  const tabs: { key: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { key: "general",     label: "General",     icon: <Settings size={14} /> },
    { key: "users",       label: "Users",       icon: <Users size={14} /> },
    { key: "companies",   label: "Companies",   icon: <Building2 size={14} /> },
    { key: "departments", label: "Departments", icon: <FolderOpen size={14} /> },
  ]

  return (
    <div className={`transition-colors ${bg}`}>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <p className={`text-[10px] uppercase tracking-widest font-semibold ${txt2}`}>System &rsaquo; Configuration</p>
      </div>

      {/* ── TABS ───────────────────────────────────────────────────────────── */}
      <div className={`flex gap-1 border-b mb-6 ${isDarkMode ? "border-slate-700" : "border-gray-200"}`}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => { setActiveTab(t.key); setSearch("") }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === t.key
                ? "border-blue-500 text-blue-500"
                : `border-transparent ${isDarkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-700"}`
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── PANEL HEADER ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            {activeTab === "general"     && "Settings"}
            {activeTab === "users"       && "Users"}
            {activeTab === "companies"   && "Companies"}
            {activeTab === "departments" && "Departments"}
          </h2>
          <p className={`text-xs ${txt2}`}>
            {activeTab === "general"     && "Language & Theme"}
            {activeTab === "users"       && `settings in ${selectedCompany?.name || "..."}`}
            {activeTab === "companies"   && `${filteredCompanies.length} registered`}
            {activeTab === "departments" && `${filteredDepts.length} total`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab !== "general" && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm ${isDarkMode ? "bg-slate-800 border-slate-700 text-gray-300" : "bg-white border-gray-300 text-gray-700"}`}>
              <Search size={13} className={txt2} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="bg-transparent outline-none w-36 text-sm"
              />
            </div>
          )}
          {activeTab === "companies" && (
            <button
              onClick={() => navigate("create")}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
            >
              <Plus size={14} /> New company
            </button>
          )}
          {activeTab === "users" && (
            <button
              onClick={() => navigate(`/${selectedCompany?.code}/users/create`)}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
            >
              <Plus size={14} /> Create
            </button>
          )}
          {activeTab === "departments" && (
            <button
              onClick={() => navigate("departments/create")}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
            >
              <Plus size={14} /> New department
            </button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: GENERAL
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "general" && (
        <div className={`rounded-xl border p-6 max-w-md ${card}`}>
          <h3 className={`text-xs font-bold uppercase tracking-widest mb-4 ${txt2}`}>Appearance</h3>
          <div className="space-y-5">
            <div>
              <p className={`text-sm font-medium mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>Theme</p>
              <div className={`flex rounded-lg border overflow-hidden ${isDarkMode ? "border-slate-600" : "border-gray-300"}`}>
                {[
                  { label: "🌙 Dark", val: "dark" },
                  { label: "☀️ Light", val: "light" },
                  { label: "🖥 System", val: "system" },
                ].map(opt => (
                  <button key={opt.val} className={`flex-1 py-2 text-sm transition-colors ${
                    (isDarkMode && opt.val === "dark") || (!isDarkMode && opt.val === "light")
                      ? "bg-blue-600 text-white font-medium"
                      : isDarkMode ? "text-gray-400 hover:bg-slate-700" : "text-gray-500 hover:bg-gray-100"
                  }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className={`text-sm font-medium mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>Language</p>
              <div className={`flex rounded-lg border overflow-hidden ${isDarkMode ? "border-slate-600" : "border-gray-300"}`}>
                {["🌐 English", "🌐 Spanish"].map(lang => (
                  <button key={lang} className={`flex-1 py-2 text-sm transition-colors ${
                    lang.includes("English") ? "bg-blue-600 text-white font-medium" : isDarkMode ? "text-gray-400 hover:bg-slate-700" : "text-gray-500 hover:bg-gray-100"
                  }`}>{lang}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: USERS
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "users" && (
        <>
          {/* stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {[
              { label: "Total Users",  val: users?.length ?? 0, sub: "Total" },
              { label: "Active",       val: users?.filter(u => u.isActive).length ?? 0, sub: "Total" },
              { label: "With Device",  val: 0, sub: "Assigned" },
              { label: "Department",   val: [...new Set(users?.map(u => u.person?.department?.name).filter(Boolean))].length ?? 0, sub: "Total" },
            ].map(s => (
              <div key={s.label} className={`rounded-xl border p-4 ${card}`}>
                <p className={`text-xs ${txt2}`}>{s.label}</p>
                <p className={`text-3xl font-bold mt-1 ${isDarkMode ? "text-white" : "text-gray-900"}`}>{s.val}</p>
                <p className={`text-xs ${txt2}`}>{s.sub}</p>
              </div>
            ))}
          </div>

          {/* filter pill */}
          <div className="mb-3">
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${isDarkMode ? "bg-slate-700 text-gray-300" : "bg-gray-200 text-gray-700"}`}>All</span>
          </div>

          {loadingUsers ? <Loader /> : (
            <div className={`rounded-xl border overflow-hidden ${card}`}>
              <table className="w-full text-sm">
                <thead className={`text-[11px] uppercase font-bold border-b ${isDarkMode ? "bg-slate-900/50 text-gray-500 border-slate-700" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                  <tr>
                    <th className="px-5 py-3 text-left">Users</th>
                    <th className="px-5 py-3 text-left">Email</th>
                    <th className="px-5 py-3 text-left">Department</th>
                    <th className="px-5 py-3 text-left">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${divider}`}>
                  {filteredUsers.map(u => {
                    const name = u.person ? `${u.person.firstName} ${u.person.lastName}` : u.username
                    return (
                      <tr key={u.id} className={`transition-colors ${rowHover}`}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full ${avatarColor(name)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                              {getInitials(name)}
                            </div>
                            <div>
                              <p className={`font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}>{name}</p>
                              <p className={`text-[10px] font-mono ${txt2}`}>{u.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className={`px-5 py-3 ${txt2}`}>{u.email}</td>
                        <td className="px-5 py-3">
                          <p className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>{u.person?.department?.name || "—"}</p>
                          <p className={`text-[10px] ${txt2}`}>{u.person?.position || ""}</p>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${u.isActive ? "bg-green-500 text-white" : "bg-red-500/80 text-white"}`}>
                            {u.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => navigate(`/${selectedCompany?.code}/users/edit/${u.id}`)}
                              className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? "text-gray-400 hover:text-white hover:bg-slate-700" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"}`}
                            ><Edit2 size={14} /></button>
                            <button
                              onClick={() => setShowDeleteConfirm({ type: "user", id: u.id })}
                              className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? "text-gray-400 hover:text-red-400 hover:bg-red-900/30" : "text-gray-500 hover:text-red-600 hover:bg-red-100"}`}
                            ><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: COMPANIES
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "companies" && (
        loadingCompanies ? <Loader /> : (
          <div className="space-y-3">
            {filteredCompanies.map(c => {
              const isExpanded = expandedCompany === c.id
              const depts = c.departments || []
              return (
                <div key={c.id} className={`rounded-xl border overflow-hidden transition-colors ${card} ${selectedCompany?.id === c.id ? (isDarkMode ? "border-blue-500/60" : "border-blue-400") : ""}`}>
                  {/* company row */}
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${avatarColor(c.name)} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                        {getInitials(c.name)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className={`font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>{c.name}</p>
                          {selectedCompany?.id === c.id && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-600 text-white font-bold">selected</span>
                          )}
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${c.isActive ? "bg-green-500 text-white" : "bg-gray-500 text-white"}`}>
                            {c.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <p className={`text-xs ${txt2}`}># {c.code}</p>
                        <div className="flex gap-2 mt-1">
                          {[
                            { label: `${c._count?.users ?? 0} users`, icon: <Users size={10} /> },
                            { label: "devices", icon: null },
                            { label: "maint.", icon: null },
                            { label: `${depts.length} depts`, icon: <FolderOpen size={10} /> },
                          ].map(b => (
                            <span key={b.label} className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border ${isDarkMode ? "border-slate-600 text-gray-400" : "border-gray-200 text-gray-500"}`}>
                              {b.icon}{b.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => navigate(`edit/${c.id}`)}
                        className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? "text-gray-400 hover:text-white hover:bg-slate-700" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"}`}
                      ><Edit2 size={15} /></button>
                      <button
                        onClick={() => setShowDeleteConfirm({ type: "company", id: c.id })}
                        className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? "text-gray-400 hover:text-red-400 hover:bg-red-900/30" : "text-gray-500 hover:text-red-600 hover:bg-red-100"}`}
                      ><Trash2 size={15} /></button>
                      <button
                        onClick={() => setExpandedCompany(isExpanded ? null : c.id)}
                        className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? "text-gray-400 hover:text-white hover:bg-slate-700" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"}`}
                      >{isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</button>
                    </div>
                  </div>

                  {/* departments accordion */}
                  {isExpanded && (
                    <div className={`border-t px-4 py-4 ${isDarkMode ? "border-slate-700 bg-slate-900/40" : "border-gray-100 bg-gray-50"}`}>
                      <div className="flex items-center justify-between mb-3">
                        <p className={`text-[11px] font-bold uppercase tracking-widest ${txt2}`}>Departments ({depts.length})</p>
                        <button
                          onClick={() => navigate(`departments/create?companyId=${c.id}`)}
                          className="flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors"
                        ><Plus size={12} /> Add</button>
                      </div>
                      {depts.length === 0 ? (
                        <p className={`text-xs text-center py-4 ${txt2}`}>No departments yet</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {depts.map(d => (
                            <div key={d.id} className={`flex items-center justify-between px-3 py-2.5 rounded-lg border ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
                              <div className="flex items-center gap-2 min-w-0">
                                <FolderOpen size={13} className={txt2} />
                                <div className="min-w-0">
                                  <p className={`text-sm font-medium truncate ${isDarkMode ? "text-white" : "text-gray-900"}`}>{d.name}</p>
                                  {d.description && <p className={`text-[10px] truncate ${txt2}`}>{d.description}</p>}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0 ml-2">
                                <span className={`w-1.5 h-1.5 rounded-full ${d.isActive ? "bg-green-500" : "bg-gray-400"}`} />
                                <button
                                  onClick={() => navigate(`departments/edit?id=${d.id}&companyId=${d.companyId}`)}
                                  className={`p-1 rounded transition-colors ${isDarkMode ? "text-gray-500 hover:text-white" : "text-gray-400 hover:text-gray-700"}`}
                                ><Edit2 size={12} /></button>
                                <button
                                  onClick={() => setShowDeleteConfirm({ type: "dept", id: d.id })}
                                  className={`p-1 rounded transition-colors ${isDarkMode ? "text-gray-500 hover:text-red-400" : "text-gray-400 hover:text-red-600"}`}
                                ><Trash2 size={12} /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: DEPARTMENTS
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "departments" && (
        loadingCompanies ? <Loader /> : (
          <div className="space-y-2">
            {filteredDepts.length === 0 && (
              <p className={`text-sm text-center py-10 ${txt2}`}>No departments found</p>
            )}
            {filteredDepts.map(d => (
              <div key={d.id} className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${card} ${rowHover}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isDarkMode ? "bg-slate-700" : "bg-gray-100"}`}>
                    <FolderOpen size={15} className={txt2} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className={`font-semibold text-sm ${isDarkMode ? "text-white" : "text-gray-900"}`}>{d.name}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${d.isActive ? "bg-green-500 text-white" : "bg-gray-500 text-white"}`}>
                        {d.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Building2 size={10} className={txt2} />
                      <span className={`text-xs ${txt2}`}>{d.company?.name}</span>
                      {d.description && (
                        <>
                          <span className={`text-xs ${txt2}`}>·</span>
                          <span className={`text-xs ${txt2}`}>{d.description}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => navigate(`departments/edit?id=${d.id}&companyId=${d.companyId}`)}
                    className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? "text-gray-400 hover:text-white hover:bg-slate-700" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"}`}
                  ><Edit2 size={14} /></button>
                  <button
                    onClick={() => setShowDeleteConfirm({ type: "dept", id: d.id })}
                    className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? "text-gray-400 hover:text-red-400 hover:bg-red-900/30" : "text-gray-500 hover:text-red-600 hover:bg-red-100"}`}
                  ><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── DELETE CONFIRM MODAL ──────────────────────────────────────────── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className={`rounded-xl p-6 max-w-sm w-full border shadow-2xl ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
            <h2 className={`text-base font-bold mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>Confirmar eliminación</h2>
            <p className={`text-sm mb-5 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>¿Estás seguro? Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(null)} className={`flex-1 py-2 rounded-lg text-sm transition-colors ${isDarkMode ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-800"}`}>Cancelar</button>
              <button onClick={handleConfirmDelete} className="flex-1 py-2 rounded-lg text-sm bg-red-600 hover:bg-red-700 text-white font-medium transition-colors">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}