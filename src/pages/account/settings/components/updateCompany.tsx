"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useTheme } from "../../../../context/themeContext"
import Loader from "../../../../components/loaders/loader"
import { useCompany } from "../../../../context/routerContext"
import { InputNode } from "./input-node"

const VITE_API_URL = import.meta.env.VITE_API_URL

interface FormData {
  name: string
  code: string
  address: string
  phone: string
  email: string
  ruc: string
  logoUrl: string
  isActive: boolean
}

export default function UpdateCompany() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { isDarkMode } = useTheme()
  const isEdit = Boolean(id)
  const { selectedCompany } = useCompany()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    name: "",
    code: "",
    address: "",
    phone: "",
    email: "",
    ruc: "",
    logoUrl: "",
    isActive: true,
  })

  const [logoPreview, setLogoPreview] = useState<string>("")

  // ===============================
  // Load company (EDIT MODE)
  // ===============================
  useEffect(() => {
    if (!id) return

    const loadCompany = async () => {
      try {
        setLoading(true)

        const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken")

        const res = await fetch(`${VITE_API_URL}/api/companies/${id}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          credentials: "include",
        })

        if (!res.ok) throw new Error("Error al cargar la compañía")

        const data = await res.json()

        setFormData({
          name: data.name,
          code: data.code,
          address: data.address || "",
          phone: data.phone || "",
          email: data.email || "",
          ruc: data.ruc || "",
          logoUrl: data.logoUrl || "",
          isActive: data.isActive,
        })

        setLogoPreview(data.logoUrl || "")
      } catch (err: any) {
        alert(err.message)
        navigate(-1)
      } finally {
        setLoading(false)
      }
    }

    loadCompany()
  }, [id, navigate])

  // ===============================
  // Logo
  // ===============================
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      setLogoPreview(result)
      setFormData((prev) => ({ ...prev, logoUrl: result }))
    }
    reader.readAsDataURL(file)
  }

  // ===============================
  // Save
  // ===============================
  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert("El nombre es requerido")
      return
    }

    try {
      setLoading(true)

      const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken")

      const res = await fetch(isEdit ? `${VITE_API_URL}/api/companies/${id}` : `${VITE_API_URL}/api/companies/create`, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        credentials: "include",
        body: JSON.stringify(formData),
      })

      if (!res.ok) throw new Error("Error al guardar la compañía")

      navigate(`/${selectedCompany?.code}/settings/all`)
    } catch (err: any) {
      alert(err.message)
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
        <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          {isEdit ? "Editar Compañía" : "Crear Compañía"}
        </h1>

        {/* Logo */}
        <div>
          <label className={`block text-sm mb-2 transition-colors ${
            isDarkMode
              ? 'text-gray-300'
              : 'text-gray-700'
          }`}>
            Logo
          </label>
          <div className="flex items-center gap-4">
            {logoPreview && (
              <img
                src={logoPreview || "/placeholder.svg"}
                className={`h-24 w-24 object-cover rounded-lg border transition-colors ${
                  isDarkMode
                    ? 'border-gray-600'
                    : 'border-gray-300'
                }`}
              />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className={`px-3 py-2 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-gray-100 border-gray-300 text-gray-900'
              }`}
              disabled
            />
          </div>
        </div>

        {/* Inputs */}
        <InputNode
          label="Nombre"
          value={formData.name}
          onChange={(value) => setFormData({ ...formData, name: value })}
          required
        />

        <InputNode
          label="Código"
          value={formData.code}
          onChange={(value) => setFormData({ ...formData, code: value })}
          disabled
        />

        <InputNode 
          label="RUC" 
          value={formData.ruc} 
          onChange={(value) => setFormData({ ...formData, ruc: value })} 
        />

        <InputNode
          label="Email"
          value={formData.email}
          onChange={(value) => setFormData({ ...formData, email: value })}
          type="email"
        />

        <InputNode
          label="Teléfono"
          value={formData.phone}
          onChange={(value) => setFormData({ ...formData, phone: value })}
          type="tel"
        />

        <InputNode
          label="Dirección"
          value={formData.address}
          onChange={(value) => setFormData({ ...formData, address: value })}
        />

        {/* Active */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            className={`cursor-pointer ${isDarkMode ? 'accent-blue-600' : 'accent-blue-500'}`}
          />
          <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Compañía activa
          </span>
        </div>

        {/* Actions */}
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
            className={`flex-1 py-2 rounded-lg transition-colors ${
              isDarkMode
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}