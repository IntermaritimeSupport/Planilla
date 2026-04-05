import { authFetcher } from "../../../../services/api"
import React from "react";
import { useParams } from "react-router-dom";
import useSWR from "swr";
import { Company, useCompany } from "../../../../context/routerContext";
import { UsuarioFull } from "../../../../utils/usuarioFull";
import NetworkProviderForm from "../../../../components/forms/updateNetworkProvider";
import { CurrentPathname } from "../../../../components/layouts/main";
const { VITE_API_URL } = import.meta.env;
// authFetcher from services/api (autenticado)
interface User {
    id: string;
    person: {
        fullName: string;
    };
}

interface Props {
    companies?: Company[] | null;
    users?: User[] | null;
    selectedCompany?: Company | null;
    // Prop para manejar el evento de cancelación
    onCancel?: () => void;
    currentPathname?: CurrentPathname
}


const UpdateNetworkProviderPage: React.FC<Props> = ({ }) => {
    const { id: NetworkProviderID } = useParams<{ id: string }>();
    const { selectedCompany }: { selectedCompany: Company | null } = useCompany();

    const renderPage = NetworkProviderID ? "Editar Proveedor" : "Crear Proveedor";
    document.title = renderPage;

    // 🔹 Consulta 1: Departamentos
    const { data: departments, error: errorDepartments, isLoading: isLoadingDepartments } = useSWR(
        selectedCompany ? `${VITE_API_URL}/api/companies/departments/by-code/${selectedCompany.code}` : null, authFetcher,
        { revalidateOnFocus: false, revalidateOnReconnect: false, dedupingInterval: 300_000 }
    );

    // 🔹 Consulta 2: Usuarios
    const { data: users, error: errorUsers, isLoading: isLoadingUsers } = useSWR<UsuarioFull[]>(
        `${VITE_API_URL}/api/users/getAll`, authFetcher,
        { revalidateOnFocus: false, revalidateOnReconnect: false, dedupingInterval: 300_000 }
    );

    // ✅ Lógica corregida para manejo de carga y errores
    if (errorUsers) return <div>Error al cargar usuarios: {errorUsers.message}</div>; // Muestra el error específico
    if (isLoadingUsers || !users ) return <div>Cargando usuarios...</div>; // Si está cargando o users es null/undefined, muestra cargando
    if (!users || !Array.isArray(users)) return <div>No se encontraron usuarios o el formato es incorrecto.</div>;
    if (errorDepartments) return <div>Error al cargar departamentos: {errorDepartments.message}</div>; // Muestra el error específico
    if (isLoadingDepartments || !departments) return <div>Cargando departamentos...</div>; // Si está cargando o departments es null/undefined, muestra cargando


    return (
        <div className="relative p-6 bg-gray-900 min-h-screen font-inter text-white">
            {/* Contenedor principal del formulario */}
            <div className="max-w-4xl mx-auto py-12">
                <h1 className="text-3xl font-bold text-center mb-2">{renderPage}</h1>
                <p className="text-center text-gray-400 mb-10">
                    Ingresa los detalles del proveedor para registrarlo en el sistema.
                </p>
                <NetworkProviderForm
                    // users={users}
                    NetworkProviderID={NetworkProviderID}
                    selectedCompany={selectedCompany}
                />
            </div>
        </div>
    );
};

export default UpdateNetworkProviderPage;