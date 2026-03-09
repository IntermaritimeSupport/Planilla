"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import useSWR from "swr"
import { useCompany } from "../../../../context/routerContext"
import { useTheme } from "../../../../context/themeContext"
import { usePageName } from "../../../../hook/usePageName"
import PagesHeader from "../../../../components/headers/pagesHeader"
import {
  History, Search, Download, Trash2, Filter,
  ChevronDown, ChevronUp, Clock, Users,
  AlertTriangle, Info, Loader2, RefreshCw,
} from "lucide-react"
import {
  type AuditEvent,
  type AuditAction,
  loadHistory,
  clearHistory,
  exportHistoryCSV,
  ACTION_LABELS,
} from "./historialEngine"

// ─────────────────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then(r => r.json())

// ─────────────────────────────────────────────────────────────────────────────
// ACTION BADGE
// ─────────────────────────────────────────────────────────────────────────────

const ActionBadge: React.FC<{ action: AuditAction; isDark: boolean }> = ({ action, isDark }) => {
  const cfg = ACTION_LABELS[action]
  const colorMap: Record<string, string> = {
    emerald: isDark ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" : "bg-emerald-100 text-emerald-700 border-emerald-300",
    blue:    isDark ? "bg-blue-500/15 text-blue-400 border-blue-500/25"          : "bg-blue-100 text-blue-700 border-blue-300",
    amber:   isDark ? "bg-amber-500/15 text-amber-400 border-amber-500/25"       : "bg-amber-100 text-amber-700 border-amber-300",
    purple:  isDark ? "bg-purple-500/15 text-purple-400 border-purple-500/25"    : "bg-purple-100 text-purple-700 border-purple-300",
    teal:    isDark ? "bg-teal-500/15 text-teal-400 border-teal-500/25"          : "bg-teal-100 text-teal-700 border-teal-300",
    red:     isDark ? "bg-red-500/15 text-red-400 border-red-500/25"             : "bg-red-100 text-red-700 border-red-300",
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${colorMap[cfg.color]}`}>
      <span className="font-mono text-[11px]">{cfg.emoji}</span>
      {cfg.label}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TIMELINE EVENT ROW
// ─────────────────────────────────────────────────────────────────────────────

const EventRow: React.FC<{ event: AuditEvent; isDark: boolean; isLast: boolean }> = ({ event, isDark, isLast }) => {
  const [open, setOpen] = useState(false)
  const cfg = ACTION_LABELS[event.action]

  const dotColor: Record<string, string> = {
    emerald: "bg-emerald-500", blue: "bg-blue-500", amber: "bg-amber-500",
    purple: "bg-purple-500", teal: "bg-teal-500", red: "bg-red-500",
  }

  const dt = new Date(event.timestamp)
  const dateStr = dt.toLocaleDateString("es-PA", { day: "2-digit", month: "short", year: "numeric" })
  const timeStr = dt.toLocaleTimeString("es-PA", { hour: "2-digit", minute: "2-digit" })

  return (
    <div className="flex gap-4">
      {/* Timeline line + dot */}
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full shrink-0 mt-1 ring-2 ${dotColor[cfg.color]} ${
          isDark ? "ring-slate-900" : "ring-white"
        }`} />
        {!isLast && <div className={`w-px flex-1 mt-1 ${isDark ? "bg-slate-700" : "bg-gray-200"}`} />}
      </div>

      {/* Contenido */}
      <div className={`flex-1 mb-5 pb-1 rounded-xl border transition-colors ${
        isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"
      }`}>
        {/* Header del evento */}
        <div
          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 cursor-pointer rounded-t-xl ${
            event.fields.length > 0
              ? isDark ? "hover:bg-slate-700/30" : "hover:bg-gray-50"
              : ""
          }`}
          onClick={() => event.fields.length > 0 && setOpen(o => !o)}
        >
          <div className="flex items-center gap-3 flex-wrap">
            <ActionBadge action={event.action} isDark={isDark} />
            <div>
              <span className={`font-semibold text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                {event.employeeName}
              </span>
              <span className={`text-xs ml-2 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                {event.employeeCedula}
              </span>
            </div>
            {event.fields.length > 0 && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                isDark ? "bg-slate-700 text-gray-400" : "bg-gray-100 text-gray-500"
              }`}>
                {event.fields.length} campo{event.fields.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <p className={`text-xs font-mono ${isDark ? "text-gray-400" : "text-gray-600"}`}>{dateStr}</p>
              <p className={`text-[10px] ${isDark ? "text-gray-600" : "text-gray-400"}`}>
                {timeStr} · {event.performedBy}
              </p>
            </div>
            {event.fields.length > 0 && (
              open
                ? <ChevronUp size={14} className={isDark ? "text-gray-500" : "text-gray-400"} />
                : <ChevronDown size={14} className={isDark ? "text-gray-500" : "text-gray-400"} />
            )}
          </div>
        </div>

        {/* Nota */}
        {event.note && (
          <p className={`px-4 pb-2 text-xs italic ${isDark ? "text-gray-500" : "text-gray-500"}`}>
            "{event.note}"
          </p>
        )}

        {/* Detalle de campos cambiados */}
        {open && event.fields.length > 0 && (
          <div className={`mx-4 mb-3 rounded-lg overflow-hidden border ${isDark ? "border-slate-700" : "border-gray-100"}`}>
            <table className="w-full text-xs">
              <thead className={`${isDark ? "bg-slate-900/50 text-gray-500" : "bg-gray-50 text-gray-500"} uppercase`}>
                <tr>
                  <th className="px-3 py-2 text-left">Campo</th>
                  <th className="px-3 py-2 text-left">Valor anterior</th>
                  <th className="px-3 py-2 text-left">Valor nuevo</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? "divide-slate-800" : "divide-gray-100"}`}>
                {event.fields.map((f, i) => (
                  <tr key={i} className={isDark ? "hover:bg-slate-700/20" : "hover:bg-gray-50"}>
                    <td className={`px-3 py-2 font-semibold ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      {f.field}
                    </td>
                    <td className="px-3 py-2 font-mono text-red-400 line-through opacity-70">
                      {f.oldValue ?? "—"}
                    </td>
                    <td className="px-3 py-2 font-mono text-emerald-500 font-bold">
                      {f.newValue ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────────────────────────────────────

const StatCard: React.FC<{ label: string; value: string | number; sub?: string; accent?: string; isDark: boolean }> = (
  { label, value, sub, accent = "text-blue-400", isDark }
) => (
  <div className={`p-4 rounded-xl border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
    <p className={`text-[10px] uppercase font-bold tracking-widest mb-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>{label}</p>
    <p className={`text-2xl font-bold font-mono ${accent}`}>{value}</p>
    {sub && <p className={`text-[10px] mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>{sub}</p>}
  </div>
)

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export const AllHistorial: React.FC = () => {
  const { selectedCompany } = useCompany()
  const { isDarkMode } = useTheme()
  const { pageName } = usePageName()

  const [events, setEvents] = useState<AuditEvent[]>([])
  const [search, setSearch] = useState("")
  const [filterAction, setFilterAction] = useState<AuditAction | "todos">("todos")
  const [filterEmployee, setFilterEmployee] = useState<string>("todos")
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [page, setPage] = useState(1)
  const PER_PAGE = 30

  // ── Cargar historial desde localStorage ──
  const loadEvents = useCallback(() => {
    if (!selectedCompany?.id) return
    const loaded = loadHistory(selectedCompany.id)
    setEvents([...loaded].reverse()) // más recientes primero
  }, [selectedCompany?.id])

  useEffect(() => {
    loadEvents()
    // Escuchar cambios de storage (por si otra pestaña actualiza)
    const handler = () => loadEvents()
    window.addEventListener("storage", handler)
    return () => window.removeEventListener("storage", handler)
  }, [loadEvents])

  // ── Empleados únicos para el filtro ──
  const uniqueEmployees = useMemo(() => {
    const map = new Map<string, string>()
    for (const ev of events) map.set(ev.employeeId, ev.employeeName)
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [events])

  // ── Filtrado ──
  const filtered = useMemo(() => {
    return events.filter(ev => {
      const matchSearch =
        ev.employeeName.toLowerCase().includes(search.toLowerCase()) ||
        ev.employeeCedula.includes(search) ||
        ev.performedBy.toLowerCase().includes(search.toLowerCase())
      const matchAction = filterAction === "todos" || ev.action === filterAction
      const matchEmp = filterEmployee === "todos" || ev.employeeId === filterEmployee
      return matchSearch && matchAction && matchEmp
    })
  }, [events, search, filterAction, filterEmployee])

  const paginated = useMemo(() => filtered.slice(0, page * PER_PAGE), [filtered, page])

  // ── Estadísticas ──
  const stats = useMemo(() => ({
    total: events.length,
    salaryChanges: events.filter(e => e.action === "SALARY_CHANGE").length,
    createdCount: events.filter(e => e.action === "CREATED").length,
    lastEvent: events[0]
      ? new Date(events[0].timestamp).toLocaleDateString("es-PA")
      : "—",
  }), [events])

  // ── Handlers ──
  const handleClear = () => {
    if (!selectedCompany?.id) return
    clearHistory(selectedCompany.id)
    setEvents([])
    setShowClearConfirm(false)
  }

  const handleExport = () => exportHistoryCSV([...events].reverse())

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className={`transition-colors ${isDarkMode ? "bg-slate-900" : ""}`}>

      <PagesHeader
        title={`${pageName} — Historial`}
        description="Auditoría de cambios de colaboradores · registros locales"
        onExport={handleExport}
      />

      {/* ── STATS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Eventos" value={stats.total}
          sub="en esta empresa" accent={isDarkMode ? "text-white" : "text-gray-900"} isDark={isDarkMode} />
        <StatCard label="Cambios de Salario" value={stats.salaryChanges}
          sub="registrados" accent="text-amber-500" isDark={isDarkMode} />
        <StatCard label="Colaboradores Creados" value={stats.createdCount}
          sub="desde el inicio" accent="text-emerald-500" isDark={isDarkMode} />
        <StatCard label="Último Cambio" value={stats.lastEvent}
          sub={events[0]?.performedBy ? `por ${events[0].performedBy}` : "sin eventos aún"}
          accent="text-blue-400" isDark={isDarkMode} />
      </div>

      {/* ── FILTROS ── */}
      <div className={`p-4 rounded-xl border mb-6 flex flex-col md:flex-row gap-3 ${
        isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"
      }`}>

        {/* Buscador */}
        <div className="relative flex-1">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`} size={15} />
          <input
            type="text"
            placeholder="Buscar por nombre, cédula o usuario…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className={`w-full pl-9 pr-4 py-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
              isDarkMode
                ? "bg-slate-900 border border-slate-700 text-white placeholder-gray-600"
                : "bg-gray-100 border border-gray-300 text-gray-900 placeholder-gray-400"
            }`}
          />
        </div>

        {/* Filtro por acción */}
        <select
          value={filterAction}
          onChange={e => { setFilterAction(e.target.value as any); setPage(1) }}
          className={`px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2 focus:ring-indigo-500 ${
            isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-gray-100 border-gray-300 text-gray-900"
          }`}
        >
          <option value="todos">Todas las acciones</option>
          {(Object.keys(ACTION_LABELS) as AuditAction[]).map(a => (
            <option key={a} value={a}>{ACTION_LABELS[a].label}</option>
          ))}
        </select>

        {/* Filtro por empleado */}
        <select
          value={filterEmployee}
          onChange={e => { setFilterEmployee(e.target.value); setPage(1) }}
          className={`px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2 focus:ring-indigo-500 ${
            isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-gray-100 border-gray-300 text-gray-900"
          }`}
        >
          <option value="todos">Todos los colaboradores</option>
          {uniqueEmployees.map(e => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>

        {/* Acciones */}
        <div className="flex gap-2">
          <button
            onClick={loadEvents}
            title="Actualizar"
            className={`p-2 rounded-lg border transition-colors ${
              isDarkMode ? "border-slate-700 text-gray-400 hover:text-white hover:bg-slate-700" : "border-gray-300 text-gray-500 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={handleExport}
            disabled={events.length === 0}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-bold rounded-lg transition-colors"
          >
            <Download size={14} /> CSV
          </button>
          <button
            onClick={() => setShowClearConfirm(true)}
            disabled={events.length === 0}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg border transition-colors disabled:opacity-40 ${
              isDarkMode ? "border-red-800 text-red-400 hover:bg-red-900/30" : "border-red-300 text-red-600 hover:bg-red-50"
            }`}
          >
            <Trash2 size={14} /> Limpiar
          </button>
        </div>
      </div>

      {/* ── MODAL CONFIRMAR BORRADO ── */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-sm rounded-2xl border p-6 shadow-2xl ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-full ${isDarkMode ? "bg-red-900/30" : "bg-red-100"}`}>
                <AlertTriangle className="text-red-500" size={20} />
              </div>
              <h3 className={`font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>¿Limpiar historial?</h3>
            </div>
            <p className={`text-sm mb-6 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
              Se eliminarán <strong>{events.length} eventos</strong> permanentemente. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className={`flex-1 py-2 rounded-lg border text-sm font-semibold transition-colors ${isDarkMode ? "border-slate-600 text-gray-300 hover:bg-slate-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
              >
                Cancelar
              </button>
              <button
                onClick={handleClear}
                className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors"
              >
                Sí, limpiar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TIMELINE ── */}
      <div className={`rounded-xl border overflow-hidden ${isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-gray-50 border-gray-200"}`}>

        {/* Header */}
        <div className={`px-5 py-3 border-b flex items-center justify-between ${isDarkMode ? "border-slate-700" : "border-gray-200"}`}>
          <div className="flex items-center gap-2">
            <History size={16} className={isDarkMode ? "text-indigo-400" : "text-indigo-600"} />
            <h3 className={`font-bold text-sm ${isDarkMode ? "text-white" : "text-gray-900"}`}>
              Línea de tiempo
            </h3>
          </div>
          <span className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
            {filtered.length} evento{filtered.length !== 1 ? "s" : ""}
            {filtered.length !== events.length && ` de ${events.length}`}
          </span>
        </div>

        <div className="p-5">
          {paginated.length === 0 ? (
            <div className={`text-center py-16 ${isDarkMode ? "text-gray-600" : "text-gray-400"}`}>
              <Clock className="mx-auto mb-3 opacity-30" size={36} />
              {events.length === 0 ? (
                <>
                  <p className="text-sm font-semibold mb-1">Sin historial todavía</p>
                  <p className="text-xs">Los cambios en empleados aparecerán aquí automáticamente.</p>
                  <div className={`mt-4 p-4 rounded-lg text-left max-w-sm mx-auto border text-xs ${isDarkMode ? "bg-slate-800 border-slate-700 text-gray-400" : "bg-white border-gray-200 text-gray-600"}`}>
                    <p className="font-bold mb-2 flex items-center gap-2"><Info size={12} /> ¿Cómo funciona?</p>
                    <p>Integra <code className="font-mono">recordCreated</code>, <code className="font-mono">recordUpdated</code> y <code className="font-mono">recordDeleted</code> del <code className="font-mono">historialEngine</code> en los formularios de empleados para que los cambios queden registrados automáticamente.</p>
                  </div>
                </>
              ) : (
                <p className="text-sm">No hay resultados para los filtros aplicados.</p>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-0">
                {paginated.map((ev, i) => (
                  <EventRow
                    key={ev.id}
                    event={ev}
                    isDark={isDarkMode}
                    isLast={i === paginated.length - 1}
                  />
                ))}
              </div>

              {filtered.length > paginated.length && (
                <div className="text-center mt-6">
                  <button
                    onClick={() => setPage(p => p + 1)}
                    className={`px-6 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                      isDarkMode
                        ? "border-slate-600 text-gray-300 hover:bg-slate-700"
                        : "border-gray-300 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    Ver más ({filtered.length - paginated.length} restantes)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── GUÍA DE INTEGRACIÓN ── */}
      <div className={`mt-5 p-4 rounded-xl border ${isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-indigo-50 border-indigo-200"}`}>
        <div className={`flex items-center gap-2 mb-3 ${isDarkMode ? "text-indigo-400" : "text-indigo-700"}`}>
          <Info size={15} />
          <h4 className="text-xs font-bold uppercase tracking-wide">Integración en formularios de empleados</h4>
        </div>
        <div className={`text-xs space-y-2 font-mono ${isDarkMode ? "text-gray-400" : "text-gray-700"}`}>
          <p className={isDarkMode ? "text-gray-500" : "text-gray-500"}>Agrega estas llamadas en EmployeeFom.tsx y AllEmployees.tsx:</p>
          <div className={`p-3 rounded-lg overflow-x-auto ${isDarkMode ? "bg-slate-900" : "bg-white border border-indigo-200"}`}>
            <pre className="text-[11px] leading-relaxed">{`// Al crear un empleado (en handleSubmit de EmployeeForm, luego del POST exitoso)
import { recordCreated } from "../historial/components/historialEngine"
recordCreated(companyId, responseData, currentUsername)

// Al editar un empleado (antes del PUT, guarda snapshot; después, registra diff)
import { recordUpdated } from "../historial/components/historialEngine"
recordUpdated(companyId, employeeDataBefore, employeeDataAfter, currentUsername)

// Al eliminar (en deleteEmployee de AllEmployees, antes del DELETE)
import { recordDeleted } from "../historial/components/historialEngine"
recordDeleted(companyId, employee, currentUsername)`}</pre>
          </div>
        </div>
      </div>

    </div>
  )
}
