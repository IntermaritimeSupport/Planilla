"use client"

import type React from "react"
import { useState, useMemo } from "react"
import useSWR, { mutate } from "swr"
import { useCompany } from "../../../../context/routerContext"
import DeleteNetworkModal from "./deleteModal"
import Loader from "../../../../components/loaders/loader"
import { CurrentPathname } from "../../../../components/layouts/main"
import { useSearch } from "../../../../context/searchContext"
import Tabla from "../../../../components/tables/Table"
import { Eye, EyeOff, Network, CheckCircle, Router, AlertCircle } from "lucide-react"
import { usePageName } from "../../../../hook/usePageName"
import PagesHeader from "../../../../components/headers/pagesHeader"

const { VITE_API_URL } = import.meta.env
const fetcher = (url: string) => fetch(url).then((res) => res.json())

export enum NetworkDeviceStatus {
  ONLINE = "ONLINE",
  OFFLINE = "OFFLINE",
  MAINTENANCE = "MAINTENANCE",
  DECOMMISSIONED = "DECOMMISSIONED",
  UNKNOWN = "UNKNOWN",
}

export interface ApiNetworkDevice {
  id: string
  name: string
  status: NetworkDeviceStatus
  location: string | null
  description: string | null
  notes: string | null
  ssid: string | null
  password: string | null
  ip: string | null
  dns: string | null
  gw: string | null
  uploadSpeed: string | null
  downloadSpeed: string | null
  createdAt: string
  updatedAt: string
  companyId: string
  assignedToUserId: string | null
  createdByUserId: string | null
  providerId: string | null
  company?: {
    id: string
    name: string
  }
  assignedToUser?: {
    id: string
    username: string
    email: string
  }
  createdBy?: {
    id: string
    username: string
    email: string
  }
  provider?: {
    id: string
    name: string
    speed?: string
    cost?: number
  }
}

export interface FrontendNetworkConnection {
  id: string
  nombre: string
  ubicacion: string
  descripcion: string
  ssid: string
  password: string
  ip: string
  dns: string
  gw: string
  velocidadSubida: string
  velocidadBajada: string
  estado: NetworkDeviceStatus | string
  notas: string
  companyName: string
  asignadoA: string
  creadoPor: string
  proveedor: string
  proveedorVelocidad: string
  costo: string
}

const mapApiDataToFrontend = (item: ApiNetworkDevice): FrontendNetworkConnection => {
  if (!item) {
    return {
      id: "0",
      nombre: "N/A",
      ubicacion: "N/A",
      descripcion: "N/A",
      ssid: "N/A",
      password: "N/A",
      ip: "N/A",
      dns: "N/A",
      gw: "N/A",
      velocidadSubida: "N/A",
      velocidadBajada: "N/A",
      estado: "UNKNOWN",
      notas: "N/A",
      companyName: "N/A",
      asignadoA: "N/A",
      creadoPor: "N/A",
      proveedor: "N/A",
      proveedorVelocidad: "N/A",
      costo: "$0.00",
    }
  }

  return {
    id: item.id,
    nombre: item.name || "N/A",
    ubicacion: item.location || "No especificada",
    descripcion: item.description || "Sin descripción",
    ssid: item.ssid || "N/A",
    password: item.password || "N/A",
    ip: item.ip || "N/A",
    dns: item.dns || "N/A",
    gw: item.gw || "N/A",
    velocidadSubida: item.uploadSpeed || "N/A",
    velocidadBajada: item.downloadSpeed || "N/A",
    estado: item.status || NetworkDeviceStatus.UNKNOWN,
    notas: item.notes || "Sin notas",
    companyName: item.company?.name || "N/A",
    asignadoA: item.assignedToUser?.username || "No asignado",
    creadoPor: item.createdBy?.username || "Sistema",
    proveedor: item.provider?.name || "Sin proveedor",
    proveedorVelocidad: item.provider?.speed || "N/A",
    costo: item.provider?.cost ? `$${item.provider.cost.toLocaleString("es-MX", { minimumFractionDigits: 2 })}` : "$0.00",
  }
}

