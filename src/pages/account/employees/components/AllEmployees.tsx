"use client"

import { useState, useEffect, useMemo } from "react"
import useSWR, { mutate } from "swr"
import Loader from "../../../../components/loaders/loader"
import { useCompany } from "../../../../context/routerContext"
import { usePageName } from "../../../../hook/usePageName"
import PagesHeader from "../../../../components/headers/pagesHeader"
import { useSearch } from "../../../../context/searchContext"
import Tabla from "../../../../components/tables/Table"
import EmployeeImportModal from "./EmployeeImportModal"
import { useTheme } from "../../../../context/themeContext"

export type UserRole = 'USER' | 'ADMIN' | 'MODERATOR' | 'SUPER_ADMIN';
export type SalaryType = 'MONTHLY' | 'BIWEEKLY';
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'TERMINATED';

export interface User {
    id: string;
    username: string;
    email: string;
    role: UserRole;
}

export interface Company {
    id: string;
    name: string;
}

export interface Employee {
    id: string;
    cedula: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string | null;
    position: string;
    department?: string | null;
    hireDate: string | Date;
    salary: number;
    salaryType: SalaryType;
    status: EmployeeStatus;
    userId?: string | null;
    companyId: string;
    user?: User | null;
    company?: Company;
    createdAt: string | Date;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const getAvatarColor = (nombre: string) => {
    const colors = ["bg-blue-600", "bg-green-600", "bg-purple-600", "bg-orange-600", "bg-pink-600", "bg-indigo-600", "bg-teal-600", "bg-red-600"]
    const index = (nombre?.length || 0) % colors.length
    return colors[index]
}

const getStatusBadge = (status: EmployeeStatus) => {
    switch (status) {
        case 'ACTIVE': return "bg-green-600 text-green-100";
        case 'INACTIVE': return "bg-gray-600 text-gray-100";
        case 'TERMINATED': return "bg-red-600 text-red-100";
        case 'SUSPENDED': return "bg-orange-600 text-orange-100";
        default: return "bg-blue-600 text-blue-100";
    }
}

export const AllEmployees: React.FC = () => {
    const { selectedCompany } = useCompany()
    const { isDarkMode, } = useTheme();
    const { data, error, isLoading } = useSWR<Employee[]>(
        selectedCompany ? `${import.meta.env.VITE_API_URL}/api/payroll/employees?companyId=${selectedCompany.id}` : null, 
        fetcher
    )
    
    const { pageName } = usePageName()
    const { search } = useSearch()
    const [statusFilter,] = useState("Todos")
    const [notification, setNotification] = useState<{ type: "success" | "error", message: string, show: boolean }>({ type: "success", message: "", show: false })
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ show: boolean, employee: Employee | null, isDeleting: boolean }>({ show: false, employee: null, isDeleting: false })
    const [importModalOpen, setImportModalOpen] = useState(false)

    const showNotification = (type: "success" | "error", message: string) => {
        setNotification({ type, message, show: true })
    }

    useEffect(() => {
        if (notification.show) {
            const timer = setTimeout(() => setNotification((prev) => ({ ...prev, show: false })), 5000)
            return () => clearTimeout(timer)
        }
    }, [notification.show])

