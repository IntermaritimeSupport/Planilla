"use client"
import type React from "react"
import { useState, useEffect } from "react"
import { UsuarioFull } from "../../utils/usuarioFull"
import { Company } from "../../context/routerContext"
import { useNavigate } from "react-router-dom"

interface Departments {
    id: string
    name: string
}

const { VITE_API_URL } = import.meta.env

export interface CreateEquipmentData {
    type: string;
    brand: string;
    model: string;
    serialNumber: string;
    plateNumber: string;
    location?: string;
    status?: string;
    acquisitionDate?: string;
    warrantyDetails?: string;
    qrCode?: string;
    invoiceUrl?: string;
    cost?: number;
    companyId: string;
    assignedToUserId?: string;
    endUser?: string;
    operatingSystem?: string;
}

interface Equipment {
    id: string;
    type: string;
    brand: string;
    model: string;
    serialNumber: string;
    plateNumber?: string;
    location?: string;
    status: string;
    acquisitionDate?: string;
    warrantyDetails?: string;
    qrCode?: string;
    invoiceUrl?: string;
    cost?: number;
    companyId: string;
    assignedToUserId?: string;
    endUser?: string;
    operatingSystem?: string;
}

interface Props {
    users?: UsuarioFull[] | null;
    departments?: Departments[] | null
    selectedCompany?: Company | null
    deviceID?: string | null
    equipment?: Equipment
}

type NotificationType = "success" | "error";

interface Notification {
    type: NotificationType;
    message: string;
    show: boolean;
}

interface FormErrors {
    type?: string;
    brand?: string;
    model?: string;
    serialNumber?: string;
    plateNumber?: string;
    location?: string;
    status?: string;
    acquisitionDate?: string;
    warrantyDetails?: string;
    qrCode?: string;
    invoiceUrl?: string;
    cost?: string;
    companyId?: string;
    assignedToUserId?: string;
    endUser?: string;
    operatingSystem?: string;
}

