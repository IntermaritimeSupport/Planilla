"use client"

import React, { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import Loader from "../../../../components/loaders/loader"
import { useCompany } from "../../../../context/routerContext"

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

                const token =
                    localStorage.getItem("authToken") ||
                    sessionStorage.getItem("authToken")

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

            const token =
                localStorage.getItem("authToken") ||
                sessionStorage.getItem("authToken")

            const res = await fetch(
                isEdit
                    ? `${VITE_API_URL}/api/companies/${id}`
                    : `${VITE_API_URL}/api/companies`,
                {
                    method: isEdit ? "PUT" : "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: token ? `Bearer ${token}` : "",
                    },
                    credentials: "include",
                    body: JSON.stringify(formData),
                }
            )

            if (!res.ok) throw new Error("Error al guardar la compañía")

            navigate(`${selectedCompany?.code}/settings/companies/all`)
        } catch (err: any) {
            alert(err.message)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <Loader />

    return (
        <div className="min-h-screen bg-gray-900 text-white px-6 py-8">
            <div className="max-w-3xl mx-auto bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-6">
                <h1 className="text-2xl font-bold">
                    {isEdit ? "Editar Compañía" : "Crear Compañía"}
                </h1>

                {/* Logo */}
                <div>
                    <label className="block text-sm text-gray-300 mb-2">Logo</label>
                    <div className="flex items-center gap-4">
                        {logoPreview && (
                            <img
                                src={logoPreview}
                                className="h-24 w-24 object-cover rounded-lg border border-gray-600"
                            />
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoChange}
                            className="bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600"
                        />
                    </div>
                </div>

                {/* Inputs */}
                {[
                    ["Nombre *", "name"],
                    ["Código", "code"],
                    ["RUC", "ruc"],
                    ["Email", "email"],
                    ["Teléfono", "phone"],
                    ["Dirección", "address"],
                ].map(([label, key]) => (
                    <div key={key}>
                        <label className="block text-sm text-gray-300 mb-1">{label}</label>
                        <input
                            value={(formData as any)[key]}
                            onChange={(e) =>
                                setFormData({ ...formData, [key]: e.target.value })
                            }
                            className="w-full bg-gray-700 px-3 py-2 rounded-lg border border-gray-600"
                        />
                    </div>
                ))}

                {/* Active */}
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) =>
                            setFormData({ ...formData, isActive: e.target.checked })
                        }
                    />
                    <span className="text-sm">Compañía activa</span>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded-lg"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 py-2 rounded-lg"
                    >
                        Guardar
                    </button>
                </div>
            </div>
        </div>
    )
}
