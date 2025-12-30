"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useCompany } from "../../../../context/routerContext"
import { useParams, useNavigate } from "react-router-dom"
import { AlertCircle, CheckCircle, Clock, AlertTriangle } from "lucide-react"
import { Notification } from "../components/notification"
import useUserProfile from "../../../../hook/userUserProfile"

export default function EditTicketPage() {
  const { selectedCompany } = useCompany()
  const {profile} = useUserProfile()
  console.log("User Profile:", profile?.id);
  const { id } = useParams()
  const router = useNavigate()

  const [isCreating, setIsCreating] = useState(!id)
  const [ticket, setTicket] = useState<any>(null)
  const [loading, setLoading] = useState(!isCreating)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null)
  const [users, setUsers] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  const API = import.meta.env.VITE_API_URL

  const emptyTicket = {
    title: "",
    description: "",
    img: "",
    comment: "",
    type: "ticket",
    priority: "medium",
    status: "open",
    startDate: "",
    endDate: "",
    requestDays: 0,
    approvedDays: 0,
    reviewed: false,
    view: false,
    sendToId: "",
  }

  // ============================
  //  LOAD USERS
  // ============================
  useEffect(() => {
    const fetchUsers = async () => {
      if (!selectedCompany?.id) return

      setLoadingUsers(true)
      try {
        const res = await fetch(`${API}/api/users/full/${selectedCompany.id}`)
        if (res.ok) {
          const data = await res.json()
          setUsers(data.users || data || [])
        }
      } catch (err) {
        console.error("Error loading users:", err)
      } finally {
        setLoadingUsers(false)
      }
    }

    fetchUsers()
  }, [selectedCompany?.id, API])

  // ============================
  //  LOAD DATA OR CREATE MODE
  // ============================
  useEffect(() => {
    if (!id) {
    setIsCreating(true)
    setTicket({
      ...emptyTicket,
      sendById: profile?.id || "",
    })
      setLoading(false)
      return
    }

    const fetchTicket = async () => {
      try {
        const res = await fetch(`${API}/api/companies/tickets/${selectedCompany?.id}/${id}`)
        if (!res.ok) {
          setIsCreating(true)
          setTicket(emptyTicket)
          return
        }

        const data = await res.json()
        setTicket(data.ticket || data)
      } catch (err) {
        console.error(err)
        setIsCreating(true)
        setTicket(emptyTicket)
      } finally {
        setLoading(false)
      }
    }

    if (selectedCompany?.id) fetchTicket()
  }, [id, selectedCompany])

  const handleChange = (field: string, value: any) => {
    setTicket((prev: any) => ({
      ...prev,
      [field]: value,
    }))
  }

  // ============================
  //        SAVE / CREATE
  // ============================
  const saveChanges = async () => {
    setSaving(true)
    setError(null)

    try {
      const method = isCreating ? "POST" : "PUT"
      const url = isCreating
        ? `${API}/api/companies/tickets/${selectedCompany?.id}/create`
        : `${API}/api/companies/tickets/${selectedCompany?.id}/${id}`

      const body = {
        title: ticket.title,
        description: ticket.description,
        img: ticket.img || null,
        comment: ticket.comment || null,
        type: ticket.type,
        priority: ticket.priority,
        status: ticket.status,
        startDate: ticket.startDate ? new Date(ticket.startDate).toISOString() : null,
        endDate: ticket.endDate ? new Date(ticket.endDate).toISOString() : null,
        requestDays: ticket.requestDays || 0,
        approvedDays: ticket.approvedDays || 0,
        reviewed: ticket.reviewed || false,
        view: ticket.view || false,
        sendTo: ticket.sendToId || null,
        sendBy: ticket.sendById || profile?.id,
      }
      console.log(body)
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error(isCreating ? "Error al crear ticket" : "Error al actualizar ticket")

      setNotification({
        message: isCreating ? "Ticket creado exitosamente" : "Cambios guardados exitosamente",
        type: "success",
      })

      setTimeout(() => {
        router(`/${selectedCompany?.id}/tickets/all`)
      }, 2000)
    } catch (err) {
      // console.error(err)
      setError(isCreating ? "Error al crear el ticket" : "Error al guardar los cambios")
      setNotification({
        message: isCreating ? "Error al crear el ticket" : "Error al guardar los cambios",
        type: "error",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading || !ticket) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-slate-400">Cargando ticket...</p>
        </div>
      </div>
    )
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "urgent": return <AlertTriangle className="h-4 w-4" />
      case "high": return <AlertCircle className="h-4 w-4" />
      case "medium": return <Clock className="h-4 w-4" />
      default: return <CheckCircle className="h-4 w-4" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-500/20 text-red-400 border-red-500/30"
      case "high": return "bg-orange-500/20 text-orange-400 border-orange-500/30"
      case "medium": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      default: return "bg-green-500/20 text-green-400 border-green-500/30"
    }
  }

  return (
    <div className="bg-slate-900">
      {notification && (
        <Notification message={notification?.message} type={notification?.type} onClose={() => setNotification(null)} />
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-2 md:px-6 h-[90vh]">
        {error && (
          <div className="mb-6 p-3 md:p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
            <p className="text-sm md:text-base text-red-400">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Form - Scrollable */}
          <div className="lg:col-span-2 space-y-5 md:space-y-6 md:overflow-y-auto md:pr-4 md:max-h-[calc(90vh)] md:py-6">
            {/* Información básica */}
            <FormSection title={isCreating ? "Crear Ticket" : "Editar Ticket"} description={`Ticket No.${ticket?.ticketNumber} enviado por: ${ticket?.sendBy?.username || "n/a"}` || "Sin título"}>
              <div className="space-y-4">
                <FormField label="Título" required>
                  <input
                    type="text"
                    value={ticket?.title || ""}
                    onChange={(e) => handleChange("title", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Título del ticket"
                    required
                  />
                </FormField>

                <FormField label="Descripción" required>
                  <textarea
                    value={ticket?.description || ""}
                    onChange={(e) => handleChange("description", e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                    placeholder="Descripción detallada del ticket"
                    required
                  />
                </FormField>

                <FormField label="Comentario">
                  <textarea
                    value={ticket?.comment || ""}
                    onChange={(e) => handleChange("comment", e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                    placeholder="Comentarios adicionales"
                  />
                </FormField>

                <FormField label="Imagen (URL)">
                  <input
                    type="text"
                    value={ticket?.img || ""}
                    onChange={(e) => handleChange("img", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="https://..."
                  />
                </FormField>
              </div>
            </FormSection>

            {/* Estado y tipo */}
            <FormSection title="Estado y clasificación" description="Prioridad, estado y tipo de solicitud">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Prioridad" required>
                  <select
                    value={ticket?.priority}
                    onChange={(e) => handleChange("priority", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
                  >
                    <option value="trivial">⚪ Trivial</option>
                    <option value="low">🟢 Baja</option>
                    <option value="medium">🟡 Media</option>
                    <option value="high">🟠 Alta</option>
                    <option value="urgent">🔴 Urgente</option>
                  </select>
                </FormField>

                <FormField label="Tipo" required>
                  <select
                    value={ticket?.type}
                    onChange={(e) => handleChange("type", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
                  >
                    <option value="ticket">Ticket</option>
                    <option value="vacations">Vacaciones</option>
                    <option value="permission">Permiso</option>
                  </select>
                </FormField>

                <FormField label="Estado" required>
                  <select
                    value={ticket?.status}
                    onChange={(e) => handleChange("status", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer md:col-span-2"
                  >
                    <option value="open">Abierto</option>
                    <option value="pending">Pendiente</option>
                    <option value="in_progress">En Progreso</option>
                    <option value="approved">Aprobado</option>
                    <option value="rejected">Rechazado</option>
                    <option value="closed">Cerrado</option>
                  </select>
                </FormField>
              </div>
            </FormSection>

            {/* Fechas y días */}
            <FormSection title="Fechas y duración" description="Período y días solicitados">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Fecha inicio">
                    <input
                      type="date"
                      value={ticket?.startDate?.substring(0, 10) || ""}
                      onChange={(e) => handleChange("startDate", e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </FormField>

                  <FormField label="Fecha fin">
                    <input
                      type="date"
                      value={ticket?.endDate?.substring(0, 10) || ""}
                      onChange={(e) => handleChange("endDate", e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </FormField>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Días solicitados">
                    <input
                      type="number"
                      value={ticket?.requestDays ?? ""}
                      onChange={(e) => handleChange("requestDays", Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="0"
                    />
                  </FormField>

                  <FormField label="Días aprobados">
                    <input
                      type="number"
                      value={ticket?.approvedDays ?? ""}
                      onChange={(e) => handleChange("approvedDays", Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="0"
                    />
                  </FormField>
                </div>
              </div>
            </FormSection>

            {/* Asignación */}
            <FormSection title="Asignación" description="Asignar a otro usuario">
              <FormField label="Asignar a">
                <select
                  value={ticket?.sendToId || ""}
                  onChange={e => handleChange("sendToId", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
                  disabled={loadingUsers}
                >
                  <option value="">Sin asignar</option>
                  {users.map((u) => (
                    <option key={u?.id} value={u?.id}>
                      {u?.username}
                    </option>
                  ))}
                </select>
              </FormField>
            </FormSection>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6 md:py-6">
            {/* Checkboxes */}
            <FormSection title="Estados adicionales">
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={ticket?.reviewed || false}
                    onChange={(e) => handleChange("reviewed", e.target.checked)}
                    className="w-5 h-5 rounded border border-slate-600 bg-slate-700 text-blue-500 focus:ring-2 focus:ring-blue-500 cursor-pointer accent-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                    Revisado
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={ticket?.view || false}
                    onChange={(e) => handleChange("view", e.target.checked)}
                    className="w-5 h-5 rounded border border-slate-600 bg-slate-700 text-blue-500 focus:ring-2 focus:ring-blue-500 cursor-pointer accent-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                    Visto
                  </span>
                </label>
              </div>
            </FormSection>

            {/* Resumen */}
            <FormSection title="Resumen">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Tipo:</span>
                  <span className="font-medium text-white capitalize">{ticket?.type}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Estado:</span>
                  <span className="font-medium text-white capitalize">{ticket?.status}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Prioridad:</span>
                  {!isCreating && (
                    <div className={`px-4 py-1.5 rounded-full border ${getPriorityColor(ticket?.priority)} flex items-center gap-2 text-sm font-medium`}>
                      {getPriorityIcon(ticket?.priority)}
                      <span className="capitalize">{ticket?.priority}</span>
                    </div>
                  )}
                </div>
                <div className="h-px bg-slate-700 my-3"></div>
                {!isCreating && <p className="text-xs text-slate-500">#{ticket?.ticketNumber}</p>}
              </div>
            </FormSection>

            {/* Action Buttons */}
            <div className="md:sticky bottom-6 space-y-3">
              <button
                onClick={saveChanges}
                disabled={saving}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-blue-500/50"
              >
                {saving
                  ? isCreating
                    ? "Creando..."
                    : "Guardando..."
                  : isCreating
                    ? "✓ Crear ticket"
                    : "✓ Guardar cambios"}
              </button>
              <button
                onClick={() => router(-1)}
                className="w-full px-4 py-3 bg-slate-700 text-slate-100 font-semibold rounded-lg hover:bg-slate-600 transition-all shadow-md hover:shadow-slate-700/30"
              >
                ✕ Cancelar
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 md:p-6">
      <div className="mb-4 md:mb-6">
        <h2 className="text-base md:text-lg font-semibold text-white mb-1">{title}</h2>
        {description && <p className="text-xs md:text-sm text-slate-400">{description}</p>}
      </div>
      {children}
    </div>
  )
}

function FormField({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs md:text-sm font-medium text-slate-300 mb-2">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
    </div>
  )
}