const UpdateDevices: React.FC<Props> = ({ users, selectedCompany, deviceID }) => {
    const isEditMode = !!deviceID;
    const navigate = useNavigate();
    const [formData, setFormData] = useState<CreateEquipmentData>({
        type: "",
        brand: "",
        model: "",
        serialNumber: "",
        plateNumber: "",
        location: "",
        status: "ACTIVE",
        acquisitionDate: "",
        warrantyDetails: "",
        qrCode: "",
        invoiceUrl: "",
        cost: undefined,
        companyId: selectedCompany?.id || "",
        assignedToUserId: "",
        endUser: "",
        operatingSystem: "",
    });

    const [isLoading, setIsLoading] = useState(false);
    const [uploadingInvoice, setUploadingInvoice] = useState(false);
    const [errors, setErrors] = useState<FormErrors>({});
    const [notification, setNotification] = useState<Notification>({
        type: "success",
        message: "",
        show: false,
    });
    const [invoicePreview, setInvoicePreview] = useState<string | null>(null);

    const equipmentTypes = [
        { value: "Laptop", label: "Laptop" },
        { value: "Desktop", label: "Computadora de Escritorio" },
        { value: "Servidor", label: "Servidor" },
        { value: "Monitor", label: "Monitor" },
        { value: "Impresora", label: "Impresora" },
        { value: "Router", label: "Router" },
        { value: "Switch", label: "Switch" },
        { value: "Tablet", label: "Tablet" },
        { value: "Smartphone", label: "Smartphone" },
        { value: "Otro", label: "Otro" },
    ];

    const equipmentStatus = [
        { value: "ACTIVE", label: "Activo" },
        { value: "IN_MAINTENANCE", label: "En Reparación o Mantenimiento" },
        { value: "STORAGE", label: "En Almacén" },
        { value: "DISPOSED", label: "Desechado" },
        { value: "ASSIGNED", label: "Asignado" },
        { value: "DAMAGED", label: "Dañado" },
    ];

    // Cargar datos del equipo si está en modo edición
    useEffect(() => {
        if (isEditMode && deviceID) {
            const fetchEquipment = async () => {
                try {
                    const response = await fetch(`${VITE_API_URL}/api/devices/${deviceID}`);
                    if (!response.ok) {
                        throw new Error("Error al cargar el equipo");
                    }
                    const data = await response.json();
                    
                    setFormData({
                        type: data.type || "",
                        brand: data.brand || "",
                        model: data.model || "",
                        serialNumber: data.serialNumber || "",
                        plateNumber: data.plateNumber || "",
                        location: data.location || "",
                        status: data.status || "ACTIVE",
                        acquisitionDate: data.acquisitionDate ? data.acquisitionDate.split('T')[0] : "",
                        warrantyDetails: data.warrantyDetails || "",
                        qrCode: data.qrCode || "",
                        invoiceUrl: data.invoiceUrl || "",
                        cost: data.cost ?? undefined,
                        companyId: data.companyId || selectedCompany?.id || "",
                        assignedToUserId: data.assignedToUserId || "",
                        endUser: data.endUser || "",
                        operatingSystem: data.operatingSystem || "",
                    });
                    if (data.invoiceUrl) {
                        setInvoicePreview(data.invoiceUrl);
                    }
                } catch (error: any) {
                    console.error("Error al cargar el equipo:", error);
                    showNotification("error", "Error al cargar los datos del equipo");
                }
            };

            fetchEquipment();
        }
    }, [deviceID, isEditMode, selectedCompany?.id]);

    const showNotification = (type: NotificationType, message: string) => {
        setNotification({ type, message, show: true });
    };

    useEffect(() => {
        if (notification.show) {
            const timer = setTimeout(() => setNotification((prev) => ({ ...prev, show: false })), 5000);
            return () => clearTimeout(timer);
        }
    }, [notification.show]);

    const handleInputChange = (field: keyof CreateEquipmentData, value: string) => {
        if (field === "cost") {
            const numericValue = parseFloat(value);
            setFormData((prev) => ({ ...prev, cost: !isNaN(numericValue) ? numericValue : undefined }));
        } else {
            setFormData((prev) => ({ ...prev, [field]: value }));
        }
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: undefined }));
        }
    };

    const handleInvoiceChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Si no estamos en modo edición, mostrar advertencia
        if (!isEditMode) {
            showNotification("error", "Debes crear primero el equipo antes de subir la factura");
            return;
        }

        try {
            setUploadingInvoice(true);
            setNotification({ type: "success", message: "", show: false });

            const formDataUpload = new FormData();
            formDataUpload.append("invoice", file);

            const uploadEndpoint = `${VITE_API_URL}/api/devices/${deviceID}/upload-invoice`;

            const response = await fetch(uploadEndpoint, {
                method: "POST",
                body: formDataUpload,
            });

            if (!response.ok) {
                throw new Error("Error al subir la factura");
            }

            const data = await response.json();
            setFormData((prev) => ({
                ...prev,
                invoiceUrl: data.invoiceUrl,
            }));
            setInvoicePreview(data.invoiceUrl);
            showNotification("success", "Factura subida exitosamente");
        } catch (err: any) {
            showNotification("error", err.message || "Error al subir la factura");
        } finally {
            setUploadingInvoice(false);
        }
    };

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};
        if (!formData.type.trim()) newErrors.type = "El tipo de equipo es requerido";
        if (!formData.brand.trim()) newErrors.brand = "La marca es requerida";
        if (!formData.model.trim()) newErrors.model = "El modelo es requerido";
        if (!formData.serialNumber.trim()) newErrors.serialNumber = "El número de serie es requerido";
        if (!formData.companyId) newErrors.companyId = "La empresa es requerida";
        if (formData.cost !== undefined && (isNaN(formData.cost) || formData.cost < 0)) {
            newErrors.cost = "El costo debe ser un número positivo válido";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsLoading(true);

        const endpoint = isEditMode
            ? `${VITE_API_URL}/api/devices/${deviceID}`
            : `${VITE_API_URL}/api/devices/create`;

        const method = isEditMode ? "PUT" : "POST";

        try {
            const apiPayload = {
                type: formData.type,
                brand: formData.brand,
                model: formData.model,
                serialNumber: formData.serialNumber,
                companyId: formData.companyId,
                ...(formData.plateNumber?.trim() && { plateNumber: formData.plateNumber }),
                ...(formData.assignedToUserId && { assignedToUserId: formData.assignedToUserId }),
                ...(formData.location?.trim() && { location: formData.location }),
                ...(formData.status?.trim() && { status: formData.status }),
                ...(formData.acquisitionDate?.trim() && { acquisitionDate: formData.acquisitionDate }),
                ...(formData.warrantyDetails?.trim() && { warrantyDetails: formData.warrantyDetails }),
                ...(formData.qrCode?.trim() && { qrCode: formData.qrCode }),
                ...(formData.invoiceUrl?.trim() && { invoiceUrl: formData.invoiceUrl }),
                ...(formData.endUser?.trim() && { endUser: formData.endUser }),
                ...(formData.operatingSystem?.trim() && { operatingSystem: formData.operatingSystem }),
                ...(formData.cost !== undefined && { cost: formData.cost }),
            };

            const response = await fetch(endpoint, {
                method: method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(apiPayload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Error al ${isEditMode ? 'actualizar' : 'crear'} el equipo`);
            }

            const successMessage = `Equipo ${isEditMode ? 'actualizado' : 'creado'} exitosamente.`;
            showNotification("success", successMessage);

            if (!isEditMode) {
                setFormData({
                    type: "", brand: "", model: "", serialNumber: "", plateNumber: "",
                    location: "", status: "ACTIVE", acquisitionDate: "", warrantyDetails: "",
                    qrCode: "", invoiceUrl: "", cost: undefined, companyId: selectedCompany?.id || "",
                    assignedToUserId: "", endUser: "", operatingSystem: "",
                });
                setInvoicePreview(null);
            }
        } catch (error: any) {
            console.error(`Error al ${isEditMode ? 'actualizar' : 'crear'} equipo:`, error);
            showNotification("error", error.message || `Error inesperado al ${isEditMode ? 'actualizar' : 'crear'} el equipo`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Sección Básica */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <div className="flex items-center space-x-3 mb-6">
                        <div>
                            <h2 className="text-xl font-bold">{isEditMode ? 'Actualizar Equipo' : 'Información del Nuevo Equipo'}</h2>
                            <p className="text-gray-400 text-sm">{isEditMode ? `Editando el dispositivo ID: ${deviceID}` : 'Datos básicos del equipo tecnológico'}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Tipo de Equipo <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <select
                                    value={formData.type}
                                    onChange={(e) => handleInputChange("type", e.target.value)}
                                    className={`w-full px-4 py-2 bg-gray-700 border rounded-lg text-white appearance-none cursor-pointer hover:bg-gray-600 focus:outline-none focus:ring-2 pr-10 ${errors.type ? "border-red-500 focus:ring-red-500" : "border-gray-600 focus:ring-blue-500"}`}
                                >
                                    <option value="">Seleccionar tipo...</option>
                                    {equipmentTypes.map((type) => (
                                        <option key={type.value} value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {errors.type && <p className="text-red-400 text-sm mt-1">{errors.type}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Marca <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.brand}
                                onChange={(e) => handleInputChange("brand", e.target.value)}
                                className={`w-full px-4 py-2 bg-gray-700 border rounded-lg text-white focus:outline-none focus:ring-2 ${errors.brand ? "border-red-500 focus:ring-red-500" : "border-gray-600 focus:ring-blue-500"}`}
                                placeholder="Dell, HP, Lenovo, etc."
                            />
                            {errors.brand && <p className="text-red-400 text-sm mt-1">{errors.brand}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Modelo <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.model}
                                onChange={(e) => handleInputChange("model", e.target.value)}
                                className={`w-full px-4 py-2 bg-gray-700 border rounded-lg text-white focus:outline-none focus:ring-2 ${errors.model ? "border-red-500 focus:ring-red-500" : "border-gray-600 focus:ring-blue-500"}`}
                                placeholder="Latitude 5520, ThinkPad X1, etc."
                            />
                            {errors.model && <p className="text-red-400 text-sm mt-1">{errors.model}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Empresa <span className="text-red-500">*</span>
                            </label>
                            <input
                                disabled={true}
                                type="text"
                                className={`w-full px-4 py-2 bg-gray-700 border rounded-lg text-white focus:outline-none focus:ring-2 ${errors.companyId ? "border-red-500 focus:ring-red-500" : "border-gray-600 focus:ring-blue-500"}`}
                                placeholder={selectedCompany ? selectedCompany.name : "Seleccionar empresa"}
                                value={selectedCompany?.name || ""}
                            />
                            {errors.companyId && <p className="text-red-400 text-sm mt-1">{errors.companyId}</p>}
                        </div>
                    </div>
                </div>

                {/* Sección de Identificación y QR */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h2 className="text-xl font-bold mb-6">Identificación y QR</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Número de Serie <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.serialNumber}
                                onChange={(e) => handleInputChange("serialNumber", e.target.value)}
                                className={`w-full px-4 py-2 bg-gray-700 border rounded-lg text-white focus:outline-none focus:ring-2 ${errors.serialNumber ? "border-red-500 focus:ring-red-500" : "border-gray-600 focus:ring-blue-500"}`}
                                placeholder="ABC123456789"
                            />
                            {errors.serialNumber && <p className="text-red-400 text-sm mt-1">{errors.serialNumber}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Número de Placa
                            </label>
                            <input
                                type="text"
                                value={formData.plateNumber}
                                onChange={(e) => handleInputChange("plateNumber", e.target.value)}
                                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="PLACA001 (opcional)"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Código QR
                            </label>
                            <input
                                type="text"
                                value={formData.qrCode}
                                onChange={(e) => handleInputChange("qrCode", e.target.value)}
                                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Código QR (opcional)"
                            />
                        </div>
                    </div>
                </div>

                {/* Sección de Factura */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h2 className="text-xl font-bold mb-6">Factura</h2>
                    {!isEditMode ? (
                        <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 text-yellow-200 text-sm">
                            ⚠️ Debes crear primero el equipo para poder subir la factura
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Subir Factura (PDF, Imagen, Documento)
                                </label>
                                <div className="flex items-center gap-4">
                                    {invoicePreview && (
                                        <a
                                            href={invoicePreview}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-400 hover:text-blue-300 text-sm underline"
                                        >
                                            📄 Ver Factura
                                        </a>
                                    )}
                                    <input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                                        onChange={handleInvoiceChange}
                                        disabled={uploadingInvoice}
                                        className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                    />
                                    {uploadingInvoice && (
                                        <span className="text-yellow-400 text-sm">Subiendo...</span>
                                    )}
                                </div>
                                <p className="text-gray-400 text-xs mt-2">Máximo 50MB. Formatos: PDF, JPG, PNG, DOC, DOCX, XLS, XLSX</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sección de Información Adicional */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h2 className="text-xl font-bold mb-6">Información Adicional</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Costo
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                                <input
                                    type="number"
                                    value={formData.cost !== undefined ? formData.cost : ""}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        handleInputChange("cost", e.target.value)
                                    }
                                    className={`w-full pl-7 pr-4 py-2 bg-gray-700 border rounded-lg text-white focus:outline-none focus:ring-2 ${errors.cost ? "border-red-500 focus:ring-red-500" : "border-gray-600 focus:ring-blue-500"}`}
                                    placeholder="0.00 (opcional)"
                                    step="0.01"
                                />
                            </div>
                            {errors.cost && <p className="text-red-400 text-sm mt-1">{errors.cost}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Ubicación
                            </label>
                            <input
                                type="text"
                                value={formData.location}
                                onChange={(e) => handleInputChange("location", e.target.value)}
                                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Ej: Oficina 101, Piso 3"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Estado del Equipo
                            </label>
                            <div className="relative">
                                <select
                                    value={formData.status}
                                    onChange={(e) => handleInputChange("status", e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white appearance-none cursor-pointer hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                                >
                                    {equipmentStatus.map((status) => (
                                        <option key={status.value} value={status.value}>
                                            {status.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Fecha de Adquisición
                            </label>
                            <input
                                type="date"
                                value={formData.acquisitionDate}
                                onChange={(e) => handleInputChange("acquisitionDate", e.target.value)}
                                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Detalles de la Garantía
                            </label>
                            <input
                                type="text"
                                value={formData.warrantyDetails}
                                onChange={(e) => handleInputChange("warrantyDetails", e.target.value)}
                                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Ej: Vence el 31/12/2025"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Sistema Operativo
                            </label>
                            <input
                                type="text"
                                value={formData.operatingSystem}
                                onChange={(e) => handleInputChange("operatingSystem", e.target.value)}
                                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Ej: Windows 11, macOS Ventura"
                            />
                        </div>
                    </div>
                </div>

                {/* Sección de Asignación */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h2 className="text-xl font-bold mb-6">Asignación</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Usuario Asignado
                            </label>
                            <div className="relative">
                                <select
                                    value={formData.assignedToUserId}
                                    onChange={(e) => handleInputChange("assignedToUserId", e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white appearance-none cursor-pointer hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                                >
                                    <option value="">Sin asignar (opcional)</option>
                                    {Array.isArray(users) &&
                                        users.map((user) => (
                                            <option key={user.id} value={user.id}>
                                                {user?.person?.fullName}
                                            </option>
                                        ))}
                                </select>
                            </div>
                            <p className="text-gray-400 text-xs mt-1">
                                Puedes dejar este campo vacío si el equipo no está asignado a ningún usuario específico
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Usuario Final
                            </label>
                            <input
                                type="text"
                                value={formData.endUser}
                                onChange={(e) => handleInputChange("endUser", e.target.value)}
                                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Nombre del usuario final (opcional)"
                            />
                            <p className="text-gray-400 text-xs mt-1">
                                Nombre del usuario que utiliza el equipo actualmente
                            </p>
                        </div>
                    </div>
                </div>

                {/* Botones */}
                <div className="flex justify-end space-x-4">
                    <button 
                        type="button" 
                        className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                        onClick={() => navigate(`/${selectedCompany?.code}/devices/all`)}
                    >
                        Cancelar
                    </button>
                    <button type="submit" disabled={isLoading || uploadingInvoice} className="flex items-center space-x-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors">
                        {isLoading ? (
                            <>
                                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                <span>{isEditMode ? 'Actualizando...' : 'Creando...'}</span>
                            </>
                        ) : (
                            <span>{isEditMode ? 'Actualizar Equipo' : 'Crear Equipo'}</span>
                        )}
                    </button>
                </div>
            </form>

            {notification.show && (
                <div
                    className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4 transition-all duration-300 ease-in-out ${notification.show ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
                >
                    <div
                        className={`rounded-lg p-4 shadow-lg border ${notification.type === "success"
                            ? "bg-green-800 border-green-600 text-green-100"
                            : "bg-red-800 border-red-600 text-red-100"
                            }`}
                    >
                        <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                                {notification.type === "success" ? (
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M9 12l2 2 4-4" />
                                        <circle cx="12" cy="12" r="10" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="15" y1="9" x2="9" y2="15" />
                                        <line x1="9" y1="9" x2="15" y2="15" />
                                    </svg>
                                )}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium">{notification.message}</p>
                            </div>
                            <button
                                onClick={() => setNotification((prev) => ({ ...prev, show: false }))}
                                className="flex-shrink-0 text-current hover:opacity-75 transition-opacity"
                            >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default UpdateDevices