interface Props {
  currentPathname?: CurrentPathname
}

const PasswordField: React.FC<{ password: string }> = ({ password }) => {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="flex items-center gap-2">
      <span className="text-white text-sm font-mono">
        {showPassword ? password : "•".repeat(Math.min(password.length, 8))}
      </span>
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="p-1 text-gray-400 hover:text-gray-300 transition-colors"
        title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
      >
        {showPassword ? (
          <Eye size={16} />
        ) : (
          <EyeOff size={16} />
        )}
      </button>
    </div>
  )
}

const AllNetwork: React.FC<Props> = ({ }) => {
  const { search } = useSearch()
  const { pageName } = usePageName()
  const [filterStatus, setFilterStatus] = useState("TODOS")

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedConnection, setSelectedConnection] = useState<FrontendNetworkConnection | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const { selectedCompany } = useCompany()
  const { data, isLoading } = useSWR<ApiNetworkDevice[]>(`${VITE_API_URL}/api/network/${selectedCompany?.id}/all`, fetcher)

  const openDeleteModal = (connection: FrontendNetworkConnection) => {
    setSelectedConnection(connection)
    setIsModalOpen(true)
  }

  const closeDeleteModal = () => {
    if (!isDeleting) {
      setIsModalOpen(false)
      setSelectedConnection(null)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!selectedConnection) return
    setIsDeleting(true)

    try {
      const res = await fetch(`${VITE_API_URL}/api/network/${selectedCompany?.id}/${selectedConnection.id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Error al eliminar conexión")

      mutate(`${VITE_API_URL}/api/network/${selectedCompany?.id}/all`)
      setIsDeleting(false)
      closeDeleteModal()
    } catch (err) {
      console.error("Error eliminando conexión", err)
      setIsDeleting(false)
    }
  }

  const conexiones: FrontendNetworkConnection[] = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return []
    return data.map(mapApiDataToFrontend)
  }, [data])

  const filteredConexiones = useMemo(() => {
    let current = [...conexiones]
    if (filterStatus !== "TODOS") {
      current = current.filter((c) => c.estado === filterStatus)
    }
    if (search) {
      const s = search.toLowerCase()
      current = current.filter(
        (c) =>
          c.nombre.toLowerCase().includes(s) ||
          c.proveedor.toLowerCase().includes(s) ||
          c.ip.toLowerCase().includes(s) ||
          c.ssid.toLowerCase().includes(s) ||
          c.ubicacion.toLowerCase().includes(s) ||
          c.descripcion.toLowerCase().includes(s),
      )
    }
    return current
  }, [conexiones, filterStatus, search])

  const getStatusColor = (status: string) => {
    switch (status) {
      case NetworkDeviceStatus.ONLINE:
        return "bg-green-900 text-green-300 border-green-700"
      case NetworkDeviceStatus.OFFLINE:
        return "bg-red-900 text-red-300 border-red-700"
      case NetworkDeviceStatus.MAINTENANCE:
        return "bg-yellow-900 text-yellow-300 border-yellow-700"
      case NetworkDeviceStatus.DECOMMISSIONED:
        return "bg-gray-700 text-gray-300 border-gray-600"
      default:
        return "bg-slate-700 text-slate-300 border-slate-600"
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      ONLINE: "En línea",
      OFFLINE: "Desconectado",
      MAINTENANCE: "Mantenimiento",
      DECOMMISSIONED: "Desactivado",
      UNKNOWN: "Desconocido",
    }
    return labels[status] || status
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case NetworkDeviceStatus.ONLINE:
        return <CheckCircle size={16} className="text-green-400" />
      case NetworkDeviceStatus.OFFLINE:
        return <AlertCircle size={16} className="text-red-400" />
      case NetworkDeviceStatus.MAINTENANCE:
        return <AlertCircle size={16} className="text-yellow-400" />
      default:
        return <AlertCircle size={16} className="text-gray-400" />
    }
  }

  // Configuración de columnas personalizadas
  const columnConfig = {
    "nombre": (item: FrontendNetworkConnection) => (
      <div>
        <p className="text-white font-medium">{item.nombre}</p>
        <p className="text-gray-400 text-sm">{item.ssid}</p>
      </div>
    ),
    "password": (item: FrontendNetworkConnection) => (
      <PasswordField password={item.password} />
    ),
    "ip": (item: FrontendNetworkConnection) => (
      <div>
        <p className="text-white text-sm">{item.ip}</p>
        <p className="text-gray-400 text-xs">{item.dns}</p>
      </div>
    ),
    "gw": (item: FrontendNetworkConnection) => (
      <p className="text-white text-sm">{item.gw}</p>
    ),
    "velocidadBajada": (item: FrontendNetworkConnection) => (
      <div className="text-sm">
        <p className="text-white">↓ {item.velocidadBajada} Mbps</p>
        <p className="text-gray-400 text-xs">↑ {item.velocidadSubida} Mbps</p>
      </div>
    ),
    "proveedor": (item: FrontendNetworkConnection) => (
      <div>
        <p className="text-white text-sm">{item.proveedor}</p>
        <p className="text-gray-400 text-xs">{item.proveedorVelocidad}</p>
      </div>
    ),
    "estado": (item: FrontendNetworkConnection) => (
      <div className="flex items-center gap-2">
        {getStatusIcon(item.estado)}
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(item.estado)}`}>
          {getStatusLabel(item.estado)}
        </span>
      </div>
    ),
    "ubicacion": (item: FrontendNetworkConnection) => (
      <p className="text-gray-400 text-sm">{item.ubicacion}</p>
    ),
  };

  if (isLoading) {
    return <Loader />
  }

  const totalRedes = conexiones.length
  const enLinea = conexiones.filter((c) => c.estado === NetworkDeviceStatus.ONLINE).length
  const desconectadas = conexiones.filter((c) => c.estado === NetworkDeviceStatus.OFFLINE).length
  const proveedores = new Set(conexiones.map((c) => c.proveedor)).size

  return (
    <div className="bg-slate-900 text-gray-100">
      {/* Header Section */}
      <PagesHeader title={pageName} description={`${pageName} in ${selectedCompany?.name}`} showCreate/>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Total Redes</p>
              <p className="text-2xl font-semibold text-white">{totalRedes}</p>
            </div>
            <Network size={32} className="text-blue-500" />
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">En Línea</p>
              <p className="text-2xl font-semibold text-green-400">{enLinea}</p>
            </div>
            <CheckCircle size={32} className="text-green-500" />
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Proveedores</p>
              <p className="text-2xl font-semibold text-white">{proveedores}</p>
            </div>
            <Router size={32} className="text-purple-500" />
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Desconectadas</p>
              <p className="text-2xl font-semibold text-red-400">{desconectadas}</p>
            </div>
            <AlertCircle size={32} className="text-red-500" />
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <select
          className="px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="TODOS">Todos los estados</option>
          {Object.values(NetworkDeviceStatus).map((status) => (
            <option key={status} value={status}>
              {getStatusLabel(status)}
            </option>
          ))}
        </select>
      </div>

      {filteredConexiones.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-gray-400">No hay redes registradas</p>
        </div>
      ) : (
        <Tabla
          datos={filteredConexiones}
          titulo={`${pageName || "Redes"} List`}
          columnasPersonalizadas={columnConfig}
          onEditar={(item) => window.location.href = `edit/${item.id}`}
          onEliminar={openDeleteModal}
          mostrarAcciones={true}
        />
      )}

      {/* Modal de confirmación */}
      <DeleteNetworkModal
        isOpen={isModalOpen}
        onClose={closeDeleteModal}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
        itemName={selectedConnection?.nombre || ""}
      />
    </div>
  )
}
export default AllNetwork