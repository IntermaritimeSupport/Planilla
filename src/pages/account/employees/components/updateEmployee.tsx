"use client"

import useSWR from "swr";
import { useNavigate, useParams } from "react-router-dom";
import { useCompany } from "../../../../context/routerContext";
import EmployeeForm from "../../../../components/forms/EmployeeFom";

const { VITE_API_URL } = import.meta.env;

const fetcher = async (url: string) => {
    const token = localStorage.getItem('authToken');
    const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`Error: ${res.status}`);
    return res.json();
};

const ManageEmployeePage: React.FC = () => {
    const { id: employeeId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { selectedCompany } = useCompany();
    
    const title = employeeId ? "Editar Colaborador" : "Registrar Colaborador";
    document.title = title;

    // Traemos datos del empleado si estamos editando
    const { data: employeeData, isLoading: loadingEmp } = useSWR(
        employeeId ? `${VITE_API_URL}/api/payroll/employees/${employeeId}` : null,
        fetcher
    );
    console.log("Employee Data:", employeeData);
    // Traemos departamentos para el select
    const { data: departments, isLoading: loadingDepts } = useSWR(
        selectedCompany ? `${VITE_API_URL}/api/companies/departments/by-code/${selectedCompany.code}` : null,
        fetcher
    );

    if (loadingEmp || loadingDepts) return <div className="p-10 text-center text-blue-500">Cargando...</div>;

    return (
        <div className="min-h-screen">
            <div className="max-w-5xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold">{title}</h1>
                        <p className="text-gray-400">Gestión de personal para {selectedCompany?.name}</p>
                    </div>
                    <button
                        onClick={() => navigate(-1)}
                        className=" hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors"
                    >
                        Volver
                    </button>
                </div>

                <div className=" border border-gray-700 rounded-xl p-8 shadow-xl">
                    <EmployeeForm 
                        initialData={employeeData} 
                        departments={departments || []}
                        companyId={selectedCompany?.id || ""}
                    />
                </div>
            </div>
        </div>
    );
};

export default ManageEmployeePage;