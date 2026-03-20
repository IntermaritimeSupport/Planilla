"use client"

/**
 * AllLiquidacion.tsx — Módulo de Liquidación
 * Calcula la liquidación final de empleados conforme al Código de Trabajo de Panamá.
 *
 * Componentes calculados:
 *  1. Preaviso (Art. 224 CT): 1 semana/año trabajado, máx 4 semanas si < 2 años;
 *     10 días/año si ≥ 2 años, máx 90 días
 *  2. Antigüedad (Art. 225 CT): 1 semana/año trabajado (≥ 10 años → 1.5 sem/año)
 *  3. Décimo Tercer Mes proporcional al tiempo no pagado del período actual
 *  4. Vacaciones proporcionales (Art. 54 CT): 30 días / 11 meses
 *  5. Descuentos: SS (9.75%) sobre el total gravable
 */

import React, { useState, useMemo } from "react"
import useSWR from "swr"
import {
  Search, Calculator, User, Calendar,
  FileText, Download, ChevronDown, ChevronUp, AlertTriangle,
  CheckCircle2, Clock
} from "lucide-react"
import { useCompany } from "../../../../context/routerContext"
import { useTheme } from "../../../../context/themeContext"
import { authFetcher } from "../../../../services/api"
import { formatCurrency, getMonthlySalary } from "../../../../lib/payrollCalculation"
import PagesHeader from "../../../../components/headers/pagesHeader"
import jsPDF from "jspdf"

const API = import.meta.env.VITE_API_URL as string

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Employee {
  id: string
  cedula: string
  firstName: string
  lastName: string
  position: string
  department?: string
  hireDate: string
  salary: number
  salaryType: "MONTHLY" | "BIWEEKLY"
  status: string
}

interface LeaveRecord {
  id: string
  leaveType: string
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED"
  startDate: string
  endDate: string
  daysRequested: number
  daysApproved: number | null
  isPaid: boolean
  paidAt: string | null
}

interface LiquidacionResult {
  employee: Employee
  fechaIngreso: Date
  fechaSalida: Date
  diasTrabajados: number
  mesesTrabajados: number
  anosTrabajados: number
  // Ingresos
  preaviso: number
  antiguedad: number
  decimoProporcional: number
  vacacionesProporcionales: number
  otrosIngresos: number
  totalBruto: number
  // Descuentos
  ss: number
  isr: number
  otrosDescuentos: number
  totalDescuentos: number
  // Neto
  totalNeto: number
  // Detalles
  diasPreaviso: number
  diasAntiguedad: number
  diasVacaciones: number
  // Vacaciones ya tomadas/pagadas (para desglose)
  diasVacTomados: number
  diasVacPagados: number
  diasVacNetos: number
}

// ── Cálculos ──────────────────────────────────────────────────────────────────

function calcDiff(fechaIngreso: Date, fechaSalida: Date) {
  const ms = fechaSalida.getTime() - fechaIngreso.getTime()
  const dias = Math.floor(ms / (1000 * 60 * 60 * 24))
  const meses = Math.floor(dias / 30)
  const anos = Math.floor(dias / 365)
  return { dias, meses, anos }
}

/**
 * Preaviso (Art. 224 CT)
 * < 2 años: 1 semana por año, mínimo 1 semana, máximo 4 semanas
 * ≥ 2 años: 10 días por año trabajado, máximo 90 días
 */
function calcPreaviso(anos: number, meses: number, salarioDiario: number) {
  let dias = 0
  if (anos < 2) {
    dias = Math.min(Math.max(Math.round(anos * 7 + (meses % 12) / 12 * 7), 7), 28)
  } else {
    dias = Math.min(Math.floor(anos) * 10, 90)
  }
  return { dias, monto: Number((dias * salarioDiario).toFixed(2)) }
}

/**
 * Prima de antigüedad (Art. 225 CT)
 * < 10 años: 1 semana de salario por cada año
 * ≥ 10 años: 1.5 semanas de salario por cada año
 */
function calcAntiguedad(anos: number, meses: number, salarioDiario: number) {
  const tasaSemanas = anos >= 10 ? 1.5 : 1
  const diasBase = tasaSemanas * 7
  // Proporcional al tiempo exacto trabajado
  const tiempoDecimal = anos + meses / 12
  const dias = Number((tiempoDecimal * diasBase).toFixed(2))
  return { dias, monto: Number((dias * salarioDiario).toFixed(2)) }
}

