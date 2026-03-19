"use client"

import { useState, useMemo, useCallback } from "react"
import useSWR, { mutate } from "swr"
import { authFetcher, getToken } from "../../../../services/api"
import {
  calcAllPayrolls,
  calcPayrollTotals,
  getISRTramos,
  getSSSRate,
  // calcDecimo,
  validateLegalParams,
  formatCurrency,
  // REQUIRED_LEGAL_KEYS,
  type LegalParameter,
  type PayrollPeriodType,
  type QuincenaType,
} from "../../../../lib/payrollCalculation"
import { Company, useCompany } from "../../../../context/routerContext"
import { useTheme } from "../../../../context/themeContext"
import { Calendar, Users, AlertCircle, Calculator, Eye, EyeOff, History, PlusCircle, SlidersHorizontal, Mail } from "lucide-react"
import PayrollHistory from "./PayrollHistory"
import { exportToExcel } from "./ExportToExcel"
import PagesHeader from "../../../../components/headers/pagesHeader"
import { usePageName } from "../../../../hook/usePageName"
import LoadingPayrollModal from "./LoadingPayroolModal"
import DetailsModal from "./DetailsModal"
import { PayrollInfo } from "./PayrollInfo"
import { NotificationComponent } from "./Notification"
import { PayslipEmailModal } from "./PayslipEmailModal"

// fetcher autenticado centralizado (ver services/api.ts)

// ==================== TYPES ====================
type SalaryType = "MONTHLY" | "BIWEEKLY"

export interface RecurringDeduction {
  id: string
  name: string
  amount: string | number
  frequency: "ALWAYS" | "FIRST_QUINCENA" | "SECOND_QUINCENA"
  isActive: boolean
}

export interface Employee {
  id: string
  cedula: string
  firstName: string
  department?: string
  position?: string
  lastName: string
  salary: number
  salaryType: SalaryType
  recurringDeductions?: RecurringDeduction[]
}

// REQUIRED_LEGAL_KEYS imported from lib/payrollCalculation

// LegalParameter & ISRTramo imported from lib/payrollCalculation

export interface PayrollCalculation {
  employeeId: string
  employee: Employee
  department?: string
  baseSalary: number
  hoursExtra: number
  bonifications: number
  otherIncome: number
  grossSalary: number
  sss: number
  se: number
  isr: number
  otherDeductions: number
  totalDeductions: number
  netSalary: number
  netSalaryMonthly: number
  netSalaryBiweekly: number
  thirteenthMonth?: number
  recurringAmount: number
  company?: Company
}

type NotificationType = "success" | "error"

interface Notification {
  type: NotificationType
  message: string
  show: boolean
  title?: string
}

type PayrollOverrides = Record<
  string,
  Partial<
    Pick<
      PayrollCalculation,
      "hoursExtra" | "bonifications" | "otherIncome" | "otherDeductions" | "baseSalary"
    >
  >
>

// formatCurrency imported from lib/payrollCalculation

// getMonthlyGross/getBiweeklyGross moved to lib/payrollCalculation.ts

