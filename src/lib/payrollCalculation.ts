/**
 * src/lib/payrollCalculation.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * FUENTE ÚNICA DE VERDAD PARA CÁLCULOS DE NÓMINA PANAMEÑA
 *
 * MECÁNICA DEL ISR EN PANAMÁ (Código Fiscal Art. 700 y 701):
 *
 *   1. BASE ANUAL GRAVABLE = salario mensual × 13
 *      (12 meses de salario regular + 1 décimo tercer mes)
 *
 *   2. RETENCIÓN: el ISR NO se paga en un solo momento anual.
 *      Se RETIENE EN LA FUENTE en cada período de pago:
 *        - Nómina MENSUAL   → se retiene 1 vez/mes   → ISR anual ÷ 12
 *        - Nómina QUINCENAL → se retiene cada 15 días → ISR anual ÷ 24
 *          (quincena 1 retenida + quincena 2 retenida = pago mensual a la DGI)
 *
 *   3. PAGO A LA DGI: el empleador declara y PAGA MENSUALMENTE
 *      la suma de lo retenido a todos sus empleados en ese mes.
 *        - Nómina quincenal: Q1 + Q2 del mes = lo que se entrega a la DGI.
 *        - Nómina mensual:   lo retenido en ese único pago del mes.
 *
 *   RESULTADO: calcISRPorPeriodo() devuelve la RETENCIÓN de ESE período
 *   (quincena o mes). Es lo que se descuenta al empleado en ese pago.
 *   El módulo SIPE acumula el total mensual para el reporte a la CSS/DGI.
 *
 * SS empleado:  9.75% del bruto  (ss_empleado en legal-parameters)
 * Seg. Educ.:   1.25% del bruto  (se_empleado en legal-parameters)
 * SS Décimo:    7.25%            (ss_decimo   en legal-parameters)
 *
 * TRAMOS ISR (Código Fiscal Art. 700):
 *   0       – 11,000    → 0%
 *   11,001  – 50,000    → 15%
 *   50,001  – ∞         → 25%
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

export interface LegalParameter {
  id: string
  key: string
  name: string
  type: 'employee' | 'employer' | 'fixed'
  category: 'social_security' | 'educational_insurance' | 'isr' | 'other'
  percentage: number
  minRange?: number
  maxRange?: number
  status: 'active' | 'inactive'
  effectiveDate: string
  description?: string
}

export interface ISRTramo {
  name: string
  percentage: number   // 0, 15, 25
  minRange: number
  maxRange: number
}

export interface Employee {
  id: string
  cedula: string
  firstName: string
  lastName: string
  salary: number
  salaryType: 'MONTHLY' | 'BIWEEKLY'
  department?: string
  position?: string
}

export interface RecurringDeduction {
  id: string
  name: string
  amount: string | number
  frequency: 'ALWAYS' | 'FIRST_QUINCENA' | 'SECOND_QUINCENA'
  isActive: boolean
}

export interface EmployeeWithDeductions extends Employee {
  recurringDeductions?: RecurringDeduction[]
}

export interface PayrollCalculation {
  employeeId: string
  employee: EmployeeWithDeductions
  baseSalary: number
  hoursExtra: number
  bonifications: number
  otherIncome: number
  grossSalary: number
  sss: number          // SS empleado 9.75%
  se: number           // Seguro Educativo empleado 1.25%
  isr: number          // ISR del período
  recurringAmount: number
  otherDeductions: number
  totalDeductions: number
  netSalary: number
  netSalaryMonthly: number
  netSalaryBiweekly: number
  thirteenthMonth?: number
}

export type PayrollPeriodType = 'Mensual' | 'Quincenal (cada 15 días)'
export type QuincenaType = 'Primera Quincena (1-15)' | 'Segunda Quincena (16-31)'

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS DE SALARIO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Devuelve el salario mensual normalizado.
 * MONTHLY: salary ya es mensual.
 * BIWEEKLY: salary es quincenal → ×2 para mensual.
 */
export const getMonthlySalary = (emp: { salary: number; salaryType: 'MONTHLY' | 'BIWEEKLY' }): number => {
  const s = Number(emp.salary) || 0
  return emp.salaryType === 'MONTHLY' ? s : s * 2
}

/**
 * Devuelve el salario quincenal normalizado.
 * BIWEEKLY: salary ya es quincenal.
 * MONTHLY:  salary / 2.
 */
export const getBiweeklySalary = (emp: { salary: number; salaryType: 'MONTHLY' | 'BIWEEKLY' }): number => {
  const s = Number(emp.salary) || 0
  return emp.salaryType === 'BIWEEKLY' ? s : s / 2
}