/**
 * Décimo proporcional al período transcurrido desde el último pago
 * Períodos: dic-abr, abr-ago, ago-dic (Art. 259 CT)
 */
function calcDecimoProporcional(mensual: number, fechaSalida: Date) {
  const mes = fechaSalida.getMonth() // 0-based
  let diasTranscurridos = 0

  if (mes >= 0 && mes <= 3) {
    // dic-abr: del 16 dic al 15 abr (120 días aprox)
    const inicio = new Date(fechaSalida.getFullYear() - (mes < 4 ? 1 : 0), 11, 16)
    diasTranscurridos = Math.floor((fechaSalida.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24))
  } else if (mes >= 4 && mes <= 7) {
    // abr-ago
    const inicio = new Date(fechaSalida.getFullYear(), 3, 16)
    diasTranscurridos = Math.floor((fechaSalida.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24))
  } else {
    // ago-dic
    const inicio = new Date(fechaSalida.getFullYear(), 7, 16)
    diasTranscurridos = Math.floor((fechaSalida.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24))
  }

  // Décimo mensual = mensual / 12; proporcional = (mensual/12) * (diasTranscurridos/120)
  const decimoMensual = mensual / 12
  const proporcional = Number((decimoMensual * (diasTranscurridos / 120)).toFixed(2))
  return Math.max(proporcional, 0)
}

/**
 * Vacaciones proporcionales (Art. 54 CT)
 * 30 días por cada 11 meses. Proporcional al tiempo trabajado.
 * Se descuentan los días ya tomados (APPROVED) y los ya pagados (isPaid).
 */
function calcVacaciones(meses: number, salarioDiario: number, leaves: LeaveRecord[]) {
  const diasGanados = Number(((meses / 11) * 30).toFixed(2))

  // Días APROBADOS de vacaciones (tomados o en proceso de tomar)
  const diasTomados = leaves
    .filter(l => l.leaveType === "VACATION" && l.status === "APPROVED")
    .reduce((s, l) => s + (l.daysApproved ?? l.daysRequested), 0)

  // De esos aprobados, cuáles ya fueron pagados (no incluir en la liquidación)
  const diasPagados = leaves
    .filter(l => l.leaveType === "VACATION" && l.status === "APPROVED" && l.isPaid)
    .reduce((s, l) => s + (l.daysApproved ?? l.daysRequested), 0)

  // Días netos a pagar en liquidación = ganados - tomados (los tomados ya se pagaron o se compensaron en especie)
  // Si hubo días tomados pero no pagados aún, esos sí se incluyen
  const diasNoRemunerados = diasTomados - diasPagados
  const diasVacNetos = Math.max(0, Number((diasGanados - diasTomados).toFixed(2)))
  // También sumamos los tomados pero pendientes de pago
  const diasFinalLiquidacion = Number((diasVacNetos + diasNoRemunerados).toFixed(2))

  return {
    dias: diasGanados,
    diasTomados,
    diasPagados,
    diasNetos: diasFinalLiquidacion,
    monto: Number((diasFinalLiquidacion * salarioDiario).toFixed(2)),
  }
}

