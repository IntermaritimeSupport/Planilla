// ─────────────────────────────────────────────────────────────────────────────
// historialEngine.ts
// Motor de auditoría de cambios de empleados — almacenamiento en localStorage
//
// Diseño:
//   • Cada evento queda registrado como un AuditEvent en localStorage
//   • Clave: `historial:${companyId}`  →  AuditEvent[]  (JSON)
//   • Se detectan cambios campo a campo comparando snapshots antes/después
//   • Campos auditados: salary, salaryType, position, department, status,
//     firstName, lastName, email, phoneNumber, bankName, bankAccount,
//     hireDate, recurringDeductions
// ─────────────────────────────────────────────────────────────────────────────

export type AuditAction =
  | "CREATED"           // empleado registrado por primera vez
  | "UPDATED"           // uno o más campos cambiaron
  | "SALARY_CHANGE"     // cambio de salario (categoría especial)
  | "STATUS_CHANGE"     // cambio de estado (ACTIVE/INACTIVE/TERMINATED…)
  | "POSITION_CHANGE"   // cambio de cargo o departamento
  | "DELETED"           // empleado eliminado

export interface AuditField {
  field: string         // nombre legible del campo
  key: string           // clave técnica
  oldValue: string | number | null
  newValue: string | number | null
}

export interface AuditEvent {
  id: string            // uuid local
  companyId: string
  employeeId: string
  employeeName: string
  employeeCedula: string
  action: AuditAction
  fields: AuditField[]  // campos que cambiaron (vacío para CREATED/DELETED)
  performedBy: string   // username del usuario que hizo el cambio
  timestamp: string     // ISO 8601
  note?: string         // nota libre opcional
}

// ─── Campos que se auditan y su etiqueta legible ───────────────────────────