export const AllPayrolls: React.FC = () => {
  const { selectedCompany }: { selectedCompany: Company | null } = useCompany()
  const { isDarkMode } = useTheme()
  const { pageName } = usePageName()

  const [activeTab, setActiveTab] = useState<"nueva" | "historial">("nueva")
  // const [duplicateWarning, setDuplicateWarning] = useState<{show: boolean; employeeName: string; existingId: string} | null>(null)
  const [isGeneratingPayrolls, setIsGeneratingPayrolls] = useState(false)
  const [showCols, setShowCols] = useState({ hoursExtra: false, bonifications: false, otherIncome: false })
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [payrollProgress, setPayrollProgress] = useState({ success: 0, error: 0 })
  const [selectedEmployeeForDetails, setSelectedEmployeeForDetails] = useState<string | null>(null)

  const [notification, setNotification] = useState<Notification>({
    type: "success",
    message: "",
    show: false
  })

  const showNotification = (type: NotificationType, message: string, title?: string) => {
    setNotification({
      type,
      message,
      show: true,
      title: title || undefined
    })
    setTimeout(() => setNotification((prev) => ({ ...prev, show: false })), 5000)
  }

  const { data: employees, isLoading: empLoading } = useSWR<Employee[]>(
    selectedCompany ? `${import.meta.env.VITE_API_URL}/api/payroll/employees?companyId=${selectedCompany.id}&status=ACTIVE` : null,
    authFetcher
  )

  // Empleados en licencia de maternidad — se incluyen solo en el pago de décimo tercer mes
  const { data: maternityEmployees } = useSWR<Employee[]>(
    selectedCompany ? `${import.meta.env.VITE_API_URL}/api/payroll/employees?companyId=${selectedCompany.id}&status=MATERNITY_LEAVE` : null,
    authFetcher
  )

  const { data: legalParams = [], isLoading } = useSWR<LegalParameter[]>(
    selectedCompany?.id ? `${import.meta.env.VITE_API_URL}/api/system/legal-parameters?companyId=${selectedCompany?.id}` : null,
    authFetcher,
    { revalidateOnFocus: false }
  )

  const validation = useMemo(() => {
    if (isLoading) return { isValid: true, missing: [] as string[] }
    return validateLegalParams(legalParams)
  }, [legalParams, isLoading])

  // ✅ Este selector ahora sí afecta los cálculos del período
  // Parsea "YYYY-MM-DD" como fecha local (evita el desfase UTC que retrocede un mes en UTC-5)
  const parseLocal = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number)
    return new Date(y, m - 1, d)
  }

  const [payrollType, setPayrollType] = useState<"Quincenal (cada 15 días)" | "Mensual">("Quincenal (cada 15 días)")
  const [payrollDate, setPayrollDate] = useState(() => {
    const n = new Date()
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-01`
  })
  const [quincenal, setQuincenal] = useState("Primera Quincena (1-15)")

  // ✅ Overrides ahora sí se usan
  const [overrides, setOverrides] = useState<PayrollOverrides>({})

  // ── Wrappers para usar las funciones del lib con los legalParams actuales ──
  // const getSSSRateMemo = () => getSSSRate(legalParams)
  // const getISRRates = () => getISRTramos(legalParams)

  // ── Cálculos usando lib/payrollCalculation (fuente única) ──
  const employeeCalculations = useMemo<PayrollCalculation[]>(() => {
    if (!legalParams?.length || !employees?.length) return []

    const d = parseLocal(payrollDate)
    const isPeriodDecimo = d.getMonth() === 3 || d.getMonth() === 7 || d.getMonth() === 11

    // En meses de décimo, incluir empleados en maternidad (solo se les calcula el décimo)
    const allEmployees = isPeriodDecimo && maternityEmployees?.length
      ? [...employees, ...maternityEmployees]
      : employees

    return calcAllPayrolls(
      allEmployees as any,
      legalParams,
      payrollType as PayrollPeriodType,
      quincenal as QuincenaType,
      payrollDate,
      overrides
    )
  }, [employees, maternityEmployees, legalParams, payrollType, quincenal, payrollDate, overrides])

  const updateEmployeeCalc = useCallback(
    (employeeId: string, field: keyof PayrollOverrides[string], value: number) => {
      setOverrides((prev) => ({
        ...prev,
        [employeeId]: {
          ...prev[employeeId],
          [field]: Number(value) || 0,
        },
      }))
    },
    []
  )

  const generatePayrolls = async () => {
    if (!selectedCompany) {
      showNotification("error", "Selecciona una compañía primero")
      return
    }

    if (!legalParams || legalParams.length === 0) {
      showNotification("error", "No se pueden generar nóminas sin parámetros legales configurados")
      return
    }

    setIsGeneratingPayrolls(true)
    setPayrollProgress({ success: 0, error: 0 })

    try {
      let successCount = 0
      let errorCount = 0

      for (const calc of employeeCalculations) {
        try {
          const extraDeductions = (calc.employee.recurringDeductions || [])
            .filter(d => d.isActive)
            .map(d => ({ type: "OTHER", description: d.name, amount: Number(d.amount), isFixed: true }))

          const _token = getToken()
          const response = await fetch(`${import.meta.env.VITE_API_URL}/api/payroll/payrolls/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${_token}` },
            body: JSON.stringify({
              employeeId: calc.employeeId,
              payPeriod: payrollDate,
              paymentDate: new Date().toISOString().split("T")[0],
              baseSalary: calc.baseSalary,
              salaryType: calc.employee.salaryType,
              workingDays: payrollType === "Mensual" ? 30 : 15,
              daysWorked: payrollType === "Mensual" ? 30 : 15,
              payrollType: "REGULAR",
              deductions: [
                {
                  type: "SSS",
                  description: "Seguro Social",
                  amount: calc.sss,
                  isFixed: true,
                },
                {
                  type: "SE",
                  description: "Seguro Educativo",
                  amount: calc.se,
                  isFixed: true,
                },
                ...(calc.isr > 0
                  ? [
                      {
                        type: "ISR",
                        description: "Impuesto sobre la Renta",
                        amount: calc.isr,
                        isFixed: false,
                      },
                    ]
                  : []),
                ...extraDeductions
              ],
              allowances: [
                ...(calc.hoursExtra > 0
                  ? [
                      {
                        type: "OVERTIME",
                        description: "Horas Extra",
                        amount: calc.hoursExtra,
                      },
                    ]
                  : []),
                ...(calc.bonifications > 0
                  ? [
                      {
                        type: "BONUS",
                        description: "Bonificación",
                        amount: calc.bonifications,
                      },
                    ]
                  : []),
                ...(calc.otherIncome > 0
                  ? [
                      {
                        type: "OTHER",
                        description: "Otros Ingresos",
                        amount: calc.otherIncome,
                      },
                    ]
                  : []),
              ],
            }),
          })

          if (!response.ok) {
            const error = await response.json()
            if (response.status === 409) {
              // Duplicado detectado — mostrar advertencia pero no contar como error fatal
              showNotification("error", `${calc.employee.firstName} ${calc.employee.lastName}: ya existe nómina para este período`)
            }
            console.error(`Error para ${calc.employee.firstName}:`, error)
            errorCount++
          } else {
            successCount++
          }
          setPayrollProgress({ success: successCount, error: errorCount })
        } catch (error) {
          console.error("Error:", error)
          errorCount++
          setPayrollProgress({ success: successCount, error: errorCount })
        }
      }

      if (successCount > 0) {
        showNotification(
          "success",
          `${successCount} nómina${successCount !== 1 ? "s" : ""} generada${successCount !== 1 ? "s" : ""} exitosamente`
        )
        mutate(`${import.meta.env.VITE_API_URL}/api/payroll/payrolls?companyId=${selectedCompany?.id}`)
      }

      if (errorCount > 0) {
        showNotification("error", `Error al generar ${errorCount} nómina${errorCount !== 1 ? "s" : ""}`)
      }
    } catch (error: any) {
      showNotification("error", error.message || "Error al generar nóminas")
    } finally {
      setTimeout(() => {
        setIsGeneratingPayrolls(false)
      }, 500)
    }
  }

  const handleExport = () => {
    exportToExcel({
      employeeCalculations,
      payrollDate,
      payrollType,
      quincenal,
      isPeriodThirteenthMonth:
        parseLocal(payrollDate).getMonth() === 3 ||
        parseLocal(payrollDate).getMonth() === 7 ||
        parseLocal(payrollDate).getMonth() === 11,
    })
  }

  if (empLoading)
    return (
      <div className={`flex items-center justify-center min-h-screen ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )

  const isDecember = parseLocal(payrollDate).getMonth() === 11
  const isApril = parseLocal(payrollDate).getMonth() === 3
  const isAugust = parseLocal(payrollDate).getMonth() === 7
  const isPeriodThirteenthMonth = isDecember || isApril || isAugust

  const thirteenthMonthPeriod = isApril
    ? "Primera Partida (16 dic - 15 abr)"
    : isAugust
      ? "Segunda Partida (16 abr - 15 ago)"
      : isDecember
        ? "Tercera Partida (16 ago - 15 dic)"
        : ""

  const totals = calcPayrollTotals(employeeCalculations, isPeriodThirteenthMonth)
  const { totalGross: totalGrossSalary, totalSss, totalSe, totalIsr, totalDeductions,
          totalNetMonthly: totalNetSalaryMonthly, totalNetBiweekly: totalNetSalaryBiweekly,
          totalThirteenth: totalThirteenthMonth } = totals

  const isrTramos = getISRTramos(legalParams)

  return (
    <div className={`relative transition-colors ${isDarkMode ? "bg-gray-900" : ""}`}>
      <LoadingPayrollModal
        isOpen={isGeneratingPayrolls}
        successCount={payrollProgress.success}
        errorCount={payrollProgress.error}
        totalCount={employeeCalculations.length}
      />

      <PagesHeader
        title={"Planilla"}
        description={pageName ? `${pageName} in ${selectedCompany?.name} "Configuración del Período de Pago"` : "Cargando compañía..."}
        onExport={activeTab === "nueva" ? handleExport : undefined}
      />

      {/* ── TABS ──────────────────────────────────────────────────────── */}
      <div className={`flex gap-1 p-1 rounded-xl mb-6 w-fit ${
        isDarkMode ? "bg-gray-800 border border-gray-700" : "bg-gray-100 border border-gray-200"
      }`}>
        <button
          onClick={() => setActiveTab("nueva")}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "nueva"
              ? isDarkMode ? "bg-blue-600 text-white shadow-lg" : "bg-white text-blue-700 shadow-md"
              : isDarkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-800"
          }`}
        >
          <PlusCircle size={15} />
          Nueva Nómina
        </button>
        <button
          onClick={() => setActiveTab("historial")}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "historial"
              ? isDarkMode ? "bg-blue-600 text-white shadow-lg" : "bg-white text-blue-700 shadow-md"
              : isDarkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-800"
          }`}
        >
          <History size={15} />
          Historial
        </button>
      </div>

      {/* ── TAB: HISTORIAL ──────────────────────────────────────────────── */}
      {activeTab === "historial" && <PayrollHistory />}

      {/* ── TAB: NUEVA NÓMINA ───────────────────────────────────────────── */}
      {activeTab === "nueva" && <>

      {/* Configuration Section */}
      <div className={`rounded-lg p-6 border mb-8 transition-colors ${
        isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
      }`}>
        <div className={`flex items-center gap-2 mb-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
          <Calendar size={20} />
          <h3 className="text-lg font-semibold">Configuración del Período de Pago</h3>
        </div>
        <p className={`text-sm mb-6 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
          Seleccione el tipo de período y las fechas para calcular la planilla
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
              Tipo de Período
            </label>
            <select
              value={payrollType}
              onChange={(e) => setPayrollType(e.target.value as any)}
              className={`w-full rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                isDarkMode
                  ? "bg-gray-700 border border-gray-600 text-white"
                  : "bg-white border border-gray-300 text-gray-900"
              }`}
            >
              <option>Quincenal (cada 15 días)</option>
              <option>Mensual</option>
            </select>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
              Mes y Año
            </label>
            <input
              type="month"
              value={payrollDate.substring(0, 7)}
              onChange={(e) => setPayrollDate(e.target.value + "-01")}
              className={`w-full rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                isDarkMode
                  ? "bg-gray-700 border border-gray-600 text-white"
                  : "bg-white border border-gray-300 text-gray-900"
              }`}
            />
          </div>

          {payrollType === "Quincenal (cada 15 días)" && (
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                Quincena
              </label>
              <select
                value={quincenal}
                onChange={(e) => setQuincenal(e.target.value)}
                className={`w-full rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  isDarkMode
                    ? "bg-gray-700 border border-gray-600 text-white"
                    : "bg-white border border-gray-300 text-gray-900"
                }`}
              >
                <option>Primera Quincena (1-15)</option>
                <option>Segunda Quincena (16-31)</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Active Employees Section */}
      <div className={`rounded-lg p-6 border mb-8 transition-colors ${
        isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
      }`}>
        <div className={`flex items-center justify-between text-sm rounded-lg py-2 transition-colors ${
          isDarkMode
            ? "border border-gray-700 bg-gray-700/30"
            : "border border-gray-300 bg-gray-100/30"
        }`}>
          <div className="flex w-full justify-center items-center gap-2 text-lg font-semibold text-center flex-wrap">
            <span className={isDarkMode ? "text-white" : "text-gray-900"}>Período:</span>
            <span className="font-medium text-blue-400">
              {payrollType === "Mensual"
                ? `${parseLocal(payrollDate).toLocaleDateString("es-PA", { month: "long", year: "numeric" })}`
                : quincenal === "Primera Quincena (1-15)"
                  ? `1 - 15 de ${parseLocal(payrollDate).toLocaleDateString("es-PA", { month: "long", year: "numeric" })}`
                  : `16 - 31 de ${parseLocal(payrollDate).toLocaleDateString("es-PA", { month: "long", year: "numeric" })}`}
            </span>
            {payrollType !== "Mensual" && <span className={isDarkMode ? "text-gray-500" : "text-gray-600"}>(15 días)</span>}
            <span className={`text-xs px-2 py-0.5 rounded-full ${isDarkMode ? "bg-blue-900/40 text-blue-300" : "bg-blue-100 text-blue-700"}`}>
              {payrollType === "Mensual"
                ? "ISR se retiene mensualmente • empleador paga a DGI este mes"
                : "ISR se retiene esta quincena • empleador paga a DGI suma Q1+Q2"}
            </span>
          </div>
        </div>

        {isPeriodThirteenthMonth && (
          <div className={`border rounded-lg p-4 mt-4 transition-colors ${
            isDarkMode
              ? "bg-green-900/30 border-green-600"
              : "bg-green-100/30 border-green-300"
          }`}>
            <div className={`text-sm mb-2 ${isDarkMode ? "text-green-100" : "text-green-800"}`}>
              ⚠️ Período de Pago del Décimo Tercer Mes
            </div>
            <div className={`text-lg font-bold ${isDarkMode ? "text-green-300" : "text-green-700"}`}>
              {thirteenthMonthPeriod}
            </div>
            <div className={`text-sm mt-2 ${isDarkMode ? "text-green-100" : "text-green-800"}`}>
              Total acumulado a pagar: {formatCurrency(totalThirteenthMonth)}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center gap-2 flex-wrap">
          <div className={`flex items-center gap-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            <Users size={20} />
            <h3 className="text-lg font-semibold">Empleados Activos ({employeeCalculations.length})</h3>
          </div>

          {/* Column visibility toggles */}
          <div className={`flex items-center gap-1 p-1 rounded-lg ${isDarkMode ? "bg-gray-700" : "bg-gray-100"}`}>
            <SlidersHorizontal size={14} className={isDarkMode ? "text-gray-400 ml-1" : "text-gray-500 ml-1"} />
            {(["hoursExtra", "bonifications", "otherIncome"] as const).map(col => {
              const labels: Record<string, string> = { hoursExtra: "H.Extra", bonifications: "Bonif.", otherIncome: "Otros" }
              return (
                <button
                  key={col}
                  onClick={() => setShowCols(prev => ({ ...prev, [col]: !prev[col] }))}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all ${
                    showCols[col]
                      ? isDarkMode ? "bg-blue-600 text-white" : "bg-blue-600 text-white"
                      : isDarkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {showCols[col] ? <Eye size={11} /> : <EyeOff size={11} />}
                  {labels[col]}
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-2 mt-6">
            <button
              onClick={() => setShowEmailModal(true)}
              disabled={employeeCalculations.length === 0}
              className="px-4 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg flex items-center gap-2 transition-colors"
              title="Enviar comprobantes por email"
            >
              <Mail size={18} />
              Enviar Comprobantes
            </button>
            <button
              onClick={generatePayrolls}
              className="px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
              disabled={employeeCalculations.length === 0}
            >
              <Calculator size={20} />
              Guardar Nóminas
            </button>
          </div>
        </div>

        <p className={`text-sm mb-6 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
          Haz clic en el ícono de ojo para ver el desglose detallado de cada empleado.
        </p>

        {employeeCalculations.length === 0 ? (
          <div className={`text-center py-12 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
            <p>No hay empleados en esta compañía</p>
          </div>
        ) : legalParams.length === 0 ? (
          <div className={`border rounded-lg p-6 text-center transition-colors ${
            isDarkMode
              ? "bg-red-900/30 border-red-600"
              : "bg-red-100/30 border-red-300"
          }`}>
            <AlertCircle className={`mx-auto mb-3 ${isDarkMode ? "text-red-400" : "text-red-600"}`} size={32} />
            <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? "text-red-300" : "text-red-700"}`}>
              Parámetros Legales No Configurados
            </h3>
            <p className={`mb-4 ${isDarkMode ? "text-red-100" : "text-red-800"}`}>
              Los cálculos de nómina no serán posibles hasta que configure los parámetros legales del sistema.
            </p>
            <p className={`text-sm ${isDarkMode ? "text-red-200" : "text-red-700"}`}>
              Por favor contacte al administrador del sistema para configurar:
            </p>
            <ul className={`text-sm mt-2 space-y-1 ${isDarkMode ? "text-red-200" : "text-red-700"}`}>
              <li>• Tasa de SSS (Seguro Social)</li>
              <li>• Tramos de ISR (Impuesto sobre la Renta)</li>
              <li>• Otros parámetros fiscales requeridos</li>
            </ul>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className={`w-full text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
              <thead>
                <tr className={`border-b transition-colors ${
                  isDarkMode ? "border-gray-700" : "border-gray-200"
                }`}>
                  <th className={`text-left px-2 py-2 font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                    Desglose
                  </th>
                  <th className={`text-left px-2 py-2 font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                    Empleado
                  </th>
                  <th className={`text-left px-2 py-2 font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                    Tipo de Pago
                  </th>
                  <th className={`text-left px-2 py-2 font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                    Salario Base
                  </th>
                  {showCols.hoursExtra && (
                    <th className={`text-left px-2 py-2 font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                      Horas Extras
                    </th>
                  )}
                  {showCols.bonifications && (
                    <th className={`text-left px-2 py-2 font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                      Bonificaciones
                    </th>
                  )}
                  {showCols.otherIncome && (
                    <th className={`text-left px-2 py-2 font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                      Otros Ingresos
                    </th>
                  )}
                  <th className={`text-left px-2 py-2 font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                    Bruto
                  </th>
                  <th className={`text-left px-2 py-2 font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                    SS (9.75%)
                  </th>
                  <th className={`text-left px-2 py-2 font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                    Seg. Educ. (1.25%)
                  </th>
                  <th className={`text-left px-2 py-2 font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                    ISR
                  </th>
                  <th className={`text-right py-3 px-2 font-medium ${isDarkMode ? "text-orange-400" : "text-orange-600"}`}>
                    Dctos. Fijos
                  </th>
                  <th className={`text-left px-2 py-2 font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                    Otras Ret.
                  </th>
                  <th className={`text-left px-2 py-2 font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                    Total Desc.
                  </th>
                  <th className={`text-left px-2 py-2 font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                    Mensual Neto
                  </th>
                  <th className={`text-left px-2 py-2 font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                    Quincenal Neto
                  </th>
                  {isPeriodThirteenthMonth && (
                    <th className={`text-left px-4 py-3 font-medium ${
                      isDarkMode
                        ? "bg-green-900/30 text-green-300"
                        : "bg-green-100/30 text-green-700"
                    }`}>
                      13° Mes Neto
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {employeeCalculations.map((calc) => (
                  <tr
                    key={calc.employeeId}
                    className={`border-b transition ${
                      isDarkMode
                        ? "border-gray-700 hover:bg-gray-700/50"
                        : "border-gray-200 hover:bg-gray-100/50"
                    }`}
                  >
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => setSelectedEmployeeForDetails(calc.employeeId)}
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                        title="Ver desglose detallado"
                      >
                        <Eye size={18} />
                      </button>
                    </td>

                    <td className="px-4 py-3 text-sm">
                      <a
                        className={`font-medium cursor-pointer hover:underline ${
                          isDarkMode ? "text-blue-400" : "text-blue-600"
                        }`}
                        href={`/${selectedCompany?.code}/employees/edit/${calc.employee?.id}`}
                      >
                        {calc.employee?.firstName} {calc.employee?.lastName}
                      </a>
                      <div className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                        {calc.employee.cedula}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                        calc.employee.salaryType === "MONTHLY"
                          ? isDarkMode ? "bg-blue-900 text-blue-200" : "bg-blue-100 text-blue-800"
                          : isDarkMode ? "bg-purple-900 text-purple-200" : "bg-purple-100 text-purple-800"
                      }`}>
                        {calc.employee.salaryType === "MONTHLY" ? "Mensual" : "Quincenal"}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-sm">
                      <input
                        type="number"
                        value={calc.baseSalary}
                        onChange={(e) =>
                          updateEmployeeCalc(calc.employeeId, "baseSalary", parseFloat(e.target.value) || 0)
                        }
                        className={`w-24 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                          isDarkMode
                            ? "bg-gray-700 border border-gray-600 text-white"
                            : "bg-white border border-gray-300 text-gray-900"
                        }`}
                      />
                    </td>

                    {showCols.hoursExtra && (
                      <td className="px-4 py-3 text-sm">
                        <input
                          type="number"
                          value={calc.hoursExtra}
                          onChange={(e) =>
                            updateEmployeeCalc(calc.employeeId, "hoursExtra", parseFloat(e.target.value) || 0)
                          }
                          placeholder="0.00"
                          className={`w-20 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                            isDarkMode
                              ? "bg-gray-700 border border-gray-600 text-white"
                              : "bg-white border border-gray-300 text-gray-900"
                          }`}
                        />
                      </td>
                    )}

                    {showCols.bonifications && (
                      <td className="px-4 py-3 text-sm">
                        <input
                          type="number"
                          value={calc.bonifications}
                          onChange={(e) =>
                            updateEmployeeCalc(calc.employeeId, "bonifications", parseFloat(e.target.value) || 0)
                          }
                          placeholder="0.00"
                          className={`w-20 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                            isDarkMode
                              ? "bg-gray-700 border border-gray-600 text-white"
                              : "bg-white border border-gray-300 text-gray-900"
                          }`}
                        />
                      </td>
                    )}

                    {showCols.otherIncome && (
                      <td className="px-4 py-3 text-sm">
                        <input
                          type="number"
                          value={calc.otherIncome}
                          onChange={(e) =>
                            updateEmployeeCalc(calc.employeeId, "otherIncome", parseFloat(e.target.value) || 0)
                          }
                          placeholder="0.00"
                          className={`w-20 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                            isDarkMode
                              ? "bg-gray-700 border border-gray-600 text-white"
                              : "bg-white border border-gray-300 text-gray-900"
                          }`}
                        />
                      </td>
                    )}

                    <td className={`px-4 py-3 font-medium text-sm ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                      {formatCurrency(calc.grossSalary)}
                    </td>

                    <td className="px-4 py-3 text-sm">{formatCurrency(calc.sss)}</td>
                    <td className="px-4 py-3 text-sm">{formatCurrency(calc.se)}</td>
                    <td className="px-4 py-3 text-sm">{formatCurrency(calc.isr)}</td>

                    <td className={`py-3 px-2 text-right font-medium ${
                      isDarkMode ? "text-orange-400" : "text-orange-600"
                    }`}>
                      {calc.recurringAmount > 0 ? `-${formatCurrency(calc.recurringAmount)}` : "$0.00"}
                    </td>

                    <td className="px-4 py-3 text-sm">
                      <input
                        type="number"
                        value={calc.otherDeductions}
                        onChange={(e) =>
                          updateEmployeeCalc(calc.employeeId, "otherDeductions", parseFloat(e.target.value) || 0)
                        }
                        placeholder="0.00"
                        className={`w-20 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                          isDarkMode
                            ? "bg-gray-700 border border-gray-600 text-white"
                            : "bg-white border border-gray-300 text-gray-900"
                        }`}
                      />
                    </td>

                    <td className={`px-4 py-3 text-sm font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                      {formatCurrency(calc.totalDeductions)}
                    </td>

                    <td className="px-4 py-3 text-sm font-medium text-green-400">
                      {formatCurrency(calc.netSalaryMonthly)}
                    </td>

                    <td className="px-4 py-3 text-sm font-medium text-green-400">
                      {formatCurrency(calc.netSalaryBiweekly)}
                    </td>

                    {isPeriodThirteenthMonth && (
                      <td className={`px-4 py-3 text-sm font-medium text-green-300 ${
                        isDarkMode ? "bg-green-900/20" : "bg-green-100/30"
                      }`}>
                        {formatCurrency(calc.thirteenthMonth || 0)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>

              <tfoot>
                <tr className={`font-bold transition-colors ${
                  isDarkMode
                    ? "border-t-2 border-gray-600 bg-gray-700/50"
                    : "border-t-2 border-gray-400 bg-gray-200/50"
                }`}>
                  <td colSpan={3} className={`px-4 py-3 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                    TOTALES
                  </td>
                  <td className="px-4 py-3">{formatCurrency(totalGrossSalary)}</td>
                  {showCols.hoursExtra && <td className="px-4 py-3">-</td>}
                  {showCols.bonifications && <td className="px-4 py-3">-</td>}
                  {showCols.otherIncome && <td className="px-4 py-3">-</td>}
                  <td className="px-4 py-3">{formatCurrency(totalGrossSalary)}</td>
                  <td className="px-4 py-3">{formatCurrency(totalSss)}</td>
                  <td className="px-4 py-3">{formatCurrency(totalSe)}</td>
                  <td className="px-4 py-3">{formatCurrency(totalIsr)}</td>
                  <td className="px-4 py-3">-</td>
                  <td className="px-4 py-3">-</td>
                  <td className="px-4 py-3">{formatCurrency(totalDeductions)}</td>
                  <td className="px-4 py-3 text-green-400">{formatCurrency(totalNetSalaryMonthly)}</td>
                  <td className="px-4 py-3 text-green-400">{formatCurrency(totalNetSalaryBiweekly)}</td>
                  {isPeriodThirteenthMonth && (
                    <td className={`px-4 py-3 text-green-300 ${isDarkMode ? "bg-green-900/20" : "bg-green-100/30"}`}>
                      {formatCurrency(totalThirteenthMonth)}
                    </td>
                  )}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {selectedEmployeeForDetails && (
        <DetailsModal
          calculation={employeeCalculations.find((c) => c.employeeId === selectedEmployeeForDetails)!}
          isOpen={true}
          onClose={() => setSelectedEmployeeForDetails(null)}
        />
      )}

      {showEmailModal && (
        <PayslipEmailModal
          calculations={employeeCalculations}
          companyName={selectedCompany?.name ?? "Empresa"}
          payPeriod={(() => {
            const d = parseLocal(payrollDate)
            const monthYear = d.toLocaleDateString("es-PA", { month: "long", year: "numeric" })
            if (payrollType === "Mensual") {
              const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
              return `1 al ${lastDay} de ${monthYear}`
            }
            return quincenal === "Primera Quincena (1-15)"
              ? `1 al 15 de ${monthYear}`
              : `16 al 31 de ${monthYear}`
          })()}
          payrollType={payrollType}
          onClose={() => setShowEmailModal(false)}
        />
      )}

      <PayrollInfo
        sssRate={getSSSRate(legalParams) || 9.75}
        isrTramos={isrTramos}
        defaultOpen={false}
      />

      <NotificationComponent
        notification={notification}
        onClose={() => setNotification((prev) => ({ ...prev, show: false }))}
      />

      {(!validation.isValid && !isLoading) && (
        <div className={`p-6 border rounded-lg transition-colors ${
          isDarkMode
            ? "bg-red-900/20 border-red-700 text-red-200"
            : "bg-red-100/30 border-red-300 text-red-800"
        }`}>
          <h2 className={`text-lg font-bold mb-2 ${isDarkMode ? "text-red-300" : "text-red-700"}`}>
            ⚠️ Configuración Incompleta
          </h2>
          <p className={`mb-4 text-sm ${isDarkMode ? "text-red-100" : "text-red-700"}`}>
            No se pueden realizar cálculos de nómina porque faltan los siguientes parámetros legales o están inactivos:
          </p>
          <ul className={`list-disc list-inside grid grid-cols-2 gap-2 text-xs font-mono ${
            isDarkMode ? "text-red-100" : "text-red-700"
          }`}>
            {validation.missing.map(key => (
              <li key={key} className={`p-1 rounded ${isDarkMode ? "bg-red-900/40" : "bg-red-200/40"}`}>
                {key}
              </li>
            ))}
          </ul>
          <button
            onClick={() => {/* Redirigir a configuración */}}
            className={`mt-4 px-4 py-2 rounded text-sm transition-colors ${
              isDarkMode
                ? "bg-red-600 hover:bg-red-500 text-white"
                : "bg-red-500 hover:bg-red-600 text-white"
            }`}
          >
            Configurar Parámetros Legales
          </button>
        </div>
      )}

      </> /* fin tab nueva nómina */}
    </div>
  )
}