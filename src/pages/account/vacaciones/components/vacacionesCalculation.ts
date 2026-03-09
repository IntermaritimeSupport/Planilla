// ─────────────────────────────────────────────────────────────────────────────
// vacacionesCalculation.ts
// Lógica de cálculo de vacaciones según ley panameña vigente
//
// FUNDAMENTO LEGAL:
//   Código de Trabajo de Panamá — Artículos 54 al 60
//   • Derecho: 30 días calendario por cada 11 meses de trabajo continuo
//   • Proporcional: (días_trabajados / 365) × 30 días
//   • Salario de vacaciones: promedio del último año (o del tiempo trabajado)
//   • SS del pago de vacaciones: 9.75 % empleado
//   • Seguro Educativo: 1.25 % empleado
//   • ISR: aplica sobre el monto bruto de vacaciones
// ─────────────────────────────────────────────────────────────────────────────

export interface VacacionesEmployee {
  id: string
  cedula: string
  firstName: string
  lastName: string
  position?: string
  department?: string
  salary: number
  salaryType: "MONTHLY" | "BIWEEKLY"
  hireDate: string | Date
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "TERMINATED"
}

export interface VacacionesLegalParam {
  key: string
  category: string
  percentage: number
  minRange?: number | null
  maxRange?: number | null
  status: "active" | "inactive"
}

export interface VacacionesCalc {
  employeeId: string
  employee: VacacionesEmployee

  // Antigüedad
  hireDate: Date
  daysWorked: number          // días calendario desde ingreso
  monthsWorked: number        // meses completos trabajados
  yearsWorked: number         // años completos

  // Días de vacaciones
  daysEarned: number          // días proporcionales ganados (total acumulado)
  daysPerYear: number         // siempre 30 (ley panamá)
  nextVacationDays: number    // días que le corresponden en el próximo período

  // Salario base mensual normalizado
  monthlyBaseSalary: number

  // Pago de vacaciones
  dailySalary: number         // salario diario = mensual / 30
  grossVacationPay: number    // salario diario × días ganados proporcionales

  // Deducciones
  ss: number                  // 9.75 % empleado
  se: number                  // 1.25 % seguro educativo
  isr: number                 // ISR proporcional

  // Neto
  totalDeductions: number
  netVacationPay: number

  // Clasificación
  status: "pendiente" | "disponible" | "parcial"
  // disponible = cumplió 11 meses (período completo)
  // parcial    = menos de 11 meses (proporcional)
  // pendiente  = menos de 3 meses (muy reciente)
}

export interface VacacionesTotals {
  totalEmpleados: number
  totalDiasGanados: number
  totalBruto: number
  totalSS: number
  totalSE: number
  totalISR: number
  totalNeto: number
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export const getMonthlySalary = (emp: VacacionesEmployee): number => {
  const s = Number(emp.salary) || 0
  return emp.salaryType === "BIWEEKLY" ? s * 2 : s
}

export const getDailySalary = (monthlyGross: number): number => {
  // Día laboral = salario mensual / 30 (estándar legal panameño)
  return Number((monthlyGross / 30).toFixed(4))
}

export const calcDaysWorked = (hireDate: Date, refDate: Date): number => {
  const ms = refDate.getTime() - hireDate.getTime()
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)))
}

export const calcMonthsWorked = (hireDate: Date, refDate: Date): number => {
  const years = refDate.getFullYear() - hireDate.getFullYear()
  const months = refDate.getMonth() - hireDate.getMonth()
  const days = refDate.getDate() - hireDate.getDate()
  let total = years * 12 + months
  if (days < 0) total -= 1
  return Math.max(0, total)
}

// Días proporcionales ganados (base 30 días/año)
// Fórmula: (días_trabajados / 365) × 30
export const calcProportionalDays = (daysWorked: number): number => {
  return Number(((daysWorked / 365) * 30).toFixed(2))
}

// ─────────────────────────────────────────────────────────────────────────────
// ISR PROGRESIVO (idéntico al resto del sistema)
// ─────────────────────────────────────────────────────────────────────────────

export const calculateISRForVacaciones = (
  grossVacationPay: number,
  legalParams: VacacionesLegalParam[]
): number => {
  const isrRates = legalParams
    .filter(p => p.category === "isr" && p.status === "active")
    .sort((a, b) => Number(a.minRange ?? 0) - Number(b.minRange ?? 0))

  if (isrRates.length === 0) return 0

  // Anualizar el pago de vacaciones para ubicar en tramo correcto
  const annualEquivalent = grossVacationPay * 12
  let annualISR = 0

  for (const rate of isrRates) {
    const min = Number(rate.minRange ?? 0)
    const max = rate.maxRange ? Number(rate.maxRange) : Infinity
    const pct = Number(rate.percentage) / 100

    if (annualEquivalent > min) {
      const taxable = Math.min(annualEquivalent, max) - min
      annualISR += taxable * pct
    }
  }

  // Retención proporcional al monto real (no mensual)
  const monthlyISR = annualISR / 12
  // Proporción: ISR del período = (vacPay / mensual) × ISR mensual
  // Si vacPay es menor al mensual, aplica proporcionalmente
  return Number(monthlyISR.toFixed(2))
}

