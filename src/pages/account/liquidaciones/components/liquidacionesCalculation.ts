// ─────────────────────────────────────────────────────────────────────────────
// liquidacionesCalculation.ts
// Cálculo de liquidación laboral — Ley panameña vigente
//
// FUNDAMENTO LEGAL (Código de Trabajo de Panamá):
//
//  1. PRIMA DE ANTIGÜEDAD (Art. 224)
//     • 1 semana de salario por cada año trabajado (o fracción ≥ 3 meses)
//     • Se paga SIEMPRE al terminar la relación laboral, sea cual sea la causa
//     • Base = salario promedio de los últimos 3 meses
//
//  2. PREAVISO (Art. 683 - 686)
//     • Solo cuando el empleador despide sin causa justificada
//     • < 2 años:   1 semana
//     • 2–5 años:   2 semanas
//     • > 5 años:   3 semanas
//     (Si se trabaja el preaviso, no se paga; si no, se paga en efectivo)
//
//  3. VACACIONES PROPORCIONALES (Art. 54–60)
//     • (días_trabajados / 365) × 30 × salario_diario
//     • Se paga SIEMPRE al liquidar
//
//  4. DÉCIMO TERCER MES PROPORCIONAL (Art. 2 Ley 44 de 1995)
//     • Días trabajados en el período vigente / días_del_período × monto_del_periodo
//     • Equivalente: (salario_mensual × meses_en_periodo) / 12
//
//  5. INDEMNIZACIÓN (Art. 225 — solo despido injustificado)
//     • < 2 años:   3.4 semanas por año
//     • 2–10 años:  3.4 semanas por año + semana adicional por c/año > 2
//     • > 10 años:  6 semanas por año (tope)
//     Base = salario promedio últimos 3 meses
//
//  DEDUCCIONES sobre el total bruto:
//     • SS empleado: 9.75 %   (key: ss_empleado)
//     • Seguro Educativo: 1.25 % (key: se_empleado)
//     • ISR: progresivo sobre base mensual equivalente
// ─────────────────────────────────────────────────────────────────────────────

export type TipoTerminacion =
  | "DESPIDO_INJUSTIFICADO"   // Art. 225 → prima + preaviso + vacaciones + décimo + indemnización
  | "RENUNCIA"                // → prima + vacaciones + décimo (sin preaviso ni indemnización)
  | "MUTUO_ACUERDO"           // → prima + vacaciones + décimo (negociable)
  | "DESPIDO_JUSTIFICADO"     // → prima + vacaciones + décimo (sin preaviso ni indemnización)
  | "TERMINACION_CONTRATO"    // → todos los conceptos + salarios pendientes del período

export interface LiquidacionEmployee {
  id: string
  cedula: string
  firstName: string
  lastName: string
  position?: string
  department?: string
  salary: number
  salaryType: "MONTHLY" | "BIWEEKLY"
  hireDate: string | Date
  status: string
}

export interface LiquidacionLegalParam {
  key: string
  category: string
  percentage: number
  minRange?: number | null
  maxRange?: number | null
  status: "active" | "inactive"
}

export interface LiquidacionDesglose {
  // ── Concepto bruto ──
  primaAntiguedadBruto: number      // Art. 224
  preaviso: number                   // Art. 683-686 (solo despido injust.)
  vacacionesBruto: number            // Art. 54-60
  decimoProporcionalBruto: number    // Ley 44/1995
  indemnizacionBruto: number         // Art. 225 (solo despido injust.)
  salariosPendientes: number         // Días trabajados no pagados del último período
  diasPendientes: number             // Cantidad de días pendientes de pago
  totalBruto: number

  // ── Deducciones ──
  ss: number
  se: number
  isr: number
  totalDeducciones: number

  // ── Neto ──
  totalNeto: number

  // ── Metadatos de cálculo ──
  diasTrabajados: number
  mesesTrabajados: number
  anosTrabajados: number             // completos
  fraccionMeses: number              // meses del año en curso
  salarioMensual: number
  salarioDiario: number
  salarioSemanal: number
  semanasPrimaAntiguedad: number
  semanasPreaviso: number
  diasVacaciones: number
  diasVacYaPagados: number           // días de vacaciones ya pagados vía permisos
  mesesDecimoActual: number
  tipoTerminacion: TipoTerminacion
  fechaIngreso: Date
  fechaTerminacion: Date
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export const getMonthlySalaryLiq = (emp: LiquidacionEmployee): number => {
  const s = Number(emp.salary) || 0
  return emp.salaryType === "BIWEEKLY" ? s * 2 : s
}

export const getDailySalaryLiq = (monthly: number): number =>
  Number((monthly / 30).toFixed(4))

export const getWeeklySalary = (monthly: number): number =>
  Number((monthly / 4.333).toFixed(4))   // semanas en un mes = 365/12/7

export const calcDaysLiq = (from: Date, to: Date): number =>
  Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86400000))

