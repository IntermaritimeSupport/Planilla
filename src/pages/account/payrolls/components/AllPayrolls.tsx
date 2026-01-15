"use client"

import { useState, useCallback, useMemo } from "react"
import useSWR, { mutate } from "swr"
import { Company, useCompany } from "../../../../context/routerContext"
import { Calendar, Users, AlertCircle, Calculator, Eye} from "lucide-react"
import { exportToExcel } from "./ExportToExcel"
import PagesHeader from "../../../../components/headers/pagesHeader"
import { usePageName } from "../../../../hook/usePageName"
import LoadingPayrollModal from "./LoadingPayroolModal"
import DetailsModal from "./DetailsModal"
import { PayrollInfo } from "./PayrollInfo"
import { NotificationComponent } from "./Notification"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

// ==================== TYPES ====================
type SalaryType = "MONTHLY" | "BIWEEKLY"

export interface RecurringDeduction {
  id: string
  name: string
  amount: string | number // Viene como string del JSON
  frequency: "ALWAYS" | "FIRST_QUINCENA" | "SECOND_QUINCENA"
  isActive: boolean
}

export interface Employee {
  id: string
  cedula: string
  firstName: string
  department?:string
  position?:string
  lastName: string
  salary: number
  salaryType: SalaryType // NUEVO: tipo de salario
    recurringDeductions?: RecurringDeduction[]
}

const REQUIRED_LEGAL_KEYS = [
  "ss_empleado",        // Seguro Social Empleado
  "ss_patrono",         // Seguro Social Patrono
  "ss_decimo",          // Seguro Social Décimo
  "se_empleado",        // Seguro Educativo Empleado
  "se_patrono",         // Seguro Educativo Patrono
  "isr_r1",             // ISR Tramo 1
  "isr_r2",             // ISR Tramo 2
  "isr_r3",             // ISR Tramo 3
  "riesgo_profesional"  // Riesgo Profesional
];

interface LegalParameter {
  id: string
  key: string
  name: string
  type: "employee" | "employer" | "fixed"
  category: "social_security" | "educational_insurance" | "isr" | "other"
  percentage: number
  minRange?: number
  maxRange?: number
  status: "active" | "inactive"
  effectiveDate: string
  description?: string
}

interface ISRTramo {
  name: string
  percentage: number
  minRange: number
  maxRange: number
}

export interface PayrollCalculation {
  employeeId: string
  employee: Employee
  department?:string
  baseSalary: number
  hoursExtra: number
  bonifications: number
  otherIncome: number
  grossSalary: number
  sss: number
  isr: number
  otherDeductions: number
  totalDeductions: number
  netSalary: number
  netSalaryMonthly: number // NUEVO: desglose mensual
  netSalaryBiweekly: number // NUEVO: desglose quincenal
  thirteenthMonth?: number
  recurringAmount: number
  company?: Company
}

type NotificationType = "success" | "error"

interface Notification {
  type: NotificationType
  message: string
  show: boolean
  title?: string  // Agrega esta línea
}

type PayrollOverrides = Record<
  string,
  Partial<Pick<
    PayrollCalculation,
    'hoursExtra' | 'bonifications' | 'otherIncome' | 'otherDeductions' | 'baseSalary'
  >>
>

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("es-PA", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

// NUEVO: Modal para desglose individual

export const AllPayrolls: React.FC = () => {
  const { selectedCompany }: { selectedCompany: Company | null } = useCompany()
  const { pageName } = usePageName()
  const [isGeneratingPayrolls, setIsGeneratingPayrolls] = useState(false)
  const [payrollProgress, setPayrollProgress] = useState({ success: 0, error: 0 })
  // Estado para el modal
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
    title: title || undefined  // Ahora esto funcionará correctamente
  })
  setTimeout(() => setNotification((prev) => ({ ...prev, show: false })), 5000)
}
  // Fetch employees
  const { data: employees, isLoading: empLoading } = useSWR<Employee[]>(
    selectedCompany ? `${import.meta.env.VITE_API_URL}/api/payroll/employees?companyId=${selectedCompany.id}` : null,
    fetcher
  )

  // Fetch legal parameters
