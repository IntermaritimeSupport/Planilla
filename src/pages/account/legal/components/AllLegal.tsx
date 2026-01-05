"use client"

import { useState, useEffect, useCallback } from "react"
import { X, Edit2, Trash2 } from "lucide-react"
import PagesHeader from "../../../../components/headers/pagesHeader"
import { usePageName } from "../../../../hook/usePageName"
import { useCompany } from "../../../../context/routerContext"

/* ============================
   TYPES
============================ */

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
  minRange: number | null
  maxRange: number | null
  status: "active" | "inactive"
  effectiveDate: string
  description?: string | null
  companyId: string
}

interface ModalState {
  show: boolean
  isEditing: boolean
  parameter: Partial<LegalParameter> | null
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000"

/* ============================
   COMPONENT
============================ */

export const AllLegalParameters: React.FC = () => {
  const { pageName } = usePageName()
  const { selectedCompany } = useCompany()

  const [activeTab, setActiveTab] = useState("social_security")
  const [parameters, setParameters] = useState<LegalParameter[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [, setError] = useState<string | null>(null)

  const [notification, setNotification] = useState<Notification>({
    type: "success",
    message: "",
    show: false,
  })

  const [modal, setModal] = useState<ModalState>({
    show: false,
    isEditing: false,
    parameter: null,
  })

  const [availableKeys, setAvailableKeys] = useState<
    { value: string; label: string; category: string }[]
  >([])

  /* ============================
     FETCH AVAILABLE KEYS
  ============================ */

  useEffect(() => {
    fetch(`${API_URL}/api/system/legal-parameters/keys`)
      .then(res => res.json())
      .then(data => {
        const mapped = data.map((k: any) => ({
          value: k.key,
          label: k.name,
          category: k.category,
        }))
        setAvailableKeys(mapped)
      })
  }, [])

  /* ============================
     FETCH PARAMETERS
  ============================ */

  const fetchParameters = useCallback(async () => {
    if (!selectedCompany?.id) return

    try {
      setIsLoading(true)
      setError(null)

      const url = `${API_URL}/api/system/legal-parameters?category=${activeTab}&companyId=${selectedCompany.id}`
      const response = await fetch(url)

      if (!response.ok) throw new Error("Error al cargar parámetros")

      const data = await response.json()
      setParameters(data || [])
    } catch (err: any) {
      setError(err.message)
      setParameters([])
    } finally {
      setIsLoading(false)
    }
  }, [activeTab, selectedCompany?.id])

  useEffect(() => {
    fetchParameters()
  }, [fetchParameters])

  /* ============================
     HELPERS
  ============================ */

  const showNotification = (type: NotificationType, message: string) => {
    setNotification({ type, message, show: true })
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }))
    }, 3000)
  }

  const openModal = (param?: LegalParameter) => {
    if (param) {
      setModal({ show: true, isEditing: true, parameter: param })
    } else {
      setModal({
        show: true,
        isEditing: false,
        parameter: {
          key: "",
          name: "",
          type: "employee",
          category: activeTab as any,
          percentage: 0,
          minRange: null,
          maxRange: null,
          status: "active",
          effectiveDate: new Date().toISOString().split("T")[0],
          description: "",
        },
      })
    }
  }

  const closeModal = () =>
    setModal({ show: false, isEditing: false, parameter: null })

  /* ============================
     SAVE (POST / PUT)
  ============================ */

  const saveParameter = async () => {
    if (!selectedCompany?.id) {
      showNotification("error", "No hay compañía seleccionada")
      return
    }

    try {
      const isEditing = modal.isEditing
      const method = isEditing ? "PUT" : "POST"
      const url = isEditing
        ? `${API_URL}/api/system/legal-parameters/${modal.parameter?.id}`
        : `${API_URL}/api/system/legal-parameters`

      const payload: any = {
        companyId: selectedCompany?.id,
        name: modal.parameter?.name,
        type: modal.parameter?.type,
        category: modal.parameter?.category,
        percentage: Number(modal.parameter?.percentage),
        minRange: modal.parameter?.minRange ?? null,
        maxRange: modal.parameter?.maxRange ?? null,
        description: modal.parameter?.description || null,
        status: modal.parameter?.status,
      }

      if (!isEditing) {
        payload.key = modal.parameter?.key
        payload.companyId = selectedCompany.id
      }

      if (isEditing && modal.parameter?.effectiveDate) {
        payload.effectiveDate = modal.parameter.effectiveDate
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error)

      showNotification("success", "Parámetro guardado correctamente")
      fetchParameters()
      closeModal()
    } catch (err: any) {
      showNotification("error", err.message)
    }
  }

  /* ============================
     DELETE
  ============================ */

  const deleteParameter = async (id: string) => {
    if (!confirm("¿Eliminar este parámetro?")) return

    try {
      const response = await fetch(
        `${API_URL}/api/system/legal-parameters/${id}`,
        { method: "DELETE" }
      )

      if (!response.ok) throw new Error("Error al eliminar")

      setParameters(prev => prev.filter(p => p.id !== id))
      showNotification("success", "Parámetro eliminado")
    } catch (err: any) {
      showNotification("error", err.message)
    }
  }

  /* ============================
     UI
  ============================ */

  const categories = [
    "social_security",
    "educational_insurance",
    "isr",
    "other",
  ]

  const categoryLabel: Record<string, string> = {
    social_security: "Seguro Social",
    educational_insurance: "Seguro Educativo",
    isr: "ISR",
    other: "Otros",
  }

  return (
    <div className="bg-gray-900 text-white">
      <PagesHeader title={pageName} description="Configuración de parámetros legales" onModal={openModal}/>

      {/* Tabs */}
      <div className="flex border-b border-gray-700 mb-6">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            className={`px-4 py-3 border-b-2 ${activeTab === cat ? "border-blue-500 text-blue-400" : "border-transparent text-gray-400"
              }`}
          >
            {categoryLabel[cat]}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-gray-800 p-6 rounded-lg">

        {parameters.length === 0 ? (
          <p className="text-gray-400 text-center py-10">No hay parámetros en esta categoría</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-700/50">
                  <th className="text-left px-6 py-4 font-semibold text-gray-200">Nombre</th>
                  <th className="text-left px-6 py-4 font-semibold text-gray-200">Tipo</th>
                  <th className="text-left px-6 py-4 font-semibold text-gray-200">Porcentaje</th>
                  {activeTab === "isr" && (
                    <>
                      <th className="text-left px-6 py-4 font-semibold text-gray-200">Mín</th>
                      <th className="text-left px-6 py-4 font-semibold text-gray-200">Máx</th>
                    </>
                  )}
                  <th className="text-left px-6 py-4 font-semibold text-gray-200">Estado</th>
                  <th className="text-right px-6 py-4 font-semibold text-gray-200">Acciones</th>
                </tr>
              </thead>
              <tbody>

                {isLoading ? (
                  <tr>
                    <td colSpan={activeTab === "isr" ? 7 : 5} className="px-6 py-4">
                      loadding...
                    </td>
                  </tr>
                ) : (
                <>
                {parameters.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t border-gray-700 hover:bg-gray-700/30 transition-colors duration-150"
                  >
                    <td className="px-6 py-4 font-medium text-white">{p.name}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${p.type === "employee"
                            ? "bg-blue-900/50 text-blue-300 border border-blue-700"
                            : p.type === "employer"
                              ? "bg-purple-900/50 text-purple-300 border border-purple-700"
                              : "bg-gray-700 text-gray-300 border border-gray-600"
                          }`}
                      >
                        {p.type === "employee" ? "Empleado" : p.type === "employer" ? "Patrono" : "Fijo"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-emerald-400">{p.percentage}%</span>
                    </td>
                    {activeTab === "isr" && (
                      <>
                        <td className="px-6 py-4 text-gray-300">
                          {p.minRange !== null ? `$${p.minRange.toLocaleString()}` : "-"}
                        </td>
                        <td className="px-6 py-4 text-gray-300">
                          {p.maxRange !== null ? `$${p.maxRange.toLocaleString()}` : "∞"}
                        </td>
                      </>
                    )}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${p.status === "active"
                            ? "bg-green-900/50 text-green-300 border border-green-700"
                            : "bg-red-900/50 text-red-300 border border-red-700"
                          }`}
                      >
                        {p.status === "active" ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => openModal(p)}
                          className="p-2 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 hover:text-blue-300 transition-all duration-150"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => deleteParameter(p.id)}
                          className="p-2 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 hover:text-red-300 transition-all duration-150"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                </>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL MEJORADO */}
      {modal.show && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 w-full max-w-lg rounded-xl shadow-xl">
            {/* HEADER */}
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <div>
                <h3 className="text-lg font-semibold">
                  {modal.isEditing ? "Editar parámetro legal" : "Nuevo parámetro legal"}
                </h3>
                <p className="text-sm text-gray-400">Configura los valores que aplicarán a la nómina</p>
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-white">
                <X />
              </button>
            </div>

            {/* BODY */}
            <div className="p-5 space-y-6 text-sm">
              {/* SECCIÓN: DEFINICIÓN */}
              {!modal.isEditing && (
                <div>
                  <label className="block mb-1 text-gray-300 font-medium">Tipo de parámetro</label>
                  <select
                    value={modal.parameter?.key || ""}
                    onChange={(e) => {
                      const selected = availableKeys.find((k) => k.value === e.target.value)
                      setModal((prev) => ({
                        ...prev,
                        parameter: {
                          ...prev.parameter,
                          key: e.target.value,
                          name: selected?.label || "",
                        },
                      }))
                    }}
                    className="w-full bg-gray-700 p-2 rounded"
                  >
                    <option value="">Seleccione un parámetro</option>
                    {availableKeys
                      .filter((k) => k.category === activeTab)
                      .map((k) => (
                        <option key={k.value} value={k.value}>
                          {k.label}
                        </option>
                      ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Este valor define el comportamiento del sistema</p>
                </div>
              )}

              {/* CONFIGURACIÓN */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-gray-300 font-medium">Aplica a</label>
                  <select
                    className="w-full bg-gray-700 p-2 rounded"
                    value={modal.parameter?.type || "employee"}
                    onChange={(e) =>
                      setModal((prev) => ({
                        ...prev,
                        parameter: { ...prev.parameter, type: e.target.value as any },
                      }))
                    }
                  >
                    <option value="employee">Empleado</option>
                    <option value="employer">Patrono</option>
                    <option value="fixed">Monto fijo</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-gray-300 font-medium">Porcentaje (%)</label>
                  <input
                    type="number"
                    className="w-full bg-gray-700 p-2 rounded"
                    placeholder="0.00"
                    value={modal.parameter?.percentage ?? ""}
                    onChange={(e) =>
                      setModal((prev) => ({
                        ...prev,
                        parameter: {
                          ...prev.parameter,
                          percentage: Number(e.target.value),
                        },
                      }))
                    }
                  />
                </div>
              </div>

              {/* ISR */}
              {activeTab === "isr" && (
                <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                  <p className="font-medium text-gray-200 mb-2">Rango salarial (ISR)</p>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="number"
                      placeholder="Desde"
                      className="bg-gray-700 p-2 rounded"
                      value={modal.parameter?.minRange ?? ""}
                      onChange={(e) =>
                        setModal((prev) => ({
                          ...prev,
                          parameter: {
                            ...prev.parameter,
                            minRange: e.target.value === "" ? null : Number(e.target.value),
                          },
                        }))
                      }
                    />
                    <input
                      type="number"
                      placeholder="Hasta"
                      className="bg-gray-700 p-2 rounded"
                      value={modal.parameter?.maxRange ?? ""}
                      onChange={(e) =>
                        setModal((prev) => ({
                          ...prev,
                          parameter: {
                            ...prev.parameter,
                            maxRange: e.target.value === "" ? null : Number(e.target.value),
                          },
                        }))
                      }
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Déjalo vacío si el tramo no tiene límite superior</p>
                </div>
              )}

              {/* ESTADO Y FECHA */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-gray-300 font-medium">Estado</label>
                  <select
                    className="w-full bg-gray-700 p-2 rounded"
                    value={modal.parameter?.status || "active"}
                    onChange={(e) =>
                      setModal((prev) => ({
                        ...prev,
                        parameter: { ...prev.parameter, status: e.target.value as any },
                      }))
                    }
                  >
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-gray-300 font-medium">Fecha efectiva</label>
                  <input
                    type="date"
                    className="w-full bg-gray-700 p-2 rounded"
                    value={modal.parameter?.effectiveDate || ""}
                    onChange={(e) =>
                      setModal((prev) => ({
                        ...prev,
                        parameter: { ...prev.parameter, effectiveDate: e.target.value },
                      }))
                    }
                  />
                </div>
              </div>

              {/* DESCRIPCIÓN */}
              <div>
                <label className="block mb-1 text-gray-300 font-medium">Descripción (opcional)</label>
                <textarea
                  className="w-full bg-gray-700 p-2 rounded resize-none"
                  rows={2}
                  placeholder="Notas internas sobre este parámetro"
                  value={modal.parameter?.description || ""}
                  onChange={(e) =>
                    setModal((prev) => ({
                      ...prev,
                      parameter: { ...prev.parameter, description: e.target.value },
                    }))
                  }
                />
              </div>
            </div>

            {/* FOOTER */}
            <div className="p-4 border-t border-gray-700 flex gap-3">
              <button onClick={closeModal} className="flex-1 bg-gray-600 hover:bg-gray-500 py-2 rounded">
                Cancelar
              </button>
              <button onClick={saveParameter} className="flex-1 bg-blue-600 hover:bg-blue-500 py-2 rounded font-medium">
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {notification.show && (
        <div
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded ${notification.type === "success" ? "bg-green-700" : "bg-red-700"
            }`}
        >
          {notification.message}
        </div>
      )}
    </div>
  )
}
