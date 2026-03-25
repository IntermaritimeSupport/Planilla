"use client"

import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import useSWR, { mutate } from "swr"
import Loader from "../../../../components/loaders/loader"
import { useCompany } from "../../../../context/routerContext"
import { usePageName } from "../../../../hook/usePageName"
import PagesHeader from "../../../../components/headers/pagesHeader"
import { useSearch } from "../../../../context/searchContext"
import Tabla from "../../../../components/tables/Table"
import EmployeeImportModal from "./EmployeeImportModal"
import { useTheme } from "../../../../context/themeContext"
import { authFetcher } from "../../../../services/api"

export type UserRole = 'USER' | 'ADMIN' | 'MODERATOR' | 'SUPER_ADMIN';
export type SalaryType = 'MONTHLY' | 'BIWEEKLY';
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'TERMINATED' | 'MATERNITY_LEAVE';

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
    maternityStartDate?: string | null;
    maternityEndDate?: string | null;
    inactivityReason?: string | null;
}

// fetcher unificado con auth (ver services/api.ts)
import SalaryHistoryModal from "./SalaryHistoryModal"
import Pagination from "../../../../components/ui/Pagination"

const getAvatarColor = (nombre: string) => {
    const colors = ["bg-blue-600", "bg-green-600", "bg-purple-600", "bg-orange-600", "bg-pink-600", "bg-indigo-600", "bg-teal-600", "bg-red-600"]
    const index = (nombre?.length || 0) % colors.length
    return colors[index]
}

const STATUS_LABEL: Record<EmployeeStatus, string> = {
    ACTIVE: "Activo",
    INACTIVE: "Inactivo",
    TERMINATED: "Terminado",
    SUSPENDED: "Suspendido",
    MATERNITY_LEAVE: "Mat. Maternidad",
}

const getStatusBadge = (status: EmployeeStatus) => {
    switch (status) {
        case 'ACTIVE': return "bg-green-600 text-green-100";
        case 'INACTIVE': return "bg-gray-600 text-gray-100";
        case 'TERMINATED': return "bg-red-600 text-red-100";
        case 'SUSPENDED': return "bg-orange-600 text-orange-100";
        case 'MATERNITY_LEAVE': return "bg-pink-600 text-pink-100";
        default: return "bg-blue-600 text-blue-100";
    }
}

