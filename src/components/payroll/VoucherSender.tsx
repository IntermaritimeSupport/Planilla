// ─────────────────────────────────────────────────────────────────────────────
// VoucherSender.tsx
// Botones de envío de comprobantes: individual y masivo
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react"
import {
  Mail, Send, CheckCircle, XCircle, Loader2,
  Users, FileDown, AlertCircle,
} from "lucide-react"
import { authHeaders } from "../../utils/apiFetcher"

const API = import.meta.env.VITE_API_URL

interface BulkResult {
  success: boolean
  total: number
  sent: number
  failed: number
  skipped: number
  message?: string
  errors?: Array<{ employee: string; email: string | null; error: string }>
}

// ─── ENVÍO INDIVIDUAL ─────────────────────────────────────────────────────────
interface VoucherSenderProps {
  payrollId: string
  employeeName?: string
  employeeEmail?: string | null
  isDark?: boolean
  /** "icon" = botones pequeños en tabla | "button" = botones con texto */
  variant?: "icon" | "button"
}

export const VoucherSender: React.FC<VoucherSenderProps> = ({
  payrollId,
  employeeName = "",
  employeeEmail,
  isDark = true,
  variant = "icon",
}) => {
  const [st, setSt] = useState<"idle" | "loading" | "ok" | "err">("idle")
  const [errMsg, setErrMsg] = useState("")

  // Descarga el PDF directamente sin enviar email
  const downloadPDF = () => {
    const a = document.createElement("a")
    a.href = `${API}/api/payroll/voucher/preview/${payrollId}`
    a.download = `Comprobante_${payrollId.slice(0, 8)}.pdf`
    a.target = "_blank"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // Envía el PDF por email al empleado
  const sendEmail = async () => {
    if (!employeeEmail) {
      setErrMsg("Sin email registrado")
      setSt("err")
      setTimeout(() => setSt("idle"), 3500)
      return
    }

    setSt("loading")
    setErrMsg("")

    try {
      const res = await fetch(`${API}/api/payroll/voucher/send`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ payrollId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al enviar")
      setSt("ok")
    } catch (e: any) {
      setErrMsg(e.message?.slice(0, 70) || "Error al enviar")
      setSt("err")
    }

    setTimeout(() => setSt("idle"), 4000)
  }

  // ── Variante: íconos compactos para tabla ─────────────────────────────────
  if (variant === "icon") {
    return (
      <div className="flex items-center gap-1">
        {/* Descargar PDF */}
        <button
          onClick={downloadPDF}
          title="Descargar PDF"
          className={`p-1.5 rounded-lg transition-all ${
            isDark
              ? "text-slate-500 hover:text-blue-400 hover:bg-blue-900/30"
              : "text-gray-400 hover:text-blue-600 hover:bg-blue-50"
          }`}
        >
          <FileDown size={14} />
        </button>

        {/* Enviar por email */}
        <button
          onClick={sendEmail}
          disabled={st === "loading"}
          title={
            !employeeEmail
              ? "Sin email registrado"
              : st === "ok"
              ? "¡Enviado!"
              : `Enviar a ${employeeEmail}`
          }
          className={`p-1.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            st === "ok"
              ? isDark
                ? "text-green-400 bg-green-900/30"
                : "text-green-600 bg-green-50"
              : st === "err"
              ? isDark
                ? "text-red-400 bg-red-900/30"
                : "text-red-600 bg-red-50"
              : !employeeEmail
              ? "text-slate-700 cursor-not-allowed"
              : isDark
              ? "text-slate-500 hover:text-indigo-400 hover:bg-indigo-900/30"
              : "text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"
          }`}
        >
          {st === "loading" ? (
            <Loader2 size={14} className="animate-spin" />
          ) : st === "ok" ? (
            <CheckCircle size={14} />
          ) : st === "err" ? (
            <XCircle size={14} />
          ) : (
            <Mail size={14} />
          )}
        </button>
      </div>
    )
  }

  // ── Variante: botones con texto ───────────────────────────────────────────
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          onClick={downloadPDF}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold border transition-all ${
            isDark
              ? "border-slate-700 text-slate-300 hover:border-blue-700 hover:text-blue-400 hover:bg-blue-900/20"
              : "border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50"
          }`}
        >
          <FileDown size={13} /> Descargar PDF
        </button>

        <button
          onClick={sendEmail}
          disabled={st === "loading" || !employeeEmail}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 ${
            st === "ok"
              ? "bg-green-600 text-white"
              : st === "err"
              ? "bg-red-600/20 text-red-400 border border-red-700"
              : isDark
              ? "bg-indigo-600 hover:bg-indigo-500 text-white"
              : "bg-indigo-600 hover:bg-indigo-700 text-white"
          }`}
        >
          {st === "loading" ? (
            <Loader2 size={13} className="animate-spin" />
          ) : st === "ok" ? (
            <CheckCircle size={13} />
          ) : st === "err" ? (
            <XCircle size={13} />
          ) : (
            <Send size={13} />
          )}
          {st === "loading"
            ? "Enviando…"
            : st === "ok"
            ? "Enviado ✓"
            : "Enviar email"}
        </button>
      </div>
      {st === "err" && errMsg && (
        <p className="text-[11px] text-red-400 text-center">{errMsg}</p>
      )}
    </div>
  )
}

// ─── ENVÍO MASIVO ─────────────────────────────────────────────────────────────
interface VoucherSenderBulkProps {
  payrollRunId?: string
  payrollIds?: string[]
  totalEmployees: number
  totalWithEmail?: number
  isDark?: boolean
  onComplete?: (r: BulkResult) => void
}