export const calcMonthsLiq = (from: Date, to: Date): number => {
  let m = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
  if (to.getDate() < from.getDate()) m -= 1
  return Math.max(0, m)
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIMA DE ANTIGÜEDAD — Art. 224
// 1 semana por año trabajado (o fracción ≥ 3 meses)
// ─────────────────────────────────────────────────────────────────────────────

export const calcPrimaAntiguedad = (
  mesesTrabajados: number,
  salarioSemanal: number
): { semanas: number; monto: number } => {
  const anosCompletos = Math.floor(mesesTrabajados / 12)
  const fraccionMeses = mesesTrabajados % 12

  // fracción de año ≥ 3 meses = cuenta como semana adicional
  const semanasExtra = fraccionMeses >= 3 ? 1 : 0
  const semanas = anosCompletos + semanasExtra

  return {
    semanas,
    monto: Number((semanas * salarioSemanal).toFixed(2)),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PREAVISO — Art. 683-686
// Solo en despido injustificado
// ─────────────────────────────────────────────────────────────────────────────

export const calcPreaviso = (
  mesesTrabajados: number,
  salarioSemanal: number,
  tipo: TipoTerminacion
): { semanas: number; monto: number } => {
  if (tipo !== "DESPIDO_INJUSTIFICADO") return { semanas: 0, monto: 0 }

  let semanas = 1
  if (mesesTrabajados >= 24 && mesesTrabajados < 60) semanas = 2   // 2–5 años
  if (mesesTrabajados >= 60) semanas = 3                            // > 5 años

  return {
    semanas,
    monto: Number((semanas * salarioSemanal).toFixed(2)),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// VACACIONES PROPORCIONALES — Art. 54-60
// ─────────────────────────────────────────────────────────────────────────────

export const calcVacacionesProporcionales = (
  diasTrabajados: number,
  salarioDiario: number
): { dias: number; monto: number } => {
  const dias = Number(((diasTrabajados / 365) * 30).toFixed(2))
  return {
    dias,
    monto: Number((dias * salarioDiario).toFixed(2)),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DÉCIMO PROPORCIONAL — Ley 44/1995
// Meses trabajados en el período actual (máx 4) / 12 × salario mensual
// Período: dic-abr, abr-ago, ago-dic (cada 4 meses)
// ─────────────────────────────────────────────────────────────────────────────

export const calcDecimoProporcional = (
  fechaTerminacion: Date,
  salarioMensual: number
): { mesesEnPeriodo: number; monto: number; periodo: string } => {
  const mes = fechaTerminacion.getMonth() // 0-based

  let inicioPartida: number
  let periodo: string

  // Primera partida: dic(11) → abr(3)
  if (mes >= 0 && mes <= 2) {
    inicioPartida = 11
    periodo = "Primera Partida (16 dic – 15 abr)"
  } else if (mes === 3) {
    // abril = mes de pago, partida completa
    inicioPartida = 11
    periodo = "Primera Partida (16 dic – 15 abr)"
  } else if (mes >= 4 && mes <= 6) {
    inicioPartida = 3
    periodo = "Segunda Partida (16 abr – 15 ago)"
  } else if (mes === 7) {
    inicioPartida = 3
    periodo = "Segunda Partida (16 abr – 15 ago)"
  } else {
    inicioPartida = 7
    periodo = "Tercera Partida (16 ago – 15 dic)"
  }

  // Meses transcurridos dentro del período (1–4)
  let mesesEnPeriodo: number
  if (mes >= inicioPartida) {
    mesesEnPeriodo = mes - inicioPartida
  } else {
    mesesEnPeriodo = mes + (12 - inicioPartida)
  }
  mesesEnPeriodo = Math.max(1, Math.min(4, mesesEnPeriodo))

  const monto = Number(((salarioMensual * mesesEnPeriodo) / 12).toFixed(2))

  return { mesesEnPeriodo, monto, periodo }
}

// ─────────────────────────────────────────────────────────────────────────────
// INDEMNIZACIÓN — Art. 225
// Solo en despido injustificado
// ─────────────────────────────────────────────────────────────────────────────

export const calcIndemnizacion = (
  mesesTrabajados: number,
  salarioSemanal: number,
  tipo: TipoTerminacion
): { semanas: number; monto: number } => {
  if (tipo !== "DESPIDO_INJUSTIFICADO") return { semanas: 0, monto: 0 }

  const anos = mesesTrabajados / 12

  let semanas: number

  if (anos < 2) {
    // < 2 años: 3.4 semanas por año proporcional
    semanas = Number((anos * 3.4).toFixed(4))
  } else if (anos <= 10) {
    // 2–10 años: 3.4 × años + semana extra por cada año > 2
    const anosExtra = anos - 2
    semanas = Number((2 * 3.4 + anosExtra * (3.4 + 1)).toFixed(4))
  } else {
    // > 10 años: 6 semanas por año (tope legal)
    semanas = Number((anos * 6).toFixed(4))
  }

  return {
    semanas: Number(semanas.toFixed(2)),
    monto: Number((semanas * salarioSemanal).toFixed(2)),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SALARIOS PENDIENTES — días trabajados del último período no pagado
// Aplica cuando el empleado tiene días trabajados sin cobrar en el período actual
// ─────────────────────────────────────────────────────────────────────────────

export const calcSalariosPendientes = (
  fechaTerminacion: Date,
  salarioDiario: number,
  diasYaPagadosEnPeriodo?: number
): { dias: number; monto: number } => {
  // Determinar inicio del período actual (quincena o mes)
  const dia = fechaTerminacion.getDate()

  // Período quincenal: del 1 al 15 o del 16 al fin de mes
  let diasEnPeriodo: number
  if (dia <= 15) {
    diasEnPeriodo = dia  // trabajó del 1 al día actual
  } else {
    diasEnPeriodo = dia - 15  // trabajó del 16 al día actual
  }

  const diasPendientes = Math.max(0, diasEnPeriodo - (diasYaPagadosEnPeriodo ?? 0))
  const monto = Number((diasPendientes * salarioDiario).toFixed(2))

  return { dias: diasPendientes, monto }
}

// ─────────────────────────────────────────────────────────────────────────────
// ISR SOBRE LIQUIDACIÓN
// Se anualiza el total bruto para ubicar tramo y se aplica proporcional
// ─────────────────────────────────────────────────────────────────────────────

export const calcISRLiquidacion = (
  totalBruto: number,
  salarioMensual: number,
  legalParams: LiquidacionLegalParam[]
): number => {
  const isrRates = legalParams
    .filter(p => p.category === "isr" && p.status === "active")
    .sort((a, b) => Number(a.minRange ?? 0) - Number(b.minRange ?? 0))

  if (isrRates.length === 0) return 0

  // Base anual de referencia (salario mensual × 13)
  const annualBase = salarioMensual * 13
  let annualISR = 0

  for (const rate of isrRates) {
    if (Number(rate.percentage) === 0) continue
    const rawMin = Number(rate.minRange ?? 0)
    const piso = rawMin > 0 ? rawMin - 1 : 0  // 11001→11000, 50001→50000
    const max = rate.maxRange ? Number(rate.maxRange) : Infinity
    const pct = Number(rate.percentage) / 100
    if (annualBase > piso) {
      annualISR += (Math.min(annualBase, max) - piso) * pct
    }
  }

  const monthlyISR = annualISR / 12

  // ISR proporcional = (liquidación / salario mensual) × ISR mensual
  // Si la liquidación es mayor que un mes se aplica el ISR mensual completo
  const ratio = Math.min(totalBruto / (salarioMensual || 1), 1)
  return Number((monthlyISR * ratio).toFixed(2))
}

// ─────────────────────────────────────────────────────────────────────────────
// CÁLCULO COMPLETO POR EMPLEADO
// ─────────────────────────────────────────────────────────────────────────────

export const calcularLiquidacion = (
  employee: LiquidacionEmployee,
  tipoTerminacion: TipoTerminacion,
  fechaTerminacion: Date,
  legalParams: LiquidacionLegalParam[],
  diasVacPagadas?: number,
  diasSalarioPendiente?: number  // días del período actual sin pagar (override manual)
): LiquidacionDesglose => {
  const fechaIngreso = new Date(employee.hireDate)
  const diasTrabajados = calcDaysLiq(fechaIngreso, fechaTerminacion)
  const mesesTrabajados = calcMonthsLiq(fechaIngreso, fechaTerminacion)
  const anosTrabajados = Math.floor(mesesTrabajados / 12)
  const fraccionMeses = mesesTrabajados % 12

  const salarioMensual = getMonthlySalaryLiq(employee)
  const salarioDiario = getDailySalaryLiq(salarioMensual)
  const salarioSemanal = getWeeklySalary(salarioMensual)

  // 1. Prima de antigüedad (siempre)
  const prima = calcPrimaAntiguedad(mesesTrabajados, salarioSemanal)

  // 2. Preaviso (solo despido injustificado)
  const preaviso = calcPreaviso(mesesTrabajados, salarioSemanal, tipoTerminacion)

  // 3. Vacaciones proporcionales (siempre) — descontando días ya pagados vía permisos
  const diasVacYaPagados = Math.max(0, diasVacPagadas ?? 0)
  const vacRaw = calcVacacionesProporcionales(diasTrabajados, salarioDiario)
  const vacMontoYaPagado = Number(Math.min(diasVacYaPagados * salarioDiario, vacRaw.monto).toFixed(2))
  const vacaciones = {
    dias: Number(Math.max(0, vacRaw.dias - diasVacYaPagados).toFixed(2)),
    monto: Number(Math.max(0, vacRaw.monto - vacMontoYaPagado).toFixed(2)),
  }

  // 4. Décimo proporcional (siempre)
  const decimo = calcDecimoProporcional(fechaTerminacion, salarioMensual)

  // 5. Indemnización (solo despido injustificado o terminación de contrato sin causa)
  const tipoParaIndem: TipoTerminacion =
    tipoTerminacion === "TERMINACION_CONTRATO" ? "DESPIDO_INJUSTIFICADO" : tipoTerminacion
  const indemnizacion = calcIndemnizacion(mesesTrabajados, salarioSemanal, tipoParaIndem)

  // 6. Salarios pendientes del período actual (siempre en Terminación de Contrato)
  const salariosPendientesResult =
    tipoTerminacion === "TERMINACION_CONTRATO"
      ? calcSalariosPendientes(fechaTerminacion, salarioDiario, diasSalarioPendiente !== undefined ? 0 : undefined)
      : { dias: 0, monto: 0 }

  // Si se pasó override manual de días pendientes, recalcular
  const salariosPendientesFinal =
    diasSalarioPendiente !== undefined
      ? { dias: diasSalarioPendiente, monto: Number((diasSalarioPendiente * salarioDiario).toFixed(2)) }
      : salariosPendientesResult

  const totalBruto = Number((
    prima.monto +
    preaviso.monto +
    vacaciones.monto +
    decimo.monto +
    indemnizacion.monto +
    salariosPendientesFinal.monto
  ).toFixed(2))

  // Deducciones
  const ssRate = legalParams.find(p => p.key === "ss_empleado" && p.status === "active")?.percentage ?? 9.75
  const seRate = legalParams.find(p => p.key === "se_empleado" && p.status === "active")?.percentage ?? 1.25

  const ss = Number((totalBruto * (ssRate / 100)).toFixed(2))
  const se = Number((totalBruto * (seRate / 100)).toFixed(2))
  const isr = calcISRLiquidacion(totalBruto, salarioMensual, legalParams)

  const totalDeducciones = Number((ss + se + isr).toFixed(2))
  const totalNeto = Number((totalBruto - totalDeducciones).toFixed(2))

  return {
    primaAntiguedadBruto: prima.monto,
    preaviso: preaviso.monto,
    vacacionesBruto: vacaciones.monto,
    decimoProporcionalBruto: decimo.monto,
    indemnizacionBruto: indemnizacion.monto,
    salariosPendientes: salariosPendientesFinal.monto,
    diasPendientes: salariosPendientesFinal.dias,
    totalBruto,
    ss,
    se,
    isr,
    totalDeducciones,
    totalNeto,
    diasTrabajados,
    mesesTrabajados,
    anosTrabajados,
    fraccionMeses,
    salarioMensual,
    salarioDiario,
    salarioSemanal,
    semanasPrimaAntiguedad: prima.semanas,
    semanasPreaviso: preaviso.semanas,
    diasVacaciones: vacaciones.dias,
    diasVacYaPagados,
    mesesDecimoActual: decimo.mesesEnPeriodo,
    tipoTerminacion,
    fechaIngreso,
    fechaTerminacion,
  }
}
