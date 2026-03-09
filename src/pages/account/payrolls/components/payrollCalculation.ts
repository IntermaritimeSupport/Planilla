

export interface LegalParameter {
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

export interface ISRTramo {
  name: string
  percentage: number
  minRange: number
  maxRange: number
}

export interface Employee {
  id: string
  cedula: string
  firstName: string
  lastName: string
  salary: number
  salaryType: "MONTHLY" | "BIWEEKLY"
}

export interface PayrollCalculation {
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
  netSalaryMonthly: number
  netSalaryBiweekly: number
  thirteenthMonth?: number
}

// Obtener tasa SSS
export const getSSSRate = (legalParams: LegalParameter[]): number => {
  if (!legalParams || legalParams.length === 0) return 2.87
  const sssParam = legalParams.find(
    (p) => p.category === "social_security" && p.type === "employee" && p.status === "active"
  )
  return sssParam?.percentage || 2.87
}

// Obtener tramos ISR
export const getISRRates = (legalParams: LegalParameter[]): ISRTramo[] => {
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
}

// Calcular ISR mensual
export const calculateISR = (monthlyIncome: number, tramos: ISRTramo[]): number => {
  const annualIncome = monthlyIncome * 12

  if (tramos.length === 0) return 0

  let tax = 0

  for (const tramo of tramos) {
    if (annualIncome <= tramo.minRange) {
      continue
    }

    const rangeStart = Math.max(annualIncome, tramo.minRange)
    const rangeEnd = Math.min(annualIncome, tramo.maxRange)
    
    if (rangeEnd > rangeStart) {
      const taxableInThisTramo = rangeEnd - rangeStart
      tax += (taxableInThisTramo * tramo.percentage) / 100
    }
  }

  return Number((tax / 12).toFixed(2))
}

// Normalizar salario a base mensual
export const getNormalizedMonthlySalary = (employee: Employee): number => {
  const salary = Number(employee.salary) || 0
  if (employee.salaryType === "MONTHLY") {
    return salary
  } else {
    return (salary * 26) / 12
  }
}

// Calcular décimo tercer mes por período
// ─────────────────────────────────────────────────────────────────
// CORRECCIÓN: getMonth() devuelve índice 0-based (0=ene … 11=dic)
//   • Abril  = índice 3  → Primera Partida  (pago en abril)
//   • Agosto = índice 7  → Segunda Partida  (pago en agosto)
//   • Diciembre = índice 11 → Tercera Partida (pago en diciembre)
//
// SSS del décimo: 7.25 % recibido como parámetro (no hardcodeado)
// ISR del décimo: solo si ingreso anual > B/. 11,000 (Art. 700 CF)
// ─────────────────────────────────────────────────────────────────
export const calculateThirteenthMonthByPeriod = (
  totalIncome: number,
  month: number,                               // 0-based (getMonth())
  calculateISRFunction: (income: number) => number,
  ssDecimoRate: number = 7.25                  // % desde legal-parameters (ss_decimo)
): {
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

  // mes 3 = abril  → Primera Partida
  if (month === 3) {
    period = "Primera Partida (16 dic - 15 abr)"
    startMonth = 11   // diciembre
    endMonth = 3      // abril
  // mes 7 = agosto → Segunda Partida
  } else if (month === 7) {
    period = "Segunda Partida (16 abr - 15 ago)"
    startMonth = 3    // abril
    endMonth = 7      // agosto
  // mes 11 = diciembre → Tercera Partida
  } else if (month === 11) {
    period = "Tercera Partida (16 ago - 15 dic)"
    startMonth = 7    // agosto
    endMonth = 11     // diciembre
  }

  // Monto bruto = total del período / 12
  const grossAmount = Number((totalIncome / 12).toFixed(2))

  // SSS = tasa dinámica desde BD (default 7.25 %)
  const sss = Number((grossAmount * (ssDecimoRate / 100)).toFixed(2))

  // ISR solo si ingreso anual > B/. 11,000  (Código Fiscal Art. 700)
  const annualIncome = totalIncome
  let isr = 0
  if (annualIncome > 11000) {
    isr = calculateISRFunction(grossAmount - sss)
  }

  const netAmount = Number((grossAmount - sss - isr).toFixed(2))

  return { period, grossAmount, sss, isr, netAmount, startMonth, endMonth }
}

// Calcular nómina individual
export const calculateEmployeePayroll = (
  employee: Employee,
  baseSalary: number,
  hoursExtra: number,
  bonifications: number,
  otherIncome: number,
  otherDeductions: number,
  sssRate: number,
  calculateISRFunction: (income: number) => number,
  payrollMonth: number,
  calculateThirteenthFunction: (income: number, month: number, ssRate?: number) => any,
  ssDecimoRate: number = 7.25   // tasa SS del décimo desde BD (ss_decimo)
): PayrollCalculation => {
  const grossSalary = Number((baseSalary + hoursExtra + bonifications + otherIncome).toFixed(2))
  const sss = Number((grossSalary * (sssRate / 100)).toFixed(2))
  const taxableIncome = Number((grossSalary - sss).toFixed(2))
  const isr = calculateISRFunction(taxableIncome)
  const totalDeductions = Number((sss + isr + otherDeductions).toFixed(2))
  const netSalary = Number((grossSalary - totalDeductions).toFixed(2))

  const netSalaryMonthly = netSalary
  const netSalaryBiweekly = Number((netSalary / 2).toFixed(2))

  const calc: PayrollCalculation = {
    employeeId: employee.id,
    employee,
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
  }

  // Meses exactos de pago del décimo: abril(3), agosto(7), diciembre(11)
  const isPeriodThirteenthMonth = payrollMonth === 3 || payrollMonth === 7 || payrollMonth === 11
  if (isPeriodThirteenthMonth) {
    // Base = 4 meses del período (aproximación estándar cuando no hay historial de ingresos)
    const fourMonthsSalary = baseSalary * 4
    const thirteenthData = calculateThirteenthFunction(fourMonthsSalary, payrollMonth, ssDecimoRate)
    calc.thirteenthMonth = thirteenthData.netAmount
  }

  return calc
}

// Calcular todas las nóminas
export const calculateAllPayrolls = (
  employees: Employee[],
  legalParams: LegalParameter[],
  payrollDate: string,
  overrides: Record<string, Partial<any>>
): PayrollCalculation[] => {
  if (!legalParams || legalParams.length === 0) {
    return []
  }

  if (!employees || employees.length === 0) return []

  const sssRate = getSSSRate(legalParams)
  const isrTramos = getISRRates(legalParams)

  // Tasa SS del décimo desde BD (key: ss_decimo) — default 7.25 %
  const ssDecimoParam = legalParams.find(
    (p) => p.key === "ss_decimo" && p.status === "active"
  )
  const ssDecimoRate = ssDecimoParam?.percentage ?? 7.25

  // CORRECCIÓN: getMonth() devuelve 0-based; abril=3, agosto=7, diciembre=11
  const payrollMonth = new Date(payrollDate).getMonth()

  const calculateISRForEmployee = (income: number) => calculateISR(income, isrTramos)
  const calculateThirteenthForEmployee = (income: number, month: number, ssRate?: number) =>
    calculateThirteenthMonthByPeriod(income, month, calculateISRForEmployee, ssRate ?? ssDecimoRate)

  return employees.map((emp) => {
    const normalizedMonthlySalary = getNormalizedMonthlySalary(emp)
    
    const baseSalary = overrides[emp.id]?.baseSalary !== undefined 
      ? overrides[emp.id].baseSalary 
      : normalizedMonthlySalary
    
    const hoursExtra = overrides[emp.id]?.hoursExtra || 0
    const bonifications = overrides[emp.id]?.bonifications || 0
    const otherIncome = overrides[emp.id]?.otherIncome || 0
    const otherDeductions = overrides[emp.id]?.otherDeductions || 0

    return calculateEmployeePayroll(
      emp,
      baseSalary,
      hoursExtra,
      bonifications,
      otherIncome,
      otherDeductions,
      sssRate,
      calculateISRForEmployee,
      payrollMonth,
      calculateThirteenthForEmployee,
      ssDecimoRate
    )
  })
}

// Calcular totales
export const calculateTotals = (calculations: PayrollCalculation[], isPeriodThirteenthMonth: boolean) => {
  const totalGrossSalary = Number(
    calculations.reduce((sum, c) => sum + Number(c.grossSalary), 0).toFixed(2)
  )
  const totalSss = Number(calculations.reduce((sum, c) => sum + Number(c.sss), 0).toFixed(2))
  const totalIsr = Number(calculations.reduce((sum, c) => sum + Number(c.isr), 0).toFixed(2))
  const totalDeductions = Number(
    calculations.reduce((sum, c) => sum + Number(c.totalDeductions), 0).toFixed(2)
  )
  const totalNetSalaryMonthly = Number(
    calculations.reduce((sum, c) => sum + Number(c.netSalaryMonthly), 0).toFixed(2)
  )
  const totalNetSalaryBiweekly = Number(
    calculations.reduce((sum, c) => sum + Number(c.netSalaryBiweekly), 0).toFixed(2)
  )
  const totalThirteenthMonth = isPeriodThirteenthMonth
    ? Number(calculations.reduce((sum, c) => sum + Number(c.thirteenthMonth || 0), 0).toFixed(2))
    : 0

  return {
    totalGrossSalary,
    totalSss,
    totalIsr,
    totalDeductions,
    totalNetSalaryMonthly,
    totalNetSalaryBiweekly,
    totalThirteenthMonth,
  }
}