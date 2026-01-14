import * as XLSX from "xlsx"

type SalaryType = "MONTHLY" | "BIWEEKLY"

interface RecurringDeduction {
  id: string
  name: string
  amount: string | number // Viene como string del JSON
  frequency: "ALWAYS" | "FIRST_QUINCENA" | "SECOND_QUINCENA"
  isActive: boolean
}

interface Employee {
  id: string
  cedula: string
  firstName: string
  lastName: string
  salary: number
  salaryType: SalaryType // NUEVO: tipo de salario
    recurringDeductions?: RecurringDeduction[]
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
  recurringAmount: number
}

interface ExportParams {
  employeeCalculations: PayrollCalculation[]
  payrollDate: string
  payrollType: string
  quincenal?: string
  isPeriodThirteenthMonth?: boolean
}

export const exportToExcel = (params: ExportParams) => {
  const {
    employeeCalculations,
    payrollDate,
    payrollType,
    quincenal,
    isPeriodThirteenthMonth = false,
  } = params

  if (employeeCalculations.length === 0) {
    alert("No hay datos de empleados para exportar")
    return
  }

  // Crear workbook
  const wb = XLSX.utils.book_new()

  // ==================== HOJA 1: PLANILLA ====================
  const payrollData = employeeCalculations.map((calc) => ({
    "Cédula": calc.employee.cedula,
    "Nombre": `${calc.employee.firstName} ${calc.employee.lastName}`,
    "Salario Base": calc.baseSalary,
    "Horas Extras": calc.hoursExtra,
    "Bonificaciones": calc.bonifications,
    "Otros Ingresos": calc.otherIncome,
    "Salario Bruto": calc.grossSalary,
    "SSS (8.75%)": calc.sss,
    "ISR": calc.isr,
    "Descuentos fijos":calc.recurringAmount,
    "Otras Retenciones": calc.otherDeductions,
    "Total Retenciones": calc.totalDeductions,
    "Salario Neto": calc.netSalary,
    ...(isPeriodThirteenthMonth && { "13° Mes Neto": calc.thirteenthMonth || 0 }),
  }))

  // Calcular totales
  const totalBaseSalary = payrollData.reduce((sum, row) => sum + (row["Salario Base"] || 0), 0)
  const totalHoursExtra = payrollData.reduce((sum, row) => sum + (row["Horas Extras"] || 0), 0)
  const totalBonifications = payrollData.reduce((sum, row) => sum + (row["Bonificaciones"] || 0), 0)
  const totalOtherIncome = payrollData.reduce((sum, row) => sum + (row["Otros Ingresos"] || 0), 0)
  const totalGrossSalary = payrollData.reduce((sum, row) => sum + (row["Salario Bruto"] || 0), 0)
  const totalSss = payrollData.reduce((sum, row) => sum + (row["SSS (8.75%)"] || 0), 0)
  const totalIsr = payrollData.reduce((sum, row) => sum + (row["ISR"] || 0), 0)
  const totalDescuentos = payrollData.reduce((sum, row) => sum + (row["Descuentos fijos"] || 0), 0)
  const totalOtherDeductions = payrollData.reduce((sum, row) => sum + (row["Otras Retenciones"] || 0), 0)
  const totalDeductions = payrollData.reduce((sum, row) => sum + (row["Total Retenciones"] || 0), 0)
  const totalNetSalary = payrollData.reduce((sum, row) => sum + (row["Salario Neto"] || 0), 0)
  const totalThirteenthMonth = isPeriodThirteenthMonth
    ? payrollData.reduce((sum, row) => sum + (row["13° Mes Neto"] || 0), 0)
    : 0

  // Fila de totales
  const totalsRow = {
    "Cédula": "TOTALES",
    "Nombre": "",
    "Salario Base": totalBaseSalary,
    "Horas Extras": totalHoursExtra,
    "Bonificaciones": totalBonifications,
    "Otros Ingresos": totalOtherIncome,
    "Salario Bruto": totalGrossSalary,
    "SSS (8.75%)": totalSss,
    "ISR": totalIsr,
    "Total Descuentos": totalDescuentos,
    "Otras Retenciones": totalOtherDeductions,
    "Total Retenciones": totalDeductions,
    "Salario Neto": totalNetSalary,
    ...(isPeriodThirteenthMonth && { "13° Mes Neto": totalThirteenthMonth }),
  }

  // Crear sheet de planilla
  const wsPayroll = XLSX.utils.json_to_sheet(payrollData)
  
  // Configurar ancho de columnas
  const columns = [
    { wch: 15 }, // Cédula
    { wch: 25 }, // Nombre
    { wch: 13 }, // Salario Base
    { wch: 12 }, // Horas Extras
    { wch: 14 }, // Bonificaciones
    { wch: 13 }, // Otros Ingresos
    { wch: 13 }, // Salario Bruto
    { wch: 12 }, // SSS
    { wch: 12 }, // ISR
    { wch: 15 }, // Descuentos fijos
    { wch: 14 }, // Otras Retenciones
    { wch: 14 }, // Total Retenciones
    { wch: 13 }, // Salario Neto
  ]

  if (isPeriodThirteenthMonth) {
    columns.push({ wch: 13 }) // 13° Mes
  }

  wsPayroll["!cols"] = columns

  // Agregar fila de totales
  // const payrollDataWithTotals = [...payrollData, totalsRow]
  XLSX.utils.sheet_add_json(wsPayroll, [totalsRow], { origin: payrollData.length + 1 })

  // ==================== HOJA 2: RESUMEN ====================
  const summaryData = [
    ["RESUMEN DE PLANILLA"],
    [],
    ["Período:", payrollType === "Mensual" ? "Mensual" : `Quincenal - ${quincenal}`],
    ["Fecha:", new Date(payrollDate).toLocaleDateString("es-PA")],
    ["Cantidad de Empleados:", employeeCalculations.length],
    [],
    ["INGRESOS"],
    ["Total Salarios Base", totalBaseSalary],
    ["Total Horas Extras", totalHoursExtra],
    ["Total Bonificaciones", totalBonifications],
    ["Total Otros Ingresos", totalOtherIncome],
    ["Total Salario Bruto", totalGrossSalary],
    [],
    ["DEDUCCIONES"],
    ["Total SSS (8.75%)", totalSss],
    ["Total ISR", totalIsr],
    ["Total Descuentos fijos", totalDescuentos],
    ["Total Otras Retenciones", totalOtherDeductions],
    ["Total Deducciones", totalDeductions],
    [],
    ["NETO A PAGAR", totalNetSalary],
    ...(isPeriodThirteenthMonth
      ? [
          [],
          ["DÉCIMO TERCER MES"],
          ["Total 13° Mes Neto", totalThirteenthMonth],
          [],
          ["TOTAL PAGO INCLUYENDO 13°", totalNetSalary + totalThirteenthMonth],
        ]
      : []),
  ]

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)
  wsSummary["!cols"] = [{ wch: 35 }, { wch: 15 }]

  // Agregar hojas al workbook
  XLSX.utils.book_append_sheet(wb, wsPayroll, "Planilla")
  XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen")

  // Generar nombre de archivo
  const dateObj = new Date(payrollDate)
  const monthName = dateObj.toLocaleDateString("es-PA", { month: "long", year: "numeric" })
  const fileName = `Planilla_${monthName.replace(" ", "_")}.xlsx`

  // Descargar archivo
  XLSX.writeFile(wb, fileName)
}