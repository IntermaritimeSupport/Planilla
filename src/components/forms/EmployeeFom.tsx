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
        // Inicializamos los descuentos mapeando las fechas para el input date
        recurringDeductions: initialData?.recurringDeductions?.map((d: any) => ({
            ...d,
            startDate: d.startDate ? new Date(d.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            endDate: d.endDate ? new Date(d.endDate).toISOString().split('T')[0] : "",
        })) || [],
    });

    // Funciones para gestionar descuentos
    const addDeduction = () => {
        setFormData({
            ...formData,
            recurringDeductions: [
                ...formData.recurringDeductions,
                { 
                    name: "", 
                    amount: 0, 
                    frequency: "ALWAYS", 
                    isActive: true,
                    startDate: new Date().toISOString().split('T')[0], // Hoy por defecto
                    endDate: "" 
                }
            ]
        });
    };

    const removeDeduction = (index: number) => {
        const newDeductions = [...formData.recurringDeductions];
        newDeductions.splice(index, 1);
        setFormData({ ...formData, recurringDeductions: newDeductions });
    };

    const updateDeduction = (index: number, field: string, value: any) => {
        const newDeductions = [...formData.recurringDeductions];
        newDeductions[index] = { ...newDeductions[index], [field]: value };
        setFormData({ ...formData, recurringDeductions: newDeductions });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const method = initialData ? "PUT" : "POST";
        const url = initialData 
            ? `${import.meta.env.VITE_API_URL}/api/payroll/employees/${initialData.id}`
            : `${import.meta.env.VITE_API_URL}/api/payroll/employees`;

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

    const inputClass = "w-full bg-gray-900 border border-gray-600 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm";
    const labelClass = "block text-sm font-medium text-gray-400 mb-1";
    const smallLabel = "text-[10px] text-gray-500 uppercase font-bold mb-1 block";

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
                {/* SECCIÓN 3: SISTEMA */}
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
                {/* SECCIÓN: DESCUENTOS RECURRENTES (ACTUALIZADA) */}
                <section className="space-y-4 col-span-1 md:col-span-2">
                    <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                        <h2 className="text-red-400 font-bold uppercase text-xs tracking-wider">Descuentos Recurrentes</h2>
                        <button 
                            type="button" 
                            onClick={addDeduction}
                            className="text-[10px] bg-red-900/30 text-red-400 px-2 py-1 rounded border border-red-800 hover:bg-red-800 hover:text-white transition-all"
                        >
                            + AGREGAR
                        </button>
                    </div>
                    
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {formData.recurringDeductions.length === 0 && (
                            <p className="text-gray-600 text-xs italic">No hay descuentos configurados.</p>
                        )}
                        {formData.recurringDeductions.map((deduction: any, index: number) => (
                            <div key={index} className="p-4 bg-gray-800/40 rounded-lg border border-gray-700 space-y-4 relative">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <label className={smallLabel}>Concepto del Descuento</label>
                                        <input 
                                            className={inputClass} 
                                            placeholder="Ej. Préstamo de Auto"
                                            value={deduction.name} 
                                            onChange={(e) => updateDeduction(index, 'name', e.target.value)}
                                        />
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={() => removeDeduction(index)}
                                        className="ml-4 text-gray-500 hover:text-red-500 transition-colors"
                                    >
                                        ✕
                                    </button>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className={smallLabel}>Monto ($)</label>
                                        <input 
                                            type="number" 
                                            step="0.01" 
                                            className={inputClass} 
                                            value={deduction.amount}
                                            onChange={(e) => updateDeduction(index, 'amount', parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className={smallLabel}>Frecuencia</label>
                                        <select 
                                            className={inputClass} 
                                            value={deduction.frequency}
                                            onChange={(e) => updateDeduction(index, 'frequency', e.target.value)}
                                        >
                                            <option value="ALWAYS">Siempre (Mensual)</option>
                                            <option value="FIRST_QUINCENA">Solo 1ra Quincena</option>
                                            <option value="SECOND_QUINCENA">Solo 2da Quincena</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className={smallLabel}>Fecha Inicio</label>
                                        <input 
                                            type="date" 
                                            className={inputClass} 
                                            value={deduction.startDate}
                                            onChange={(e) => updateDeduction(index, 'startDate', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className={smallLabel}>Fecha Fin (Opcional)</label>
                                        <input 
                                            type="date" 
                                            className={inputClass} 
                                            value={deduction.endDate}
                                            onChange={(e) => updateDeduction(index, 'endDate', e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 pt-1">
                                    <input 
                                        type="checkbox" 
                                        id={`active-${index}`}
                                        className="w-4 h-4 bg-gray-900 border-gray-600 rounded text-blue-600 focus:ring-blue-500"
                                        checked={deduction.isActive}
                                        onChange={(e) => updateDeduction(index, 'isActive', e.target.checked)}
                                    />
                                    <label htmlFor={`active-${index}`} className="text-xs text-gray-400 cursor-pointer">Descuento activo</label>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>


            </div>

            <div className="flex justify-end gap-4 border-t border-gray-800 pt-6">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="px-6 py-2.5 rounded-lg text-gray-400 hover:text-white transition-colors"
                >
                    {initialData ? ( "Cancelar Cambios" ) : ( "Cancelar" )}
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