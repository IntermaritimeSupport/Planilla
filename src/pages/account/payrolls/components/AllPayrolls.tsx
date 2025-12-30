"use client"

import { useState, useEffect, useCallback } from "react"
import useSWR, { mutate } from "swr"
import { Company, useCompany } from "../../../../context/routerContext"
import { Calendar, DollarSign, Users, AlertCircle } from "lucide-react"
import { exportToExcel } from "./ExportToExcel"
import PagesHeader from "../../../../components/headers/pagesHeader"
import { usePageName } from "../../../../hook/usePageName"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

// ==================== TYPES ====================
interface Employee {
  id: string
  cedula: string
  firstName: string
  lastName: string
  salary: number
}

interface LegalParameter {
  id?: string
  key: string
  value: {
    name: string
    type: "employee" | "employer"
    percentage: number
    effectiveDate: string
    status: "active" | "inactive"
    category: string
    range?: { min: number; max: number }
  }
}

interface PayrollCalculation {
  employeeId: string
  employee: Employee
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
  thirteenthMonth?: number
}

type NotificationType = "success" | "error"

interface Notification {
  type: NotificationType
  message: string
  show: boolean
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("es-PA", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

export const AllPayrolls: React.FC = () => {
  const { selectedCompany }: { selectedCompany: Company | null } = useCompany()
  const { pageName } = usePageName()
  // Fetch employees
  const { data: employees, isLoading: empLoading } = useSWR<Employee[]>(
    selectedCompany ? `${import.meta.env.VITE_API_URL}/api/payroll/employees?companyId=${selectedCompany.id}` : null,
    fetcher
  )

  // Fetch legal parameters
  const { data: legalParams } = useSWR<LegalParameter[]>(
    `${import.meta.env.VITE_API_URL}/api/system/config?category=legal_parameters`,
    fetcher,
    { revalidateOnFocus: false }
  )

  const [notification, setNotification] = useState<Notification>({ type: "success", message: "", show: false })

  // Configuración del período
  const [payrollType, setPayrollType] = useState("Quincenal (cada 15 días)")
  const [payrollDate, setPayrollDate] = useState(new Date().toISOString().split("T")[0])
  const [quincenal, setQuincenal] = useState("Primera Quincena (1-15)")

  // Datos de cálculo
  const [employeeCalculations, setEmployeeCalculations] = useState<PayrollCalculation[]>([])

  // Extraer tasas de parámetros legales
  const getSSSRate = useCallback(() => {
    if (!legalParams) return 8.75
    const sssParam = legalParams.find((p) => p.key === "legal_parameters_sss_employee")
    return parseFloat(String(sssParam?.value?.percentage || 8.75))
  }, [legalParams])

  // Obtener tramos de ISR desde la API
  const getISRTramos = useCallback(() => {
    if (!legalParams) return []
    return legalParams
      .filter((p) => p.value?.category === "isr")
      .map((p) => ({
        name: p.value?.name || "",
        percentage: parseFloat(String(p.value?.percentage || 0)),
        range: p.value?.range || { min: 0, max: 0 },
      }))
      .sort((a, b) => a.range.min - b.range.min)
  }, [legalParams])

  // Calcular ISR usando parámetros legales desde la API
  const calculateISR = useCallback(
    (income: number): number => {
      const annualIncome = Number(income) * 12
      const tramos = getISRTramos()

      if (tramos.length === 0) return 0

      let tax = 0
      let previousMax = 0

      for (const tramo of tramos) {
        if (annualIncome <= tramo.range.min) {
          break
        }

        const taxableInThisTramo = Math.min(annualIncome, tramo.range.max) - Math.max(previousMax, tramo.range.min)
        if (taxableInThisTramo > 0) {
          tax += (taxableInThisTramo * tramo.percentage) / 100
        }

        previousMax = tramo.range.max
      }

      return Number((tax / 12).toFixed(2))
    },
    [getISRTramos]
  )

  // Calcular Décimo Tercer Mes por período (4 meses)
  // Retorna: { period: string, grossAmount: number, sss: number, isr: number, netAmount: number }
  const calculateThirteenthMonthByPeriod = useCallback(
    (totalIncome: number, month: number): { period: string; grossAmount: number; sss: number; isr: number; netAmount: number } => {
      let period = ""
      let startMonth = 0
      let endMonth = 0

      // Determinar período según el mes actual
      if (month >= 3 && month <= 6) {
        // Abril (mes 3): período 16 dic - 15 abril
        period = "Primera Partida (16 dic - 15 abr)"
        startMonth = 11 // Diciembre del año anterior
        endMonth = 3 // Abril
      } else if (month >= 7 && month <= 9) {
        // Agosto (mes 7): período 16 abr - 15 agosto
        period = "Segunda Partida (16 abr - 15 ago)"
        startMonth = 3 // Abril
        endMonth = 7 // Agosto
      } else if (month === 11) {
        // Diciembre (mes 11): período 16 ago - 15 diciembre
        period = "Tercera Partida (16 ago - 15 dic)"
        startMonth = 7 // Agosto
        endMonth = 11 // Diciembre
      }

      // Cálculo: Suma de salarios / 12
      const grossAmount = Number((totalIncome / 12).toFixed(2))

      // SSS: 7.25% (diferente al 8.75% mensual)
      const sss = Number((grossAmount * 0.0725).toFixed(2))

      // ISR: Solo si ingresos anuales > 11,000
      const annualIncome = totalIncome
      let isr = 0
      if (annualIncome > 11000) {
        isr = calculateISR(grossAmount - sss)
      }

      const netAmount = Number((grossAmount - sss - isr).toFixed(2))

      return { period, grossAmount, sss, isr, netAmount }
    },
    [calculateISR]
  )

  // Recalcular cuando cambian employees o parámetros
  useEffect(() => {
    if (employees && employees.length > 0) {
      const sssRate = getSSSRate()
      const payrollMonth = new Date(payrollDate).getMonth()
      const isPeriodThirteenthMonth = payrollMonth === 3 || payrollMonth === 7 || payrollMonth === 11 // Abril, Agosto, Diciembre

      const calcs = employees.map((emp) => {
        const baseSalary = Number(emp.salary) || 0
        const hoursExtra = 0
        const bonifications = 0
        const otherIncome = 0

        const grossSalary = Number(baseSalary) + Number(hoursExtra) + Number(bonifications) + Number(otherIncome)
        const sss = Number((grossSalary * (sssRate / 100)).toFixed(2))
        const taxableIncome = Number(grossSalary) - Number(sss)
        const isr = calculateISR(taxableIncome)
        const otherDeductions = 0
        const totalDeductions = Number(sss) + Number(isr) + Number(otherDeductions)
        const netSalary = Number(grossSalary) - Number(totalDeductions)

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
        }

        // Si es período de pago del 13° mes (16 dic-15 abr, 16 abr-15 ago, 16 ago-15 dic)
        if (isPeriodThirteenthMonth) {
          // Para propósitos de demostración, usamos el salario base multiplicado por 4 meses
          // En producción, esto vendría de un historial de 4 meses
          const fourMonthsSalary = baseSalary * 4
          const thirteenthData = calculateThirteenthMonthByPeriod(fourMonthsSalary, payrollMonth)
          calc.thirteenthMonth = thirteenthData.netAmount
        }

        return calc
      })

      setEmployeeCalculations(calcs)
    }
  }, [employees, getSSSRate, calculateISR, calculateThirteenthMonthByPeriod, payrollDate])

  const updateEmployeeCalc = useCallback(
    (employeeId: string, field: string, value: number) => {
      setEmployeeCalculations((prev) =>
        prev.map((calc) => {
          if (calc.employeeId !== employeeId) return calc

          const updated = { ...calc, [field]: Number(value) || 0 }

          // Recalcular valores derivados
          const sssRate = getSSSRate()
          updated.grossSalary = Number(updated.baseSalary) + Number(updated.hoursExtra) + Number(updated.bonifications) + Number(updated.otherIncome)
          updated.sss = Number((updated.grossSalary * (sssRate / 100)).toFixed(2))
          updated.isr = calculateISR(updated.grossSalary - updated.sss)
          updated.totalDeductions = Number(updated.sss) + Number(updated.isr) + Number(updated.otherDeductions)
          updated.netSalary = Number(updated.grossSalary) - Number(updated.totalDeductions)

          // Recalcular décimo tercer mes si es período de pago
          const payrollMonth = new Date(payrollDate).getMonth()
          const isPeriodThirteenthMonth = payrollMonth === 3 || payrollMonth === 7 || payrollMonth === 11
          if (isPeriodThirteenthMonth) {
            const fourMonthsSalary = updated.baseSalary * 4
            const thirteenthData = calculateThirteenthMonthByPeriod(fourMonthsSalary, payrollMonth)
            updated.thirteenthMonth = thirteenthData.netAmount
          }

          return updated
        })
      )
    },
    [getSSSRate, calculateISR, calculateThirteenthMonthByPeriod, payrollDate]
  )

  const showNotification = (type: NotificationType, message: string) => {
    setNotification({ type, message, show: true })
    setTimeout(() => setNotification((prev) => ({ ...prev, show: false })), 5000)
  }

  const generatePayrolls = async () => {
    if (!selectedCompany) {
      showNotification("error", "Selecciona una compañía primero")
      return
    }

    try {
      let successCount = 0
      let errorCount = 0

      for (const calc of employeeCalculations) {
        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL}/api/payroll/payrolls/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              employeeId: calc.employeeId,
              payPeriod: payrollDate,
              paymentDate: new Date().toISOString().split("T")[0],
              baseSalary: calc.baseSalary,
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
        } catch (error) {
          console.error("Error:", error)
          errorCount++
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
    }
  }

  const handleExport = () => {
    exportToExcel({
      employeeCalculations,
      payrollDate,
      payrollType,
      quincenal,
      isPeriodThirteenthMonth,
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

  const thirteenthMonthPeriod = isApril ? "Primera Partida (16 dic - 15 abr)" : isAugust ? "Segunda Partida (16 abr - 15 ago)" : isDecember ? "Tercera Partida (16 ago - 15 dic)" : ""

  const totalGrossSalary = Number(employeeCalculations.reduce((sum, c) => sum + Number(c.grossSalary), 0).toFixed(2))
  const totalSss = Number(employeeCalculations.reduce((sum, c) => sum + Number(c.sss), 0).toFixed(2))
  const totalIsr = Number(employeeCalculations.reduce((sum, c) => sum + Number(c.isr), 0).toFixed(2))
  const totalDeductions = Number(employeeCalculations.reduce((sum, c) => sum + Number(c.totalDeductions), 0).toFixed(2))
  const totalNetSalary = Number(employeeCalculations.reduce((sum, c) => sum + Number(c.netSalary), 0).toFixed(2))
  const totalThirteenthMonth = isPeriodThirteenthMonth
    ? Number(employeeCalculations.reduce((sum, c) => sum + Number(c.thirteenthMonth || 0), 0).toFixed(2))
    : 0

  const isrTramos = getISRTramos()

  return (
    <div className="relative bg-gray-900 text-white min-h-screen">
      <PagesHeader
        title={pageName}
        description={pageName ? `${pageName} in ${selectedCompany?.name}` : "Cargando compañía..."}
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

        <div className="bg-blue-900 bg-opacity-30 border border-blue-600 rounded-lg p-4 mt-6">
          <div className="text-sm text-blue-100 mb-2">Período a Pagar</div>
          <div className="text-2xl font-bold text-blue-300 mb-2">
            {quincenal === "Primera Quincena (1-15)"
              ? `1 - 15 de ${new Date(payrollDate).toLocaleDateString("es-PA", { month: "long", year: "numeric" })}`
              : `16 - 31 de ${new Date(payrollDate).toLocaleDateString("es-PA", { month: "long", year: "numeric" })}`}
          </div>
          <div className="text-sm text-gray-300">15 días</div>
        </div>

        {isPeriodThirteenthMonth && (
          <div className="bg-green-900 bg-opacity-30 border border-green-600 rounded-lg p-4 mt-4">
            <div className="text-sm text-green-100 mb-2">⚠️ Período de Pago del Décimo Tercer Mes</div>
            <div className="text-lg font-bold text-green-300">
              {thirteenthMonthPeriod}
            </div>
            <div className="text-sm text-green-100 mt-2">
              Total acumulado a pagar: {formatCurrency(totalThirteenthMonth)}
              <br />
              <span className="text-xs">
                Cálculo: Suma de ingresos de 4 meses ÷ 12 = Monto Bruto → Se descuenta SSS 7.25% (sin educativo)
              </span>
            </div>
          </div>
        )}

        <button
          onClick={generatePayrolls}
          className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          disabled={employeeCalculations.length === 0}
        >
          <DollarSign size={20} />
          Calcular Planilla para {employeeCalculations.length} Empleado{employeeCalculations.length !== 1 ? "s" : ""}
        </button>
      </div>

      {/* Active Employees Section */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Users size={20} />
          <h3 className="text-lg font-semibold">Empleados Activos ({employeeCalculations.length})</h3>
        </div>
        <p className="text-gray-400 text-sm mb-6">
          Edite el salario base, horas extras, bonificaciones y otras retenciones. Los cálculos se actualizan automáticamente.
        </p>

        {employeeCalculations.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p>No hay empleados en esta compañía</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left px-4 py-3 font-medium">Empleado</th>
                  <th className="text-left px-4 py-3 font-medium">Salario Base</th>
                  <th className="text-left px-4 py-3 font-medium">Horas Extras ($)</th>
                  <th className="text-left px-4 py-3 font-medium">Bonificaciones ($)</th>
                  <th className="text-left px-4 py-3 font-medium">Otros Ingresos ($)</th>
                  <th className="text-left px-4 py-3 font-medium">Salario Bruto</th>
                  <th className="text-left px-4 py-3 font-medium">SSS</th>
                  <th className="text-left px-4 py-3 font-medium">ISR</th>
                  <th className="text-left px-4 py-3 font-medium">Otras Retenciones ($)</th>
                  <th className="text-left px-4 py-3 font-medium">Total Retenciones</th>
                  <th className="text-left px-4 py-3 font-medium">Salario Neto</th>
                  {isPeriodThirteenthMonth && <th className="text-left px-4 py-3 font-medium bg-green-900 bg-opacity-30">13° Mes Neto</th>}
                </tr>
              </thead>
              <tbody>
                {employeeCalculations.map((calc) => (
                  <tr key={calc.employeeId} className="border-b border-gray-700 hover:bg-gray-700 hover:bg-opacity-50">
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium">
                        {calc.employee.firstName} {calc.employee.lastName}
                      </div>
                      <div className="text-xs text-gray-400">{calc.employee.cedula}</div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={calc.baseSalary}
                        onChange={(e) =>
                          updateEmployeeCalc(calc.employeeId, "baseSalary", parseFloat(e.target.value) || 0)
                        }
                        className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={calc.hoursExtra}
                        onChange={(e) =>
                          updateEmployeeCalc(calc.employeeId, "hoursExtra", parseFloat(e.target.value) || 0)
                        }
                        placeholder="0.00"
                        className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={calc.bonifications}
                        onChange={(e) =>
                          updateEmployeeCalc(calc.employeeId, "bonifications", parseFloat(e.target.value) || 0)
                        }
                        placeholder="0.00"
                        className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={calc.otherIncome}
                        onChange={(e) =>
                          updateEmployeeCalc(calc.employeeId, "otherIncome", parseFloat(e.target.value) || 0)
                        }
                        placeholder="0.00"
                        className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-sm">{formatCurrency(calc.grossSalary)}</td>
                    <td className="px-4 py-3 text-sm">{formatCurrency(calc.sss)}</td>
                    <td className="px-4 py-3 text-sm">{formatCurrency(calc.isr)}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={calc.otherDeductions}
                        onChange={(e) =>
                          updateEmployeeCalc(calc.employeeId, "otherDeductions", parseFloat(e.target.value) || 0)
                        }
                        placeholder="0.00"
                        className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">{formatCurrency(calc.totalDeductions)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-green-400">{formatCurrency(calc.netSalary)}</td>
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
                  <td colSpan={5} className="px-4 py-3">
                    TOTALES
                  </td>
                  <td className="px-4 py-3">{formatCurrency(totalGrossSalary)}</td>
                  <td className="px-4 py-3">{formatCurrency(totalSss)}</td>
                  <td className="px-4 py-3">{formatCurrency(totalIsr)}</td>
                  <td className="px-4 py-3">-</td>
                  <td className="px-4 py-3">{formatCurrency(totalDeductions)}</td>
                  <td className="px-4 py-3 text-green-400">{formatCurrency(totalNetSalary)}</td>
                  {isPeriodThirteenthMonth && (
                    <td className="px-4 py-3 text-green-300 bg-green-900 bg-opacity-20">{formatCurrency(totalThirteenthMonth)}</td>
                  )}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="bg-blue-900 bg-opacity-20 border border-blue-600 rounded-lg p-6 mb-8">
        <div className="flex gap-3">
          <AlertCircle className="flex-shrink-0 text-blue-400" size={24} />
          <div>
            <h4 className="font-semibold text-blue-300 mb-2">Información sobre Cálculos Panameños</h4>
            <ul className="text-sm text-blue-100 space-y-2">
              <li>
                • <strong>SSS (Seguro Social):</strong> {(getSSSRate() || 8.75).toFixed(2)}% del salario bruto
              </li>
              <li>
                • <strong>ISR (Impuesto sobre la Renta):</strong> Escala fiscal dinámica desde parámetros
                {isrTramos.length > 0 && (
                  <ul className="ml-6 mt-1 space-y-1">
                    {isrTramos.map((tramo, idx) => (
                      <li key={idx} className="text-xs">
                        {tramo.name}: {tramo.percentage}% (${tramo.range.min.toLocaleString()} - $
                        {tramo.range.max.toLocaleString()})
                      </li>
                    ))}
                  </ul>
                )}
              </li>
              <li>
                • <strong>Décimo Tercer Mes:</strong> Se calcula como (Salario Total Anual) / 12. Se paga en diciembre
                automáticamente cuando se detecta el mes de diciembre.
              </li>
              <li>• <strong>Fondo de Pensión:</strong> 10.75% (aporte patronal, no se descuenta del empleado)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Notification */}
      {notification.show && (
        <div
          className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4 rounded-lg p-4 shadow-lg border ${notification.type === "success"
            ? "bg-green-800 border-green-600 text-green-100"
            : "bg-red-800 border-red-600 text-red-100"
            }`}
        >
          <p className="text-sm font-medium">{notification.message}</p>
        </div>
      )}
    </div>
  )
}