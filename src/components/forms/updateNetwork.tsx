"use client"

import type React from "react"
import { useState, useEffect, type FormEvent } from "react"
import { CheckCircle, AlertCircle, Save } from "lucide-react"
import useSWR from "swr"
import { UsuarioFull } from "../../pages/account/users/components/AllUsers" // Asegúrate de que esta ruta y tipo sean correctos

const { VITE_API_URL } = import.meta.env;
const fetcher = (url: string) => fetch(url).then((res) => res.json());

// --- Tipos ---
interface Company {
    id: string
    name: string
}

interface FormErrors {
    companyId?: string
}

type NotificationType = "success" | "error";

interface Notification {
    type: NotificationType;
    message: string;
    show: boolean;
}

interface FormData {
    name: string
    ipAddress: string
    macAddress: string
    deviceType: string
    status: string
    location: string
    description: string
    serialNumber: string
    model: string
    brand: string
    purchaseDate: string
    warrantyEndDate: string
    notes: string
    companyId: string
    assignedToUserId: string
}

const deviceTypes = ["ROUTER", "SWITCH", "FIREWALL", "ACCESS_POINT", "SERVER", "PRINTER", "IP_PHONE", "CAMERA", "OTHER"]
const deviceStatuses = ["ONLINE", "OFFLINE", "MAINTENANCE", "DECOMMISSIONED", "UNKNOWN"]

interface Props {
    departments?: any[] | null
    selectedCompany?: Company | null
    networkID?: string | null
}

