// src/components/forms/UpdateMaintenanceForm.tsx
"use client"

import React, { useState, useEffect } from "react"
import useSWR from "swr"

// Asumimos que VITE_API_URL está configurado en tu archivo .env
const { VITE_API_URL } = import.meta.env;

// Función fetcher para SWR
const fetcher = (url: string) => fetch(url).then((res) => res.json());

// --- Tipos de Datos ---
interface Company {
    id: string;
    name: string;
}

interface User {
    id: string;
    username: string;
    person?: { fullName?: string };
}

interface Equipment {
    id: string;
    serialNumber: string;
    type: string;
    brand: string;
    model: string;
}

interface MaintenanceFormData {
    title: string;
    description: string;
    type: 'PREVENTIVE' | 'CORRECTIVE' | '';
    status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED';
    scheduledDate: string;
    completionDate: string;
    cost: number | string;
    equipmentId: string;
    assignedToUserId: string;
    companyId: string;
}

interface FormErrors {
    [key: string]: string | undefined;
}

type NotificationType = "success" | "error";

interface Notification {
    type: NotificationType;
    message: string;
    show: boolean;
}

interface Props {
    maintenanceId?: string | null;
    selectedCompany?: Company | null
    onSuccess?: () => void;
}

// --- Constantes de Estilos de Tailwind CSS ---
const inputClasses = "w-full bg-gray-700/50 border border-gray-600 text-gray-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 placeholder-gray-400";
const buttonClasses = "px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-800 transition-colors duration-200 disabled:bg-gray-500 disabled:cursor-not-allowed";


