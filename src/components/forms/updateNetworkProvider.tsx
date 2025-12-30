// src/components/NetworkProviderForm.tsx
"use client";

import type React from "react";
import { useState, useEffect, type FormEvent } from "react";
import { CheckCircle, AlertCircle, Save } from "lucide-react";

const { VITE_API_URL } = import.meta.env;

// --- Tipos ---
interface Company { // Interface para la compañía
    id: string;
    name: string;
}

interface NetworkProviderFormData {
    name: string;
    providerIp: string;
    dnsGateway: string;
    speed: string;
    cost: string;
    notes: string;
    meshDevices: string;
    switchDevices: string;
    companyId: string; // NUEVO: companyId
}

interface FormErrors {
    name?: string;
    companyId?: string; // NUEVO: error para companyId
    // Añade más campos de validación si es necesario
}

type NotificationType = "success" | "error";

interface Notification {
    type: NotificationType;
    message: string;
    show: boolean;
}

interface Props {
    NetworkProviderID?: string | null; // ID del proveedor para modo edición
    selectedCompany?: Company | null; // NUEVO: Compañía seleccionada del contexto
}

const NetworkProviderForm: React.FC<Props> = ({ NetworkProviderID, selectedCompany }) => { // NUEVO: Recibe selectedCompany
    const isEditMode = !!NetworkProviderID;

    const [formData, setFormData] = useState<NetworkProviderFormData>({
        name: "",
        providerIp: "",
        dnsGateway: "",
        speed: "",
        cost: "0.00",
        notes: "",
        meshDevices: "",
        switchDevices: "",
        companyId: selectedCompany?.id || "", // Inicializar con el ID de la compañía seleccionada
    });

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [formErrors, setFormErrors] = useState<FormErrors>({}); // Renombrado a formErrors para evitar conflicto
    const [, setNotification] = useState<Notification>({
        type: "success",
        message: "",
        show: false,
    });

    const showNotification = (type: NotificationType, message: string) => {
        setNotification({ type, message, show: true });
        setTimeout(() => {
            setNotification({ type, message, show: false });
        }, 5000);
    };

    // Efecto para sincronizar el companyId del contexto en MODO CREACIÓN
    // Y para establecer la compañía cuando el formulario se carga inicialmente
    useEffect(() => {
        if (!isEditMode && selectedCompany?.id && formData.companyId !== selectedCompany.id) {
            setFormData(prev => ({
                ...prev,
                companyId: selectedCompany.id,
            }));
        }
        // En modo edición, si la compañía del proveedor cargado es diferente a la seleccionada
        // Podríamos querer actualizar la seleccionada o mostrar un warning.
        // Por ahora, solo nos aseguramos de que el formData refleje la compañía del selectedCompany para el create
    }, [selectedCompany?.id, isEditMode, formData.companyId]);


    // Efecto para cargar datos del proveedor en MODO EDICIÓN
    useEffect(() => {
        if (isEditMode && NetworkProviderID) {
            const fetchProviderData = async () => {
                setIsLoading(true);
                try {
                    const response = await fetch(`${VITE_API_URL}/api/network/providers/${NetworkProviderID}`);
                    if (!response.ok) {
                        throw new Error("No se pudo cargar la información del proveedor.");
                    }
                    const data = await response.json();

                    setFormData({
                        name: data.name || "",
                        providerIp: data.providerIp || "",
                        dnsGateway: data.dnsGateway || "",
                        speed: data.speed || "",
                        cost: data.cost ? parseFloat(data.cost).toFixed(2) : "0.00",
                        notes: data.notes || "",
                        meshDevices: data.meshDevices || "",
                        switchDevices: data.switchDevices || "",
                        companyId: data.companyId || selectedCompany?.id || "", // Asegurarse de tener companyId
                    });
                } catch (error: any) {
                    showNotification("error", error.message || "Error al cargar los datos del proveedor.");
                } finally {
                    setIsLoading(false);
                }
            };

            fetchProviderData();
        }
    }, [NetworkProviderID, isEditMode, selectedCompany?.id]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (formErrors[name as keyof FormErrors]) { // Usar formErrors
            setFormErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name as keyof FormErrors];
                return newErrors;
            });
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        setFormErrors({}); // Resetear errores del formulario

        // Validación de campos obligatorios
        const newErrors: FormErrors = {};
        if (!formData.name.trim()) {
            newErrors.name = "El nombre del proveedor es obligatorio.";
        }
        if (!formData.companyId.trim()) { // NUEVO: Validación de companyId
            newErrors.companyId = "La compañía es obligatoria.";
        }

        if (Object.keys(newErrors).length > 0) {
            setFormErrors(newErrors);
            setError("Por favor, corrige los errores en el formulario.");
            return;
        }

        const endpoint = isEditMode
            ? `${VITE_API_URL}/api/network/providers/${NetworkProviderID}`
            : `${VITE_API_URL}/api/network/providers`;
        const method = isEditMode ? "PUT" : "POST";

        setIsLoading(true);
        try {
            const payload = {
                ...formData,
                cost: parseFloat(formData.cost),
                // Asegúrate de que meshDevices y switchDevices se envíen como null si están vacíos
                meshDevices: formData.meshDevices.trim() === "" ? null : formData.meshDevices,
                switchDevices: formData.switchDevices.trim() === "" ? null : formData.switchDevices,
            };

            const response = await fetch(endpoint, {
                method: method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Error al ${isEditMode ? 'actualizar' : 'crear'} el proveedor`);
            }

            const successMsg = `Proveedor ${isEditMode ? 'actualizado' : 'creado'} exitosamente.`;
            showNotification("success", successMsg);
            setSuccessMessage(successMsg);

            if (!isEditMode) {
                setFormData({
                    name: "", providerIp: "", dnsGateway: "", speed: "", cost: "0.00",
                    notes: "", meshDevices: "", switchDevices: "", companyId: selectedCompany?.id || "",
                });
            }
        } catch (error: any) {
            showNotification("error", error.message);
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Renderizado del formulario
    return (
        <div className="min-h-screen bg-slate-900">
            <div className="max-w-4xl mx-auto py-8">
                <div className="bg-slate-800 border border-slate-700 rounded-lg">
                    <div className="p-6">
                        <h2 className="text-2xl font-semibold text-white mb-6">
                            {isEditMode ? "Editar Proveedor de Red" : "Crear Nuevo Proveedor de Red"}
                        </h2>

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

                            {(isLoading && !isEditMode) && ( // Si está cargando y no es modo edición (ej. fetch inicial)
                                <div className="text-slate-300 text-center py-10">Cargando formulario...</div>
                            )}

                            {(isLoading && isEditMode) && ( // Si está cargando y es modo edición (cargando datos del proveedor)
                                <div className="text-slate-300 text-center py-10">Cargando datos del proveedor...</div>
                            )}

                            {/* Campos del formulario */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label htmlFor="name" className="text-slate-300 block text-sm font-medium">Nombre del Proveedor <span className="text-red-400">*</span></label>
                                    <input id="name" name="name" value={formData.name} onChange={handleChange} required className="w-full bg-slate-700 border border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500 focus:outline-none rounded-md px-3 py-2" placeholder="Ej: Tigo Honduras" />
                                    {formErrors.name && <p className="text-red-400 text-sm mt-1">{formErrors.name}</p>}
                                </div>

                                {/* Campo de Compañía (solo lectura) */}
                                <div className="space-y-2">
                                    <label htmlFor="companyName" className="text-slate-300 block text-sm font-medium">Empresa <span className="text-red-400">*</span></label>
                                    <input
                                        id="companyName"
                                        name="companyName"
                                        value={selectedCompany?.name || "Cargando..."}
                                        disabled
                                        className="w-full bg-slate-700 border border-slate-600 text-slate-400 rounded-md px-3 py-2 cursor-not-allowed"
                                    />
                                    {formErrors.companyId && <p className="text-red-400 text-sm mt-1">{formErrors.companyId}</p>}
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="providerIp" className="text-slate-300 block text-sm font-medium">IP del Proveedor</label>
                                    <input id="providerIp" name="providerIp" value={formData.providerIp} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500 focus:outline-none rounded-md px-3 py-2" placeholder="Ej: 200.10.20.1" />
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="dnsGateway" className="text-slate-300 block text-sm font-medium">DNS Gateway</label>
                                    <input id="dnsGateway" name="dnsGateway" value={formData.dnsGateway} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500 focus:outline-none rounded-md px-3 py-2" placeholder="Ej: 8.8.8.8" />
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="speed" className="text-slate-300 block text-sm font-medium">Velocidad Contratada</label>
                                    <input id="speed" name="speed" value={formData.speed} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500 focus:outline-none rounded-md px-3 py-2" placeholder="Ej: 100 Mbps / 50 Mbps" />
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="cost" className="text-slate-300 block text-sm font-medium">Costo Mensual</label>
                                    <input id="cost" name="cost" type="number" step="0.01" value={formData.cost} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500 focus:outline-none rounded-md px-3 py-2" placeholder="Ej: 50.00" />
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label htmlFor="meshDevices" className="text-slate-300 block text-sm font-medium">Dispositivos Malla (JSON Array)</label>
                                    <textarea id="meshDevices" name="meshDevices" value={formData.meshDevices} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500 focus:outline-none rounded-md px-3 py-2 min-h-[80px] resize-y" placeholder='Ej: ["Mesh A", "Mesh B"]' />
                                    <p className="text-gray-500 text-xs mt-1">Introduce los nombres de los dispositivos de malla como un JSON Array.</p>
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="switchDevices" className="text-slate-300 block text-sm font-medium">Dispositivos Switch (JSON Array)</label>
                                    <textarea id="switchDevices" name="switchDevices" value={formData.switchDevices} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500 focus:outline-none rounded-md px-3 py-2 min-h-[80px] resize-y" placeholder='Ej: ["Switch Principal", "Switch Sala A"]' />
                                    <p className="text-gray-500 text-xs mt-1">Introduce los nombres de los switches como un JSON Array.</p>
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="notes" className="text-slate-300 block text-sm font-medium">Notas Adicionales</label>
                                    <textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500 focus:outline-none rounded-md px-3 py-2 min-h-[100px] resize-y" placeholder="Cualquier nota adicional sobre el proveedor o servicio..." />
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
                                            {isEditMode ? "Actualizar Proveedor" : "Crear Proveedor"}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NetworkProviderForm;