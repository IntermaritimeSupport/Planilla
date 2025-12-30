"use client"

import { useState, useEffect, useMemo } from "react"
import useSWR, { mutate } from "swr"
import Loader from "../../../../components/loaders/loader"
import { Company, useCompany } from "../../../../context/routerContext"
import { usePageName } from "../../../../hook/usePageName"
import PagesHeader from "../../../../components/headers/pagesHeader"
import { useSearch } from "../../../../context/searchContext"
import Tabla from "../../../../components/tables/Table"
import { X } from "lucide-react"
import * as XLSX from 'xlsx'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

// ==================== USERS ====================
export interface UsuarioFull {
  id: string
  username: string
  email: string
  role: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  companyId: string | null
  person: {
    id: string
    userId: string
    firstName: string
    lastName: string
    fullName: string
    contactEmail: string
    phoneNumber: string
    departmentId: string
    position: string
    status: "Con Equipos" | "Sin Equipos"
    userCode: string
    createdAt: string
    updatedAt: string
    department: {
      id: string
      name: string
      description: string
      companyId: string
      isActive: boolean
    } | null
  }
}

type NotificationType = "success" | "error"

interface Notification {
  type: NotificationType
  message: string
  show: boolean
}

interface DeleteConfirmation {
  show: boolean
  user: UsuarioFull | null
  isDeleting: boolean
}

const getAvatarColor = (nombre: string) => {
  const colors = ["bg-blue-600", "bg-green-600", "bg-purple-600", "bg-orange-600", "bg-pink-600", "bg-indigo-600", "bg-teal-600", "bg-red-600"]
  const index = nombre?.length % colors?.length
  return colors[index]
}

const getStatusBadge = (user: UsuarioFull) => {
  if (user.person?.status === "Con Equipos") return "bg-blue-600 text-blue-100"
  if (user.isActive) return "bg-green-600 text-green-100"
  return "bg-red-600 text-red-100"
}