const { data: legalParams = [], isLoading } = useSWR<LegalParameter[]>(
  selectedCompany?.id ? `${import.meta.env.VITE_API_URL}/api/system/legal-parameters?companyId=${selectedCompany?.id}` : null,
    fetcher,
    { revalidateOnFocus: false }
  )
  const validation = useMemo(() => {
  if (isLoading) return { isValid: true, missing: [] };

  // Filtramos los que están activos y obtenemos solo sus llaves
  const activeKeys = legalParams
    .filter(p => p.status === "active")
    .map(p => p.key);

  // Buscamos cuáles de las obligatorias no están en las activas
  const missing = REQUIRED_LEGAL_KEYS.filter(key => !activeKeys.includes(key));

  return {
    isValid: missing.length === 0,
    missing: missing
  };
}, [legalParams, isLoading]);

  // Configuración del período
  const [payrollType, setPayrollType] = useState("Quincenal (cada 15 días)")
  const [payrollDate, setPayrollDate] = useState(new Date().toISOString().split("T")[0])
  const [quincenal, setQuincenal] = useState("Primera Quincena (1-15)")
  const [, setOverrides] = useState<PayrollOverrides>({})

  // Extraer tasas de parámetros legales
  const getSSSRate = useCallback(() => {
    if (!legalParams || legalParams.length === 0) return 2.87
    const sssParam = legalParams.find(
      (p) => p.category === "social_security" && p.type === "employee" && p.status === "active"
    )
    return sssParam?.percentage || 2.87
  }, [legalParams])

  const getISRRates = useCallback((): ISRTramo[] => {
    if (!legalParams || legalParams.length === 0) return []

    return legalParams
      .filter((p) => p.category === "isr" && p.status === "active")
      .map((p) => ({
        name: p.name,
        percentage: p.percentage,
        minRange: p.minRange || 0,
        maxRange: p.maxRange || 999999999,
      }))
      .sort((a, b) => a.minRange - b.minRange)
  }, [legalParams])

  // Calcular ISR - CORREGIDO
  const calculateISR = useCallback(
    (monthlyIncome: number): number => {
      const annualIncome = monthlyIncome * 12
      const tramos = getISRRates()

      if (tramos.length === 0) return 0

      let tax = 0

      for (const tramo of tramos) {
        // Si el ingreso anual es menor al inicio del tramo, no aplicar este tramo
        if (annualIncome <= tramo.minRange) {
          continue
        }

        // Calcular el rango de ingreso gravable en este tramo
        const rangeStart = Math.max(annualIncome, tramo.minRange)
        const rangeEnd = Math.min(annualIncome, tramo.maxRange)
        
        // Si hay ingreso gravable en este tramo
        if (rangeEnd > rangeStart) {
          const taxableInThisTramo = rangeEnd - rangeStart
          tax += (taxableInThisTramo * tramo.percentage) / 100
        }
      }

      // Retornar el impuesto mensual
      return Number((tax / 12).toFixed(2))
    },
    [getISRRates]
  )

  // NUEVO: Convertir salario a base mensual
  const getNormalizedMonthlysalary = (emp: Employee): number => {
    // Asegurar que el salario es un número válido
    const salary = Number(emp.salary) || 0
    
    if (emp.salaryType === "MONTHLY") {
      return salary
    } else {
      // BIWEEKLY: salario quincenal * 26 semanas / 12 meses
      return (salary * 26) / 12
    }
  }

  // Calcular Décimo Tercer Mes
  const calculateThirteenthMonthByPeriod = useCallback(
    (totalIncome: number, month: number): {
      period: string
      grossAmount: number
      sss: number
      isr: number
      netAmount: number
      startMonth: number
      endMonth: number
    } => {
      let period = ""
      let startMonth = 0
      let endMonth = 0

      if (month >= 3 && month <= 6) {
        period = "Primera Partida (16 dic - 15 abr)"
        startMonth = 11
        endMonth = 3
      } else if (month >= 7 && month <= 9) {
        period = "Segunda Partida (16 abr - 15 ago)"
        startMonth = 3
        endMonth = 7
      } else if (month === 11) {
        period = "Tercera Partida (16 ago - 15 dic)"
        startMonth = 7
        endMonth = 11
      }

      const grossAmount = Number((totalIncome / 12).toFixed(2))
      const sss = Number((grossAmount * 0.0725).toFixed(2))

      const annualIncome = totalIncome
      let isr = 0
      if (annualIncome > 11000) {
        isr = calculateISR(grossAmount - sss)
      }

      const netAmount = Number((grossAmount - sss - isr).toFixed(2))

      return { period, grossAmount, sss, isr, netAmount, startMonth, endMonth }
    },
    [calculateISR]
  )

  const employeeCalculations = useMemo<PayrollCalculation[]>(() => {
    // VALIDACIÓN: Verificar que existan parámetros legales
    if (!legalParams || legalParams.length === 0) {
      return []
    }

    if (!employees || employees.length === 0) return []

    const sssRate = getSSSRate()
    const isFirstQuincena = quincenal === "Primera Quincena (1-15)"
    const payrollMonth = new Date(payrollDate).getMonth()
    const isPeriodThirteenthMonth = payrollMonth === 3 || payrollMonth === 7 || payrollMonth === 11

    return employees.map((emp) => {
      const normalizedMonthlySalary = getNormalizedMonthlysalary(emp)
      const baseSalary = normalizedMonthlySalary // En display mostraremos el original
      const hoursExtra = 0
      const bonifications = 0
      const otherIncome = 0

      const grossSalary = baseSalary + hoursExtra + bonifications + otherIncome
      const sss = Number((grossSalary * (sssRate / 100)).toFixed(2))
      const taxableIncome = grossSalary - sss
      const isr = calculateISR(taxableIncome)
      // CÁLCULO DE DESCUENTOS RECURRENTES (Aquí es donde se suma la hipoteca de Luis)
      const recurringAmount = (emp.recurringDeductions || []).reduce((acc, d) => {
        if (!d.isActive) return acc
        const amount = Number(d.amount) || 0
        
        // Aplicar según frecuencia
        if (d.frequency === "ALWAYS") return acc + amount
        if (isFirstQuincena && d.frequency === "FIRST_QUINCENA") return acc + amount
        if (!isFirstQuincena && d.frequency === "SECOND_QUINCENA") return acc + amount
        return acc
      }, 0)
      const otherDeductions = 0
      const totalDeductions = sss + isr + otherDeductions + recurringAmount
      const netSalary = grossSalary - totalDeductions

      const netSalaryMonthly = netSalary
      const netSalaryBiweekly = Number((netSalary / 2).toFixed(2))

      const calc: PayrollCalculation = {
        employeeId: emp.id,
        employee: emp,
        baseSalary,
        hoursExtra,
        bonifications,
        otherIncome,
        grossSalary,
        sss,
        isr,
        otherDeductions,
        totalDeductions,
        netSalary,
        netSalaryMonthly,
        netSalaryBiweekly,
        recurringAmount,
      }

      if (isPeriodThirteenthMonth) {
        const fourMonthsSalary = baseSalary * 4
        const thirteenthData = calculateThirteenthMonthByPeriod(fourMonthsSalary, payrollMonth)
        calc.thirteenthMonth = thirteenthData.netAmount
      }

      return calc
    })
  }, [employees, payrollDate, getSSSRate, calculateISR, calculateThirteenthMonthByPeriod])

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

    // VALIDACIÓN: Verificar parámetros legales
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

          const response = await fetch(`${import.meta.env.VITE_API_URL}/api/payroll/payrolls/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              employeeId: calc.employeeId,
              payPeriod: payrollDate,
              paymentDate: new Date().toISOString().split("T")[0],
              baseSalary: calc.baseSalary,
              salaryType: calc.employee.salaryType,
              workingDays: 30,
              daysWorked: 30,
              payrollType: "REGULAR",
              deductions: [
                {
                  type: "SSS",
                  description: "Seguro Social",
                  amount: calc.sss,
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
      isPeriodThirteenthMonth: new Date(payrollDate).getMonth() === 3 ||
        new Date(payrollDate).getMonth() === 7 ||
        new Date(payrollDate).getMonth() === 11,
    })
  }

  if (empLoading)
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )

  const isDecember = new Date(payrollDate).getMonth() === 11
  const isApril = new Date(payrollDate).getMonth() === 3
  const isAugust = new Date(payrollDate).getMonth() === 7
  const isPeriodThirteenthMonth = isDecember || isApril || isAugust

  const thirteenthMonthPeriod = isApril
    ? "Primera Partida (16 dic - 15 abr)"
    : isAugust
    ? "Segunda Partida (16 abr - 15 ago)"
    : isDecember
    ? "Tercera Partida (16 ago - 15 dic)"
    : ""

  const totalGrossSalary = Number(
    employeeCalculations.reduce((sum, c) => sum + Number(c.grossSalary), 0).toFixed(2)
  )
  const totalSss = Number(employeeCalculations.reduce((sum, c) => sum + Number(c.sss), 0).toFixed(2))
  const totalIsr = Number(employeeCalculations.reduce((sum, c) => sum + Number(c.isr), 0).toFixed(2))
  const totalDeductions = Number(
    employeeCalculations.reduce((sum, c) => sum + Number(c.totalDeductions), 0).toFixed(2)
  )
  // const totalNetSalary = Number(
  //   employeeCalculations.reduce((sum, c) => sum + Number(c.netSalary), 0).toFixed(2)
  // )
  const totalNetSalaryMonthly = Number(
    employeeCalculations.reduce((sum, c) => sum + Number(c.netSalaryMonthly), 0).toFixed(2)
  )
  const totalNetSalaryBiweekly = Number(
    employeeCalculations.reduce((sum, c) => sum + Number(c.netSalaryBiweekly), 0).toFixed(2)
  )
  const totalThirteenthMonth = isPeriodThirteenthMonth
    ? Number(employeeCalculations.reduce((sum, c) => sum + Number(c.thirteenthMonth || 0), 0).toFixed(2))
    : 0

  const isrTramos = getISRRates()

  return (
    <div className=" relative bg-gray-900 text-white">

      <LoadingPayrollModal
        isOpen={isGeneratingPayrolls}
        successCount={payrollProgress.success}
        errorCount={payrollProgress.error}
        totalCount={employeeCalculations.length}
      />
      <PagesHeader
        title={pageName}
        description={pageName ? `${pageName} in ${selectedCompany?.name} "Configuración del Período de Pago"` : "Cargando compañía..."}
        onExport={handleExport}
        
      />
      {/* Configuration Section */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={20} />
          <h3 className="text-lg font-semibold">Configuración del Período de Pago</h3>
        </div>
        <p className="text-gray-400 text-sm mb-6">Seleccione el tipo de período y las fechas para calcular la planilla</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Tipo de Período</label>
            <select
              value={payrollType}
              onChange={(e) => setPayrollType(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option>Quincenal (cada 15 días)</option>
              <option>Mensual</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Mes y Año</label>
            <input
              type="month"
              value={payrollDate.substring(0, 7)}
              onChange={(e) => setPayrollDate(e.target.value + "-01")}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {payrollType === "Quincenal (cada 15 días)" && (
            <div>
              <label className="block text-sm font-medium mb-2">Quincena</label>
              <select
                value={quincenal}
                onChange={(e) => setQuincenal(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option>Primera Quincena (1-15)</option>
                <option>Segunda Quincena (16-31)</option>
              </select>
            </div>
          )}
        </div>

      </div>

      {/* Active Employees Section */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
        <div className="border-gray-800 flex items-center justify-between text-sm bg-white bg-opacity-30 border rounded-lg py-2">
          <div className="flex w-full justify-center items-center gap-2 text-lg font-semibold text-center">
            <span className="text-white">Período:</span>
            <span className="font-medium text-blue-400">
              {quincenal === "Primera Quincena (1-15)"
                ? `1 - 15 de ${new Date(payrollDate).toLocaleDateString("es-PA", { month: "long", year: "numeric" })}`
                : `16 - 31 de ${new Date(payrollDate).toLocaleDateString("es-PA", { month: "long", year: "numeric" })}`}
            </span>
            <span className="text-gray-500">(15 días)</span>
          </div>
        </div>

        {isPeriodThirteenthMonth && (
          <div className="bg-green-900 bg-opacity-30 border border-green-600 rounded-lg p-4 mt-4">
            <div className="text-sm text-green-100 mb-2">⚠️ Período de Pago del Décimo Tercer Mes</div>
            <div className="text-lg font-bold text-green-300">{thirteenthMonthPeriod}</div>
            <div className="text-sm text-green-100 mt-2">
              Total acumulado a pagar: {formatCurrency(totalThirteenthMonth)}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <Users size={20} />
            <h3 className="text-lg font-semibold">Empleados Activos ({employeeCalculations.length})</h3>
          </div>
          <button
            onClick={generatePayrolls}
            className="px-4 mt-6 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            disabled={employeeCalculations.length === 0}
          >
            <Calculator size={20} />
            Guardar Nóminas
          </button>
        </div>

        <p className="text-gray-400 text-sm mb-6">
          Haz clic en el ícono de ojo para ver el desglose detallado de cada empleado.
        </p>

        {employeeCalculations.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p>No hay empleados en esta compañía</p>
          </div>
        ) : legalParams.length === 0 ? (
          <div className="bg-red-900 bg-opacity-30 border border-red-600 rounded-lg p-6 text-center">
            <AlertCircle className="mx-auto mb-3 text-red-400" size={32} />
            <h3 className="text-lg font-semibold text-red-300 mb-2">Parámetros Legales No Configurados</h3>
            <p className="text-red-100 mb-4">
              Los cálculos de nómina no serán posibles hasta que configure los parámetros legales del sistema.
            </p>
            <p className="text-sm text-red-200">
              Por favor contacte al administrador del sistema para configurar:
            </p>
            <ul className="text-sm text-red-200 mt-2 space-y-1">
              <li>• Tasa de SSS (Seguro Social)</li>
              <li>• Tramos de ISR (Impuesto sobre la Renta)</li>
              <li>• Otros parámetros fiscales requeridos</li>
            </ul>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left px-2 py-2 font-medium">Desglose</th>
                  <th className="text-left px-2 py-2 font-medium">Empleado</th>
                  <th className="text-left px-2 py-2 font-medium">Tipo</th>
                  <th className="text-left px-2 py-2 font-medium">Salario Base</th>
                  <th className="text-left px-2 py-2 font-medium">Horas Extras</th>
                  <th className="text-left px-2 py-2 font-medium">Bonificaciones</th>
                  <th className="text-left px-2 py-2 font-medium">Otros Ingresos</th>
                  <th className="text-left px-2 py-2 font-medium">Bruto</th>
                  <th className="text-left px-2 py-2 font-medium">SSS</th>
                  <th className="text-left px-2 py-2 font-medium">ISR</th>
                  <th className="text-right py-3 px-2 text-orange-400">Dctos. Fijos</th>
                  <th className="text-left px-2 py-2 font-medium">Otras Ret.</th>
                  <th className="text-left px-2 py-2 font-medium">Total Desc.</th>
                  <th className="text-left px-2 py-2 font-medium">Mensual Neto</th>
                  <th className="text-left px-2 py-2 font-medium">Quincenal Neto</th>
                  {isPeriodThirteenthMonth && <th className="text-left px-4 py-3 font-medium bg-green-900 bg-opacity-30">13° Mes Neto</th>}
                </tr>
              </thead>
              <tbody>
                {employeeCalculations.map((calc) => (
                  <tr key={calc.employeeId} className="border-b border-gray-700 hover:bg-gray-700 hover:bg-opacity-50">
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
                        className="font-medium cursor-pointer hover:underline"
                        href={`/${selectedCompany?.code}/employees/edit/${calc.employee?.id}`}
                      >
                        {calc.employee?.firstName} {calc.employee?.lastName}
                      </a>
                      <div className="text-xs text-gray-400">{calc.employee.cedula}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        calc.employee.salaryType === 'MONTHLY' 
                          ? 'bg-blue-900 text-blue-200' 
                          : 'bg-purple-900 text-purple-200'
                      }`}>
                        {calc.employee.salaryType === 'MONTHLY' ? 'Mensual' : 'Quincenal'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <input
                        type="number"
                        value={calc.baseSalary}
                        onChange={(e) =>
                          updateEmployeeCalc(calc.employeeId, "baseSalary", parseFloat(e.target.value) || 0)
                        }
                        className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <input
                        type="number"
                        value={calc.hoursExtra}
                        onChange={(e) =>
                          updateEmployeeCalc(calc.employeeId, "hoursExtra", parseFloat(e.target.value) || 0)
                        }
                        placeholder="0.00"
                        className="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <input
                        type="number"
                        value={calc.bonifications}
                        onChange={(e) =>
                          updateEmployeeCalc(calc.employeeId, "bonifications", parseFloat(e.target.value) || 0)
                        }
                        placeholder="0.00"
                        className="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <input
                        type="number"
                        value={calc.otherIncome}
                        onChange={(e) =>
                          updateEmployeeCalc(calc.employeeId, "otherIncome", parseFloat(e.target.value) || 0)
                        }
                        placeholder="0.00"
                        className="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-sm">{formatCurrency(calc.grossSalary)}</td>
                    <td className="px-4 py-3 text-sm">{formatCurrency(calc.sss)}</td>
                    <td className="px-4 py-3 text-sm">{formatCurrency(calc.isr)}</td>
                    <td className="py-3 px-2 text-right text-orange-400 font-medium">
                      {calc.recurringAmount > 0 ? `-${formatCurrency(calc.recurringAmount)}` : '$0.00'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <input
                        type="number"
                        value={calc.otherDeductions}
                        onChange={(e) =>
                          updateEmployeeCalc(calc.employeeId, "otherDeductions", parseFloat(e.target.value) || 0)
                        }
                        placeholder="0.00"
                        className="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">{formatCurrency(calc.totalDeductions)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-green-400">
                      {formatCurrency(calc.netSalaryMonthly)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-green-400">
                      {formatCurrency(calc.netSalaryBiweekly)}
                    </td>
                    {isPeriodThirteenthMonth && (
                      <td className="px-4 py-3 text-sm font-medium text-green-300 bg-green-900 bg-opacity-20">
                        {formatCurrency(calc.thirteenthMonth || 0)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-600 font-bold bg-gray-700 bg-opacity-50">
                  <td colSpan={3} className="px-4 py-3">
                    TOTALES
                  </td>
                  <td className="px-4 py-3">{formatCurrency(totalGrossSalary)}</td>
                  <td className="px-4 py-3">-</td>
                  <td className="px-4 py-3">-</td>
                  <td className="px-4 py-3">-</td>
                  <td className="px-4 py-3">{formatCurrency(totalGrossSalary)}</td>
                  <td className="px-4 py-3">{formatCurrency(totalSss)}</td>
                  <td className="px-4 py-3">{formatCurrency(totalIsr)}</td>
                  <td className="px-4 py-3">-</td>
                  <td className="px-4 py-3">-</td>
                  <td className="px-4 py-3">{formatCurrency(totalDeductions)}</td>
                  <td className="px-4 py-3 text-green-400">{formatCurrency(totalNetSalaryMonthly)}</td>
                  <td className="px-4 py-3 text-green-400">{formatCurrency(totalNetSalaryBiweekly)}</td>
                  {isPeriodThirteenthMonth && (
                    <td className="px-4 py-3 text-green-300 bg-green-900 bg-opacity-20">{formatCurrency(totalThirteenthMonth)}</td>
                  )}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Detalles */}
      {selectedEmployeeForDetails && (
        <DetailsModal
          calculation={employeeCalculations.find((c) => c.employeeId === selectedEmployeeForDetails)!}
          isOpen={true}
          onClose={() => setSelectedEmployeeForDetails(null)}
        />
      )}

      <PayrollInfo  
        sssRate={getSSSRate() || 2.87}
        isrTramos={isrTramos}
        defaultOpen={false}
      />

      <NotificationComponent 
        notification={notification} 
        onClose={() => setNotification((prev) => ({ ...prev, show: false }))}
      />

      {/* Alerta: Parámetros Legales No Configurados */}
      {(!validation.isValid && !isLoading) && (
      <div className="p-6 bg-red-900/20 border border-red-700 rounded-lg text-red-200">
        <h2 className="text-lg font-bold mb-2">⚠️ Configuración Incompleta</h2>
        <p className="mb-4 text-sm">
          No se pueden realizar cálculos de nómina porque faltan los siguientes parámetros legales o están inactivos:
        </p>
        <ul className="list-disc list-inside grid grid-cols-2 gap-2 text-xs font-mono">
          {validation.missing.map(key => (
            <li key={key} className="bg-red-900/40 p-1 rounded">{key}</li>
          ))}
        </ul>
        <button 
          onClick={() => {/* Redirigir a configuración */}}
          className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded text-sm transition-colors"
        >
          Configurar Parámetros Legales
        </button>
      </div>
      )}

      
    </div>
  )
}