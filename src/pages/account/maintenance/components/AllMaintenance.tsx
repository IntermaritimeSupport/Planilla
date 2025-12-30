"use client"

import { useState, useEffect } from "react"
import { mutate } from "swr"
import * as XLSX from 'xlsx'
import DeleteConfirmationModal from "./deleteModal"
import Loader from "../../../../components/loaders/loader"
import { useCompany } from "../../../../context/routerContext"
import PagesHeader from "../../../../components/headers/pagesHeader"
import { usePageName } from "../../../../hook/usePageName"
import { useSearch } from "../../../../context/searchContext"
import Tabla from "../../../../components/tables/Table"
const { VITE_API_URL } = import.meta.env

interface CurrentPathname {
  name: string;
}

interface SubRoutesProps {
  currentPathname?: CurrentPathname
  subroutes?: {
    name?: string
    href?: string
  }[]
}

export interface MaintenanceFrontend {
  id: string
  equipo: string
  equipoId: string
  tipo: string
  estado: string
  prioridad: string
  tecnico: string
  fecha: string
  costo: string
}

interface MaintenanceBackend {
  id: string
  title: string
  description: string | null
  type: string
  status: string
  scheduledDate: string
  completionDate: string | null
  cost: number | null
  equipment: {
    serialNumber: string
    type: string
  }
  assignedToUser: {
    username: string
  } | null
  company: {
    name: string
  }
}