const UpdateNetworkForm: React.FC<Props> = ({ selectedCompany, networkID }) => {
    const isEditMode = !!networkID
    
    const [formData, setFormData] = useState<FormData>({
        name: "",
        ipAddress: "",
        macAddress: "",
        deviceType: "OTHER",
        status: "UNKNOWN",
        location: "",
        description: "",
        serialNumber: "",
        model: "",
        brand: "",
        purchaseDate: "",
        warrantyEndDate: "",
        notes: "",
        companyId: selectedCompany?.id || "",
        assignedToUserId: "",
    })

    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)
    const [errors, ] = useState<FormErrors>({})
    const [, setNotification] = useState<Notification>({
        type: "success",
        message: "",
        show: false,
    });
    
    const showNotification = (type: NotificationType, message: string) => {
        setNotification({ type, message, show: true });
        // Opcional: ocultar la notificación después de unos segundos
        setTimeout(() => {
            setNotification({ type, message, show: false });
        }, 5000);
    };

    // Efecto para sincronizar el companyId del contexto en MODO CREACIÓN
    useEffect(() => {
        if (!isEditMode && selectedCompany?.id) {
            setFormData(prev => ({
                ...prev,
                companyId: selectedCompany.id,
            }));
        }
    }, [selectedCompany?.id, isEditMode]);

    // Efecto para cargar datos del dispositivo en MODO EDICIÓN
    useEffect(() => {
        if (isEditMode && networkID) {
            const fetchNetworkData = async () => {
                setIsLoading(true);
                try {
                    const response = await fetch(`${VITE_API_URL}/api/network/${networkID}`);
                    if (!response.ok) {
                        throw new Error("No se pudo cargar la información del dispositivo.");
                    }
                    const data = await response.json();

                    const formatDate = (dateString: string | null) => {
                        if (!dateString) return "";
                        return new Date(dateString).toISOString().split("T")[0];
                    }

                    setFormData({
                        name: data.name || "",
                        ipAddress: data.ipAddress || "",
                        macAddress: data.macAddress || "",
                        deviceType: data.deviceType || "ROUTER",
                        status:  data.status || "ONLINE",
                        location: data.location || "",
                        description: data.description || "",
                        serialNumber: data.serialNumber || "",
                        model: data.model || "",
                        brand: data.brand || "",
                        purchaseDate: formatDate(data.purchaseDate),
                        warrantyEndDate: formatDate(data.warrantyEndDate),
                        notes: data.notes || "",
                        companyId: data.companyId || "", // Usar el ID del dispositivo, no del contexto
                        assignedToUserId: data.assignedToUserId || "",
                    })

                } catch (error: any) {
                    showNotification("error", error.message || "Error al cargar los datos.");
                } finally {
                    setIsLoading(false);
                }
            };

            fetchNetworkData();
        }
    }, [networkID, isEditMode]);

    const { data: users, error: errorUsers, isLoading: isLoadingUsers } = useSWR<UsuarioFull[]>(
        `${VITE_API_URL}/api/users/full`,
        fetcher
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError(null);
        setSuccessMessage(null);

        if (!formData.name || !formData.ipAddress || !formData.companyId) {
            setError("Nombre, Dirección IP y Compañía son campos obligatorios.")
            return
        }

        const endpoint = isEditMode
            ? `${VITE_API_URL}/api/network/${networkID}`
            : `${VITE_API_URL}/api/network/create`;
        const method = isEditMode ? "PUT" : "POST";
        
        setIsLoading(true);
        try {
            const response = await fetch(endpoint, {
                method: method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Error al ${isEditMode ? 'actualizar' : 'crear'} el equipo`);
            }

            const successMsg = `Equipo ${isEditMode ? 'actualizado' : 'creado'} exitosamente.`;
            showNotification("success", successMsg);
            setSuccessMessage(successMsg);

            if (!isEditMode) {
                setFormData({
                    name: "", ipAddress: "", macAddress: "", deviceType: "OTHER",
                    status: "UNKNOWN", location: "", description: "", serialNumber: "",
                    model: "", brand: "", purchaseDate: "", warrantyEndDate: "",
                    notes: "", companyId: selectedCompany?.id || "", assignedToUserId: "",
                });
            }
        } catch (error: any) {
            showNotification("error", error.message);
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-slate-900">
            <div className="max-w-4xl mx-auto">
                <div className="bg-slate-800 border border-slate-700 rounded-lg">

                    <div className="p-6">
                        {isLoadingUsers ? (
                            <div className="text-slate-300 text-center py-10">Cargando usuarios...</div>
                        ) : errorUsers ? (
                            <div className="text-red-400 text-center py-10">Error al cargar usuarios: {errorUsers.message}</div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {error && (
                                    <div className="bg-red-900/20 border border-red-800 text-red-300 p-4 rounded-lg flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                {successMessage && (
                                    <div className="bg-green-900/20 border border-green-800 text-green-300 p-4 rounded-lg flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4" />
                                        <span>{successMessage}</span>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label htmlFor="name" className="text-slate-300 block text-sm font-medium">Nombre del Dispositivo <span className="text-red-400">*</span></label>
                                        <input id="name" name="name" value={formData.name} onChange={handleChange} required className="w-full bg-slate-700 border border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500 focus:outline-none rounded-md px-3 py-2" placeholder="Ej: Router Principal" />
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="ipAddress" className="text-slate-300 block text-sm font-medium">Dirección IP <span className="text-red-400">*</span></label>
                                        <input id="ipAddress" name="ipAddress" value={formData.ipAddress} onChange={handleChange} required className="w-full bg-slate-700 border border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500 focus:outline-none rounded-md px-3 py-2" placeholder="192.168.1.1" />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-slate-300 block text-sm font-medium">Empresa <span className="text-red-400">*</span></label>
                                        <input disabled value={selectedCompany?.name || "Empresa no seleccionada"} className="w-full bg-slate-700 border border-slate-600 text-slate-400 rounded-md px-3 py-2 cursor-not-allowed" />
                                        {errors.companyId && <p className="text-red-400 text-sm">{errors.companyId}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="deviceType" className="text-slate-300 block text-sm font-medium">Tipo de Dispositivo <span className="text-red-400">*</span></label>
                                        <select id="deviceType" name="deviceType" value={formData.deviceType} onChange={handleSelectChange} className="w-full bg-slate-700 border border-slate-600 text-white focus:border-blue-500 focus:outline-none rounded-md px-3 py-2">
                                            {deviceTypes.map((type) => (<option key={type} value={type} className="bg-slate-700">{type}</option>))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <label htmlFor="macAddress" className="text-slate-300 block text-sm font-medium">Dirección MAC</label>
                                        <input id="macAddress" name="macAddress" value={formData.macAddress} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500 focus:outline-none rounded-md px-3 py-2" placeholder="00:1B:44:11:3A:B7" />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="serialNumber" className="text-slate-300 block text-sm font-medium">Número de Serie</label>
                                        <input id="serialNumber" name="serialNumber" value={formData.serialNumber} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500 focus:outline-none rounded-md px-3 py-2" placeholder="RT-2024-001" />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="brand" className="text-slate-300 block text-sm font-medium">Marca</label>
                                        <input id="brand" name="brand" value={formData.brand} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500 focus:outline-none rounded-md px-3 py-2" placeholder="Cisco" />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="model" className="text-slate-300 block text-sm font-medium">Modelo</label>
                                        <input id="model" name="model" value={formData.model} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500 focus:outline-none rounded-md px-3 py-2" placeholder="RX-5000" />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="status" className="text-slate-300 block text-sm font-medium">Estado</label>
                                        <select id="status" name="status" value={formData.status} onChange={handleSelectChange} className="w-full bg-slate-700 border border-slate-600 text-white focus:border-blue-500 focus:outline-none rounded-md px-3 py-2">
                                            {deviceStatuses.map((status) => (<option key={status} value={status} className="bg-slate-700">{status}</option>))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="location" className="text-slate-300 block text-sm font-medium">Ubicación</label>
                                        <input id="location" name="location" value={formData.location} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500 focus:outline-none rounded-md px-3 py-2" placeholder="Sala de Servidores" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <label htmlFor="assignedToUserId" className="text-slate-300 block text-sm font-medium">Asignado a (Usuario)</label>
                                        <select id="assignedToUserId" name="assignedToUserId" value={formData.assignedToUserId} onChange={handleSelectChange} className="w-full bg-slate-700 border border-slate-600 text-white focus:border-blue-500 focus:outline-none rounded-md px-3 py-2">
                                            <option value="" className="bg-slate-700">Sin asignar</option>
                                            {users && users.map((user) => (<option key={user.id} value={user.id} className="bg-slate-700">{user.username}</option>))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="purchaseDate" className="text-slate-300 block text-sm font-medium">Fecha de Compra</label>
                                        <input id="purchaseDate" name="purchaseDate" type="date" value={formData.purchaseDate} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 text-white focus:border-blue-500 focus:outline-none rounded-md px-3 py-2" />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="warrantyEndDate" className="text-slate-300 block text-sm font-medium">Fin de Garantía</label>
                                        <input id="warrantyEndDate" name="warrantyEndDate" type="date" value={formData.warrantyEndDate} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 text-white focus:border-blue-500 focus:outline-none rounded-md px-3 py-2" />
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label htmlFor="description" className="text-slate-300 block text-sm font-medium">Descripción</label>
                                        <textarea id="description" name="description" value={formData.description} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500 focus:outline-none rounded-md px-3 py-2 min-h-[100px] resize-y" placeholder="Descripción detallada del dispositivo..." />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="notes" className="text-slate-300 block text-sm font-medium">Notas Adicionales</label>
                                        <textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500 focus:outline-none rounded-md px-3 py-2 min-h-[100px] resize-y" placeholder="Notas adicionales, configuraciones especiales..." />
                                    </div>
                                </div>

                                <div className="flex justify-end pt-6 border-t border-slate-700">
                                    <button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-8 py-2 min-w-[200px] rounded-md font-medium transition-colors flex items-center justify-center">
                                        {isLoading ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                                Guardando...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="h-4 w-4 mr-2" />
                                                {isEditMode ? "Actualizar Dispositivo" : "Crear Dispositivo"}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default UpdateNetworkForm;