export const VoucherSenderBulk: React.FC<VoucherSenderBulkProps> = ({
  payrollRunId,
  payrollIds,
  totalEmployees,
  totalWithEmail,
  isDark = true,
  onComplete,
}) => {
  const [phase, setPhase] = useState<"idle" | "confirm" | "sending" | "done">("idle")
  const [result, setResult] = useState<BulkResult | null>(null)
  const [showErrors, setShowErrors] = useState(false)

  const doSend = async () => {
    setPhase("sending")
    try {
      const body = payrollIds?.length ? { payrollIds } : { payrollRunId }
      const res = await fetch(`${API}/api/payroll/voucher/send-bulk`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
      })
      const data: BulkResult = await res.json()
      if (!res.ok) throw new Error((data as any).error || "Error en envío masivo")
      setResult(data)
      setPhase("done")
      onComplete?.(data)
    } catch (e: any) {
      setResult({
        success: false,
        total: totalEmployees,
        sent: 0,
        failed: totalEmployees,
        skipped: 0,
        message: e.message,
      })
      setPhase("done")
    }
  }

  // ── Idle: botón principal ─────────────────────────────────────────────────
  if (phase === "idle") {
    return (
      <button
        onClick={() => setPhase("confirm")}
        disabled={totalEmployees === 0}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 ${
          isDark
            ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/40"
            : "bg-indigo-600 hover:bg-indigo-700 text-white"
        }`}
      >
        <Users size={16} />
        Enviar a todos ({totalWithEmail ?? totalEmployees})
      </button>
    )
  }

  // ── Confirmación ──────────────────────────────────────────────────────────
  if (phase === "confirm") {
    return (
      <div
        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border ${
          isDark
            ? "bg-slate-800 border-slate-600"
            : "bg-amber-50 border-amber-200"
        }`}
      >
        <AlertCircle size={16} className="text-amber-400 shrink-0" />
        <p className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-amber-800"}`}>
          ¿Enviar comprobante a{" "}
          <strong>{totalWithEmail ?? totalEmployees} empleados</strong>?
        </p>
        <div className="flex gap-2 ml-auto">
          <button
            onClick={doSend}
            className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
          >
            Sí, enviar
          </button>
          <button
            onClick={() => setPhase("idle")}
            className={`px-3 py-1 rounded-lg text-xs font-medium ${
              isDark
                ? "bg-slate-700 hover:bg-slate-600 text-slate-300"
                : "bg-gray-200 hover:bg-gray-300 text-gray-700"
            }`}
          >
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  // ── Enviando ──────────────────────────────────────────────────────────────
  if (phase === "sending") {
    return (
      <div
        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl ${
          isDark ? "bg-slate-800 text-slate-300" : "bg-gray-100 text-gray-700"
        }`}
      >
        <Loader2 size={16} className="animate-spin text-indigo-400" />
        <span className="text-sm font-medium">Enviando comprobantes…</span>
      </div>
    )
  }

  // ── Resultado ─────────────────────────────────────────────────────────────
  const r = result!
  return (
    <div
      className={`rounded-2xl border p-4 min-w-[260px] max-w-xs ${
        isDark
          ? "bg-slate-900 border-slate-700"
          : "bg-white border-gray-200 shadow-md"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {r.failed === 0 && r.skipped === 0 ? (
            <CheckCircle size={17} className="text-green-400" />
          ) : (
            <AlertCircle size={17} className="text-amber-400" />
          )}
          <span className={`text-sm font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
            {r.failed === 0 && r.skipped === 0 ? "¡Enviado con éxito!" : "Envío completado"}
          </span>
        </div>
        <button
          onClick={() => { setPhase("idle"); setResult(null); setShowErrors(false) }}
          className={`text-xs px-2 py-1 rounded-lg ${
            isDark
              ? "text-slate-500 hover:bg-slate-800 hover:text-slate-300"
              : "text-gray-400 hover:bg-gray-100"
          }`}
        >
          Cerrar
        </button>
      </div>

      {/* Contadores */}
      <div className="flex flex-wrap gap-2 mb-3">
        {r.sent > 0 && (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/15 text-green-400">
            <CheckCircle size={10} /> {r.sent} enviados
          </span>
        )}
        {r.failed > 0 && (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/15 text-red-400">
            <XCircle size={10} /> {r.failed} fallidos
          </span>
        )}
        {r.skipped > 0 && (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400">
            <AlertCircle size={10} /> {r.skipped} sin email
          </span>
        )}
      </div>

      {/* Detalle de errores */}
      {r.errors && r.errors.length > 0 && (
        <div className="mb-3">
          <button
            onClick={() => setShowErrors(v => !v)}
            className={`text-xs underline underline-offset-2 ${
              isDark
                ? "text-slate-500 hover:text-slate-400"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {showErrors ? "Ocultar" : "Ver"} detalles ({r.errors.length})
          </button>
          {showErrors && (
            <div
              className={`mt-2 max-h-36 overflow-y-auto rounded-xl p-2 space-y-1 text-xs ${
                isDark ? "bg-slate-800" : "bg-gray-50"
              }`}
            >
              {r.errors.map((e, i) => (
                <div
                  key={i}
                  className={`flex justify-between gap-3 ${isDark ? "text-slate-400" : "text-gray-600"}`}
                >
                  <span className="truncate font-medium">{e.employee}</span>
                  <span className="text-red-400 shrink-0">{e.error}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        onClick={doSend}
        className={`w-full flex items-center justify-center gap-2 py-1.5 rounded-xl text-xs font-semibold transition-all ${
          isDark
            ? "bg-slate-800 hover:bg-slate-700 text-slate-300"
            : "bg-gray-100 hover:bg-gray-200 text-gray-700"
        }`}
      >
        <Send size={11} /> Reenviar
      </button>
    </div>
  )
}

export default VoucherSender
