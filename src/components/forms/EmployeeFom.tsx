"use client"

import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface EmployeeFormProps {
    initialData?: any;
    departments: any[];
    companyId: string;
}

const EmployeeForm: React.FC<EmployeeFormProps> = ({ initialData, departments, companyId }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        cedula: initialData?.cedula || "",
        firstName: initialData?.firstName || "",
        lastName: initialData?.lastName || "",
        email: initialData?.email || "",
        phoneNumber: initialData?.phoneNumber || "",
        position: initialData?.position || "",
        department: initialData?.department || "",
        hireDate: initialData?.hireDate ? new Date(initialData.hireDate).toISOString().split('T')[0] : "",
        salary: initialData?.salary || 0,
        salaryType: initialData?.salaryType || "MONTHLY",
        bankAccount: initialData?.bankAccount || "",
        bankName: initialData?.bankName || "",
        userId: initialData?.userId || "", 
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const method = initialData ? "PUT" : "POST";
        const url = initialData 
            ? `${import.meta.env.VITE_API_URL}/api/payroll/employees/${initialData.id}`
            : `${import.meta.env.VITE_API_URL}/api/payroll/employees`;

        // Limpiamos el payload para evitar el error de Foreign Key de Prisma
        const payload = { 
            ...formData, 
            companyId,
            userId: formData.userId.trim() === "" ? null : formData.userId 
        };

        try {
            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Error en la operación");
            }
            
            alert(initialData ? "Colaborador actualizado" : "Colaborador creado con éxito");
            navigate(-1);
        } catch (error: any) {
            console.error(error);
            alert(error.message || "Ocurrió un error al guardar.");
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full bg-gray-900 border border-gray-600 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all";
    const labelClass = "block text-sm font-medium text-gray-400 mb-1";

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* SECCIÓN 1: DATOS PERSONALES */}
                <section className="space-y-4">
                    <h2 className="text-blue-400 font-bold border-b border-gray-700 pb-2 uppercase text-xs tracking-wider">Información Personal</h2>
                    
                    <div>
                        <label className={labelClass}>Cédula / ID</label>
                        <input required className={inputClass} value={formData.cedula} onChange={(e) => setFormData({...formData, cedula: e.target.value})} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Nombre</label>
                            <input required className={inputClass} value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} />
                        </div>
                        <div>
                            <label className={labelClass}>Apellido</label>
                            <input required className={inputClass} value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Correo Electrónico</label>
                            <input type="email" required className={inputClass} value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                        </div>
                        <div>
                            <label className={labelClass}>Teléfono</label>
                            <input className={inputClass} value={formData.phoneNumber} onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})} />
                        </div>
                    </div>
                </section>

                {/* SECCIÓN 2: DATOS LABORALES */}
                <section className="space-y-4">
                    <h2 className="text-blue-400 font-bold border-b border-gray-700 pb-2 uppercase text-xs tracking-wider">Puesto y Contrato</h2>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Departamento</label>
                            <select 
                                className={inputClass} 
                                value={formData.department} 
                                onChange={(e) => setFormData({...formData, department: e.target.value})}
                            >
                                <option value="">Seleccione...</option>
                                {departments.map((dept) => (
                                    <option key={dept.id} value={dept.name}>{dept.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Cargo / Posición</label>
                            <input required className={inputClass} value={formData.position} onChange={(e) => setFormData({...formData, position: e.target.value})} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Salario Base ($)</label>
                            <input type="number" step="0.01" className={inputClass} value={formData.salary} onChange={(e) => setFormData({...formData, salary: parseFloat(e.target.value) || 0})} />
                        </div>
                        <div>
                            <label className={labelClass}>Frecuencia de Pago</label>
                            <select className={inputClass} value={formData.salaryType} onChange={(e) => setFormData({...formData, salaryType: e.target.value})}>
                                <option value="MONTHLY">Mensual</option>
                                <option value="BIWEEKLY">Quincenal</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className={labelClass}>Fecha de Ingreso</label>
                        <input type="date" required className={inputClass} value={formData.hireDate} onChange={(e) => setFormData({...formData, hireDate: e.target.value})} />
                    </div>
                </section>

                {/* SECCIÓN 3: DATOS BANCARIOS */}
                <section className="space-y-4">
                    <h2 className="text-green-400 font-bold border-b border-gray-700 pb-2 uppercase text-xs tracking-wider">Información de Pago</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Banco</label>
                            <input className={inputClass} placeholder="Ej. Banco General" value={formData.bankName} onChange={(e) => setFormData({...formData, bankName: e.target.value})} />
                        </div>
                        <div>
                            <label className={labelClass}>Número de Cuenta</label>
                            <input className={inputClass} value={formData.bankAccount} onChange={(e) => setFormData({...formData, bankAccount: e.target.value})} />
                        </div>
                    </div>
                </section>

                {/* SECCIÓN 4: SISTEMA (Oculto o Metadata) */}
                <section className="space-y-4">
                    <h2 className="text-gray-500 font-bold border-b border-gray-700 pb-2 uppercase text-xs tracking-wider">Ajustes de Sistema</h2>
                    <div>
                        <label className={labelClass}>ID de Usuario vinculado (Opcional)</label>
                        <input 
                            className={`${inputClass} opacity-50`} 
                            placeholder="UUID del usuario de acceso" 
                            value={formData.userId} 
                            onChange={(e) => setFormData({...formData, userId: e.target.value})} 
                        />
                        <p className="text-[10px] text-gray-500 mt-1 italic">Vincule un ID de la tabla de usuarios si este empleado tendrá acceso al portal.</p>
                    </div>
                </section>
            </div>

            <div className="flex justify-end gap-4 border-t border-gray-800 pt-6">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="px-6 py-2.5 rounded-lg text-gray-400 hover:text-white transition-colors"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-2.5 rounded-lg font-bold shadow-lg shadow-blue-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? "Procesando..." : initialData ? "Guardar Cambios" : "Registrar Empleado"}
                </button>
            </div>
        </form>
    );
};

export default EmployeeForm;