// --- Componente Principal ---
const UpdateMaintenanceForm: React.FC<Props> = ({ maintenanceId, selectedCompany, onSuccess }) => {
    const isEditMode = !!maintenanceId;

    // --- ESTADO DEL COMPONENTE ---
    const [formData, setFormData] = useState<MaintenanceFormData>({
        title: '',
        description: '',
        type: '',
        status: 'SCHEDULED',
        scheduledDate: '',
        completionDate: '',
        cost: '',
        equipmentId: '',
        assignedToUserId: '',
        companyId: selectedCompany?.id || "",
    });
    const [errors, setErrors] = useState<FormErrors>({});
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState<Notification>({ show: false, type: 'success', message: '' });

    // --- OBTENCIÓN DE DATOS (DATA FETCHING) ---
    const { data: maintenanceData } = useSWR(
        isEditMode ? `${VITE_API_URL}/api/maintenances/${maintenanceId}` : null,
        fetcher
    );

    const { data: users } = useSWR<User[]>(`${VITE_API_URL}/api/users/full/${selectedCompany?.id}`, fetcher);
    const { data: equipments } = useSWR<Equipment[]>(
        formData.companyId ? `${VITE_API_URL}/api/devices/all` : null,
        fetcher
    );

    // --- EFECTOS (LIFECYCLE) ---
    useEffect(() => {
        if (isEditMode && maintenanceData) {
            setFormData({
                title: maintenanceData.title || '',
                description: maintenanceData.description || '',
                type: maintenanceData.type || '',
                status: maintenanceData.status || 'SCHEDULED',
                scheduledDate: maintenanceData.scheduledDate ? new Date(maintenanceData.scheduledDate).toISOString().split('T')[0] : '',
                completionDate: maintenanceData.completionDate ? new Date(maintenanceData.completionDate).toISOString().split('T')[0] : '',
                cost: maintenanceData.cost || '',
                equipmentId: maintenanceData.equipmentId || '',
                assignedToUserId: maintenanceData.assignedToUserId || '',
                companyId: maintenanceData.companyId || '',
            });
        }
    }, [isEditMode, maintenanceData]);

    // --- MANEJADORES DE EVENTOS ---
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};
        if (!formData.title.trim()) newErrors.title = "El título es obligatorio.";
        if (!formData.type) newErrors.type = "El tipo de mantenimiento es obligatorio.";
        if (!formData.scheduledDate) newErrors.scheduledDate = "La fecha programada es obligatoria.";
        if (!formData.equipmentId) newErrors.equipmentId = "Debe seleccionar un equipo.";
        if (!formData.companyId) newErrors.companyId = "Debe seleccionar una compañía.";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        setLoading(true);
        setNotification({ show: false, type: 'success', message: '' });

        const endpoint = isEditMode
            ? `${VITE_API_URL}/api/maintenances/${maintenanceId}`
            : `${VITE_API_URL}/api/maintenances/create`;

        const method = isEditMode ? "PUT" : "POST";

        const body = {
            ...formData,
            cost: formData.cost ? parseFloat(String(formData.cost)) : undefined,
            completionDate: formData.completionDate || undefined,
            assignedToUserId: formData.assignedToUserId || undefined,
        };

        try {
            const response = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Ocurrió un error inesperado.');

            setNotification({ show: true, type: 'success', message: `Mantenimiento ${isEditMode ? 'actualizado' : 'creado'} con éxito.` });
            setTimeout(() => onSuccess?.(),1500);

        } catch (error: any) {
            setNotification({ show: true, type: 'error', message: error.message });
        } finally {
            setLoading(false);
        }
    };

    // --- RENDERIZADO DEL COMPONENTE ---
    return (
        <form onSubmit={handleSubmit} className="space-y-6 bg-gray-800 rounded-lg p-8 border border-gray-700">
            {/* --- Notificación --- */}
            {notification.show && (
                <div className={`p-4 rounded-lg text-white font-medium text-sm ${notification.type === 'success' ? 'bg-green-600/80' : 'bg-red-600/80'}`}>
                    {notification.message}
                </div>
            )}

            {/* --- Encabezado --- */}
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white">{isEditMode ? 'Editar Mantenimiento' : 'Registrar Nuevo Mantenimiento'}</h2>
                <p className="text-gray-400 text-sm">{isEditMode ? `Editando el registro ID: ${maintenanceId}` : 'Complete los detalles del mantenimiento'}</p>
            </div>

            {/* --- Campos del Formulario (Grid Layout) --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Título */}
                <div className="md:col-span-2">
                    <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">Título</label>
                    <input type="text" id="title" name="title" value={formData.title} onChange={handleChange} className={inputClasses} placeholder="Ej: Revisión de servidor principal" />
                    {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
                </div>

                {/* Compañía */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Empresa <span className="text-red-500">*</span>
                    </label>
                    <input
                        disabled={true}
                        type="text"
                        className={`w-full px-4 py-2 bg-gray-700 border rounded-lg text-white focus:outline-none focus:ring-2 ${errors.companyId ? "border-red-500 focus:ring-red-500" : "border-gray-600 focus:ring-blue-500"
                            }`}
                        placeholder={selectedCompany ? selectedCompany.name : "Seleccionar empresa"}
                        value={selectedCompany?.name || ""}
                    />
                    {errors.companyId && <p className="text-red-400 text-sm mt-1">{errors.companyId}</p>}
                </div>

                {/* Equipo */}
                <div>
                    <label htmlFor="equipmentId" className="block text-sm font-medium text-gray-300 mb-2">Equipo Afectado</label>
                    <select id="equipmentId" name="equipmentId" value={formData.equipmentId} onChange={handleChange} className={inputClasses} disabled={!formData.companyId}>
                        <option value="">{formData.companyId ? 'Seleccione un equipo' : 'Primero elija una compañía'}</option>
                        {equipments?.map(e => <option key={e.id} value={e.id}>{`${e.type} ${e.brand} (${e.serialNumber})`}</option>)}
                    </select>
                    {errors.equipmentId && <p className="text-red-500 text-xs mt-1">{errors.equipmentId}</p>}
                </div>

                {/* Tipo de Mantenimiento */}
                <div>
                    <label htmlFor="type" className="block text-sm font-medium text-gray-300 mb-2">Tipo</label>
                    <select id="type" name="type" value={formData.type} onChange={handleChange} className={inputClasses}>
                        <option value="">Seleccione un tipo</option>
                        <option value="PREVENTIVE">Preventivo</option>
                        <option value="CORRECTIVE">Correctivo</option>
                    </select>
                    {errors.type && <p className="text-red-500 text-xs mt-1">{errors.type}</p>}
                </div>

                {/* Estado del Mantenimiento */}
                <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-300 mb-2">Estado</label>
                    <select id="status" name="status" value={formData.status} onChange={handleChange} className={inputClasses}>
                        <option value="SCHEDULED">Programado</option>
                        <option value="IN_PROGRESS">En Progreso</option>
                        <option value="COMPLETED">Completado</option>
                        <option value="CANCELED">Cancelado</option>
                    </select>
                </div>

                {/* Fecha Programada */}
                <div>
                    <label htmlFor="scheduledDate" className="block text-sm font-medium text-gray-300 mb-2">Fecha Programada</label>
                    <input type="date" id="scheduledDate" name="scheduledDate" value={formData.scheduledDate} onChange={handleChange} className={inputClasses} />
                    {errors.scheduledDate && <p className="text-red-500 text-xs mt-1">{errors.scheduledDate}</p>}
                </div>

                {/* Fecha de Finalización */}
                <div>
                    <label htmlFor="completionDate" className="block text-sm font-medium text-gray-300 mb-2">Fecha de Finalización (Opcional)</label>
                    <input type="date" id="completionDate" name="completionDate" value={formData.completionDate} onChange={handleChange} className={inputClasses} />
                </div>

                {/* Costo */}
                <div>
                    <label htmlFor="cost" className="block text-sm font-medium text-gray-300 mb-2">Costo (Opcional)</label>
                    <input type="number" step="0.01" id="cost" name="cost" value={formData.cost} onChange={handleChange} placeholder="0.00" className={inputClasses} />
                </div>

                {/* Técnico Asignado */}
                <div>
                    <label htmlFor="assignedToUserId" className="block text-sm font-medium text-gray-300 mb-2">Asignado a (Opcional)</label>
                    <select id="assignedToUserId" name="assignedToUserId" value={formData.assignedToUserId} onChange={handleChange} className={inputClasses}>
                        <option value="">Sin asignar</option>
                        {users?.map(u => <option key={u.id} value={u.id}>{u.person?.fullName || u.username}</option>)}
                    </select>
                </div>

                {/* Descripción */}
                <div className="md:col-span-2">
                    <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">Descripción (Opcional)</label>
                    <textarea id="description" name="description" rows={4} value={formData.description} onChange={handleChange} className={inputClasses} placeholder="Detalles adicionales sobre el mantenimiento..."></textarea>
                </div>
            </div>

            {/* --- Botón de Envío --- */}
            <div className="flex justify-end pt-4">
                <button type="submit" className={buttonClasses} disabled={loading}>
                    {loading ? 'Guardando...' : (isEditMode ? 'Actualizar Mantenimiento' : 'Crear Mantenimiento')}
                </button>
            </div>
        </form>
    );
};

export default UpdateMaintenanceForm;