// ─────────────────────────────────────────────────────────────────────────────
// LEER PARÁMETROS LEGALES
// ─────────────────────────────────────────────────────────────────────────────

export const getSSSRate = (legalParams: LegalParameter[]): number => {
  if (!legalParams?.length) return 9.75
  const p = legalParams.find(
    p => (p.key === 'ss_empleado' || (p.category === 'social_security' && p.type === 'employee')) && p.status === 'active'
  )
  return p?.percentage ?? 9.75
}

export const getSERate = (legalParams: LegalParameter[]): number => {
  if (!legalParams?.length) return 1.25
  const p = legalParams.find(
    p => (p.key === 'se_empleado' || (p.category === 'educational_insurance' && p.type === 'employee')) && p.status === 'active'
  )
  return p?.percentage ?? 1.25
}

export const getSSDecimoRate = (legalParams: LegalParameter[]): number => {
  if (!legalParams?.length) return 7.25
  const p = legalParams.find(p => p.key === 'ss_decimo' && p.status === 'active')
  return p?.percentage ?? 7.25
}

export const getISRTramos = (legalParams: LegalParameter[]): ISRTramo[] => {
  if (!legalParams?.length) return []
  return legalParams
    .filter(p => p.category === 'isr' && p.status === 'active')
    .map(p => ({
      name: p.name,
      percentage: p.percentage,
      minRange: p.minRange ?? 0,
      maxRange: p.maxRange ?? 999_999_999,
    }))
    .sort((a, b) => a.minRange - b.minRange)
}

// ─────────────────────────────────────────────────────────────────────────────
// CÁLCULO ISR — FUENTE ÚNICA DE VERDAD
//
// Base anual = salario mensual × 13
//   (12 meses de salario + 1 décimo tercer mes)
//
// Retención mensual  = ISR anual / 12
// Retención quincenal = ISR anual / 24
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula el ISR anual progresivo sobre la base anual dada.
 */
export const calcISRAnual = (baseAnual: number, tramos: ISRTramo[]): number => {
  if (!tramos.length) return 0
  let tax = 0
  for (const t of tramos) {
    const upper = t.maxRange ?? 999_999_999
    const gravable = Math.min(baseAnual, upper) - t.minRange
    if (gravable > 0 && t.percentage > 0) {
      tax += gravable * (t.percentage / 100)
    }
  }
  return Number(tax.toFixed(2))
}

/**
 * Calcula la RETENCIÓN de ISR para un período de pago.
 *
 * El ISR se retiene en la fuente en cada pago al empleado:
 *   - Nómina MENSUAL:   1 retención/mes  → ISR anual ÷ 12
 *   - Nómina QUINCENAL: 1 retención/quincena → ISR anual ÷ 24
 *     La suma de las 2 quincenas = pago mensual que el empleador
 *     declara y entrega a la DGI.
 *
 * @param grossSalaryPeriod  Bruto del período (quincena o mes según periodType)
 * @param periodType         'Mensual' | 'Quincenal (cada 15 días)'
 * @param tramos             Tramos ISR desde legal-parameters
 * @returns Monto a RETENER al empleado en ESTE período de pago
 */
export const calcISRPorPeriodo = (
  grossSalaryPeriod: number,
  periodType: PayrollPeriodType,
  tramos: ISRTramo[]
): number => {
  if (!tramos.length) return 0

  // Normalizar a salario mensual equivalente para anualizar
  const mensualEquivalente =
    periodType === 'Mensual' ? grossSalaryPeriod : grossSalaryPeriod * 2

  // Base anual gravable = 13 salarios (12 regulares + 1 décimo tercer mes)
  const baseAnual = mensualEquivalente * 13

  const isrAnual = calcISRAnual(baseAnual, tramos)

  // Retención por período:
  //   Mensual:   ISR anual ÷ 12  (una retención al mes)
  //   Quincenal: ISR anual ÷ 24  (una retención por quincena; 2 quincenas = 1 mes)
  //   El empleador suma Q1 + Q2 y paga mensualmente a la DGI.
  const divisor = periodType === 'Mensual' ? 12 : 24
  return Number((isrAnual / divisor).toFixed(2))
}

// ─────────────────────────────────────────────────────────────────────────────
// DÉCIMO TERCER MES
// ─────────────────────────────────────────────────────────────────────────────

export interface ThirteenthMonthResult {
  period: string
  grossAmount: number
  sss: number
  isr: number
  netAmount: number
  startMonth: number
  endMonth: number
}