export const AllUsers: React.FC = () => {
  const { selectedCompany }: { selectedCompany: Company | null } = useCompany()
  const { data, error, isLoading } = useSWR<UsuarioFull[]>(`${import.meta.env.VITE_API_URL}/api/users/full/${selectedCompany?.id}`, fetcher)
  const { pageName } = usePageName()
  const { search } = useSearch()
  const [statusFilter, setStatusFilter] = useState("Todos")
  const [notification, setNotification] = useState<Notification>({ type: "success", message: "", show: false })
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation>({ show: false, user: null, isDeleting: false })

  const showNotification = (type: NotificationType, message: string) => {
    setNotification({ type, message, show: true })
  }

  useEffect(() => {
    if (notification.show) {
      const timer = setTimeout(() => setNotification((prev) => ({ ...prev, show: false })), 5000)
      return () => clearTimeout(timer)
    }
  }, [notification.show])

  const openDeleteConfirmation = (user: UsuarioFull) => {
    setDeleteConfirmation({ show: true, user, isDeleting: false })
  }

  const closeDeleteConfirmation = () => {
    if (!deleteConfirmation.isDeleting) {
      setDeleteConfirmation({ show: false, user: null, isDeleting: false })
    }
  }

  const deleteUser = async () => {
    if (!deleteConfirmation.user) return
    setDeleteConfirmation((prev) => ({ ...prev, isDeleting: true }))

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users/delete/${deleteConfirmation?.user?.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Error al eliminar el usuario")
      }

      mutate(`${import.meta.env.VITE_API_URL}/api/users/full/${selectedCompany?.id}`)
      showNotification("success", `Usuario ${deleteConfirmation.user.person.fullName} eliminado exitosamente`)
      closeDeleteConfirmation()
    } catch (error: any) {
      console.error("Error al eliminar usuario:", error)
      showNotification("error", error.message || "Error inesperado al eliminar el usuario")
      setDeleteConfirmation((prev) => ({ ...prev, isDeleting: false }))
    }
  }

  const filteredUsers = useMemo(() => {
    if (!data || !Array.isArray(data)) return []

    return data.filter((user) => {
      const statusMatch =
        statusFilter === "Todos" ||
        (statusFilter === "Activos" && user?.isActive) ||
        (statusFilter === "Inactivos" && !user?.isActive) ||
        (statusFilter === "Con Equipos" && user.person?.status === "Con Equipos") ||
        (statusFilter === "Sin Equipos" && user.person?.status === "Sin Equipos")

      const searchMatch =
        search.trim() === "" ||
        user?.person?.fullName.toLowerCase().includes(search.toLowerCase()) ||
        user?.email?.toLowerCase().includes(search.toLowerCase()) ||
        user?.person?.department?.name?.toLowerCase().includes(search.toLowerCase()) ||
        user?.person?.position?.toLowerCase().includes(search.toLowerCase())

      return statusMatch && searchMatch
    })
  }, [data, search, statusFilter])

  const columnConfig = {
    "fullName": (item: UsuarioFull) => (
      <div className="flex items-center space-x-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm ${getAvatarColor(item?.person?.fullName)}`}>
          {item?.person?.fullName.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="font-medium text-sm">{item?.person?.fullName}</div>
          <div className="text-xs text-gray-400">{item?.id}</div>
        </div>
      </div>
    ),
    "email": (item: UsuarioFull) => (
      <div className="text-sm">
        <div className="flex items-center space-x-1 mb-1">
          <span>{item.email}</span>
        </div>
        <div className="flex items-center space-x-1">
          <span>{item?.person?.phoneNumber}</span>
        </div>
      </div>
    ),
    "department": (item: UsuarioFull) => (
      <div>
        <div className="font-medium text-sm">{item.person?.department?.name || "Sin departamento"}</div>
        <div className="text-xs text-gray-400">{item.person?.position}</div>
      </div>
    ),
    "isActive": (item: UsuarioFull) => (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(item)}`}>
        {item.isActive ? "Activo" : "Inactivo"}
      </span>
    ),
  }

  if (isLoading) return <Loader />
  if (error || !data) return <div className="text-center p-8 text-red-500">Error al cargar usuarios</div>

  const totalUsers = data?.length || 0
  const activeUsers = data?.filter((u) => u.isActive).length || 0
  const usersWithEquipment = data?.filter((u) => u.person?.status === "Con Equipos").length || 0
  const departments = Array.from(new Set(data?.map((u) => u.person?.department?.name).filter(Boolean))).length || 0

  return (
    <div className="relative bg-gray-900 text-white">
      <PagesHeader
        title={pageName}
        description={pageName ? `${pageName} in ${selectedCompany?.name}` : "Cargando compañía..."}
        showCreate
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <span className="text-gray-400 text-sm">Total Usuarios</span>
          <div className="text-3xl font-bold mb-1">{totalUsers}</div>
          <div className="text-sm text-gray-400">Registrados en el sistema</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <span className="text-gray-400 text-sm">Usuarios Activos</span>
          <div className="text-3xl font-bold mb-1">{activeUsers}</div>
          <div className="text-sm text-gray-400">Con acceso al sistema</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <span className="text-gray-400 text-sm">Con Equipos</span>
          <div className="text-3xl font-bold mb-1">{usersWithEquipment}</div>
          <div className="text-sm text-gray-400">Tienen equipos asignados</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <span className="text-gray-400 text-sm">Departamentos</span>
          <div className="text-3xl font-bold mb-1">{departments}</div>
          <div className="text-sm text-gray-400">Diferentes áreas</div>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 mb-8">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold mb-2">Lista de Usuarios</h2>
          <p className="text-gray-400 text-sm mb-6">{filteredUsers?.length} de {data?.length || 0} usuarios encontrados</p>

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <select
              className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white appearance-none cursor-pointer hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option>Todos</option>
              <option>Activos</option>
              <option>Inactivos</option>
              <option>Con Equipos</option>
              <option>Sin Equipos</option>
            </select>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <p className="text-white font-medium">No se encontraron usuarios</p>
            </div>
          ) : (
            <Tabla
              datos={filteredUsers}
              titulo=""
              columnasPersonalizadas={columnConfig}
              onEditar={(item) => window.location.href = `edit/${item.id}`}
              onEliminar={openDeleteConfirmation}
              mostrarAcciones={true}
            />
          )}
        </div>
      </div>

      {/* Delete Modal */}
      {deleteConfirmation.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">Confirmar Eliminación</h3>
              <button onClick={closeDeleteConfirmation} disabled={deleteConfirmation.isDeleting} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-300 mb-2">¿Estás seguro de que deseas eliminar al usuario:</p>
              <div className="bg-gray-700 rounded-lg p-3 border border-gray-600">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-sm ${getAvatarColor(deleteConfirmation.user?.person.fullName || "")}`}>
                    {deleteConfirmation.user?.person.fullName?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-sm text-white">{deleteConfirmation.user?.person.fullName}</div>
                    <div className="text-xs text-gray-400">{deleteConfirmation.user?.email}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button onClick={closeDeleteConfirmation} disabled={deleteConfirmation.isDeleting} className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 text-white rounded-lg">
                Cancelar
              </button>
              <button onClick={deleteUser} disabled={deleteConfirmation.isDeleting} className="flex-1 flex items-center justify-center px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg">
                {deleteConfirmation.isDeleting ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification.show && (
        <div className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4 rounded-lg p-4 shadow-lg border ${notification.type === "success" ? "bg-green-800 border-green-600 text-green-100" : "bg-red-800 border-red-600 text-red-100"}`}>
          <p className="text-sm font-medium">{notification.message}</p>
        </div>
      )}
    </div>
  )
}

// ==================== TICKETS ====================
export interface Ticket {
  id: string
  ticketNumber: number
  title: string
  description: string
  status: string
  priority: string
  createdAt: Date
  updatedAt: Date
  companyId: string
}

const getStatusBadgeTicket = (status: string) => {
  switch (status) {
    case "open": return "bg-yellow-600 text-yellow-100"
    case "pending": return "bg-purple-600 text-purple-100"
    case "approved": return "bg-green-600 text-green-100"
    case "rejected": return "bg-red-600 text-red-100"
    case "closed": return "bg-red-600 text-red-100"
    default: return "bg-gray-600 text-gray-100"
  }
}

const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case "urgent": return "bg-red-600 text-red-100"
    case "high": return "bg-orange-600 text-orange-100"
    case "medium": return "bg-yellow-600 text-yellow-100"
    case "low": return "bg-green-600 text-green-100"
    case "trivial": return "bg-gray-600 text-gray-100"
    default: return "bg-gray-600 text-gray-100"
  }
}

interface TicketDeleteConfirmation {
  show: boolean
  ticket: Ticket | null
  isDeleting: boolean
}

export const AllTickets: React.FC = () => {
  const { search } = useSearch()
  const { selectedCompany } = useCompany()
  const { pageName } = usePageName()
  const [activeTab, setActiveTab] = useState("Todos")
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState<TicketDeleteConfirmation>({ show: false, ticket: null, isDeleting: false })
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type })
  }

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  useEffect(() => {
    if (!selectedCompany?.id) {
      setLoading(false)
      return
    }

    const fetchTickets = async () => {
      try {
        setLoading(true)
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/companies/tickets/${selectedCompany.id}/all`)

        if (!res.ok) throw new Error(`Error al cargar tickets: ${res.status}`)

        let fetchedTickets = await res.json()
        if (fetchedTickets.ticket) fetchedTickets = Array.isArray(fetchedTickets.ticket) ? fetchedTickets.ticket : [fetchedTickets.ticket]
        if (fetchedTickets.data) fetchedTickets = fetchedTickets.data
        if (!Array.isArray(fetchedTickets)) fetchedTickets = []

        fetchedTickets = fetchedTickets.map((ticket: any) => ({
          ...ticket,
          createdAt: new Date(ticket.createdAt),
          updatedAt: new Date(ticket.updatedAt),
        }))

        setTickets(fetchedTickets)
      } catch (error) {
        console.error("Error al cargar tickets:", error)
        showNotification("Error al cargar tickets", 'error')
      } finally {
        setLoading(false)
      }
    }

    fetchTickets()
  }, [selectedCompany?.id])

  const openDeleteModal = (ticket: Ticket) => {
    setDeleteConfirmation({ show: true, ticket, isDeleting: false })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmation.ticket || !selectedCompany?.id) return
    setDeleteConfirmation((prev) => ({ ...prev, isDeleting: true }))

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/companies/tickets/${selectedCompany.id}/${deleteConfirmation.ticket.id}`,
        { method: "DELETE" }
      )

      if (!res.ok) throw new Error("Error al eliminar ticket")

      setTickets(tickets.filter((t) => t.id !== deleteConfirmation.ticket!.id))
      showNotification(`Ticket #${deleteConfirmation.ticket.ticketNumber || deleteConfirmation.ticket.id} eliminado`, 'success')
      closeDeleteModal()
    } catch (error) {
      console.error("Error eliminando ticket:", error)
      showNotification("Error al eliminar el ticket", 'error')
      setDeleteConfirmation((prev) => ({ ...prev, isDeleting: false }))
    }
  }

  const filteredTickets = tickets.filter((ticket) => {
    const matchesTab =
      activeTab === "Todos" ||
      (activeTab === "Pendientes" && ["open", "pending"].includes(ticket.status)) ||
      (activeTab === "Completados" && ["approved", "closed"].includes(ticket.status))

    if (!matchesTab) return false
    if (!search.trim()) return true

    const searchLower = search.toLowerCase()
    return (
      ticket.title?.toLowerCase().includes(searchLower) ||
      ticket.description?.toLowerCase().includes(searchLower) ||
      String(ticket.ticketNumber || "").toLowerCase().includes(searchLower)
    )
  })

  const columnConfig = {
    "ticketNumber": (item: Ticket) => (
      <span className="text-sm font-medium">{item.ticketNumber || item.id.slice(0, 8)}</span>
    ),
    "title": (item: Ticket) => (
      <div>
        <div className="font-medium text-sm">{item.title}</div>
        <div className="text-xs text-gray-400">{item.description?.substring(0, 40)}...</div>
      </div>
    ),
    "status": (item: Ticket) => (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeTicket(item.status)}`}>
        {item.status}
      </span>
    ),
    "priority": (item: Ticket) => (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityBadge(item.priority)}`}>
        {item.priority}
      </span>
    ),
    "createdAt": (item: Ticket) => (
      <span className="text-sm">{item.createdAt?.toLocaleDateString()}</span>
    ),
  }

  if (!selectedCompany?.id) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6 flex items-center justify-center">
        <p className="text-xl text-gray-400">Selecciona una compañía para ver los tickets</p>
      </div>
    )
  }

  const totalTickets = tickets.length
  const pendientes = tickets.filter((t) => ["open", "pending"].includes(t.status)).length
  const completados = tickets.filter((t) => ["approved", "closed"].includes(t.status)).length

  const exportToExcel = () => {
    if (tickets.length === 0) {
      showNotification("No hay tickets para exportar", 'error')
      return
    }

    try {
      const dataToExport = tickets.map((ticket) => ({
        '# Ticket': ticket.ticketNumber || ticket.id,
        'Título': ticket.title,
        'Descripción': ticket.description,
        'Estado': ticket.status,
        'Prioridad': ticket.priority,
        'Fecha Creación': ticket.createdAt?.toLocaleDateString(),
      }))

      const worksheet = XLSX.utils.json_to_sheet(dataToExport)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Tickets")
      XLSX.writeFile(workbook, "tickets_exportados.xlsx")
      showNotification("Tickets exportados con éxito", 'success')
    } catch (error) {
      console.error("Error al exportar:", error)
      showNotification("Error al exportar tickets", 'error')
    }
  }

  const closeDeleteModal = () => {
    if (!deleteConfirmation.isDeleting) {
      setDeleteConfirmation({ show: false, ticket: null, isDeleting: false })
    }
  }

  return (
    <div className="bg-gray-900 text-white">
      <PagesHeader
        title={pageName}
        description={pageName ? `${pageName} in ${selectedCompany?.name}` : "Cargando compañía..."}
        showCreate
        onExport={exportToExcel}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <span className="text-gray-400 text-sm">Total Tickets</span>
          <div className="text-3xl font-bold mb-1">{totalTickets}</div>
          <div className="text-sm text-gray-400">Registrados</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <span className="text-gray-400 text-sm">Pendientes</span>
          <div className="text-3xl font-bold mb-1">{pendientes}</div>
          <div className="text-sm text-gray-400">Requieren atención</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <span className="text-gray-400 text-sm">Completados</span>
          <div className="text-3xl font-bold mb-1">{completados}</div>
          <div className="text-sm text-gray-400">Finalizados</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg w-fit">
          {["Todos", "Pendientes", "Completados"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === tab ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white hover:bg-gray-700"}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-400">
          <p>Cargando tickets...</p>
        </div>
      ) : filteredTickets?.length === 0 ? (
        <div className="p-8 text-center text-gray-400">
          <p>No hay tickets disponibles</p>
        </div>
      ) : (
        <Tabla
          datos={filteredTickets}
          titulo={`${pageName} - ${selectedCompany?.name}`}
          columnasPersonalizadas={columnConfig}
          onEditar={(item) => window.location.href = `edit/${item.id}`}
          onEliminar={openDeleteModal}
          mostrarAcciones={true}
        />
      )}

      {/* Delete Modal */}
      {deleteConfirmation.show && deleteConfirmation.ticket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">Confirmar Eliminación</h3>
              <button onClick={closeDeleteModal} disabled={deleteConfirmation.isDeleting} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <p className="text-gray-300 mb-2">¿Estás seguro de eliminar el ticket?</p>
            <p className="text-white font-semibold mb-6">{deleteConfirmation.ticket.title}</p>

            <div className="flex space-x-3">
              <button onClick={closeDeleteModal} disabled={deleteConfirmation.isDeleting} className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 text-white rounded-lg">
                Cancelar
              </button>
              <button onClick={handleDeleteConfirm} disabled={deleteConfirmation.isDeleting} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg">
                {deleteConfirmation.isDeleting ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification && (
        <div className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4 rounded-lg p-4 shadow-lg border ${notification.type === "success" ? "bg-green-800 border-green-600 text-green-100" : "bg-red-800 border-red-600 text-red-100"}`}>
          <p className="text-sm font-medium">{notification.message}</p>
        </div>
      )}

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700">
            <h3 className="text-lg font-medium text-white mb-4">Crear Nuevo Ticket</h3>
            <p className="text-gray-400 text-sm">Modal de creación de tickets</p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setIsCreateModalOpen(false)} className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}