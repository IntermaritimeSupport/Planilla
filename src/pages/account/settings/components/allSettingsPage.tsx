"use client"

import React, { useState, useEffect } from "react"
import { Edit2, Trash2, ChevronDown, ChevronUp, Plus } from "lucide-react"
import { useCompany } from "../../../../context/routerContext"
import Loader from "../../../../components/loaders/loader"
import PagesHeader from "../../../../components/headers/pagesHeader"
import { usePageName } from "../../../../hook/usePageName"
import { useSearch } from "../../../../context/searchContext"

const VITE_API_URL = import.meta.env?.VITE_API_URL || "http://localhost:3000"

interface Department {
  id: string
  name: string
  description?: string
  isActive: boolean
}

interface Company {
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
  _count?: {
    users: number
    equipments: number
    licenses: number
    documents: number
    maintenances: number
    departments: number
    networks?: number
  }
}

const fetcherWithAuth = async (url: string): Promise<Company[]> => {
  try {
    const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken")

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }

    const res = await fetch(url, {
      method: "GET",
      headers,
      credentials: "include",
    })

    if (res.status === 403) {
      throw new Error("No tienes permisos para acceder a este recurso")
    }

    if (!res.ok) {
      throw new Error(`API error: ${res.status}`)
    }

    return res.json()
  } catch (error) {
    console.error("Fetch error:", error)
    throw error
  }
}

