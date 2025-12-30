// CreateUserPage.tsx
"use client"

import useSWR from "swr";
import { useNavigate, useParams } from "react-router-dom";
import UpdateUser from "../../../../components/forms/UpdateUser";
import { Company, useCompany } from "../../../../context/routerContext";

const { VITE_API_URL } = import.meta.env;

const fetcher = async (url: string) => {
    try {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch(url, {
            method: 'GET',
            headers,
            credentials: 'include',
        });

        if (!res.ok) {
            throw new Error(`API error: ${res.status}`);
        }

        return res.json();
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
};

export interface Department {
    id: string;
    name: string;
    description: string;
    isActive: boolean;
}

const CreateUserPage: React.FC = () => {
    const { id: userID } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const renderPage = userID ? "Editar Usuario" : "Crear Usuario";
    document.title = renderPage;

    const { selectedCompany }: { selectedCompany: Company | null } = useCompany();

    // ✅ CORREGIDO: Nueva URL con endpoint dedicado
    const departmentUrl = selectedCompany 
        ? `${VITE_API_URL}/api/companies/departments/by-code/${selectedCompany.code}`
        : null;

    const { data: departments, error, isLoading } = useSWR<Department[]>(
        departmentUrl,
        fetcher,
        {
            revalidateOnFocus: true,
            shouldRetryOnError: true,
            errorRetryInterval: 5000,
            errorRetryCount: 10,
        }
    );
    // console.log("Departamentos cargados:", departments);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-900 text-white p-6 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-900 text-white p-6">
                <div className="bg-red-900/30 border border-red-600 rounded-lg p-6 text-red-300">
                    <p className="font-semibold mb-2">Error al cargar departamentos</p>
                    <p>{error.message}</p>
                </div>
            </div>
        );
    }

    if (!departments) {
        return (
            <div className="min-h-screen bg-gray-900 text-white p-6">
                <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-6 text-yellow-300">
                    <p>No hay departamentos disponibles</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <div className="p-6">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h1 className="text-2xl font-bold mb-2">{renderPage}</h1>
                        <p className="text-gray-400">
                            Complete la información para {userID ? "editar" : "registrar"} un usuario en el sistema
                        </p>
                    </div>
                    <div className="flex space-x-3">
                        <button
                            type="button"
                            onClick={() => navigate(`/${selectedCompany?.code}/users/all`)}
                            className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                            <svg 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="2" 
                                className="w-4 h-4"
                            >
                                <path d="M19 12H5" />
                                <path d="M12 19l-7-7 7-7" />
                            </svg>
                            <span>Cancelar</span>
                        </button>
                    </div>
                </div>

                <UpdateUser
                    userID={userID}
                    departments={departments}
                    selectedCompany={selectedCompany}
                />
            </div>
        </div>
    );
};

export default CreateUserPage;