/**
 * Calcula el décimo tercer mes para un período específico.
 *
 * Meses de pago (0-based, getMonth()):
 *   Abril     = 3  → 1ra Partida (16 dic – 15 abr)
 *   Agosto    = 7  → 2da Partida (16 abr – 15 ago)
 *   Diciembre = 11 → 3ra Partida (16 ago – 15 dic)
 *
 * @param totalIncome   Suma de ingresos del período de 4 meses
 * @param month         Mes actual (0-based, de Date.getMonth())
 * @param tramos        Tramos ISR
 * @param ssDecimoRate  Tasa SS del décimo (default 7.25%)
 */
export const calcDecimo = (
  totalIncome: number,
  month: number,
  tramos: ISRTramo[],
  ssDecimoRate: number = 7.25
): ThirteenthMonthResult => {
  let period = ''
  let startMonth = 0
  let endMonth = 0

  if (month === 3) {
    period = 'Primera Partida (16 dic – 15 abr)'
    startMonth = 11
    endMonth = 3
  } else if (month === 7) {
    period = 'Segunda Partida (16 abr – 15 ago)'
    startMonth = 3
    endMonth = 7
  } else if (month === 11) {
    period = 'Tercera Partida (16 ago – 15 dic)'
    startMonth = 7
    endMonth = 11
  }

  // Bruto = ingresos del período / 12
  const grossAmount = Number((totalIncome / 12).toFixed(2))

  // SS del décimo
  const sss = Number((grossAmount * (ssDecimoRate / 100)).toFixed(2))

  // ISR del décimo: solo si ingreso anual > B/. 11,000 (Art. 700 CF)
  let isr = 0
  if (totalIncome > 11_000) {
    // Anualizar el décimo para ubicarlo en el tramo correcto
    const baseAnualDecimo = (grossAmount - sss) * 13
    const isrAnual = calcISRAnual(baseAnualDecimo, tramos)
    isr = Number((isrAnual / 12).toFixed(2))
  }

  const netAmount = Number((grossAmount - sss - isr).toFixed(2))

  return { period, grossAmount, sss, isr, netAmount, startMonth, endMonth }
}

// ─────────────────────────────────────────────────────────────────────────────
// CÁLCULO INDIVIDUAL DE NÓMINA
// ─────────────────────────────────────────────────────────────────────────────

export interface PayrollOverrides {
  baseSalary?: number
  hoursExtra?: number
  bonifications?: number
  otherIncome?: number
  otherDeductions?: number
}

export const calcEmployeePayroll = (
  employee: EmployeeWithDeductions,
  overrides: PayrollOverrides,
  legalParams: LegalParameter[],
  periodType: PayrollPeriodType,
  quincena: QuincenaType,
  payrollMonth: number   // 0-based de Date.getMonth()
): PayrollCalculation => {
  const sssRate = getSSSRate(legalParams)
  const seRate  = getSERate(legalParams)
  const ssDecimoRate = getSSDecimoRate(legalParams)
  const tramos = getISRTramos(legalParams)
  const isMensual = periodType === 'Mensual'
  const isFirstQuincena = quincena === 'Primera Quincena (1-15)'

  // Salario base del período
  const defaultBase = isMensual ? getMonthlySalary(employee) : getBiweeklySalary(employee)
  const baseSalary = Number((overrides.baseSalary ?? defaultBase) || 0)

  const hoursExtra    = Number(overrides.hoursExtra    ?? 0)
  const bonifications = Number(overrides.bonifications ?? 0)
  const otherIncome   = Number(overrides.otherIncome   ?? 0)
  const otherDeductions = Number(overrides.otherDeductions ?? 0)

  const grossSalary = Number((baseSalary + hoursExtra + bonifications + otherIncome).toFixed(2))

  // SS empleado (9.75%)
  const sss = Number((grossSalary * (sssRate / 100)).toFixed(2))

  // Seguro Educativo empleado (1.25%)
  const se = Number((grossSalary * (seRate / 100)).toFixed(2))

  // ISR del período: base gravable = bruto − SS − SE (igual que SIPE/CSS)
  const grossNetOfSSSE = Number((grossSalary - sss - se).toFixed(2))
  const isr = calcISRPorPeriodo(grossNetOfSSSE, periodType, tramos)

  // Deducciones recurrentes según frecuencia y período
  const recurringAmount = (employee.recurringDeductions || []).reduce((acc, d) => {
    if (!d.isActive) return acc
    const amount = Number(d.amount) || 0
    if (d.frequency === 'ALWAYS') return acc + amount
    if (isMensual) {
      // En mensual se aplican AMBAS quincenas
      return acc + amount
    }
    if (isFirstQuincena && d.frequency === 'FIRST_QUINCENA') return acc + amount
    if (!isFirstQuincena && d.frequency === 'SECOND_QUINCENA') return acc + amount
    return acc
  }, 0)

  const totalDeductions = Number((sss + se + isr + otherDeductions + recurringAmount).toFixed(2))
  const netSalary = Number((grossSalary - totalDeductions).toFixed(2))

  // Ambas vistas consistentes con el período calculado
  const netSalaryMonthly = isMensual ? netSalary : Number((netSalary * 2).toFixed(2))
  const netSalaryBiweekly = isMensual ? Number((netSalary / 2).toFixed(2)) : netSalary

  const calc: PayrollCalculation = {
    employeeId: employee.id,
    employee,
    baseSalary,
    hoursExtra,
    bonifications,
    otherIncome,
    grossSalary,
    sss,
    se,
    isr,
    recurringAmount,
    otherDeductions,
    totalDeductions,
    netSalary,
    netSalaryMonthly,
    netSalaryBiweekly,
  }

  // Décimo: meses de pago abril(3), agosto(7), diciembre(11)
  const esDecimoMes = payrollMonth === 3 || payrollMonth === 7 || payrollMonth === 11
  if (esDecimoMes) {
    const base4Meses = getMonthlySalary(employee) * 4
    const decimoData = calcDecimo(base4Meses, payrollMonth, tramos, ssDecimoRate)
    calc.thirteenthMonth = decimoData.netAmount
  }

  return calc
}