export default function AllSettingsPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const { search } = useSearch()
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [showDeleteDeptConfirm, setShowDeleteDeptConfirm] = useState<{ companyId: string; deptId: string } | null>(null)
  const { selectedCompany } = useCompany()
  const { pageName } = usePageName()

  useEffect(() => {
    loadCompanies()
  }, [])

  const loadCompanies = async () => {
    try {
      setLoading(true)
      const url = `${VITE_API_URL}/api/companies/all`
      const data = await fetcherWithAuth(url)
      setCompanies(Array.isArray(data) ? data : [])
      setError(null)
    } catch (err: any) {
      setError(err.message)
      setCompanies([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken")
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }
      if (token) headers["Authorization"] = `Bearer ${token}`

      const res = await fetch(`${VITE_API_URL}/api/companies/${id}`, {
        method: "DELETE",
        headers,
        credentials: "include",
      })

      if (res.ok) {
        const data = await res.json()
        setCompanies(companies.filter((c) => c.id !== id))
        setShowDeleteConfirm(null)
        alert(`Compañía eliminada.\nUsuarios desasociados: ${data.usersDisassociated}`)
      } else if (res.status === 404) {
        alert("La compañía no fue encontrada")
      } else {
        const errorData = await res.json()
        alert(`Error: ${errorData.error || "Error al eliminar la compañía"}`)
      }
    } catch (err: any) {
      console.error("Delete error:", err)
      alert("Error: " + err.message)
    }
  }

  const handleDeleteDepartment = async (companyId: string, deptId: string) => {
    try {
      const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken")
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }
      if (token) headers["Authorization"] = `Bearer ${token}`

      const res = await fetch(`${VITE_API_URL}/api/departments/${deptId}`, {
        method: "DELETE",
        headers,
        credentials: "include",
      })

      if (res.ok) {
        // Actualizar el estado local removiendo el departamento
        setCompanies(
          companies.map((c) => {
            if (c.id === companyId) {
              return {
                ...c,
                departments: c.departments?.filter((d) => d.id !== deptId),
              }
            }
            return c
          }),
        )
        setShowDeleteDeptConfirm(null)
        alert("Departamento eliminado exitosamente")
      } else {
        const errorData = await res.json()
        alert(`Error: ${errorData.error || "Error al eliminar el departamento"}`)
      }
    } catch (err: any) {
      console.error("Delete department error:", err)
      alert("Error: " + err.message)
    }
  }

  const toggleExpandRow = (id: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  const filteredCompanies = companies.filter(
    (company) =>
      company.name.toLowerCase().includes(search.toLowerCase()) ||
      company.code.toLowerCase().includes(search.toLowerCase()) ||
      (company.email && company.email.toLowerCase().includes(search.toLowerCase())) ||
      (company.ruc && company.ruc.toLowerCase().includes(search.toLowerCase())),
  )

  if (loading) {
    return <Loader />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="bg-red-900/30 border border-red-600 rounded-lg p-6 text-red-300">
          <p className="font-semibold mb-2">Error de Acceso</p>
          <p>{error}</p>
          <button
            onClick={loadCompanies}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 text-white">
      {/* Header */}
      <PagesHeader
        title={`${pageName} Company Management`}
        description={pageName ? `${pageName} in ${selectedCompany?.name}` : "Cargando compañía..."}
        showCreate
      />

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-700">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-800 border-b border-gray-700">
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Nombre</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Código</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">RUC</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Email</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Teléfono</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Estado</th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-300">Acciones</th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-300" />
            </tr>
          </thead>
          <tbody>
            {filteredCompanies.length > 0 ? (
              filteredCompanies.map((company) => (
                <React.Fragment key={company.id}>
                  <tr
                    className={`border-b border-gray-700 transition-colors cursor-pointer ${
                      selectedCompany?.id === company.id
                        ? "bg-blue-700/60 ring-2 ring-blue-500"
                        : expandedRows.has(company.id)
                          ? "bg-blue-900/40"
                          : "hover:bg-gray-800/50"
                    }`}
                  >
                    <td className="px-6 py-4 text-sm text-white font-medium">{company.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-400">{company.code}</td>
                    <td className="px-6 py-4 text-sm text-gray-400">{company.ruc || "-"}</td>
                    <td className="px-6 py-4 text-sm text-gray-400">{company.email || "-"}</td>
                    <td className="px-6 py-4 text-sm text-gray-400">{company.phone || "-"}</td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          company.isActive ? "bg-green-600/30 text-green-300" : "bg-red-600/30 text-red-300"
                        }`}
                      >
                        {company.isActive ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex justify-center space-x-2">
                        <a
                          href={`edit/${company.id}`}
                          className="bg-yellow-600 hover:bg-yellow-700 text-white p-2 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </a>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowDeleteConfirm(company.id)
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleExpandRow(company.id)
                        }}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        {expandedRows.has(company.id) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </button>
                    </td>
                  </tr>
                  {expandedRows.has(company.id) && (
                    <tr className="bg-gray-800/30 border-b border-gray-700">
                      <td colSpan={8} className="px-6 py-4">
                        <div className="space-y-6">
                          {/* Información general */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-gray-400 uppercase">Dirección</p>
                              <p className="text-sm text-white">{company.address || "No especificada"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 uppercase">Usuarios</p>
                              <p className="text-sm text-white">{company._count?.users || 0} usuarios</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 uppercase">Equipos</p>
                              <p className="text-sm text-white">{company._count?.equipments || 0} equipos</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 uppercase">Mantenimientos</p>
                              <p className="text-sm text-white">{company._count?.maintenances || 0} mantenimientos</p>
                            </div>
                          </div>

                          {/* Departamentos */}
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-xs text-gray-400 uppercase font-semibold">
                                Departamentos ({company.departments?.length || 0})
                              </p>
                              <a
                                href={`departments/create?companyId=${company.id}`}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors text-sm font-medium"
                              >
                                <Plus size={16} />
                                Agregar Departamento
                              </a>
                            </div>

                            {company.departments && company.departments.length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {company.departments.map((dept) => (
                                  <div key={dept.id} className="bg-gray-700/50 rounded-lg p-3 border border-gray-600">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <p className="text-sm font-semibold text-white">{dept.name}</p>
                                        {dept.description && (
                                          <p className="text-xs text-gray-400 mt-1">{dept.description}</p>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 ml-2">
                                        <span
                                          className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${
                                            dept.isActive
                                              ? "bg-green-600/30 text-green-300"
                                              : "bg-red-600/30 text-red-300"
                                          }`}
                                        >
                                          {dept.isActive ? "Activo" : "Inactivo"}
                                        </span>
                                        <a
                                          href={`departments/edit?companyId=${company.id}&id=${dept.id}`}
                                          className="bg-yellow-600 hover:bg-yellow-700 text-white p-1.5 rounded transition-colors"
                                          title="Editar departamento"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <Edit2 size={14} />
                                        </a>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setShowDeleteDeptConfirm({ companyId: company.id, deptId: dept.id })
                                          }}
                                          className="bg-red-600 hover:bg-red-700 text-white p-1.5 rounded transition-colors"
                                          title="Eliminar departamento"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-400 text-center py-4">No hay departamentos registrados</p>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                  No se encontraron compañías
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Delete Confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4">Confirmar eliminación</h2>
            <p className="text-gray-300 mb-6">
              ¿Estás seguro de que deseas eliminar esta compañía? Esta acción no se puede deshacer.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteDeptConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4">Confirmar eliminación</h2>
            <p className="text-gray-300 mb-6">
              ¿Estás seguro de que deseas eliminar este departamento? Esta acción no se puede deshacer.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteDeptConfirm(null)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteDepartment(showDeleteDeptConfirm.companyId, showDeleteDeptConfirm.deptId)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
