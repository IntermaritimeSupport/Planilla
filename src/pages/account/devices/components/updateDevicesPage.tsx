import React from "react";
import UpdateDevices from "../../../../components/forms/UpdateDevices";
import { useParams } from "react-router-dom";
import useSWR from "swr";
import { Company, useCompany } from "../../../../context/routerContext";
import { UsuarioFull } from "../../../../utils/usuarioFull";
const { VITE_API_URL } = import.meta.env;
const fetcher = (url: string) => fetch(url).then((res) => res.json());

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
}


const UpdateDevicesPage: React.FC<Props> = ({ }) => {
    const { id: deviceID } = useParams<{ id: string }>();
    const { selectedCompany }: { selectedCompany: Company | null } = useCompany();

    const renderPage = deviceID ? "Editar Equipo" : "Crear Equipo";
    document.title = renderPage;

    // 🔹 Consulta 1: Departamentos
    const { data: departments, error: errorDepartments, isLoading: isLoadingDepartments } = useSWR( // Añadido isLoading
        selectedCompany ? `${VITE_API_URL}/api/companies/departments/by-code/${selectedCompany.code}` : null,
        fetcher,
        {
            revalidateOnFocus: true,
            shouldRetryOnError: true,
            errorRetryInterval: 5000,
            errorRetryCount: 10,
        }
    );

    // 🔹 Consulta 2: Usuarios
    const { data: users, error: errorUsers, isLoading: isLoadingUsers } = useSWR<UsuarioFull[]>( // Añadido isLoading
        `${VITE_API_URL}/api/users/full`,
        fetcher
    );

    // ✅ Lógica corregida para manejo de carga y errores
    if (errorUsers) return <div>Error al cargar usuarios: {errorUsers.message}</div>; // Muestra el error específico
    if (isLoadingUsers || !users) return <div>Cargando usuarios...</div>; // Si está cargando o users es null/undefined, muestra cargando

    if (errorDepartments) return <div>Error al cargar departamentos: {errorDepartments.message}</div>; // Muestra el error específico
    if (isLoadingDepartments || !departments) return <div>Cargando departamentos...</div>; // Si está cargando o departments es null/undefined, muestra cargando


    return (
        <div className="relative p-6 bg-gray-900 min-h-screen font-inter text-white">
            {/* Contenedor principal del formulario */}
            <div className="max-w-4xl mx-auto py-12">
                <h1 className="text-3xl font-bold text-center mb-2">{renderPage}</h1>
                <p className="text-center text-gray-400 mb-10">
                    Ingresa los detalles del equipo para registrarlo en el sistema.
                </p>
                <UpdateDevices
                    users={users}
                    deviceID={deviceID}
                    departments={departments}
                    selectedCompany={selectedCompany}
                />
            </div>
        </div>
    );
};

export default UpdateDevicesPage;