    const deleteEmployee = async () => {
        if (!deleteConfirmation.employee) return
        setDeleteConfirmation((prev) => ({ ...prev, isDeleting: true }))

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/payroll/employees/${deleteConfirmation.employee.id}`, {
                method: "DELETE"
            })

            if (!response.ok) throw new Error("Error al eliminar el empleado")

            mutate(`${import.meta.env.VITE_API_URL}/api/payroll/employees?companyId=${selectedCompany?.id}`)
            showNotification("success", `Empleado ${deleteConfirmation.employee.firstName} eliminado exitosamente`)
            setDeleteConfirmation({ show: false, employee: null, isDeleting: false })
        } catch (error: any) {
            showNotification("error", error.message || "Error al eliminar")
            setDeleteConfirmation((prev) => ({ ...prev, isDeleting: false }))
        }
    }

    const filteredEmployees = useMemo(() => {
        if (!data || !Array.isArray(data)) return []

        return data.filter((emp) => {
            const statusMatch =
                statusFilter === "Todos" ||
                (statusFilter === "Activos" && emp.status === "ACTIVE") ||
                (statusFilter === "Inactivos" && emp.status === "INACTIVE");

            const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
            const searchMatch =
                search.trim() === "" ||
                fullName.includes(search.toLowerCase()) ||
                emp.email.toLowerCase().includes(search.toLowerCase()) ||
                emp.cedula.includes(search);

            return statusMatch && searchMatch
        })
    }, [data, search, statusFilter])

    const columnConfig = {
        "Nombre Completo": (item: Employee) => (
            <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm ${getAvatarColor(item.firstName)}`}>
                    {item.firstName[0]}{item.lastName[0]}
                </div>
                <div>
                    <div className="font-medium text-sm">{item.firstName} {item.lastName}</div>
                    <div className="text-xs text-gray-400">{item.cedula}</div>
                </div>
            </div>
        ),
        "Email": (item: Employee) => (
            <div className="text-sm">
                <div className="">{item.email}</div>
                <div className="text-xs text-gray-400">{item.phoneNumber || "Sin teléfono"}</div>
            </div>
        ),
        "Departamento": (item: Employee) => (
            <div>
                <div className="font-medium text-sm">{item.department || "Sin área"}</div>
                <div className="text-xs text-gray-400">{item.position}</div>
            </div>
        ),
        "Estado": (item: Employee) => (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(item.status)}`}>
                {item.status}
            </span>
        ),
    }

    const handleImportSuccess = () => {
        mutate(`${import.meta.env.VITE_API_URL}/api/payroll/employees?companyId=${selectedCompany?.id}`)
        showNotification("success", "Empleados importados exitosamente")
    }

    if (isLoading) return <Loader />
    if (error) return <div className="text-center p-8 text-red-500">Error al cargar empleados</div>

    return (
        <div className="relative">
            <PagesHeader
                title={"Empleados"}
                description={`${pageName} en ${selectedCompany?.name || '...'}`}
                showCreate
                onImportCsv={
                    () => setImportModalOpen(true)
                }
            />

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className={`rounded-lg p-6 border transition-colors ${
                    isDarkMode 
                    ? 'bg-gray-800 border-gray-700' 
                    : 'bg-white border-gray-200'
                }`}>
                    <span className="text-gray-400 text-sm">Total Empleados</span>
                    <div className="text-3xl font-bold">{data?.length || 0}</div>
                </div>
                <div className={`rounded-lg p-6 border transition-colors ${
                    isDarkMode 
                    ? 'bg-gray-800 border-gray-700' 
                    : 'bg-white border-gray-200'
                }`}>
                    <span className="text-gray-400 text-sm">Activos</span>
                    <div className="text-3xl font-bold text-green-500">{data?.filter(e => e.status === 'ACTIVE').length || 0}</div>
                </div>
            </div>

            {/* Controles */}
            {/* <div className="mb-6 flex gap-3 flex-wrap">
                <select
                    className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white outline-none"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="Todos">Todos los estados</option>
                    <option value="Activos">Activos</option>
                    <option value="Inactivos">Inactivos</option>
                </select>
                
            </div> */}

            <Tabla
                datos={filteredEmployees}
                titulo="Listado de Colaboradores"
                columnasPersonalizadas={columnConfig}
                onEditar={(item) => window.location.href = `edit/${item.id}`}
                onEliminar={(item) => setDeleteConfirmation({ show: true, employee: item, isDeleting: false })}
                mostrarAcciones={true}
            />

            {/* Modal de eliminación */}
            {deleteConfirmation.show && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 max-w-sm w-full">
                        <h3 className="text-xl font-bold mb-4">¿Eliminar empleado?</h3>
                        <p className="text-gray-400 mb-6 text-sm">
                            Esta acción eliminará a <b>{deleteConfirmation.employee?.firstName}</b>. Esta acción no se puede deshacer.
                        </p>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setDeleteConfirmation({ show: false, employee: null, isDeleting: false })}
                                className="flex-1 px-4 py-2 bg-gray-700 rounded-lg"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={deleteEmployee}
                                disabled={deleteConfirmation.isDeleting}
                                className="flex-1 px-4 py-2 bg-red-600 rounded-lg disabled:opacity-50"
                            >
                                {deleteConfirmation.isDeleting ? "Eliminando..." : "Eliminar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Importación */}
            <EmployeeImportModal
                isOpen={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                companyId={selectedCompany?.id}
                onImportSuccess={handleImportSuccess}
            />

            {/* Notificación Flotante */}
            {notification.show && (
                <div className={`fixed bottom-5 right-5 p-4 rounded-lg shadow-2xl border z-50 ${notification.type === 'success' ? 'bg-green-900 border-green-500' : 'bg-red-900 border-red-500'}`}>
                    {notification.message}
                </div>
            )}
        </div>
    )
}