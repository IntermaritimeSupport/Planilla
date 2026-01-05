"use client"

import { useState, useEffect } from "react"
import { X, Plus, Edit2, Trash2 } from "lucide-react"
import PagesHeader from "../../../../components/headers/pagesHeader"
import { usePageName } from "../../../../hook/usePageName"
import Loader from "../../../../components/loaders/loader"

type NotificationType = "success" | "error"

interface Notification {
  type: NotificationType
  message: string
  show: boolean
}

interface LegalParameter {
  id: string
  key: string
  name: string
  type: "employee" | "employer" | "fixed"
  category: "social_security" | "educational_insurance" | "isr" | "other"
  percentage: number
  minRange?: number
  maxRange?: number
  status: "active" | "inactive"
  effectiveDate: string
  description?: string
  createdAt?: string
  updatedAt?: string
}

interface Modal {
  show: boolean
  isEditing: boolean
  parameter: Partial<LegalParameter> | null
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000"

export const AllLegalParameters: React.FC = () => {
  const [activeTab, setActiveTab] = useState("social_security")
  const [notification, setNotification] = useState<Notification>({ type: "success", message: "", show: false })
  const [modal, setModal] = useState<Modal>({ show: false, isEditing: false, parameter: null })
  const [parameters, setParameters] = useState<LegalParameter[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { pageName } = usePageName()
  // Fetch legal parameters from API
  useEffect(() => {
    fetchParameters()
  }, [activeTab])

  const fetchParameters = async () => {
    try {
      setIsLoading(true)
      setError(null)
      // Usa query param para filtrar por categoría
      const url = `${API_URL}/api/system/legal-parameters?category=${activeTab}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error("Error al cargar los parámetros")
      }

      const data = await response.json()
      setParameters(data || [])
    } catch (err: any) {
      setError(err.message)
      setParameters([])
      showNotification("error", "Error al cargar los parámetros legales")
    } finally {
      setIsLoading(false)
    }
  }

  const showNotification = (type: NotificationType, message: string) => {
    setNotification({ type, message, show: true })
    setTimeout(() => setNotification((prev) => ({ ...prev, show: false })), 3000)
  }

  const openModal = (param?: LegalParameter) => {
    if (param) {
      setModal({
        show: true,
        isEditing: true,
        parameter: param,
      })
    } else {
      setModal({
        show: true,
        isEditing: false,
        parameter: {
          key: "",
          name: "",
          type: "employee",
          percentage: 0,
          effectiveDate: new Date().toISOString().split("T")[0],
          status: "active",
          category: activeTab as any,
          description: "",
        },
      })
    }
  }

  const closeModal = () => {
    setModal({ show: false, isEditing: false, parameter: null })
  }

  const getCategoryLabel = (category: string): string => {
    const map: Record<string, string> = {
      social_security: "Seguro Social",
      educational_insurance: "Seguro Educativo",
      isr: "ISR",
      other: "Otros",
    }
    return map[category] || "Otros"
  }

  const generateUniqueKey = (name: string): string => {
    const sanitized = name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "")
    
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 9)
    
    return `${sanitized}_${timestamp}_${random}`.substring(0, 100)
  }

  const saveParameter = async () => {
    if (!modal.parameter?.name || modal.parameter.percentage === undefined) {
      showNotification("error", "Nombre y porcentaje son obligatorios")
      return
    }

    try {
      const payload: Partial<LegalParameter> = {
        key: modal.isEditing 
          ? modal.parameter.key 
          : modal.parameter.key || generateUniqueKey(modal.parameter.name),
        name: modal.parameter.name,
        type: modal.parameter.type || "employee",
        category: modal.parameter.category,
        percentage: modal.parameter.percentage,
        minRange: modal.parameter.minRange,
        maxRange: modal.parameter.maxRange,
        status: modal.parameter.status || "active",
        effectiveDate: modal.parameter.effectiveDate,
        description: modal.parameter.description,
      }

      if (modal.isEditing && modal.parameter.id) {
        // Update - ahora envía type y category también
        const response = await fetch(`${API_URL}/api/system/legal-parameters/${modal.parameter.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Error al actualizar")
        }

        const updated = await response.json()
        setParameters((prev) =>
          prev.map((p) => (p.id === modal.parameter?.id ? updated : p))
        )
        showNotification("success", "Parámetro actualizado correctamente")
      } else {
        // Create
        const response = await fetch(`${API_URL}/api/system/legal-parameters`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Error al crear")
        }

        const newParam = await response.json()
        setParameters((prev) => [...prev, newParam])
        showNotification("success", "Parámetro agregado correctamente")
      }

      closeModal()
    } catch (error: any) {
      showNotification("error", error.message || "Error al guardar el parámetro")
    }
  }

  const deleteParameter = async (id: string) => {
    if (!confirm("¿Está seguro que desea eliminar este parámetro?")) {
      return
    }

    try {
      const response = await fetch(`${API_URL}/api/system/legal-parameters/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al eliminar")
      }

      setParameters((prev) => prev.filter((p) => p.id !== id))
      showNotification("success", "Parámetro eliminado correctamente")
    } catch (error: any) {
      showNotification("error", error.message || "Error al eliminar el parámetro")
    }
  }

  // Get unique categories from all parameters
  const categories = ["social_security", "educational_insurance", "isr", "other"]
  // const availableCategories = categories.filter((cat) =>
  //   parameters.some((p) => p.category === cat)
  // )

  if (isLoading) {
    return (
      <Loader/>
    )
  }

  return (
    <div className="relative bg-gray-900 text-white">

      <PagesHeader title={`${pageName}`} description="Configure las tasas y parámetros legales para el cálculo de planilla"/>

      {error && (
        <div className="bg-yellow-900 bg-opacity-30 border border-yellow-600 rounded-lg p-4 mb-8">
          <p className="text-yellow-300 text-sm">
            ⚠️ Error: {error}
          </p>
        </div>
      )}

      {/* Tabs */}
      {categories.length > 0 && (
        <div className="flex border-b border-gray-700 mb-8 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={`px-6 py-3 font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === cat
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              {getCategoryLabel(cat)}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold">
              {getCategoryLabel(activeTab)}
            </h3>
            <p className="text-gray-400 text-sm">Tasas de contribución para empleado y empleador</p>
          </div>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
          >
            <Plus size={20} />
            Agregar Parámetro
          </button>
        </div>

        {parameters.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p>No hay parámetros en esta categoría. Haga clic en 'Agregar Parámetro' para comenzar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left px-4 py-3 font-medium">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium">Porcentaje</th>
                  {activeTab === "isr" && (
                    <>
                      <th className="text-left px-4 py-3 font-medium">Rango Mín.</th>
                      <th className="text-left px-4 py-3 font-medium">Rango Máx.</th>
                    </>
                  )}
                  <th className="text-left px-4 py-3 font-medium">Fecha Vigencia</th>
                  <th className="text-left px-4 py-3 font-medium">Estado</th>
                  <th className="text-left px-4 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {parameters.map((param) => (
                  <tr key={param.id} className="border-b border-gray-700 hover:bg-gray-700 hover:bg-opacity-50 transition-colors">
                    <td className="px-4 py-3 font-medium">{param.name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-gray-700 rounded text-xs">
                        {param.type === "employee" ? "Empleado" : param.type === "employer" ? "Patrono" : "Fijo"}
                      </span>
                    </td>
                    <td className="px-4 py-3">{param.percentage}%</td>
                    {activeTab === "isr" && (
                      <>
                        <td className="px-4 py-3 text-gray-400">${param.minRange?.toLocaleString()}</td>
                        <td className="px-4 py-3 text-gray-400">${param.maxRange?.toLocaleString()}</td>
                      </>
                    )}
                    <td className="px-4 py-3 text-gray-400">
                      {param.effectiveDate
                        ? new Date(param.effectiveDate).toLocaleDateString("es-PA")
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          param.status === "active"
                            ? "bg-green-600 text-green-100"
                            : "bg-gray-600 text-gray-100"
                        }`}
                      >
                        {param.status === "active" ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openModal(param)}
                          className="p-2 hover:bg-gray-600 rounded transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={16} className="text-blue-400" />
                        </button>
                        <button
                          onClick={() => deleteParameter(param.id)}
                          className="p-2 hover:bg-gray-600 rounded transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={16} className="text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Information Section */}
      {activeTab === "isr" && (
        <div className="bg-blue-900 bg-opacity-20 border border-blue-600 rounded-lg p-6 mb-8">
          <h3 className="font-semibold text-blue-300 mb-4">Información sobre Tramos Fiscales de ISR en Panamá</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-900 bg-opacity-30 border border-green-600 rounded-lg p-4">
              <div className="font-semibold text-green-400 mb-2">Tramo 1: Exento</div>
              <div className="text-sm text-green-100">Ingresos anuales menores a $12,000</div>
            </div>
            <div className="bg-yellow-900 bg-opacity-30 border border-yellow-600 rounded-lg p-4">
              <div className="font-semibold text-yellow-400 mb-2">Tramo 2: 15%</div>
              <div className="text-sm text-yellow-100">De $12,001 a $36,000</div>
            </div>
            <div className="bg-red-900 bg-opacity-30 border border-red-600 rounded-lg p-4">
              <div className="font-semibold text-red-400 mb-2">Tramo 3: 20% - 25%</div>
              <div className="text-sm text-red-100">De $36,001 en adelante</div>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-md w-full border border-gray-700">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold">
                {modal.isEditing ? "Editar Parámetro" : "Agregar Parámetro"}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nombre *</label>
                <input
                  type="text"
                  value={modal.parameter?.name || ""}
                  onChange={(e) =>
                    setModal((prev) => ({
                      ...prev,
                      parameter: { ...prev.parameter, name: e.target.value } as Partial<LegalParameter>,
                    }))
                  }
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Aporte del Empleado"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Tipo *</label>
                <select
                  value={modal.parameter?.type || "employee"}
                  onChange={(e) =>
                    setModal((prev) => ({
                      ...prev,
                      parameter: { ...prev.parameter, type: e.target.value as "employee" | "employer" | "fixed" } as Partial<LegalParameter>,
                    }))
                  }
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="employee">Empleado</option>
                  <option value="employer">Patrono</option>
                  <option value="fixed">Fijo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Categoría *</label>
                <select
                  value={modal.parameter?.category || "other"}
                  onChange={(e) =>
                    setModal((prev) => ({
                      ...prev,
                      parameter: { ...prev.parameter, category: e.target.value as any } as Partial<LegalParameter>,
                    }))
                  }
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="social_security">Seguro Social</option>
                  <option value="educational_insurance">Seguro Educativo</option>
                  <option value="isr">ISR</option>
                  <option value="other">Otros</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Porcentaje (%) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={modal.parameter?.percentage || 0}
                  onChange={(e) =>
                    setModal((prev) => ({
                      ...prev,
                      parameter: { ...prev.parameter, percentage: parseFloat(e.target.value) } as Partial<LegalParameter>,
                    }))
                  }
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>

              {(modal.parameter?.category === "isr" || activeTab === "isr") && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">Rango Mínimo</label>
                    <input
                      type="number"
                      value={modal.parameter?.minRange || 0}
                      onChange={(e) =>
                        setModal((prev) => ({
                          ...prev,
                          parameter: { ...prev.parameter, minRange: parseInt(e.target.value) || 0 } as Partial<LegalParameter>,
                        }))
                      }
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Rango Máximo</label>
                    <input
                      type="number"
                      value={modal.parameter?.maxRange || 0}
                      onChange={(e) =>
                        setModal((prev) => ({
                          ...prev,
                          parameter: { ...prev.parameter, maxRange: parseInt(e.target.value) || 0 } as Partial<LegalParameter>,
                        }))
                      }
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="999999"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Fecha Vigencia</label>
                <input
                  type="date"
                  value={modal.parameter?.effectiveDate || ""}
                  onChange={(e) =>
                    setModal((prev) => ({
                      ...prev,
                      parameter: { ...prev.parameter, effectiveDate: e.target.value } as Partial<LegalParameter>,
                    }))
                  }
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Estado</label>
                <select
                  value={modal.parameter?.status || "active"}
                  onChange={(e) =>
                    setModal((prev) => ({
                      ...prev,
                      parameter: { ...prev.parameter, status: e.target.value as "active" | "inactive" } as Partial<LegalParameter>,
                    }))
                  }
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Descripción (Opcional)</label>
                <input
                  type="text"
                  value={modal.parameter?.description || ""}
                  onChange={(e) =>
                    setModal((prev) => ({
                      ...prev,
                      parameter: { ...prev.parameter, description: e.target.value } as Partial<LegalParameter>,
                    }))
                  }
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Seguro Social - Aporte Empleado"
                />
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-700">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveParameter}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification.show && (
        <div
          className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4 rounded-lg p-4 shadow-lg border ${
            notification.type === "success"
              ? "bg-green-800 border-green-600 text-green-100"
              : "bg-red-800 border-red-600 text-red-100"
          }`}
        >
          <p className="text-sm font-medium">{notification.message}</p>
        </div>
      )}
    </div>
  )
}