function calcLiquidacion(
  employee: Employee,
  fechaSalida: Date,
  otrosIngresos: number,
  otrosDescuentos: number,
  leaves: LeaveRecord[],
  ssRate: number = 9.75,
  isrRate: number = 0
): LiquidacionResult {
  const fechaIngreso = new Date(employee.hireDate)
  const { dias, meses, anos } = calcDiff(fechaIngreso, fechaSalida)
  const mensual = getMonthlySalary(employee)
  const salarioDiario = mensual / 30

  const preaviso = calcPreaviso(anos, meses, salarioDiario)
  const antiguedad = calcAntiguedad(anos, meses, salarioDiario)
  const decimoProp = calcDecimoProporcional(mensual, fechaSalida)
  const vacaciones = calcVacaciones(meses, salarioDiario, leaves)

  const totalBruto = Number(
    (preaviso.monto + antiguedad.monto + decimoProp + vacaciones.monto + otrosIngresos).toFixed(2)
  )

  const ss = Number((totalBruto * (ssRate / 100)).toFixed(2))
  const isr = Number((totalBruto * (isrRate / 100)).toFixed(2))
  const totalDescuentos = Number((ss + isr + otrosDescuentos).toFixed(2))
  const totalNeto = Number((totalBruto - totalDescuentos).toFixed(2))

  return {
    employee,
    fechaIngreso,
    fechaSalida,
    diasTrabajados: dias,
    mesesTrabajados: meses,
    anosTrabajados: anos,
    preaviso: preaviso.monto,
    antiguedad: antiguedad.monto,
    decimoProporcional: decimoProp,
    vacacionesProporcionales: vacaciones.monto,
    otrosIngresos,
    totalBruto,
    ss,
    isr,
    otrosDescuentos,
    totalDescuentos,
    totalNeto,
    diasPreaviso: preaviso.dias,
    diasAntiguedad: antiguedad.dias,
    diasVacaciones: vacaciones.dias,
    diasVacTomados: vacaciones.diasTomados,
    diasVacPagados: vacaciones.diasPagados,
    diasVacNetos: vacaciones.diasNetos,
  }
}

// ── PDF ────────────────────────────────────────────────────────────────────────

