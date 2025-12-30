"use client";

import { useState, useMemo } from "react";
import useSWR, { mutate } from "swr";
import Loader from "../../../../components/loaders/loader";
import { Company, useCompany } from "../../../../context/routerContext";
import { CurrentPathname } from "../../../../components/layouts/main";
import { useSearch } from "../../../../context/searchContext";
import PagesHeader from "../../../../components/headers/pagesHeader";
import { usePageName } from "../../../../hook/usePageName";
import Tabla from "../../../../components/tables/Table";
import { X } from "lucide-react";

const { VITE_API_URL } = import.meta.env;

const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (res.status === 404) return null;
    if (!res.ok) {
        let errorData: any = { message: res.statusText || 'Error desconocido' };
        try {
            errorData = await res.json();
        } catch (e) {
            // Si no se puede leer JSON, usa el mensaje por defecto
        }
        throw new Error(errorData.message || 'Error al cargar datos del servidor.');
    }
    return res.json();
};

export interface ApiNetworkProvider {
    id: string;
    name: string;
    providerIp: string | null;
    dnsGateway: string | null;
    speed: string | null;
    cost: number | null;
    notes: string | null;
    meshDevices: string | null;
    switchDevices: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface FrontendNetworkProvider {
    id: string;
    nombre: string;
    ipProveedor: string;
    dnsGateway: string;
    velocidad: string;
    costoMensual: string;
    notas: string;
    dispositivosMalla: string;
    dispositivosSwitch: string;
}

interface Props {
    currentPathname?: CurrentPathname
}

interface DeleteConfirmation {
    show: boolean;
    provider: FrontendNetworkProvider | null;
    isDeleting: boolean;
}

const mapApiProviderToFrontend = (item: ApiNetworkProvider): FrontendNetworkProvider => {
    if (!item) {
        return {
            id: "0",
            nombre: "N/A",
            ipProveedor: "N/A",
            dnsGateway: "N/A",
            velocidad: "N/A",
            costoMensual: "$0.00",
            notas: "N/A",
            dispositivosMalla: "N/A",
            dispositivosSwitch: "N/A",
        };
    }

    const costValue = Number.parseFloat(item.cost?.toString() || "0") || 0;

    const parseDevices = (devices: string | null): string => {
        if (!devices) return "Ninguno";
        try {
            const parsed = JSON.parse(devices);
            if (Array.isArray(parsed)) return parsed.join(", ");
            if (typeof parsed === 'string') return parsed;
            return "Ninguno";
        } catch (e) {
            return devices || "Ninguno";
        }
    };

    return {
        id: item.id,
        nombre: item.name || "N/A",
        ipProveedor: item.providerIp || "N/A",
        dnsGateway: item.dnsGateway || "N/A",
        velocidad: item.speed || "N/A",
        costoMensual: `$${costValue.toLocaleString("es-MX", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`,
        notas: item.notes || "Sin notas",
        dispositivosMalla: parseDevices(item.meshDevices),
        dispositivosSwitch: parseDevices(item.switchDevices),
    };
};

const NetworkProvidersPage: React.FC<Props> = ({ }) => {
    const { selectedCompany }: { selectedCompany: Company | null } = useCompany();
    const { data, error, isLoading } = useSWR<ApiNetworkProvider[] | null>(
        `${VITE_API_URL}/api/network/providers/${selectedCompany?.id}/all`,
        fetcher
    );
    const { pageName } = usePageName();
    const { search } = useSearch();

    const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation>({
        show: false,
        provider: null,
        isDeleting: false,
    });

    const proveedores: FrontendNetworkProvider[] = useMemo(() => {
        if (!Array.isArray(data) || data.length === 0) return [];
        return data.map(mapApiProviderToFrontend);
    }, [data]);

    const filteredProveedores = useMemo(() => {
        if (!search) return proveedores;
        const s = search.toLowerCase();
        return proveedores.filter(
            (p) =>
                p.nombre.toLowerCase().includes(s) ||
                p.ipProveedor.toLowerCase().includes(s) ||
                p.dnsGateway.toLowerCase().includes(s) ||
                p.velocidad.toLowerCase().includes(s) ||
                p.notas.toLowerCase().includes(s)
        );
    }, [proveedores, search]);

    const openDeleteModal = (provider: FrontendNetworkProvider) => {
        setDeleteConfirmation({
            show: true,
            provider,
            isDeleting: false,
        });
    };

    const closeDeleteModal = () => {
        if (!deleteConfirmation.isDeleting) {
            setDeleteConfirmation({
                show: false,
                provider: null,
                isDeleting: false,
            });
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deleteConfirmation.provider) return;
        setDeleteConfirmation((prev) => ({ ...prev, isDeleting: true }));

        try {
            const res = await fetch(
                `${VITE_API_URL}/api/network/providers/${selectedCompany?.id}/${deleteConfirmation.provider.id}`,
                { method: "DELETE" }
            );
            if (!res.ok) throw new Error("Error al eliminar proveedor");

            mutate(`${VITE_API_URL}/api/network/providers/${selectedCompany?.id}/all`);
            closeDeleteModal();
        } catch (err) {
            console.error("Error al eliminar proveedor:", err);
            setDeleteConfirmation((prev) => ({ ...prev, isDeleting: false }));
        }
    };

    // Configuración de columnas personalizadas
    const columnConfig = {
        "nombre": (item: FrontendNetworkProvider) => (
            <p className="text-white font-medium">{item.nombre}</p>
        ),
        "ipProveedor": (item: FrontendNetworkProvider) => (
            <div>
                <p className="text-white">{item.ipProveedor}</p>
                <p className="text-gray-400 text-sm">{item.dnsGateway}</p>
            </div>
        ),
        "velocidad": (item: FrontendNetworkProvider) => (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-700 text-gray-300 border border-slate-600">
                {item.velocidad}
            </span>
        ),
        "costoMensual": (item: FrontendNetworkProvider) => (
            <p className="text-white">{item.costoMensual}</p>
        ),
        "notas": (item: FrontendNetworkProvider) => (
            <p className="text-gray-400 text-sm max-w-[200px] truncate">{item.notas}</p>
        ),
        "dispositivosMalla": (item: FrontendNetworkProvider) => (
            <div>
                <p className="text-gray-400 text-sm">Malla: {item.dispositivosMalla}</p>
                <p className="text-gray-400 text-sm">Switch: {item.dispositivosSwitch}</p>
            </div>
        ),
    };

    if (isLoading) {
        return <Loader />;
    }

    if (error) {
        return (
            <div className="text-center p-8 text-red-500">
                Error al cargar proveedores de red: {error.message}
            </div>
        );
    }

    return (
        <div className="bg-slate-900 text-gray-100">
            <PagesHeader
                title={pageName}
                description={`${pageName} in ${selectedCompany?.name}`}
                showCreate
            />

            {/* Stats Card */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-gray-400 text-sm mb-1">Total Proveedores</p>
                        <p className="text-2xl font-semibold text-white">{proveedores.length}</p>
                        <p className="text-gray-500 text-sm">Registrados en el sistema</p>
                    </div>
                </div>
            </div>


            {filteredProveedores.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                    <p className="text-white font-medium">No se encontraron proveedores registrados.</p>
                    <p className="text-gray-500 text-sm mt-1">Agrega tu primer proveedor para comenzar.</p>
                </div>
            ) : (
                <Tabla
                    datos={filteredProveedores}
                    titulo={`${pageName || "Proveedores de Red"} List`}
                    columnasPersonalizadas={columnConfig}
                    onEditar={(item) => window.location.href = `edit-provider/${item.id}`}
                    onEliminar={openDeleteModal}
                    mostrarAcciones={true}
                />
            )}

            {/* Modal de confirmación de eliminación */}
            {deleteConfirmation.show && deleteConfirmation.provider && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-slate-800 rounded-lg shadow-xl max-w-sm w-full mx-4 border border-slate-700">
                        <div className="flex items-center justify-between p-6 border-b border-slate-700">
                            <h3 className="text-lg font-semibold text-white">Confirmar eliminación</h3>
                            <button
                                onClick={closeDeleteModal}
                                disabled={deleteConfirmation.isDeleting}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6">
                            <p className="text-gray-300 mb-2">
                                ¿Estás seguro de que deseas eliminar este proveedor?
                            </p>
                            <p className="text-white font-semibold text-lg">
                                {deleteConfirmation.provider.nombre}
                            </p>
                            <p className="text-gray-500 text-sm mt-4">
                                Esta acción no se puede deshacer.
                            </p>
                        </div>

                        <div className="flex gap-3 p-6 border-t border-slate-700 bg-slate-750">
                            <button
                                onClick={closeDeleteModal}
                                disabled={deleteConfirmation.isDeleting}
                                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDeleteConfirm}
                                disabled={deleteConfirmation.isDeleting}
                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 flex items-center justify-center"
                            >
                                {deleteConfirmation.isDeleting ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Eliminando...
                                    </>
                                ) : (
                                    'Sí, eliminar'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NetworkProvidersPage;