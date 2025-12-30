"use client"

import { useState, useEffect } from "react"
import { X, Plus, Edit2, Trash2 } from "lucide-react"

type NotificationType = "success" | "error"

interface Notification {
  type: NotificationType
  message: string
  show: boolean
}

interface LegalParameter {
  id: string
  key: string
  value: {
    name: string
    type: "employee" | "employer"
    percentage: number
    effectiveDate: string
    status: "active" | "inactive"
    category: "social_security" | "educational_insurance" | "isr" | "other"
  }
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

  // Fetch legal parameters from API
  useEffect(() => {
    fetchParameters()
  }, [])

  const fetchParameters = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch(`${API_URL}/api/system/config?category=legal_parameters`)

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
          value: {
            name: "",
            type: "employee",
            percentage: 0,
            effectiveDate: new Date().toISOString().split("T")[0],
            status: "active",
            category: activeTab as any,
          },
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

  const saveParameter = async () => {
    if (!modal.parameter?.value?.name || modal.parameter.value.percentage === undefined) {
      showNotification("error", "Todos los campos son obligatorios")
      return
    }

    try {
      const payload = {
        key: modal.parameter.key || `legal_parameters_${Date.now()}`,
        value: modal.parameter.value,
        description: modal.parameter.description || `Parámetro legal: ${modal.parameter.value.name}`,
      }

      if (modal.isEditing && modal.parameter.id) {
        // Update
        const response = await fetch(`${API_URL}/api/system/config/${modal.parameter.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            value: payload.value,
            description: payload.description,
          }),
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
        const response = await fetch(`${API_URL}/api/system/config`, {
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
      const response = await fetch(`${API_URL}/api/system/config/${id}`, {
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

  // Filter parameters by active tab
  const currentParameters = parameters.filter(
    (p) => p.value?.category === activeTab
  )

  // Get unique categories from parameters
  const categories = ["social_security", "educational_insurance", "isr", "other"]
  const availableCategories = categories.filter((cat) =>
    parameters.some((p) => p.value?.category === cat)
  )

  // If no data from API, show empty state
  if (isLoading) {
    return (
      <div className="relative bg-gray-900 text-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Cargando parámetros legales...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative bg-gray-900 text-white min-h-screen p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Parámetros Legales</h1>
        <p className="text-gray-400">Configure las tasas y parámetros legales para el cálculo de planilla</p>
      </div>

      {error && (
        <div className="bg-yellow-900 bg-opacity-30 border border-yellow-600 rounded-lg p-4 mb-8">
          <p className="text-yellow-300 text-sm">
            ⚠️ Error: {error}
          </p>
        </div>
      )}

      {/* Tabs */}
      {availableCategories.length > 0 && (
        <div className="flex border-b border-gray-700 mb-8 overflow-x-auto">
          {availableCategories.map((cat) => (
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
              {availableCategories.length > 0 ? getCategoryLabel(activeTab) : "Parámetros Legales"}
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

        {currentParameters.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p>
              {parameters.length === 0
                ? "No hay parámetros configurados. Haga clic en 'Agregar Parámetro' para comenzar."
                : "No hay parámetros en esta categoría"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left px-4 py-3 font-medium">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium">Porcentaje</th>
                  <th className="text-left px-4 py-3 font-medium">Fecha Vigencia</th>
                  <th className="text-left px-4 py-3 font-medium">Estado</th>
                  <th className="text-left px-4 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {currentParameters.map((param) => (
                  <tr key={param.id} className="border-b border-gray-700 hover:bg-gray-700 hover:bg-opacity-50 transition-colors">
                    <td className="px-4 py-3 font-medium">{param.value?.name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-gray-700 rounded text-xs">
                        {param.value?.type === "employee" ? "Empleado" : "Patrono"}
                      </span>
                    </td>
                    <td className="px-4 py-3">{param.value?.percentage}%</td>
                    <td className="px-4 py-3 text-gray-400">
                      {param.value?.effectiveDate
                        ? new Date(param.value.effectiveDate).toLocaleDateString("es-PA")
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          param.value?.status === "active"
                            ? "bg-green-600 text-green-100"
                            : "bg-gray-600 text-gray-100"
                        }`}
                      >
                        {param.value?.status === "active" ? "Activo" : "Inactivo"}
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
      {availableCategories.includes("isr") && (
        <div className="bg-blue-900 bg-opacity-20 border border-blue-600 rounded-lg p-6 mb-8">
          <h3 className="font-semibold text-blue-300 mb-4">Información sobre Tramos Fiscales de ISR en Panamá</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-900 bg-opacity-30 border border-green-600 rounded-lg p-4">
              <div className="font-semibold text-green-400 mb-2">Tramo 1: Exento</div>
              <div className="text-sm text-green-100">
                Ingresos anuales menores a $12,000
              </div>
            </div>
            <div className="bg-yellow-900 bg-opacity-30 border border-yellow-600 rounded-lg p-4">
              <div className="font-semibold text-yellow-400 mb-2">Tramo 2: 15%</div>
              <div className="text-sm text-yellow-100">
                De $12,001 a $36,000
              </div>
            </div>
            <div className="bg-red-900 bg-opacity-30 border border-red-600 rounded-lg p-4">
              <div className="font-semibold text-red-400 mb-2">Tramo 3: 20% - 25%</div>
              <div className="text-sm text-red-100">
                De $36,001 en adelante
              </div>
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
                <label className="block text-sm font-medium mb-2">Nombre</label>
                <input
                  type="text"
                  value={modal.parameter?.value?.name || ""}
                  onChange={(e) =>
                    setModal((prev) => ({
                      ...prev,
                      parameter: {
                        ...prev.parameter,
                        value: { ...prev.parameter?.value, name: e.target.value } as any,
                      } as Partial<LegalParameter>,
                    }))
                  }
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Aporte del Empleado"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Tipo</label>
                <select
                  value={modal.parameter?.value?.type || "employee"}
                  onChange={(e) =>
                    setModal((prev) => ({
                      ...prev,
                      parameter: {
                        ...prev.parameter,
                        value: { ...prev.parameter?.value, type: e.target.value as "employee" | "employer" } as any,
                      } as Partial<LegalParameter>,
                    }))
                  }
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="employee">Empleado</option>
                  <option value="employer">Patrono</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Porcentaje (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={modal.parameter?.value?.percentage || 0}
                  onChange={(e) =>
                    setModal((prev) => ({
                      ...prev,
                      parameter: {
                        ...prev.parameter,
                        value: { ...prev.parameter?.value, percentage: parseFloat(e.target.value) } as any,
                      } as Partial<LegalParameter>,
                    }))
                  }
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Fecha Vigencia</label>
                <input
                  type="date"
                  value={modal.parameter?.value?.effectiveDate || ""}
                  onChange={(e) =>
                    setModal((prev) => ({
                      ...prev,
                      parameter: {
                        ...prev.parameter,
                        value: { ...prev.parameter?.value, effectiveDate: e.target.value } as any,
                      } as Partial<LegalParameter>,
                    }))
                  }
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Estado</label>
                <select
                  value={modal.parameter?.value?.status || "active"}
                  onChange={(e) =>
                    setModal((prev) => ({
                      ...prev,
                      parameter: {
                        ...prev.parameter,
                        value: { ...prev.parameter?.value, status: e.target.value as "active" | "inactive" } as any,
                      } as Partial<LegalParameter>,
                    }))
                  }
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>
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