const AllMaintenance: React.FC<SubRoutesProps> = ({}) => {
  const [activeTab, setActiveTab] = useState("Todos")
  const { search } = useSearch();
  const [maintenanceData, setMaintenanceData] = useState<MaintenanceFrontend[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedMaintenance, setSelectedMaintenance] = useState<MaintenanceFrontend | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const { selectedCompany } = useCompany();
  const { pageName } = usePageName();

  const exportToExcel = () => {
    const excelData = filteredMantenimientos.map((mantenimiento) => ({
      'ID': mantenimiento.id,
      'Equipo': mantenimiento.equipo,
      'Serial del Equipo': mantenimiento.equipoId,
      'Tipo': mantenimiento.tipo,
      'Estado': mantenimiento.estado,
      'Prioridad': mantenimiento.prioridad,
      'Técnico Asignado': mantenimiento.tecnico,
      'Fecha Programada': mantenimiento.fecha,
      'Costo': mantenimiento.costo
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Mantenimientos');

    const maxWidth = 50;
    const columnWidths = Object.keys(excelData[0] || {}).map(key => {
      const maxLength = Math.max(
        key.length,
        ...excelData.map(row => String(row[key as keyof typeof row]).length)
      );
      return { wch: Math.min(maxLength + 2, maxWidth) };
    });
    worksheet['!cols'] = columnWidths;

    const timestamp = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `mantenimientos_${timestamp}.xlsx`);
  };

  const openDeleteModal = (connection: MaintenanceFrontend) => {
    setSelectedMaintenance(connection)
    setIsModalOpen(true)
  }

  const closeDeleteModal = () => {
    if (!isDeleting) {
      setIsModalOpen(false)
      setSelectedMaintenance(null)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!selectedMaintenance) return
    setIsDeleting(true)

    try {
      const res = await fetch(`${VITE_API_URL}/api/maintenances/${selectedCompany?.id}/${selectedMaintenance.id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Error al eliminar conexión")

      mutate(`${VITE_API_URL}/api/maintenances/${selectedCompany?.id}/all`)
      setIsDeleting(false)
      closeDeleteModal()
    } catch (err) {
      console.error("Error eliminando conexión", err)
      setIsDeleting(false)
    }
  }

  useEffect(() => {
    if (!selectedCompany?.id) return;

    const fetchMaintenances = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${VITE_API_URL}/api/maintenances/${selectedCompany.id}/all`);
        if (!response.ok) {
          throw new Error("Error al obtener los datos de mantenimiento");
        }

        const data: MaintenanceBackend[] = await response.json();
        const mappedData = data.map(mapApiToFrontend);
        setMaintenanceData(mappedData);
        setError(null);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMaintenances();
  }, [selectedCompany?.id]);  

  const mapApiToFrontend = (
    item: MaintenanceBackend
  ): MaintenanceFrontend => {
    const getPriority = (status: string): string => {
      switch (status) {
        case 'COMPLETED':
          return 'Baja';
        case 'IN_PROGRESS':
          return 'Media';
        case 'SCHEDULED':
          return 'Alta';
        default:
          return 'Baja';
      }
    };

    return {
      id: item.id,
      equipo: item.title,
      equipoId: item.equipment.serialNumber,
      tipo: item.type,
      estado: item.status,
      prioridad: getPriority(item.status),
      tecnico: item.assignedToUser?.username || "No asignado",
      fecha: new Date(item.scheduledDate).toLocaleDateString(),
      costo: item.cost ? `$${item.cost}` : "$0",
    }
  }

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case "COMPLETED":
        return "bg-green-600 text-green-100"
      case "IN_PROGRESS":
        return "bg-blue-600 text-blue-100"
      case "SCHEDULED":
        return "bg-yellow-600 text-yellow-100"
      case "PENDING":
        return "bg-red-600 text-red-100"
      default:
        return "bg-gray-600 text-gray-100"
    }
  }

  const getPriorityBadge = (prioridad: string) => {
    switch (prioridad) {
      case "Alta":
        return "bg-red-600 text-red-100"
      case "Media":
        return "bg-yellow-600 text-yellow-100"
      case "Baja":
        return "bg-green-600 text-green-100"
      default:
        return "bg-gray-600 text-gray-100"
    }
  }

  const getStatusIcon = (estado: string) => {
    switch (estado) {
      case "COMPLETED":
        return (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="w-4 h-4 text-green-400"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22,4 12,14.01 9,11.01" />
          </svg>
        )
      case "IN_PROGRESS":
        return (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="w-4 h-4 text-blue-400"
          >
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
        )
      case "SCHEDULED":
        return (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="w-4 h-4 text-yellow-400"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12,6 12,12 16,14" />
          </svg>
        )
      case "PENDING":
        return (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="w-4 h-4 text-red-400"
          >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <path d="M12 9v4" />
            <path d="m12 17 .01 0" />
          </svg>
        )
      default:
        return null
    }
  }

  const filteredMantenimientos = maintenanceData.filter((mantenimiento) => {
    const matchesTab =
      activeTab === "Todos" ||
      (activeTab === "Pendientes" &&
        ["PENDING", "IN_PROGRESS", "SCHEDULED"].includes(mantenimiento.estado)) ||
      (activeTab === "Completados" && mantenimiento.estado === "COMPLETED");

    if (!matchesTab) return false;

    if (!search.trim()) return true;

    const term = search.toLowerCase();

    return (
      mantenimiento.equipo.toLowerCase().includes(term) ||
      mantenimiento.equipoId.toLowerCase().includes(term) ||
      mantenimiento.tipo.toLowerCase().includes(term) ||
      mantenimiento.estado.toLowerCase().includes(term) ||
      mantenimiento.prioridad.toLowerCase().includes(term) ||
      mantenimiento.tecnico.toLowerCase().includes(term) ||
      mantenimiento.fecha.toLowerCase().includes(term) ||
      mantenimiento.costo.toLowerCase().includes(term)
    );
  });

  // Columnas personalizadas para la tabla
  const columnConfig = {
    "ID": (item: MaintenanceFrontend) => (
      <span className="text-sm font-medium">{item.id.substring(0, 8)}...</span>
    ),
    "equipo": (item: MaintenanceFrontend) => (
      <div>
        <div className="font-medium text-sm">{item.equipo}</div>
        <div className="text-xs text-gray-400">{item.equipoId}</div>
      </div>
    ),
    "tipo": (item: MaintenanceFrontend) => (
      <span className="text-sm">{item.tipo}</span>
    ),
    "estado": (item: MaintenanceFrontend) => (
      <div className="flex items-center space-x-2">
        {getStatusIcon(item.estado)}
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(item.estado)}`}>
          {item.estado}
        </span>
      </div>
    ),
    "prioridad": (item: MaintenanceFrontend) => (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityBadge(item.prioridad)}`}>
        {item.prioridad}
      </span>
    ),
    "tecnico": (item: MaintenanceFrontend) => (
      <span className="text-sm">{item.tecnico}</span>
    ),
    "fecha": (item: MaintenanceFrontend) => (
      <span className="text-sm">{item.fecha}</span>
    ),
    "costo": (item: MaintenanceFrontend) => (
      <span className="text-sm font-medium">{item.costo}</span>
    ),
  };

  const totalMantenimientos = maintenanceData.length
  const pendientes = maintenanceData.filter(
    (m) =>
      m.estado === "PENDING" ||
      m.estado === "IN_PROGRESS" ||
      m.estado === "SCHEDULED"
  ).length
  const completados = maintenanceData.filter(
    (m) => m.estado === "COMPLETED"
  ).length
  const costoTotal = maintenanceData.reduce((acc, m) => {
    const cost = parseFloat(m.costo.replace("$", ""))
    return acc + (isNaN(cost) ? 0 : cost)
  }, 0)

  if (loading) {
    return <Loader/>
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">Error: {error}</div>
  }

  return (
    <div className="bg-gray-900 text-white">

      <PagesHeader 
        title={pageName || "N/a"} 
        description={pageName ? `${pageName} in ${selectedCompany?.name}` : "Cargando compañía..."}
        showCreate   
        onExport={exportToExcel}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Total Mantenimientos</span>
            <div className="w-6 h-6">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-full h-full text-gray-400"
              >
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold mb-1">{totalMantenimientos}</div>
          <div className="text-sm text-gray-400">Este mes</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Pendientes</span>
            <div className="w-6 h-6">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-full h-full text-yellow-400"
              >
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <path d="M12 9v4" />
                <path d="m12 17 .01 0" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold mb-1">{pendientes}</div>
          <div className="text-sm text-gray-400">Requieren atención</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Completados</span>
            <div className="w-6 h-6">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-full h-full text-green-400"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22,4 12,14.01 9,11.01" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold mb-1">{completados}</div>
          <div className="text-sm text-gray-400">Este mes</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Costo Total</span>
            <div className="w-6 h-6">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-full h-full text-gray-400"
              >
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold mb-1">${costoTotal.toFixed(2)}</div>
          <div className="text-sm text-gray-400">Este mes</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg w-fit">
          {["Todos", "Pendientes", "Completados"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === tab
                  ? "bg-gray-700 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-700"
                }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

          <Tabla
            datos={filteredMantenimientos}
            titulo={`${pageName || "Mantenimientos"} List`}
            columnasPersonalizadas={columnConfig}
            onEditar={(item) => window.location.href = `edit/${item.id}`}
            onEliminar={openDeleteModal}
            mostrarAcciones={true}
          />

      {/* Modal de confirmación */}
      <DeleteConfirmationModal
        isOpen={isModalOpen}
        onClose={closeDeleteModal}
        onConfirm={handleDeleteConfirm}
        maintenance={selectedMaintenance}
        isDeleting={isDeleting}
      />
    </div>
  )
}
export default AllMaintenance