function generarPDF(res: LiquidacionResult, companyName: string) {
  const doc = new jsPDF()
  const pg = doc.internal.pageSize.getWidth()
  const m = 20
  let y = 25

  doc.setFillColor(30, 41, 59)
  doc.rect(0, 0, pg, 45, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont("helvetica", "bold")
  doc.text("LIQUIDACIÓN DE EMPLEADO", m, 20)
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.text(`Fecha: ${new Date().toLocaleDateString("es-PA")}`, m, 32)
  doc.text(companyName, pg - m, 20, { align: "right" })

  y = 55
  doc.setTextColor(30, 41, 59)
  doc.setFontSize(13)
  doc.setFont("helvetica", "bold")
  doc.text(`${res.employee.firstName} ${res.employee.lastName}`, m, y)
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(100)
  doc.text(`Cédula: ${res.employee.cedula}  |  Cargo: ${res.employee.position}`, m, y + 7)
  doc.text(
    `Ingreso: ${res.fechaIngreso.toLocaleDateString("es-PA")}  |  Salida: ${res.fechaSalida.toLocaleDateString("es-PA")}`,
    m, y + 14
  )
  doc.text(
    `Tiempo trabajado: ${res.anosTrabajados} años, ${res.mesesTrabajados % 12} meses (${res.diasTrabajados} días)`,
    m, y + 21
  )

  y += 36
  const row = (label: string, value: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal")
    doc.setTextColor(bold ? 30 : 70)
    doc.text(label, m, y)
    doc.text(value, pg - m, y, { align: "right" })
    y += 8
  }
  const line = () => { doc.setDrawColor(200); doc.line(m, y, pg - m, y); y += 4 }

  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(30, 41, 59)
  doc.text("INGRESOS", m, y); y += 8
  line()
  row(`Preaviso (${res.diasPreaviso} días)`, formatCurrency(res.preaviso))
  row(`Antigüedad (${res.diasAntiguedad.toFixed(1)} días)`, formatCurrency(res.antiguedad))
  row("Décimo Tercer Mes (proporcional)", formatCurrency(res.decimoProporcional))
  row(`Vacaciones (${res.diasVacNetos.toFixed(1)} días netos / ${res.diasVacaciones.toFixed(1)} ganados)`, formatCurrency(res.vacacionesProporcionales))
  if (res.otrosIngresos > 0) row("Otros Ingresos", formatCurrency(res.otrosIngresos))
  line()
  row("TOTAL BRUTO", formatCurrency(res.totalBruto), true)

  y += 6
  doc.setFont("helvetica", "bold")
  doc.text("DESCUENTOS", m, y); y += 8
  line()
  row("Seguro Social (9.75%)", formatCurrency(res.ss))
  if (res.isr > 0) row("ISR", formatCurrency(res.isr))
  if (res.otrosDescuentos > 0) row("Otros Descuentos", formatCurrency(res.otrosDescuentos))
  line()
  row("TOTAL DESCUENTOS", formatCurrency(res.totalDescuentos), true)

  y += 8
  doc.setFillColor(30, 41, 59)
  doc.rect(m - 2, y - 5, pg - 2 * m + 4, 14, "F")
  doc.setTextColor(255)
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.text("TOTAL NETO A PAGAR", m + 2, y + 4)
  doc.text(formatCurrency(res.totalNeto), pg - m, y + 4, { align: "right" })

  doc.save(`Liquidacion_${res.employee.lastName}_${res.employee.cedula}.pdf`)
}

// ── Componente principal ──────────────────────────────────────────────────────

export const AllLiquidacion: React.FC = () => {
  const { selectedCompany } = useCompany()
  const { isDarkMode } = useTheme()
  const dark = isDarkMode

  const [search, setSearch] = useState("")
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [fechaSalida, setFechaSalida] = useState(new Date().toISOString().split("T")[0])
  const [otrosIngresos, setOtrosIngresos] = useState(0)
  const [otrosDescuentos, setOtrosDescuentos] = useState(0)
  const [resultado, setResultado] = useState<LiquidacionResult | null>(null)
  const [showDetalle, setShowDetalle] = useState(true)

  const { data: employees = [], isLoading } = useSWR<Employee[]>(
    selectedCompany ? `${API}/api/payroll/employees?companyId=${selectedCompany.id}` : null,
    authFetcher
  )

  const { data: employeeLeaves = [] } = useSWR<LeaveRecord[]>(
    selectedCompany && selectedEmployee
      ? `${API}/api/payroll/leaves?companyId=${selectedCompany.id}&employeeId=${selectedEmployee.id}`
      : null,
    authFetcher
  )

  const filteredEmployees = useMemo(() => {
    if (!employees.length) return []
    const q = search.toLowerCase()
    return employees.filter(
      e =>
        e.status === "ACTIVE" &&
        (
          `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
          e.cedula.includes(q) ||
          (e.department || "").toLowerCase().includes(q)
        )
    )
  }, [employees, search])

  const handleCalcular = () => {
    if (!selectedEmployee) return
    const salida = new Date(fechaSalida + "T12:00:00")
    const res = calcLiquidacion(selectedEmployee, salida, otrosIngresos, otrosDescuentos, employeeLeaves)
    setResultado(res)
    setShowDetalle(true)
  }

  const card = (label: string, value: string, sub?: string, color = "blue") => {
    const colors: Record<string, string> = {
      blue: "bg-blue-500", green: "bg-green-500", red: "bg-red-500",
      amber: "bg-amber-500", purple: "bg-purple-500",
    }
    return (
      <div className={`rounded-xl border p-4 ${dark ? "bg-slate-800 border-gray-700" : "bg-white border-gray-200"}`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs font-bold uppercase tracking-wider ${dark ? "text-gray-400" : "text-gray-500"}`}>{label}</span>
          <div className={`w-2 h-2 rounded-full ${colors[color]}`} />
        </div>
        <div className={`text-xl font-black font-mono ${dark ? "text-white" : "text-gray-900"}`}>{value}</div>
        {sub && <div className={`text-xs mt-1 ${dark ? "text-gray-500" : "text-gray-400"}`}>{sub}</div>}
      </div>
    )
  }

  return (
    <div className={`transition-colors ${dark ? "text-white" : "text-gray-900"}`}>
      <PagesHeader
        title="Liquidación"
        description={`Cálculo de liquidación final · ${selectedCompany?.name || "..."}`}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* ── Panel izquierdo: buscar empleado ── */}
        <div className={`xl:col-span-1 rounded-xl border p-5 ${dark ? "bg-slate-800 border-gray-700" : "bg-white border-gray-200"}`}>
          <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 ${dark ? "text-gray-400" : "text-gray-500"}`}>
            1. Seleccionar Empleado
          </h3>

          {/* Búsqueda */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border mb-3 ${dark ? "bg-slate-700 border-gray-600" : "bg-gray-50 border-gray-200"}`}>
            <Search size={15} className={dark ? "text-gray-400" : "text-gray-400"} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, cédula..."
              className={`flex-1 bg-transparent text-sm outline-none ${dark ? "text-white placeholder-gray-500" : "text-gray-900 placeholder-gray-400"}`}
            />
          </div>

          {/* Lista */}
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {isLoading ? (
              <div className={`text-center py-6 text-sm ${dark ? "text-gray-500" : "text-gray-400"}`}>Cargando...</div>
            ) : filteredEmployees.length === 0 ? (
              <div className={`text-center py-6 text-sm ${dark ? "text-gray-500" : "text-gray-400"}`}>Sin resultados</div>
            ) : filteredEmployees.map(emp => (
              <button
                key={emp.id}
                onClick={() => { setSelectedEmployee(emp); setResultado(null) }}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-all text-sm ${
                  selectedEmployee?.id === emp.id
                    ? "bg-blue-600 text-white"
                    : dark
                      ? "hover:bg-slate-700 text-gray-300"
                      : "hover:bg-gray-100 text-gray-700"
                }`}
              >
                <div className="font-medium">{emp.firstName} {emp.lastName}</div>
                <div className={`text-xs ${selectedEmployee?.id === emp.id ? "text-blue-200" : dark ? "text-gray-500" : "text-gray-400"}`}>
                  {emp.cedula} · {emp.department || "Sin dpto."}
                </div>
              </button>
            ))}
          </div>

          {/* Empleado seleccionado info */}
          {selectedEmployee && (
            <div className={`mt-4 p-3 rounded-lg border ${dark ? "bg-slate-700 border-gray-600" : "bg-blue-50 border-blue-200"}`}>
              <div className="flex items-center gap-2 mb-2">
                <User size={14} className="text-blue-400" />
                <span className={`text-xs font-bold uppercase ${dark ? "text-gray-400" : "text-gray-500"}`}>Empleado seleccionado</span>
              </div>
              <div className={`text-sm font-bold ${dark ? "text-white" : "text-gray-900"}`}>
                {selectedEmployee.firstName} {selectedEmployee.lastName}
              </div>
              <div className={`text-xs mt-0.5 ${dark ? "text-gray-400" : "text-gray-500"}`}>
                {selectedEmployee.position} · {formatCurrency(getMonthlySalary(selectedEmployee))}/mes
              </div>
              <div className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>
                Ingreso: {new Date(selectedEmployee.hireDate).toLocaleDateString("es-PA")}
              </div>
            </div>
          )}

          {/* Fecha de salida */}
          <div className="mt-4">
            <h3 className={`text-sm font-bold uppercase tracking-wider mb-3 ${dark ? "text-gray-400" : "text-gray-500"}`}>
              2. Fecha de Salida
            </h3>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${dark ? "bg-slate-700 border-gray-600" : "bg-gray-50 border-gray-200"}`}>
              <Calendar size={14} className={dark ? "text-gray-400" : "text-gray-400"} />
              <input
                type="date"
                value={fechaSalida}
                onChange={e => setFechaSalida(e.target.value)}
                className={`flex-1 bg-transparent text-sm outline-none ${dark ? "text-white" : "text-gray-900"}`}
              />
            </div>
          </div>

          {/* Ajustes adicionales */}
          <div className="mt-4">
            <h3 className={`text-sm font-bold uppercase tracking-wider mb-3 ${dark ? "text-gray-400" : "text-gray-500"}`}>
              3. Ajustes (opcional)
            </h3>
            <div className="space-y-2">
              <div>
                <label className={`text-xs mb-1 block ${dark ? "text-gray-400" : "text-gray-500"}`}>Otros ingresos</label>
                <input
                  type="number"
                  value={otrosIngresos}
                  onChange={e => setOtrosIngresos(Number(e.target.value))}
                  className={`w-full px-3 py-2 rounded-lg border text-sm outline-none ${dark ? "bg-slate-700 border-gray-600 text-white" : "bg-gray-50 border-gray-200 text-gray-900"}`}
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
              <div>
                <label className={`text-xs mb-1 block ${dark ? "text-gray-400" : "text-gray-500"}`}>Otros descuentos</label>
                <input
                  type="number"
                  value={otrosDescuentos}
                  onChange={e => setOtrosDescuentos(Number(e.target.value))}
                  className={`w-full px-3 py-2 rounded-lg border text-sm outline-none ${dark ? "bg-slate-700 border-gray-600 text-white" : "bg-gray-50 border-gray-200 text-gray-900"}`}
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
            </div>
          </div>

          {/* Calcular */}
          <button
            onClick={handleCalcular}
            disabled={!selectedEmployee}
            className="mt-5 w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-all"
          >
            <Calculator size={16} />
            Calcular Liquidación
          </button>
        </div>

        {/* ── Panel derecho: resultado ── */}
        <div className="xl:col-span-2 space-y-5">

          {!resultado ? (
            <div className={`rounded-xl border flex flex-col items-center justify-center py-20 ${dark ? "bg-slate-800 border-gray-700 text-gray-500" : "bg-white border-gray-200 text-gray-400"}`}>
              <FileText size={48} className="mb-4 opacity-20" />
              <p className="text-sm font-medium">Selecciona un empleado y pulsa Calcular</p>
              <p className="text-xs mt-1 opacity-60">El resultado aparecerá aquí</p>
            </div>
          ) : (
            <>
              {/* Header resultado */}
              <div className={`rounded-xl border p-5 ${dark ? "bg-slate-800 border-gray-700" : "bg-white border-gray-200"}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 size={18} className="text-green-500" />
                      <span className={`text-xs font-bold uppercase tracking-wider ${dark ? "text-gray-400" : "text-gray-500"}`}>Liquidación calculada</span>
                    </div>
                    <h2 className={`text-2xl font-black ${dark ? "text-white" : "text-gray-900"}`}>
                      {resultado.employee.firstName} {resultado.employee.lastName}
                    </h2>
                    <p className={`text-sm mt-0.5 ${dark ? "text-gray-400" : "text-gray-500"}`}>
                      {resultado.employee.cedula} · {resultado.employee.position}
                    </p>
                    <p className={`text-xs mt-1 ${dark ? "text-gray-500" : "text-gray-400"}`}>
                      <Clock size={11} className="inline mr-1" />
                      {resultado.anosTrabajados} años, {resultado.mesesTrabajados % 12} meses trabajados
                      ({resultado.diasTrabajados} días)
                    </p>
                  </div>
                  <button
                    onClick={() => generarPDF(resultado, selectedCompany?.name || "Empresa")}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-all"
                  >
                    <Download size={15} />
                    PDF
                  </button>
                </div>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {card("Salario Mensual", formatCurrency(getMonthlySalary(resultado.employee)), `${resultado.employee.salaryType === "BIWEEKLY" ? "Quincenal ×2" : "Mensual"}`, "blue")}
                {card("Total Bruto", formatCurrency(resultado.totalBruto), "antes de descuentos", "purple")}
                {card("Descuentos", formatCurrency(resultado.totalDescuentos), "SS + ISR + otros", "red")}
                {card("NETO A PAGAR", formatCurrency(resultado.totalNeto), "total final", "green")}
              </div>

              {/* Detalle expandible */}
              <div className={`rounded-xl border ${dark ? "bg-slate-800 border-gray-700" : "bg-white border-gray-200"}`}>
                <button
                  onClick={() => setShowDetalle(!showDetalle)}
                  className={`w-full flex items-center justify-between p-5 text-left ${dark ? "hover:bg-slate-700/50" : "hover:bg-gray-50"} rounded-xl transition-all`}
                >
                  <span className={`text-sm font-bold uppercase tracking-wider ${dark ? "text-gray-300" : "text-gray-700"}`}>
                    Desglose Detallado
                  </span>
                  {showDetalle ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showDetalle && (
                  <div className="px-5 pb-5 space-y-4">

                    {/* Ingresos */}
                    <div>
                      <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 pb-2 border-b ${dark ? "text-green-400 border-gray-700" : "text-green-700 border-gray-200"}`}>
                        Ingresos
                      </h4>
                      <div className="space-y-2">
                        {[
                          { label: `Preaviso (${resultado.diasPreaviso} días)`, value: resultado.preaviso, note: resultado.anosTrabajados < 2 ? "Art. 224 CT — < 2 años" : "Art. 224 CT — ≥ 2 años" },
                          { label: `Antigüedad (${resultado.diasAntiguedad.toFixed(1)} días)`, value: resultado.antiguedad, note: resultado.anosTrabajados >= 10 ? "Art. 225 CT — 1.5 sem/año" : "Art. 225 CT — 1 sem/año" },
                          { label: "Décimo Tercer Mes (proporcional)", value: resultado.decimoProporcional, note: "Art. 259 CT" },
                          {
                            label: `Vacaciones (${resultado.diasVacNetos.toFixed(1)} días netos)`,
                            value: resultado.vacacionesProporcionales,
                            note: `Art. 54 CT — Ganados: ${resultado.diasVacaciones.toFixed(1)}d · Tomados: ${resultado.diasVacTomados}d · Pagados prev: ${resultado.diasVacPagados}d`
                          },
                          ...(resultado.otrosIngresos > 0 ? [{ label: "Otros Ingresos", value: resultado.otrosIngresos, note: "" }] : []),
                        ].map(({ label, value, note }) => (
                          <div key={label} className={`flex justify-between items-center py-2 border-b ${dark ? "border-gray-700/50" : "border-gray-100"}`}>
                            <div>
                              <span className={`text-sm ${dark ? "text-gray-300" : "text-gray-700"}`}>{label}</span>
                              {note && <div className={`text-xs ${dark ? "text-gray-600" : "text-gray-400"}`}>{note}</div>}
                            </div>
                            <span className={`text-sm font-mono font-bold ${dark ? "text-green-400" : "text-green-700"}`}>{formatCurrency(value)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between items-center pt-2">
                          <span className={`text-sm font-bold ${dark ? "text-white" : "text-gray-900"}`}>Total Bruto</span>
                          <span className={`font-mono font-black text-base ${dark ? "text-white" : "text-gray-900"}`}>{formatCurrency(resultado.totalBruto)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Descuentos */}
                    <div>
                      <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 pb-2 border-b ${dark ? "text-red-400 border-gray-700" : "text-red-600 border-gray-200"}`}>
                        Descuentos
                      </h4>
                      <div className="space-y-2">
                        {[
                          { label: "Seguro Social (9.75%)", value: resultado.ss },
                          ...(resultado.isr > 0 ? [{ label: "ISR", value: resultado.isr }] : []),
                          ...(resultado.otrosDescuentos > 0 ? [{ label: "Otros Descuentos", value: resultado.otrosDescuentos }] : []),
                        ].map(({ label, value }) => (
                          <div key={label} className={`flex justify-between items-center py-2 border-b ${dark ? "border-gray-700/50" : "border-gray-100"}`}>
                            <span className={`text-sm ${dark ? "text-gray-300" : "text-gray-700"}`}>{label}</span>
                            <span className={`text-sm font-mono font-bold ${dark ? "text-red-400" : "text-red-600"}`}>-{formatCurrency(value)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between items-center pt-2">
                          <span className={`text-sm font-bold ${dark ? "text-red-400" : "text-red-600"}`}>Total Descuentos</span>
                          <span className={`font-mono font-black text-base ${dark ? "text-red-400" : "text-red-600"}`}>-{formatCurrency(resultado.totalDescuentos)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Total final */}
                    <div className={`rounded-xl p-4 flex justify-between items-center ${dark ? "bg-gradient-to-r from-green-900/40 to-emerald-900/40 border border-green-800/50" : "bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200"}`}>
                      <div>
                        <div className={`text-xs font-bold uppercase tracking-wider ${dark ? "text-green-400" : "text-green-700"}`}>Total Neto a Pagar</div>
                        <div className={`text-xs mt-0.5 ${dark ? "text-green-500/60" : "text-green-600/60"}`}>Bruto − Descuentos</div>
                      </div>
                      <div className={`text-3xl font-black font-mono ${dark ? "text-green-400" : "text-green-700"}`}>
                        {formatCurrency(resultado.totalNeto)}
                      </div>
                    </div>

                    {/* Aviso legal */}
                    <div className={`flex gap-2 p-3 rounded-lg ${dark ? "bg-amber-900/20 border border-amber-800/40" : "bg-amber-50 border border-amber-200"}`}>
                      <AlertTriangle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                      <p className={`text-xs ${dark ? "text-amber-400" : "text-amber-700"}`}>
                        Este cálculo es referencial basado en el Código de Trabajo de Panamá (Arts. 54, 224, 225, 259). 
                        Los montos exactos pueden variar según el tipo de terminación (renuncia, despido justificado/injustificado) 
                        y comisiones o ingresos variables no incluidos.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