const AUDITED_FIELDS: Record<string, string> = {
  salary: "Salario",
  salaryType: "Tipo de salario",
  position: "Cargo",
  department: "Departamento",
  status: "Estado",
  firstName: "Nombre",
  lastName: "Apellido",
  email: "Correo electrónico",
  phoneNumber: "Teléfono",
  bankName: "Banco",
  bankAccount: "Cuenta bancaria",
  hireDate: "Fecha de ingreso",
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

const storageKey = (companyId: string) => `historial:${companyId}`

const formatValue = (key: string, value: any): string => {
  if (value === null || value === undefined || value === "") return "—"
  if (key === "salary") return `$${Number(value).toFixed(2)}`
  if (key === "salaryType") return value === "MONTHLY" ? "Mensual" : "Quincenal"
  if (key === "hireDate") {
    try { return new Date(value).toLocaleDateString("es-PA") } catch { return String(value) }
  }
  if (key === "status") {
    const map: Record<string, string> = {
      ACTIVE: "Activo", INACTIVE: "Inactivo",
      SUSPENDED: "Suspendido", TERMINATED: "Terminado",
    }
    return map[value] || String(value)
  }
  return String(value)
}

// ─── Detectar acción principal de un conjunto de cambios ──────────────────

const detectAction = (fields: AuditField[]): AuditAction => {
  const keys = fields.map(f => f.key)
  if (keys.includes("salary") || keys.includes("salaryType")) return "SALARY_CHANGE"
  if (keys.includes("status")) return "STATUS_CHANGE"
  if (keys.includes("position") || keys.includes("department")) return "POSITION_CHANGE"
  return "UPDATED"
}

// ─────────────────────────────────────────────────────────────────────────────
// API PÚBLICA
// ─────────────────────────────────────────────────────────────────────────────

/** Cargar todos los eventos de una empresa */
export const loadHistory = (companyId: string): AuditEvent[] => {
  try {
    const raw = localStorage.getItem(storageKey(companyId))
    if (!raw) return []
    return JSON.parse(raw) as AuditEvent[]
  } catch {
    return []
  }
}

/** Guardar lista completa (sobreescribe) */
const saveHistory = (companyId: string, events: AuditEvent[]): void => {
  try {
    // Mantener máximo 2000 eventos por empresa (FIFO)
    const trimmed = events.slice(-2000)
    localStorage.setItem(storageKey(companyId), JSON.stringify(trimmed))
  } catch {
    console.warn("historialEngine: no se pudo guardar en localStorage")
  }
}

/** Registrar creación de un empleado */
export const recordCreated = (
  companyId: string,
  employee: any,
  performedBy: string
): void => {
  const events = loadHistory(companyId)
  events.push({
    id: uid(),
    companyId,
    employeeId: employee.id,
    employeeName: `${employee.firstName} ${employee.lastName}`,
    employeeCedula: employee.cedula,
    action: "CREATED",
    fields: [],
    performedBy,
    timestamp: new Date().toISOString(),
  })
  saveHistory(companyId, events)
}

/** Registrar eliminación de un empleado */
export const recordDeleted = (
  companyId: string,
  employee: any,
  performedBy: string
): void => {
  const events = loadHistory(companyId)
  events.push({
    id: uid(),
    companyId,
    employeeId: employee.id,
    employeeName: `${employee.firstName} ${employee.lastName}`,
    employeeCedula: employee.cedula,
    action: "DELETED",
    fields: [],
    performedBy,
    timestamp: new Date().toISOString(),
  })
  saveHistory(companyId, events)
}

/** Comparar snapshot anterior vs nuevo y registrar cambios */
export const recordUpdated = (
  companyId: string,
  before: any,
  after: any,
  performedBy: string,
  note?: string
): void => {
  const changedFields: AuditField[] = []

  for (const key of Object.keys(AUDITED_FIELDS)) {
    const prev = before[key]
    const next = after[key]

    // Comparación normalizada
    const prevStr = prev === null || prev === undefined ? "" : String(prev)
    const nextStr = next === null || next === undefined ? "" : String(next)

    if (prevStr !== nextStr) {
      changedFields.push({
        field: AUDITED_FIELDS[key],
        key,
        oldValue: formatValue(key, prev),
        newValue: formatValue(key, next),
      })
    }
  }

  if (changedFields.length === 0) return  // nada cambió

  const events = loadHistory(companyId)
  events.push({
    id: uid(),
    companyId,
    employeeId: after.id,
    employeeName: `${after.firstName} ${after.lastName}`,
    employeeCedula: after.cedula,
    action: detectAction(changedFields),
    fields: changedFields,
    performedBy,
    timestamp: new Date().toISOString(),
    note,
  })
  saveHistory(companyId, events)
}

/** Eliminar todo el historial de una empresa */
export const clearHistory = (companyId: string): void => {
  localStorage.removeItem(storageKey(companyId))
}

/** Exportar historial como CSV */
export const exportHistoryCSV = (events: AuditEvent[]): void => {
  const rows: string[] = [
    ["Fecha", "Empleado", "Cédula", "Acción", "Campo", "Valor Anterior", "Valor Nuevo", "Realizado por", "Nota"].join(",")
  ]

  for (const ev of events) {
    const date = new Date(ev.timestamp).toLocaleString("es-PA")
    const action = ACTION_LABELS[ev.action]?.label ?? ev.action

    if (ev.fields.length === 0) {
      rows.push([date, ev.employeeName, ev.employeeCedula, action, "—", "—", "—", ev.performedBy, ev.note ?? ""].join(","))
    } else {
      for (const f of ev.fields) {
        rows.push([date, ev.employeeName, ev.employeeCedula, action, f.field, f.oldValue ?? "—", f.newValue ?? "—", ev.performedBy, ev.note ?? ""].join(","))
      }
    }
  }

  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `historial_empleados_${new Date().toISOString().split("T")[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Metadatos de acciones para la UI ──────────────────────────────────────

export const ACTION_LABELS: Record<AuditAction, { label: string; color: string; emoji: string }> = {
  CREATED:         { label: "Registro creado",     color: "emerald", emoji: "✦" },
  UPDATED:         { label: "Datos actualizados",   color: "blue",    emoji: "✎" },
  SALARY_CHANGE:   { label: "Cambio de salario",    color: "amber",   emoji: "$" },
  STATUS_CHANGE:   { label: "Cambio de estado",     color: "purple",  emoji: "◉" },
  POSITION_CHANGE: { label: "Cambio de cargo",      color: "teal",    emoji: "⬆" },
  DELETED:         { label: "Registro eliminado",   color: "red",     emoji: "✕" },
}
