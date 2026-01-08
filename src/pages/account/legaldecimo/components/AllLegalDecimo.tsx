"use client"

import React, { useState, useEffect, useCallback } from "react"
import { X, Edit2, Trash2 } from "lucide-react"
import PagesHeader from "../../../../components/headers/pagesHeader"
import { usePageName } from "../../../../hook/usePageName"
import { useCompany } from "../../../../context/routerContext"

/* ============================ 
   TYPES 
============================ */
type NotificationType = "success" | "error"
type ParameterCategory = "social_security" | "educational_insurance" | "isr" | "other";
interface Notification {
  type: NotificationType
  message: string
  show: boolean
}

interface LegalDecimoParameter {
  id: string
  key: string
  name: string
  type: "employee" | "employer" | "fixed"
  category: ParameterCategory 
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
  parameter: Partial<LegalDecimoParameter> | null
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000"

/* ============================ 
   COMPONENT 
============================ */
export const AllLegalDecimoParameters: React.FC = () => {
  const { pageName } = usePageName()
  const { selectedCompany } = useCompany()

  const [activeTab, setActiveTab] = useState<ParameterCategory>("social_security")
  const [parameters, setParameters] = useState<LegalDecimoParameter[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [availableKeys, setAvailableKeys] = useState<{ value: string; label: string; category: string }[] >([])
  const [notification, setNotification] = useState<Notification>({ type: "success", message: "", show: false })
  
  const [modal, setModal] = useState<ModalState>({ show: false, parameter: null })

  // Fetch de llaves disponibles
  useEffect(() => {
    fetch(`${API_URL}/api/system/legal-decimo-parameters/keys`)
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

  const fetchParameters = useCallback(async () => {
    if (!selectedCompany?.id) return
    try {
      setIsLoading(true)
      const url = `${API_URL}/api/system/legal-decimo-parameters?category=${activeTab}&companyId=${selectedCompany?.id}`
      const response = await fetch(url)
      if (!response.ok) throw new Error("Error al cargar parámetros")
      const data = await response.json()
      setParameters(data || [])
    } catch (err: any) {
      setParameters([])
    } finally {
      setIsLoading(false)
    }
  }, [activeTab, selectedCompany?.id])

  useEffect(() => {
    fetchParameters()
  }, [fetchParameters])

  const showNotification = (type: NotificationType, message: string) => {
    setNotification({ type, message, show: true })
    setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 3000)
  }

  const openModal = (param?: LegalDecimoParameter) => {
    setModal({
      show: true,
      parameter: param || {
        type: "employee",
        category: activeTab,
        status: "active",
        effectiveDate: new Date().toISOString().split("T")[0],
      }
    })
  }

  const closeModal = () => setModal({ show: false, parameter: null })

  /* ============================ 
     SAVE (MANEJO CON FORMDATA)
  ============================ */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedCompany?.id) return showNotification("error", "No hay compañía seleccionada")

    const formData = new FormData(e.currentTarget)
    
    // Extraer valores y convertir tipos
    const isEditing = !!modal.parameter?.id
    const key = formData.get("key") as string
    const name = availableKeys.find(k => k.value === key)?.label || modal.parameter?.name

    const payload = {
      companyId: selectedCompany.id,
      key: isEditing ? modal.parameter?.key : key,
      name: name,
      type: formData.get("type"),
      category: activeTab,
      percentage: Number(formData.get("percentage")),
      minRange: formData.get("minRange") ? Number(formData.get("minRange")) : null,
      maxRange: formData.get("maxRange") ? Number(formData.get("maxRange")) : null,
      status: formData.get("status"),
      effectiveDate: formData.get("effectiveDate"),
      description: formData.get("description") || null,
    }

    try {
      const url = isEditing
        ? `${API_URL}/api/system/legal-decimo-parameters/${modal.parameter?.id}`
        : `${API_URL}/api/system/legal-decimo-parameters?category=${activeTab}&companyId=${selectedCompany?.id}`
      
      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Error al guardar")

      showNotification("success", "Guardado correctamente")
      fetchParameters()
      closeModal()
    } catch (err: any) {
      showNotification("error", err.message)
    }
  }

  const deleteParameter = async (id: string) => {
    if (!confirm("¿Eliminar este parámetro?")) return
    try {
      const response = await fetch(`${API_URL}/api/system/legal-decimo-parameters/${id}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Error al eliminar")
      setParameters(prev => prev.filter(p => p.id !== id))
      showNotification("success", "Parámetro eliminado")
    } catch (err: any) {
      showNotification("error", err.message)
    }
  }

  const categories: ParameterCategory[] = ["social_security", "educational_insurance", "isr", "other"]
  const categoryLabel: Record<string, string> = {
    social_security: "Seguro Social",
    educational_insurance: "Seguro Educativo",
    isr: "ISR",
    other: "Otros",
  }

  return (
    <div className="bg-gray-900 text-white min-h-screen">
      <PagesHeader title={pageName} description="Configuración de parámetros legales" onModal={() => openModal()} />

      {/* Tabs */}
      <div className="flex border-b border-gray-700 mb-6">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            className={`px-4 py-3 border-b-2 transition-colors ${activeTab === cat ? "border-blue-500 text-blue-400" : "border-transparent text-gray-400"}`}
          >
            {categoryLabel[cat]}
          </button>
        ))}
      </div>

      {/* Listado */}
      <div className="bg-gray-800 p-6 rounded-lg mx-4">
        {isLoading ? (
          <p className="text-center py-10">Cargando...</p>
        ) : parameters.length === 0 ? (
          <p className="text-gray-400 text-center py-10">No hay parámetros en esta categoría</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-700/50">
                  <th className="text-left px-6 py-4">Nombre</th>
                  <th className="text-left px-6 py-4">Tipo</th>
                  <th className="text-left px-6 py-4">Porcentaje</th>
                  {activeTab === "isr" && (
                    <>
                      <th className="text-left px-6 py-4">Mín</th>
                      <th className="text-left px-6 py-4">Máx</th>
                    </>
                  )}
                  <th className="text-left px-6 py-4">Estado</th>
                  <th className="text-right px-6 py-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {parameters.map((p) => (
                  <tr key={p.id} className="border-t border-gray-700 hover:bg-gray-700/30">
                    <td className="px-6 py-4 font-medium">{p.name}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-900/30 border border-blue-700">
                        {p.type === "employee" ? "Empleado" : p.type === "employer" ? "Patrono" : "Fijo"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-emerald-400 font-bold">{p.percentage}%</td>
                    {activeTab === "isr" && (
                      <>
                        <td className="px-6 py-4">${p.minRange?.toLocaleString()}</td>
                        <td className="px-6 py-4">{p.maxRange ? `$${p.maxRange.toLocaleString()}` : "∞"}</td>
                      </>
                    )}
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${p.status === 'active' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                        {p.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 flex gap-2 justify-end">
                      <button onClick={() => openModal(p)} className="p-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/40"><Edit2 size={16} /></button>
                      <button onClick={() => deleteParameter(p.id)} className="p-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/40"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL CON FORMDATA */}
      {modal.show && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSubmit} className="bg-gray-800 w-full max-w-lg rounded-xl shadow-xl overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold">{modal.parameter?.id ? "Editar Parámetro" : "Nuevo Parámetro"}</h3>
              <button type="button" onClick={closeModal} className="text-gray-400 hover:text-white"><X /></button>
            </div>

            <div className="p-5 space-y-4 text-sm">
              {/* Selector de Key (Solo creación) */}
              {!modal.parameter?.id ? (
                <div>
                  <label className="block mb-1 text-gray-300">Tipo de parámetro</label>
                  <select name="key" required className="w-full bg-gray-700 p-2 rounded border border-gray-600">
                    <option value="">Seleccione...</option>
                    {availableKeys.filter(k => k.category === activeTab).map(k => (
                      <option key={k.value} value={k.value}>{k.label}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="p-2 bg-gray-900 rounded border border-gray-700">
                  <span className="text-gray-400 block text-xs">Editando:</span>
                  <span className="font-bold">{modal.parameter.name}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-gray-300">Aplica a</label>
                  <select name="type" defaultValue={modal.parameter?.type} className="w-full bg-gray-700 p-2 rounded border border-gray-600">
                    <option value="employee">Empleado</option>
                    <option value="employer">Patrono</option>
                    <option value="fixed">Monto fijo</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-gray-300">Porcentaje (%)</label>
                  <input name="percentage" type="number" step="0.01" required defaultValue={modal.parameter?.percentage} className="w-full bg-gray-700 p-2 rounded border border-gray-600" />
                </div>
              </div>

              {activeTab === "isr" && (
                <div className="grid grid-cols-2 gap-4 p-3 bg-gray-900 rounded-lg">
                  <div>
                    <label className="block mb-1 text-xs text-gray-400">Rango Mínimo</label>
                    <input name="minRange" type="number" defaultValue={modal.parameter?.minRange ?? ""} className="w-full bg-gray-700 p-2 rounded" />
                  </div>
                  <div>
                    <label className="block mb-1 text-xs text-gray-400">Rango Máximo</label>
                    <input name="maxRange" type="number" defaultValue={modal.parameter?.maxRange ?? ""} className="w-full bg-gray-700 p-2 rounded" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-gray-300">Estado</label>
                  <select name="status" defaultValue={modal.parameter?.status} className="w-full bg-gray-700 p-2 rounded border border-gray-600">
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-gray-300">Fecha Efectiva</label>
                  <input name="effectiveDate" type="date" required defaultValue={modal.parameter?.effectiveDate?.split('T')[0]} className="w-full bg-gray-700 p-2 rounded border border-gray-600" />
                </div>
              </div>

              <div>
                <label className="block mb-1 text-gray-300">Descripción (opcional)</label>
                <textarea name="description" rows={2} defaultValue={modal.parameter?.description ?? ""} className="w-full bg-gray-700 p-2 rounded border border-gray-600 resize-none" />
              </div>
            </div>

            <div className="p-4 border-t border-gray-700 flex gap-3">
              <button type="button" onClick={closeModal} className="flex-1 bg-gray-600 hover:bg-gray-500 py-2 rounded">Cancelar</button>
              <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 py-2 rounded font-medium text-white">
                {modal.parameter?.id ? "Actualizar" : "Crear Parámetro"}
              </button>
            </div>
          </form>
        </div>
      )}

      {notification.show && (
        <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg z-[60] ${notification.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
          {notification.message}
        </div>
      )}
    </div>
  )
}