// ─────────────────────────────────────────────────────────────────────────────
// CÁLCULO DE TODAS LAS NÓMINAS
// ─────────────────────────────────────────────────────────────────────────────

export const calcAllPayrolls = (
  employees: EmployeeWithDeductions[],
  legalParams: LegalParameter[],
  periodType: PayrollPeriodType,
  quincena: QuincenaType,
  payrollDate: string,
  overridesMap: Record<string, PayrollOverrides>
): PayrollCalculation[] => {
  if (!employees?.length || !legalParams?.length) return []

  const payrollMonth = new Date(payrollDate).getMonth()

  return employees.map(emp =>
    calcEmployeePayroll(
      emp,
      overridesMap[emp.id] || {},
      legalParams,
      periodType,
      quincena,
      payrollMonth
    )
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TOTALES
// ─────────────────────────────────────────────────────────────────────────────

export interface PayrollTotals {
  totalGross: number
  totalSss: number
  totalSe: number
  totalIsr: number
  totalRecurring: number
  totalOtherDeductions: number
  totalDeductions: number
  totalNetMonthly: number
  totalNetBiweekly: number
  totalThirteenth: number
}

export const calcPayrollTotals = (
  calculations: PayrollCalculation[],
  isPeriodThirteenth: boolean
): PayrollTotals => {
  const sum = (fn: (c: PayrollCalculation) => number) =>
    Number(calculations.reduce((acc, c) => acc + fn(c), 0).toFixed(2))

  return {
    totalGross:          sum(c => c.grossSalary),
    totalSss:            sum(c => c.sss),
    totalSe:             sum(c => c.se),
    totalIsr:            sum(c => c.isr),
    totalRecurring:      sum(c => c.recurringAmount),
    totalOtherDeductions: sum(c => c.otherDeductions),
    totalDeductions:     sum(c => c.totalDeductions),
    totalNetMonthly:     sum(c => c.netSalaryMonthly),
    totalNetBiweekly:    sum(c => c.netSalaryBiweekly),
    totalThirteenth:     isPeriodThirteenth ? sum(c => c.thirteenthMonth ?? 0) : 0,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMATO MONEDA
// ─────────────────────────────────────────────────────────────────────────────

export const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('es-PA', { style: 'currency', currency: 'USD' }).format(amount)

// ─────────────────────────────────────────────────────────────────────────────
// KEYS REQUERIDAS EN LEGAL-PARAMETERS
// ─────────────────────────────────────────────────────────────────────────────

export const REQUIRED_LEGAL_KEYS = [
  'ss_empleado',
  'ss_patrono',
  'ss_decimo',
  'se_empleado',
  'se_patrono',
  'isr_r1',
  'isr_r2',
  'isr_r3',
  'riesgo_profesional',
] as const

export const validateLegalParams = (legalParams: LegalParameter[]) => {
  const activeKeys = legalParams.filter(p => p.status === 'active').map(p => p.key)
  const missing = REQUIRED_LEGAL_KEYS.filter(k => !activeKeys.includes(k))
  return { isValid: missing.length === 0, missing }
}