// ─────────────────────────────────────────────────────────────────────────────
// CÁLCULO INDIVIDUAL
// ─────────────────────────────────────────────────────────────────────────────

export const calculateEmployeeVacaciones = (
  employee: VacacionesEmployee,
  legalParams: VacacionesLegalParam[],
  referenceDate: Date = new Date()
): VacacionesCalc => {
  const hireDate = new Date(employee.hireDate)
  const daysWorked = calcDaysWorked(hireDate, referenceDate)
  const monthsWorked = calcMonthsWorked(hireDate, referenceDate)
  const yearsWorked = Math.floor(monthsWorked / 12)

  const daysPerYear = 30 // Ley Art. 54 — 30 días calendario

  // Días proporcionales ganados al día de hoy
  const daysEarned = calcProportionalDays(daysWorked)

  // Días que corresponden al próximo período completo (si cumple 11 meses)
  const nextVacationDays = monthsWorked >= 11 ? daysPerYear : Math.floor(daysEarned)

  // Salario mensual normalizado
  const monthlyBaseSalary = getMonthlySalary(employee)
  const dailySalary = getDailySalary(monthlyBaseSalary)

  // Pago bruto = días proporcionales × salario diario
  const grossVacationPay = Number((daysEarned * dailySalary).toFixed(2))

  // Deducciones (sobre el bruto de vacaciones)
  const ssRate = legalParams.find(
    p => p.key === "ss_empleado" && p.status === "active"
  )?.percentage ?? 9.75

  const seRate = legalParams.find(
    p => p.key === "se_empleado" && p.status === "active"
  )?.percentage ?? 1.25

  const ss = Number((grossVacationPay * (ssRate / 100)).toFixed(2))
  const se = Number((grossVacationPay * (seRate / 100)).toFixed(2))
  const isr = calculateISRForVacaciones(grossVacationPay, legalParams)

  const totalDeductions = Number((ss + se + isr).toFixed(2))
  const netVacationPay = Number((grossVacationPay - totalDeductions).toFixed(2))

  // Estado
  let status: VacacionesCalc["status"] = "pendiente"
  if (monthsWorked >= 11) status = "disponible"
  else if (monthsWorked >= 3) status = "parcial"

  return {
    employeeId: employee.id,
    employee,
    hireDate,
    daysWorked,
    monthsWorked,
    yearsWorked,
    daysEarned,
    daysPerYear,
    nextVacationDays,
    monthlyBaseSalary,
    dailySalary,
    grossVacationPay,
    ss,
    se,
    isr,
    totalDeductions,
    netVacationPay,
    status,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CALCULAR TODAS
// ─────────────────────────────────────────────────────────────────────────────

export const calculateAllVacaciones = (
  employees: VacacionesEmployee[],
  legalParams: VacacionesLegalParam[],
  referenceDate: Date = new Date()
): VacacionesCalc[] => {
  if (!employees || employees.length === 0) return []
  if (!legalParams || legalParams.length === 0) return []

  return employees
    .filter(emp => emp.status === "ACTIVE" || emp.status === "SUSPENDED")
    .map(emp => calculateEmployeeVacaciones(emp, legalParams, referenceDate))
}

// ─────────────────────────────────────────────────────────────────────────────
// TOTALES
// ─────────────────────────────────────────────────────────────────────────────

export const calcVacacionesTotals = (calcs: VacacionesCalc[]): VacacionesTotals => {
  return calcs.reduce(
    (acc, c) => ({
      totalEmpleados: acc.totalEmpleados + 1,
      totalDiasGanados: Number((acc.totalDiasGanados + c.daysEarned).toFixed(2)),
      totalBruto: Number((acc.totalBruto + c.grossVacationPay).toFixed(2)),
      totalSS: Number((acc.totalSS + c.ss).toFixed(2)),
      totalSE: Number((acc.totalSE + c.se).toFixed(2)),
      totalISR: Number((acc.totalISR + c.isr).toFixed(2)),
      totalNeto: Number((acc.totalNeto + c.netVacationPay).toFixed(2)),
    }),
    { totalEmpleados: 0, totalDiasGanados: 0, totalBruto: 0, totalSS: 0, totalSE: 0, totalISR: 0, totalNeto: 0 }
  )
}
