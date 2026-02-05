"use client"
import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useTheme } from "../../../../context/themeContext"
import { InputNode } from "./input-node"
import Loader from "../../../../components/loaders/loader"
import { useCompany } from "../../../../context/routerContext"

const VITE_API_URL = import.meta.env.VITE_API_URL

interface FormData {
  name: string
  description: string
  companyId: string
  isActive: boolean
}

export function UpdateDepartment() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isDarkMode } = useTheme()
  const id = searchParams.get("id")
  const companyIdFromUrl = searchParams.get("companyId")
  const isEdit = Boolean(id)
  const { selectedCompany } = useCompany()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    companyId: companyIdFromUrl || (selectedCompany ? selectedCompany.id : ""),
    isActive: true,
  })

  useEffect(() => {
    if (!id) return

    const loadDepartment = async () => {
      try {
        setLoading(true)

        const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken")

        const res = await fetch(`${VITE_API_URL}/api/departments/${id}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          credentials: "include",
        })

        if (!res.ok) throw new Error("Error al cargar el departamento")

        const data = await res.json()

        setFormData({
          name: data.name,
          description: data.description || "",
          companyId: data.companyId,
          isActive: data.isActive,
        })
      } catch (err: any) {
        setMessage({ type: "error", text: err.message })
        setTimeout(() => navigate(-1), 2000)
      } finally {
        setLoading(false)
      }
    }

    loadDepartment()
  }, [id, navigate])

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [message])

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setMessage({ type: "error", text: "El nombre es requerido" })
      return
    }

    if (!formData.companyId) {
      setMessage({ type: "error", text: "Debe seleccionar una compañía" })
      return
    }

    try {
      setLoading(true)

      const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken")

      const res = await fetch(
        isEdit ? `${VITE_API_URL}/api/departments/${id}` : `${VITE_API_URL}/api/departments/create`,
        {
          method: isEdit ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          credentials: "include",
          body: JSON.stringify(formData),
        },
      )

      if (!res.ok) throw new Error("Error al guardar el departamento")

      setMessage({
        type: "success",
        text: isEdit ? "Departamento actualizado exitosamente" : "Departamento creado exitosamente",
      })
      setTimeout(() => navigate(-1), 1500)
    } catch (err: any) {
      setMessage({ type: "error", text: err.message })
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Loader />

  return (
    <div className={`min-h-screen px-6 py-8 transition-colors ${
      isDarkMode
        ? 'bg-gray-900 text-white'
        : 'bg-gray-100 text-gray-900'
    }`}>
      <div className={`max-w-3xl mx-auto border rounded-xl p-6 space-y-6 transition-colors ${
        isDarkMode
          ? 'bg-gray-800 border-gray-700'
          : 'bg-white border-gray-200'
      }`}>
        {message && (
          <div
            className={`p-4 rounded-lg border flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 transition-colors ${
              message.type === "success"
                ? isDarkMode
                  ? "bg-green-900/30 border-green-600 text-green-300"
                  : "bg-green-100 border-green-400 text-green-800"
                : isDarkMode
                ? "bg-red-900/30 border-red-600 text-red-300"
                : "bg-red-100 border-red-400 text-red-800"
            }`}
          >
            <div className="flex-shrink-0">
              {message.type === "success" ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 001.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
            <p className="font-medium">{message.text}</p>
          </div>
        )}

        <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          {isEdit
            ? `Editar departamento de ${selectedCompany?.name}`
            : `Crear Departamento para ${selectedCompany?.name}`}
        </h1>

        {/* Selector de Compañía */}
        <InputNode
          label="Compañia *"
          value={formData.companyId}
          disabled={true}
          onChange={(value) => setFormData({ ...formData, description: value })}
          placeholder="Comapñia asignada"
        />

        <InputNode
          label="Nombre del Departamento *"
          value={formData.name}
          onChange={(value) => setFormData({ ...formData, name: value })}
          required
          placeholder="Ej: Recursos Humanos"
        />

        <InputNode
          label="Descripción"
          value={formData.description}
          onChange={(value) => setFormData({ ...formData, description: value })}
          placeholder="Descripción del departamento (opcional)"
        />

        {/* Estado Activo */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            className={`cursor-pointer ${isDarkMode ? 'accent-blue-600' : 'accent-blue-500'}`}
          />
          <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Departamento activo
          </span>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            onClick={() => navigate(-1)}
            className={`flex-1 py-2 rounded-lg transition-colors ${
              isDarkMode
                ? 'bg-gray-700 hover:bg-gray-600'
                : 'bg-gray-300 hover:bg-gray-400'
            } ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className={`flex-1 py-2 rounded-lg transition-colors disabled:opacity-50 ${
              isDarkMode
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {loading ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  )
}