export const AllEmployees: React.FC = () => {
    const { selectedCompany } = useCompany()
    const navigate = useNavigate()
    const { isDarkMode, } = useTheme();
    const { data, error, isLoading } = useSWR<Employee[]>(
        selectedCompany ? `${import.meta.env.VITE_API_URL}/api/payroll/employees?companyId=${selectedCompany.id}` : null, 
        authFetcher
    )
    
    const { pageName } = usePageName()
    const { search } = useSearch()
    const [statusFilter,] = useState("Todos")
    const [notification, setNotification] = useState<{ type: "success" | "error", message: string, show: boolean }>({ type: "success", message: "", show: false })
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ show: boolean, employee: Employee | null, isDeleting: boolean }>({ show: false, employee: null, isDeleting: false })
    const [salaryHistoryEmployee, setSalaryHistoryEmployee] = useState<Employee | null>(null);
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 25;
    const [importModalOpen, setImportModalOpen] = useState(false)
    const [maternityModal, setMaternityModal] = useState<{ show: boolean; employee: Employee | null; saving: boolean }>({ show: false, employee: null, saving: false })
    const [maternityForm, setMaternityForm] = useState({ maternityStartDate: "", maternityEndDate: "", inactivityReason: "Licencia de Maternidad — CSS cubre subsidio" })

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
            const token = localStorage.getItem('jwt')
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/payroll/employees/${deleteConfirmation.employee.id}`, {
                method: "DELETE",
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
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

    const openMaternityModal = (employee: Employee) => {
        setMaternityForm({
            maternityStartDate: employee.maternityStartDate ? new Date(employee.maternityStartDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
            maternityEndDate: employee.maternityEndDate ? new Date(employee.maternityEndDate).toISOString().split("T")[0] : "",
            inactivityReason: employee.inactivityReason || "Licencia de Maternidad — CSS cubre subsidio",
        })
        setMaternityModal({ show: true, employee, saving: false })
    }

    const saveMaternityLeave = async () => {
        if (!maternityModal.employee || !maternityForm.maternityStartDate) return
        setMaternityModal(p => ({ ...p, saving: true }))
        try {
            const token = localStorage.getItem('jwt')
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/payroll/employees/${maternityModal.employee.id}/status`, {
                method: "PUT",
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: "MATERNITY_LEAVE", ...maternityForm }),
            })
            if (!res.ok) throw new Error("Error al actualizar estado")
            mutate(`${import.meta.env.VITE_API_URL}/api/payroll/employees?companyId=${selectedCompany?.id}`)
            showNotification("success", `Licencia de maternidad registrada para ${maternityModal.employee.firstName}`)
            setMaternityModal({ show: false, employee: null, saving: false })
        } catch (error: any) {
            showNotification("error", error.message || "Error al guardar")
            setMaternityModal(p => ({ ...p, saving: false }))
        }
    }

    const reactivateEmployee = async (employee: Employee) => {
        if (!window.confirm(`¿Reactivar a ${employee.firstName} ${employee.lastName}?`)) return
        try {
            const token = localStorage.getItem('jwt')
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/payroll/employees/${employee.id}/status`, {
                method: "PUT",
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: "ACTIVE" }),
            })
            if (!res.ok) throw new Error("Error al reactivar empleado")
            mutate(`${import.meta.env.VITE_API_URL}/api/payroll/employees?companyId=${selectedCompany?.id}`)
            showNotification("success", `${employee.firstName} reactivado exitosamente`)
        } catch (error: any) {
            showNotification("error", error.message || "Error al reactivar")
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

  // Reset page on filter change
  useEffect(() => { setPage(1) }, [filteredEmployees.length])


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
            <div className="flex flex-col gap-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium w-fit ${getStatusBadge(item.status)}`}>
                    {STATUS_LABEL[item.status] ?? item.status}
                </span>
                {item.status === 'MATERNITY_LEAVE' && item.maternityStartDate && (
                    <span className="text-[10px] text-gray-400">
                        Desde {new Date(item.maternityStartDate).toLocaleDateString("es-PA")}
                        {item.maternityEndDate ? ` · Hasta ${new Date(item.maternityEndDate).toLocaleDateString("es-PA")}` : ""}
                    </span>
                )}
                {(item.status === 'ACTIVE' || item.status === 'INACTIVE') && (
                    <button
                        onClick={e => { e.stopPropagation(); openMaternityModal(item) }}
                        className="text-[10px] text-pink-400 hover:text-pink-300 underline text-left"
                    >
                        + Licencia Maternidad
                    </button>
                )}
                {item.status === 'MATERNITY_LEAVE' && (
                    <button
                        onClick={e => { e.stopPropagation(); reactivateEmployee(item) }}
                        className="text-[10px] text-green-400 hover:text-green-300 underline text-left"
                    >
                        Reactivar
                    </button>
                )}
            </div>
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
                datos={filteredEmployees.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE)}
                titulo="Listado de Colaboradores"
                columnasPersonalizadas={columnConfig}
                onVer={(item) => navigate(`/${selectedCompany?.code}/employees/profile/${item.id}`)}
                onEditar={(item) => navigate(`/${selectedCompany?.code}/employees/edit/${item.id}`)}
                onEliminar={(item) => setDeleteConfirmation({ show: true, employee: item, isDeleting: false })}
                onHistorial={(item) => setSalaryHistoryEmployee(item)}
                mostrarAcciones={true}
            />

            {/* Paginación */}
            {filteredEmployees.length > PAGE_SIZE && (
              <div className={`mt-4 flex items-center justify-between`}>
                <Pagination
                  total={filteredEmployees.length}
                  pageSize={PAGE_SIZE}
                  page={page}
                  onChange={(p) => setPage(p)}
                />
              </div>
            )}

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
            {/* Historial de Salarios */}
            {salaryHistoryEmployee && (
                <SalaryHistoryModal
                    employeeId={salaryHistoryEmployee.id}
                    employeeName={`${salaryHistoryEmployee.firstName} ${salaryHistoryEmployee.lastName}`}
                    currentSalary={Number(salaryHistoryEmployee.salary)}
                    currentSalaryType={salaryHistoryEmployee.salaryType}
                    onClose={() => setSalaryHistoryEmployee(null)}
                />
            )}

            {/* Modal de Licencia de Maternidad */}
            {maternityModal.show && maternityModal.employee && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className={`rounded-xl border max-w-md w-full p-6 shadow-2xl ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
                        <h3 className="text-lg font-bold mb-1">Licencia de Maternidad</h3>
                        <p className={`text-sm mb-5 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                            {maternityModal.employee.firstName} {maternityModal.employee.lastName}
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className={`block text-xs font-bold uppercase mb-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                                    Fecha inicio *
                                </label>
                                <input
                                    type="date"
                                    value={maternityForm.maternityStartDate}
                                    onChange={e => setMaternityForm(p => ({ ...p, maternityStartDate: e.target.value }))}
                                    className={`w-full px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2 focus:ring-pink-500 ${isDarkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                                />
                            </div>
                            <div>
                                <label className={`block text-xs font-bold uppercase mb-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                                    Fecha fin estimada (3 meses)
                                </label>
                                <input
                                    type="date"
                                    value={maternityForm.maternityEndDate}
                                    onChange={e => setMaternityForm(p => ({ ...p, maternityEndDate: e.target.value }))}
                                    className={`w-full px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2 focus:ring-pink-500 ${isDarkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                                />
                            </div>
                            <div>
                                <label className={`block text-xs font-bold uppercase mb-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                                    Notas / Motivo
                                </label>
                                <input
                                    type="text"
                                    value={maternityForm.inactivityReason}
                                    onChange={e => setMaternityForm(p => ({ ...p, inactivityReason: e.target.value }))}
                                    className={`w-full px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2 focus:ring-pink-500 ${isDarkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                                />
                            </div>

                            <div className={`p-3 rounded-lg text-xs ${isDarkMode ? "bg-pink-900/20 border border-pink-500/20 text-pink-300" : "bg-pink-50 border border-pink-200 text-pink-700"}`}>
                                <b>Nota legal:</b> Durante la licencia de maternidad (98 días / ~3 meses), la CSS paga el subsidio al empleado. La empresa sigue acumulando décimo tercer mes proporcional que se pagará en la siguiente partida.
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setMaternityModal({ show: false, employee: null, saving: false })}
                                className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold ${isDarkMode ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-100 hover:bg-gray-200"}`}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={saveMaternityLeave}
                                disabled={maternityModal.saving || !maternityForm.maternityStartDate}
                                className="flex-1 px-4 py-2 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold"
                            >
                                {maternityModal.saving ? "Guardando..." : "Registrar Licencia"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}