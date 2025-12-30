"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useCompany } from "../../../../context/routerContext"

const API_URL = import.meta.env.VITE_API_URL

// ================================
// Enums (COMPATIBLES CON PRISMA)
// ================================
export enum PaymentFrequency {
  Annual = "Annual",
  Monthly = "Monthly",
}

export const PaymentFrequencyLabels: Record<PaymentFrequency, string> = {
  Annual: "Anual",
  Monthly: "Mensual",
}

export enum ExpenseStatus {
  Active = "Active",
  Inactive = "Inactive",
  Pending = "Pending",
  Canceled = "Canceled",
  Expired = "Expired",
}

export const ExpenseStatusLabels: Record<ExpenseStatus, string> = {
  Active: "Activo",
  Inactive: "Inactivo",
  Pending: "Pendiente",
  Canceled: "Cancelado",
  Expired: "Expirado",
}

export enum SoftwareCategory {
  Accounting = "Accounting",
  CRM = "CRM",
  Antivirus = "Antivirus",
  Productivity = "Productivity",
  Design = "Design",
  Development = "Development",
  HRManagement = "HRManagement",
  Marketing = "Marketing",
  Communication = "Communication",
  CloudStorage = "CloudStorage",
  OperatingSystem = "OperatingSystem",
  Other = "Other",
}

export const SoftwareCategoryLabels: Record<SoftwareCategory, string> = {
  Accounting: "Contabilidad",
  CRM: "CRM",
  Antivirus: "Antivirus",
  Productivity: "Productividad",
  Design: "Diseño",
  Development: "Desarrollo",
  HRManagement: "Gestión RRHH",
  Marketing: "Marketing",
  Communication: "Comunicación",
  CloudStorage: "Almacenamiento en la Nube",
  OperatingSystem: "Sistema Operativo",
  Other: "Otro",
}

// ================================
// Page Component
// ================================
export default function UpdateExpensePage() {
  const navigate = useNavigate()
  const { selectedCompany } = useCompany()
  const [form, setForm] = useState({
    applicationName: "",
    provider: "",
    category: "" as SoftwareCategory | "",
    status: ExpenseStatus.Active,
    annualCost: 0,
    numberOfUsers: 0,
    costPerUser: 0,
    renewalDate: "",
    paymentFrequency: PaymentFrequency.Annual,
    additionalNotes: "",
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // ================================
  // Auto cálculo costo por usuario
  // ================================
  useEffect(() => {
    if (form.annualCost > 0 && form.numberOfUsers > 0) {
      setForm((prev) => ({
        ...prev,
        costPerUser: Number(
          (prev.annualCost / prev.numberOfUsers).toFixed(2)
        ),
      }))
    } else {
      setForm((prev) => ({ ...prev, costPerUser: 0 }))
    }
  }, [form.annualCost, form.numberOfUsers])

  // ================================
  // Submit
  // ================================
  const submit = async () => {
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      const payload = {
        ...form,
        renewalDate: form.renewalDate || null,
      }

      const res = await fetch(
        `${API_URL}/api/annual-software-expense/create`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      )

      const data: any = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || "Error al crear el gasto.")
      }


      setSuccess("Gasto creado correctamente ✅")

      // redirige luego de crear
      setTimeout(() => {
        navigate(`/${selectedCompany?.code}/devices/all`)
      }, 1200)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full text-white">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold">Agregar Nuevo Gasto</h1>
          <p className="text-sm text-gray-400">
            Registra una suscripción o aplicación empresarial
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-red-900/40 border border-red-700 text-red-300 px-4 py-2 rounded-lg text-sm">
            ❌ {error}
          </div>
        )}

        {success && (
          <div className="bg-green-900/40 border border-green-700 text-green-300 px-4 py-2 rounded-lg text-sm">
            ✅ {success}
          </div>
        )}

        {/* Form */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              placeholder="Nombre de la aplicación"
              className="rounded-lg p-2 bg-gray-800 border border-gray-700"
              value={form.applicationName}
              onChange={(e) =>
                setForm({ ...form, applicationName: e.target.value })
              }
            />

            <input
              placeholder="Proveedor"
              className="rounded-lg p-2 bg-gray-800 border border-gray-700"
              value={form.provider}
              onChange={(e) =>
                setForm({ ...form, provider: e.target.value })
              }
            />

            <select
              className="rounded-lg p-2 bg-gray-800 border border-gray-700"
              value={form.category}
              onChange={(e) =>
                setForm({
                  ...form,
                  category: e.target.value as SoftwareCategory,
                })
              }
            >
              <option value="">Selecciona categoría</option>
              {Object.values(SoftwareCategory).map((value) => (
                <option key={value} value={value}>
                  {SoftwareCategoryLabels[value]}
                </option>
              ))}
            </select>

            <select
              className="rounded-lg p-2 bg-gray-800 border border-gray-700"
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as ExpenseStatus })
              }
            >
              {Object.values(ExpenseStatus).map((value) => (
                <option key={value} value={value}>
                  {ExpenseStatusLabels[value]}
                </option>
              ))}
            </select>

            <input
              type="number"
              placeholder="Costo anual"
              className="rounded-lg p-2 bg-gray-800 border border-gray-700"
              value={form.annualCost}
              onChange={(e) =>
                setForm({ ...form, annualCost: Number(e.target.value) })
              }
            />

            <input
              type="number"
              placeholder="Usuarios"
              className="rounded-lg p-2 bg-gray-800 border border-gray-700"
              value={form.numberOfUsers}
              onChange={(e) =>
                setForm({ ...form, numberOfUsers: Number(e.target.value) })
              }
            />

            <input
              readOnly
              className="rounded-lg p-2 bg-gray-700 border border-gray-600"
              value={`$ ${form.costPerUser}`}
            />

            <input
              type="date"
              className="rounded-lg p-2 bg-gray-800 border border-gray-700"
              value={form.renewalDate}
              onChange={(e) =>
                setForm({ ...form, renewalDate: e.target.value })
              }
            />

            <select
              className="rounded-lg p-2 bg-gray-800 border border-gray-700"
              value={form.paymentFrequency}
              onChange={(e) =>
                setForm({
                  ...form,
                  paymentFrequency: e.target.value as PaymentFrequency,
                })
              }
            >
              {Object.values(PaymentFrequency).map((value) => (
                <option key={value} value={value}>
                  {PaymentFrequencyLabels[value]}
                </option>
              ))}
            </select>
          </div>

          <textarea
            rows={3}
            placeholder="Notas adicionales"
            className="w-full rounded-lg p-2 bg-gray-800 border border-gray-700"
            value={form.additionalNotes}
            onChange={(e) =>
              setForm({ ...form, additionalNotes: e.target.value })
            }
          />

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-4">
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 border border-gray-700 rounded-lg"
            >
              Cancelar
            </button>

            <button
              onClick={submit}
              disabled={loading}
              className="px-4 py-2 bg-white text-black rounded-lg disabled:opacity-50"
            >
              {loading ? "Guardando..." : "Agregar Gasto"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
