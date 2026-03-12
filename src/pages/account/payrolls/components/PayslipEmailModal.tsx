"use client"

import { useState, useMemo } from "react"
import { useTheme } from "../../../../context/themeContext"
import { apiPost } from "../../../../services/api"
import { toast } from "sonner"
import {
  X, Mail, Send, Search, CheckSquare, Square,
  Loader2, CheckCircle, AlertCircle,
} from "lucide-react"
import type { PayrollCalculation } from "./AllPayrolls"

interface Props {
  calculations: PayrollCalculation[]
  companyName: string
  payPeriod: string
  payrollType: string
  onClose: () => void
}

interface SendResult {
  email: string
  name: string
  success: boolean
  error?: string
}

export const PayslipEmailModal: React.FC<Props> = ({
  calculations,
  companyName,
  payPeriod,
  payrollType,
  onClose,
}) => {
  const { isDarkMode } = useTheme()
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState(false)
  const [results, setResults] = useState<SendResult[] | null>(null)

  // ── filtrado ──
  const visible = useMemo(() => {
    const q = search.toLowerCase()
    return calculations.filter(c =>
      `${c.employee.firstName} ${c.employee.lastName}`.toLowerCase().includes(q) ||
      c.employee.cedula.includes(q)
    )
  }, [calculations, search])

  const toggleOne = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const toggleAll = () => {
    if (selected.size === visible.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(visible.map(c => c.employeeId)))
    }
  }

  const handleSend = async () => {
    if (selected.size === 0) {
      toast.error("Selecciona al menos un colaborador")
      return
    }
    setSending(true)
    setResults(null)

    const employees = calculations
      .filter(c => selected.has(c.employeeId))
      .map(c => ({
        email: (c.employee as any).contactEmail || (c.employee as any).email || "",
        firstName: c.employee.firstName,
        lastName: c.employee.lastName,
        payslipData: {
          cedula: c.employee.cedula,
          salaryType: c.employee.salaryType,
          baseSalary: c.baseSalary,
          hoursExtra: c.hoursExtra,
          bonifications: c.bonifications,
          otherIncome: c.otherIncome,
          grossSalary: c.grossSalary,
          sss: c.sss,
          se: (c as any).se ?? 0,
          isr: c.isr,
          recurringAmount: c.recurringAmount,
          otherDeductions: c.otherDeductions,
          totalDeductions: c.totalDeductions,
          netSalary: c.netSalary,
          netSalaryMonthly: c.netSalaryMonthly,
          netSalaryBiweekly: c.netSalaryBiweekly,
          thirteenthMonth: c.thirteenthMonth,
        },
        companyName,
        payPeriod,
        payrollType,
      }))

    try {
      const res = await apiPost<{ sent: number; failed: number; results: SendResult[] }>(
        "/api/payroll/send-payslip",
        { employees }
      )
      setResults(res.results)
      if (res.sent > 0) toast.success(`${res.sent} comprobante${res.sent !== 1 ? "s" : ""} enviado${res.sent !== 1 ? "s" : ""}`)
      if (res.failed > 0) toast.error(`${res.failed} fallo${res.failed !== 1 ? "s" : ""}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al enviar correos")
    } finally {
      setSending(false)
    }
  }

  // ── estilos ──
  const overlay = "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
  const panel = `relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden ${isDarkMode ? "bg-slate-900 border border-slate-700" : "bg-white border border-gray-200"}`
  const th = `text-[10px] uppercase font-bold tracking-wider px-4 py-2 ${isDarkMode ? "text-gray-500 bg-slate-800/60" : "text-gray-500 bg-gray-50"}`

  return (
    <div className={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={panel}>
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${isDarkMode ? "border-slate-700" : "border-gray-200"}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDarkMode ? "bg-blue-500/20" : "bg-blue-100"}`}>
              <Mail className="text-blue-500" size={18} />
            </div>
            <div>
              <h2 className={`font-bold text-sm ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                Enviar Comprobantes de Nómina
              </h2>
              <p className={`text-[11px] ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
                {companyName} · {payPeriod}
              </p>
            </div>
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-lg ${isDarkMode ? "text-gray-400 hover:text-white hover:bg-slate-700" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"}`}>
            <X size={18} />
          </button>
        </div>

        {/* Resultados */}
        {results && (
          <div className={`mx-5 mt-4 rounded-xl border p-3 text-xs space-y-1 max-h-36 overflow-y-auto ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-gray-50 border-gray-200"}`}>
            {results.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                {r.success
                  ? <CheckCircle size={12} className="text-emerald-500 flex-shrink-0" />
                  : <AlertCircle size={12} className="text-red-500 flex-shrink-0" />
                }
                <span className={isDarkMode ? "text-slate-300" : "text-gray-700"}>{r.name}</span>
                <span className={`font-mono ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>{r.email}</span>
                {!r.success && <span className="text-red-400">{r.error}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Buscador + toggleAll */}
        <div className={`px-5 py-3 border-b flex items-center gap-3 ${isDarkMode ? "border-slate-700" : "border-gray-100"}`}>
          <button onClick={toggleAll} className={`flex-shrink-0 ${isDarkMode ? "text-teal-400 hover:text-teal-300" : "text-teal-600 hover:text-teal-700"}`}>
            {selected.size === visible.length && visible.length > 0
              ? <CheckSquare size={18} />
              : <Square size={18} />
            }
          </button>
          <div className="relative flex-1">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`} size={14} />
            <input
              type="text"
              placeholder="Buscar colaborador…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={`w-full pl-9 pr-4 py-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? "bg-slate-800 border border-slate-700 text-white placeholder-gray-600" : "bg-gray-100 border border-gray-200 text-gray-900 placeholder-gray-400"}`}
            />
          </div>
          <span className={`text-xs flex-shrink-0 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
            {selected.size} / {calculations.length}
          </span>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className={`${th} w-10`}></th>
                <th className={th}>Colaborador</th>
                <th className={`${th} text-right`}>Salario Base</th>
                <th className={`${th} text-right`}>Neto</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(c => {
                const checked = selected.has(c.employeeId)
                const email = (c.employee as any).contactEmail || (c.employee as any).email
                return (
                  <tr
                    key={c.employeeId}
                    onClick={() => toggleOne(c.employeeId)}
                    className={`cursor-pointer border-b transition-colors ${
                      checked
                        ? isDarkMode ? "bg-blue-500/10 border-blue-500/20" : "bg-blue-50 border-blue-100"
                        : isDarkMode ? "border-slate-800 hover:bg-slate-800/50" : "border-gray-50 hover:bg-gray-50"
                    }`}
                  >
                    <td className="px-4 py-2.5">
                      {checked
                        ? <CheckSquare size={16} className="text-blue-500" />
                        : <Square size={16} className={isDarkMode ? "text-slate-600" : "text-gray-300"} />
                      }
                    </td>
                    <td className="px-4 py-2.5">
                      <p className={`text-sm font-medium ${isDarkMode ? "text-slate-200" : "text-gray-900"}`}>
                        {c.employee.firstName} {c.employee.lastName}
                      </p>
                      <p className={`text-[10px] font-mono ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                        {c.employee.cedula} · {email
                          ? <span className="text-blue-500">{email}</span>
                          : <span className="text-red-400">sin email</span>
                        }
                      </p>
                    </td>
                    <td className={`px-4 py-2.5 text-right font-mono text-sm ${isDarkMode ? "text-slate-300" : "text-gray-700"}`}>
                      ${c.baseSalary.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-sm font-bold text-emerald-500">
                      ${c.netSalary.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-between px-5 py-4 border-t ${isDarkMode ? "border-slate-700 bg-slate-800/40" : "border-gray-100 bg-gray-50"}`}>
          <p className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
            Los comprobantes se envían al email registrado del colaborador
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isDarkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-700"}`}
            >
              Cancelar
            </button>
            <button
              onClick={handleSend}
              disabled={sending || selected.size === 0}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-colors"
            >
              {sending
                ? <><Loader2 size={15} className="animate-spin" /> Enviando…</>
                : <><Send size={15} /> Enviar ({selected.size})</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
