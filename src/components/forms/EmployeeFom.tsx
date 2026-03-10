"use client"

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/themeContext";
import { History, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface SalaryHistoryEntry {
  id: string;
  previousSalary: number;
  newSalary: number;
  previousType: string;
  newType: string;
  changeReason: string;
  notes?: string;
  effectiveDate: string;
  changedByUser?: { username?: string; email: string };
}

interface EmployeeFormProps {
  initialData?: any;
  departments: any[];
  companyId: string;
}

// ─── Etiquetas de motivo ─────────────────────────────────────────────────────

const REASON_LABELS: Record<string, string> = {
  PROMOTION:      "Ascenso",
  ADJUSTMENT:     "Ajuste salarial",
  CORRECTION:     "Corrección de error",
  COST_OF_LIVING: "Costo de vida",
  PERFORMANCE:    "Desempeño",
  RESTRUCTURE:    "Reestructuración",
  OTHER:          "Otro",
};

const SALARY_TYPE_LABEL: Record<string, string> = {
  MONTHLY:  "Mensual",
  BIWEEKLY: "Quincenal",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("es-PA", { style: "currency", currency: "USD" }).format(n);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("es-PA", { day: "2-digit", month: "short", year: "numeric" });

// ─── Componente principal ─────────────────────────────────────────────────────

const EmployeeForm: React.FC<EmployeeFormProps> = ({ initialData, departments, companyId }) => {
  const navigate   = useNavigate();
  const { isDarkMode } = useTheme();
  const isEdit     = Boolean(initialData?.id);

  const [loading, setLoading]   = useState(false);
  const [message, setMessage]   = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [salaryHistory, setSalaryHistory] = useState<SalaryHistoryEntry[]>(
    initialData?.salaryHistory || []
  );

  // Detectar si el salario cambió para mostrar campos extra
  const [originalSalary]     = useState(Number(initialData?.salary || 0));
  const [originalSalaryType] = useState(initialData?.salaryType || "MONTHLY");
  const [salaryChanged, setSalaryChanged] = useState(false);
  const [salaryChangeReason, setSalaryChangeReason] = useState("ADJUSTMENT");
  const [salaryChangeNotes, setSalaryChangeNotes]   = useState("");

  const [formData, setFormData] = useState({
    cedula:      initialData?.cedula      || "",
    firstName:   initialData?.firstName   || "",
    lastName:    initialData?.lastName    || "",
    email:       initialData?.email       || "",
    phoneNumber: initialData?.phoneNumber || "",
    position:    initialData?.position    || "",
    department:  initialData?.department  || "",
    hireDate:    initialData?.hireDate
      ? new Date(initialData.hireDate).toISOString().split("T")[0]
      : "",
    salary:      initialData?.salary      || 0,
    salaryType:  initialData?.salaryType  || "MONTHLY",
    bankAccount: initialData?.bankAccount || "",
    bankName:    initialData?.bankName    || "",
    userId:      initialData?.userId      || "",
    recurringDeductions: initialData?.recurringDeductions?.map((d: any) => ({
      ...d,
      startDate: d.startDate ? new Date(d.startDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      endDate:   d.endDate   ? new Date(d.endDate).toISOString().split("T")[0]   : "",
    })) || [],
  });

  // Detectar cambio real de salario
  useEffect(() => {
    if (!isEdit) return;
    const changed =
      Math.abs(Number(formData.salary) - originalSalary) > 0.001 ||
      formData.salaryType !== originalSalaryType;
    setSalaryChanged(changed);
  }, [formData.salary, formData.salaryType, originalSalary, originalSalaryType, isEdit]);

  // ── Deducciones ─────────────────────────────────────────────────────────────

  const addDeduction = () =>
    setFormData({
      ...formData,
      recurringDeductions: [
        ...formData.recurringDeductions,
        { name: "", amount: 0, frequency: "ALWAYS", isActive: true,
          startDate: new Date().toISOString().split("T")[0], endDate: "" },
      ],
    });

  const removeDeduction = (i: number) => {
    const d = [...formData.recurringDeductions];
    d.splice(i, 1);
    setFormData({ ...formData, recurringDeductions: d });
  };

  const updateDeduction = (i: number, field: string, value: any) => {
    const d = [...formData.recurringDeductions];
    d[i] = { ...d[i], [field]: value };
    setFormData({ ...formData, recurringDeductions: d });
  };

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const method = isEdit ? "PUT" : "POST";
    const url = isEdit
      ? `${import.meta.env.VITE_API_URL}/api/payroll/employees/${initialData.id}`
      : `${import.meta.env.VITE_API_URL}/api/payroll/employees`;

    const payload = {
      ...formData,
      companyId,
      userId: formData.userId.trim() === "" ? null : formData.userId,
      // Solo enviamos datos de cambio de salario si aplica
      ...(isEdit && salaryChanged
        ? { salaryChangeReason, salaryChangeNotes: salaryChangeNotes || null }
        : {}),
    };

    try {
      const token = localStorage.getItem("jwt");
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error en la operación");
      }

      const result = await response.json();

      // Refrescar historial si el API lo devuelve
      if (result?.salaryHistory) setSalaryHistory(result.salaryHistory);

      setMessage({
        type: "success",
        text: isEdit
          ? `Colaborador actualizado${salaryChanged ? " — cambio de salario registrado en historial ✓" : ""}`
          : "Colaborador creado con éxito",
      });
      setTimeout(() => navigate(-1), 1800);
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Ocurrió un error al guardar." });
    } finally {
      setLoading(false);
    }
  };

  // ── Estilos ─────────────────────────────────────────────────────────────────

  const inputClass = `w-full rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm ${
    isDarkMode ? "bg-gray-900 border border-gray-600 text-white" : "bg-white border border-gray-300 text-gray-900"
  }`;
  const labelClass = `block text-sm font-medium mb-1 ${isDarkMode ? "text-gray-400" : "text-gray-700"}`;
  const smallLabel = `text-[10px] uppercase font-bold mb-1 block ${isDarkMode ? "text-gray-500" : "text-gray-600"}`;
  const borderColor = isDarkMode ? "border-gray-700" : "border-gray-200";

  const sectionHeaderColor = (color: string) => {
    const colors: Record<string, string> = {
      blue:   isDarkMode ? "text-blue-400"   : "text-blue-600",
      green:  isDarkMode ? "text-green-400"  : "text-green-600",
      amber:  isDarkMode ? "text-amber-400"  : "text-amber-600",
      red:    isDarkMode ? "text-red-400"    : "text-red-600",
      gray:   isDarkMode ? "text-gray-500"   : "text-gray-700",
    };
    return colors[color] || colors.blue;
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* Mensaje de éxito / error */}
      {message && (
        <div className={`p-4 rounded-lg text-sm font-medium ${
          message.type === "success"
            ? isDarkMode ? "bg-green-900/30 text-green-300 border border-green-700" : "bg-green-100 text-green-800 border border-green-300"
            : isDarkMode ? "bg-red-900/30 text-red-300 border border-red-700"       : "bg-red-100 text-red-800 border border-red-300"
        }`}>
          {message.type === "success" ? "✅ " : "❌ "}{message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* ── SECCIÓN 1: PERSONAL ─────────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className={`font-bold border-b pb-2 uppercase text-xs tracking-wider ${sectionHeaderColor("blue")} ${borderColor}`}>
            Información Personal
          </h2>
          <div>
            <label className={labelClass}>Cédula / ID</label>
            <input required className={inputClass} value={formData.cedula}
              onChange={(e) => setFormData({ ...formData, cedula: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Nombre</label>
              <input required className={inputClass} value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Apellido</label>
              <input required className={inputClass} value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Correo Electrónico</label>
              <input type="email" required className={inputClass} value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Teléfono</label>
              <input className={inputClass} value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })} />
            </div>
          </div>
        </section>

        {/* ── SECCIÓN 2: LABORAL + SALARIO ────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className={`font-bold border-b pb-2 uppercase text-xs tracking-wider ${sectionHeaderColor("blue")} ${borderColor}`}>
            Puesto y Contrato
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Departamento</label>
              <select className={inputClass} value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}>
                <option value="">Seleccione...</option>
                {departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Cargo / Posición</label>
              <input required className={inputClass} value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })} />
            </div>
          </div>

          {/* Salario con indicador de cambio */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                Salario Base ($)
                {isEdit && salaryChanged && (
                  <span className="ml-2 text-[10px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                    MODIFICADO
                  </span>
                )}
              </label>
              <input
                type="number" step="0.01" className={inputClass}
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: parseFloat(e.target.value) || 0 })}
              />
              {isEdit && salaryChanged && (
                <p className={`text-[10px] mt-1 ${isDarkMode ? "text-amber-400/70" : "text-amber-600"}`}>
                  Antes: {fmt(originalSalary)}
                </p>
              )}
            </div>
            <div>
              <label className={labelClass}>Frecuencia de Pago</label>
              <select className={inputClass} value={formData.salaryType}
                onChange={(e) => setFormData({ ...formData, salaryType: e.target.value })}>
                <option value="MONTHLY">Mensual</option>
                <option value="BIWEEKLY">Quincenal</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Fecha de Ingreso</label>
            <input type="date" required className={inputClass} value={formData.hireDate}
              onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })} />
          </div>
        </section>

        {/* ── SECCIÓN 3: MOTIVO DE CAMBIO (solo al editar y si hay cambio) ── */}
        {isEdit && salaryChanged && (
          <section className={`col-span-1 md:col-span-2 p-4 rounded-xl border-2 space-y-4 ${
            isDarkMode ? "border-amber-600/40 bg-amber-900/10" : "border-amber-400 bg-amber-50"
          }`}>
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className={isDarkMode ? "text-amber-400" : "text-amber-600"} />
              <h2 className={`font-bold uppercase text-xs tracking-wider ${sectionHeaderColor("amber")}`}>
                Motivo del Cambio de Salario — Requerido
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Motivo</label>
                <select
                  className={inputClass}
                  value={salaryChangeReason}
                  onChange={(e) => setSalaryChangeReason(e.target.value)}
                  required
                >
                  {Object.entries(REASON_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Notas adicionales (opcional)</label>
                <input
                  className={inputClass}
                  placeholder="Ej. Revisión anual — desempeño sobresaliente"
                  value={salaryChangeNotes}
                  onChange={(e) => setSalaryChangeNotes(e.target.value)}
                />
              </div>
            </div>
            <div className={`flex items-center gap-3 text-xs p-3 rounded-lg ${
              isDarkMode ? "bg-amber-900/20 text-amber-300" : "bg-amber-100 text-amber-800"
            }`}>
              <span className="font-mono font-bold">
                {fmt(originalSalary)} {SALARY_TYPE_LABEL[originalSalaryType]}
              </span>
              <span>→</span>
              <span className="font-mono font-bold">
                {fmt(Number(formData.salary))} {SALARY_TYPE_LABEL[formData.salaryType]}
              </span>
              <span className={`ml-auto font-bold ${
                Number(formData.salary) > originalSalary
                  ? isDarkMode ? "text-green-400" : "text-green-700"
                  : isDarkMode ? "text-red-400" : "text-red-700"
              }`}>
                {Number(formData.salary) > originalSalary ? "+" : ""}
                {fmt(Number(formData.salary) - originalSalary)}
              </span>
            </div>
            <p className={`text-[11px] ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
              Este cambio quedará registrado en el historial del colaborador con fecha, motivo y el usuario que lo realizó.
            </p>
          </section>
        )}

        {/* ── SECCIÓN 4: BANCARIO ─────────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className={`font-bold border-b pb-2 uppercase text-xs tracking-wider ${sectionHeaderColor("green")} ${borderColor}`}>
            Información de Pago
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Banco</label>
              <input className={inputClass} placeholder="Ej. Banco General" value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Número de Cuenta</label>
              <input className={inputClass} value={formData.bankAccount}
                onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })} />
            </div>
          </div>
        </section>

        {/* ── SECCIÓN 5: SISTEMA ──────────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className={`font-bold border-b pb-2 uppercase text-xs tracking-wider ${sectionHeaderColor("gray")} ${borderColor}`}>
            Ajustes de Sistema
          </h2>
          <div>
            <label className={labelClass}>ID de Usuario vinculado (Opcional)</label>
            <input
              className={`${inputClass} opacity-50`}
              placeholder="UUID del usuario de acceso"
              value={formData.userId}
              onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
            />
            <p className={`text-[10px] mt-1 italic ${isDarkMode ? "text-gray-500" : "text-gray-600"}`}>
              Vincule un ID de la tabla de usuarios si este empleado tendrá acceso al portal.
            </p>
          </div>
        </section>

        {/* ── SECCIÓN 6: DESCUENTOS RECURRENTES ──────────────────────────── */}
        <section className="space-y-4 col-span-1 md:col-span-2">
          <div className={`flex justify-between items-center border-b pb-2 ${borderColor}`}>
            <h2 className={`font-bold uppercase text-xs tracking-wider ${sectionHeaderColor("red")}`}>
              Descuentos Recurrentes
            </h2>
            <button type="button" onClick={addDeduction}
              className={`text-[10px] px-2 py-1 rounded border transition-all ${
                isDarkMode
                  ? "bg-red-900/30 text-red-400 border-red-800 hover:bg-red-800 hover:text-white"
                  : "bg-red-100 text-red-600 border-red-300 hover:bg-red-200 hover:text-red-800"
              }`}>
              + AGREGAR
            </button>
          </div>
          <div className={`space-y-3 max-h-[400px] overflow-y-auto pr-2`}>
            {formData.recurringDeductions.length === 0 && (
              <p className={`text-xs italic ${isDarkMode ? "text-gray-600" : "text-gray-500"}`}>
                No hay descuentos configurados.
              </p>
            )}
            {formData.recurringDeductions.map((deduction: any, index: number) => (
              <div key={index} className={`p-4 rounded-lg border space-y-4 relative transition-colors ${
                isDarkMode ? "bg-gray-800/40 border-gray-700" : "bg-gray-100 border-gray-300"
              }`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <label className={smallLabel}>Concepto del Descuento</label>
                    <input className={inputClass} placeholder="Ej. Préstamo de Auto"
                      value={deduction.name} onChange={(e) => updateDeduction(index, "name", e.target.value)} />
                  </div>
                  <button type="button" onClick={() => removeDeduction(index)}
                    className={`ml-4 transition-colors ${isDarkMode ? "text-gray-500 hover:text-red-500" : "text-gray-400 hover:text-red-600"}`}>
                    ✕
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={smallLabel}>Monto ($)</label>
                    <input type="number" step="0.01" className={inputClass} value={deduction.amount}
                      onChange={(e) => updateDeduction(index, "amount", parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="col-span-2">
                    <label className={smallLabel}>Frecuencia</label>
                    <select className={inputClass} value={deduction.frequency}
                      onChange={(e) => updateDeduction(index, "frequency", e.target.value)}>
                      <option value="ALWAYS">Siempre (Mensual)</option>
                      <option value="FIRST_QUINCENA">Solo 1ra Quincena</option>
                      <option value="SECOND_QUINCENA">Solo 2da Quincena</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={smallLabel}>Fecha Inicio</label>
                    <input type="date" className={inputClass} value={deduction.startDate}
                      onChange={(e) => updateDeduction(index, "startDate", e.target.value)} />
                  </div>
                  <div>
                    <label className={smallLabel}>Fecha Fin (Opcional)</label>
                    <input type="date" className={inputClass} value={deduction.endDate}
                      onChange={(e) => updateDeduction(index, "endDate", e.target.value)} />
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input type="checkbox" id={`active-${index}`}
                    className={`w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer ${
                      isDarkMode ? "bg-gray-900 border-gray-600" : "bg-white border-gray-300"
                    }`}
                    checked={deduction.isActive}
                    onChange={(e) => updateDeduction(index, "isActive", e.target.checked)} />
                  <label htmlFor={`active-${index}`}
                    className={`text-xs cursor-pointer ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                    Descuento activo
                  </label>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── SECCIÓN 7: HISTORIAL DE SALARIOS (solo edición) ─────────────── */}
        {isEdit && (
          <section className="col-span-1 md:col-span-2">
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                isDarkMode
                  ? "border-gray-700 bg-gray-800/40 hover:bg-gray-800 text-gray-300"
                  : "border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700"
              }`}
            >
              <div className="flex items-center gap-2">
                <History size={15} className={isDarkMode ? "text-blue-400" : "text-blue-600"} />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Historial de Salarios
                </span>
                {salaryHistory.length > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    isDarkMode ? "bg-blue-900/40 text-blue-300" : "bg-blue-100 text-blue-700"
                  }`}>
                    {salaryHistory.length} {salaryHistory.length === 1 ? "cambio" : "cambios"}
                  </span>
                )}
              </div>
              {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showHistory && (
              <div className={`mt-2 rounded-xl border overflow-hidden ${
                isDarkMode ? "border-gray-700" : "border-gray-200"
              }`}>
                {salaryHistory.length === 0 ? (
                  <div className={`p-6 text-center text-sm ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                    <History size={28} className="mx-auto mb-2 opacity-30" />
                    No hay cambios de salario registrados.<br />
                    <span className="text-xs">Los próximos cambios quedarán registrados aquí.</span>
                  </div>
                ) : (
                  <table className={`w-full text-xs ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                    <thead className={`uppercase text-[10px] tracking-wider ${
                      isDarkMode ? "bg-gray-800 text-gray-400" : "bg-gray-100 text-gray-600"
                    }`}>
                      <tr>
                        <th className="px-4 py-3 text-left">Fecha</th>
                        <th className="px-4 py-3 text-left">Salario Anterior</th>
                        <th className="px-4 py-3 text-left">Salario Nuevo</th>
                        <th className="px-4 py-3 text-left">Diferencia</th>
                        <th className="px-4 py-3 text-left">Motivo</th>
                        <th className="px-4 py-3 text-left">Realizado por</th>
                        <th className="px-4 py-3 text-left">Notas</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDarkMode ? "divide-gray-700/50" : "divide-gray-100"}`}>
                      {salaryHistory.map((entry) => {
                        const diff = Number(entry.newSalary) - Number(entry.previousSalary);
                        const isUp = diff > 0;
                        const isDown = diff < 0;
                        return (
                          <tr key={entry.id} className={`transition-colors ${
                            isDarkMode ? "hover:bg-gray-800/50" : "hover:bg-gray-50"
                          }`}>
                            <td className="px-4 py-3 font-mono whitespace-nowrap">
                              {fmtDate(entry.effectiveDate)}
                            </td>
                            <td className="px-4 py-3 font-mono">
                              <span>{fmt(Number(entry.previousSalary))}</span>
                              <span className={`ml-1 text-[10px] ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                                {SALARY_TYPE_LABEL[entry.previousType] || entry.previousType}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono">
                              <span className="font-bold">{fmt(Number(entry.newSalary))}</span>
                              <span className={`ml-1 text-[10px] ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                                {SALARY_TYPE_LABEL[entry.newType] || entry.newType}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`flex items-center gap-1 font-bold font-mono ${
                                isUp   ? isDarkMode ? "text-green-400" : "text-green-700"
                                : isDown ? isDarkMode ? "text-red-400"   : "text-red-700"
                                : isDarkMode ? "text-gray-400" : "text-gray-500"
                              }`}>
                                {isUp   ? <TrendingUp  size={11} /> : null}
                                {isDown ? <TrendingDown size={11} /> : null}
                                {!isUp && !isDown ? <Minus size={11} /> : null}
                                {isUp ? "+" : ""}{fmt(diff)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                isDarkMode ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-700"
                              }`}>
                                {REASON_LABELS[entry.changeReason] || entry.changeReason}
                              </span>
                            </td>
                            <td className={`px-4 py-3 text-[11px] ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                              {entry.changedByUser?.username || entry.changedByUser?.email || "—"}
                            </td>
                            <td className={`px-4 py-3 text-[11px] italic max-w-[160px] truncate ${
                              isDarkMode ? "text-gray-500" : "text-gray-400"
                            }`} title={entry.notes || ""}>
                              {entry.notes || "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </section>
        )}
      </div>

      {/* ── BOTONES ──────────────────────────────────────────────────────── */}
      <div className={`flex justify-end gap-4 border-t pt-6 transition-colors ${borderColor}`}>
        <button type="button" onClick={() => navigate(-1)}
          className={`px-6 py-2.5 rounded-lg transition-colors ${
            isDarkMode ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900"
          }`}>
          {isEdit ? "Cancelar Cambios" : "Cancelar"}
        </button>
        <button type="submit" disabled={loading}
          className={`text-white px-10 py-2.5 rounded-lg font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            isDarkMode
              ? "bg-blue-600 hover:bg-blue-500 shadow-blue-900/20"
              : "bg-blue-500 hover:bg-blue-600 shadow-blue-300/20"
          }`}>
          {loading ? "Procesando..." : isEdit ? "Guardar Cambios" : "Registrar Empleado"}
        </button>
      </div>
    </form>
  );
};

export default EmployeeForm;
