"use client"

// ─────────────────────────────────────────────────────────────────────────────
// ExportButtons.tsx
// Componente reutilizable de botones Excel + PDF con menú desplegable
// Uso: <ExportButtons onExcel={fn} onPDF={fn} isDark={isDark} disabled={!rows.length} />
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from "react"
import { Download, FileSpreadsheet, FileText, ChevronDown, Loader2 } from "lucide-react"

interface ExportButtonsProps {
  onExcel: () => void
  onPDF: () => void
  isDark: boolean
  disabled?: boolean
  label?: string
}

export const ExportButtons: React.FC<ExportButtonsProps> = ({
  onExcel,
  onPDF,
  isDark,
  disabled = false,
  label = "Exportar",
}) => {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState<"excel" | "pdf" | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  // Cerrar al hacer click afuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const handle = async (type: "excel" | "pdf", fn: () => void) => {
    setLoading(type)
    setOpen(false)
    try {
      await new Promise(r => setTimeout(r, 80)) // tick para que el spinner aparezca
      fn()
    } finally {
      setLoading(null)
    }
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        disabled={disabled || loading !== null}
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm ${
          disabled || loading !== null
            ? "opacity-40 cursor-not-allowed"
            : ""
        } ${
          isDark
            ? "bg-indigo-600 hover:bg-indigo-500 text-white"
            : "bg-indigo-600 hover:bg-indigo-700 text-white"
        }`}
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Download size={14} />
        )}
        {loading === "excel" ? "Generando Excel…" : loading === "pdf" ? "Generando PDF…" : label}
        {!loading && <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />}
      </button>

      {open && !disabled && (
        <div className={`absolute right-0 mt-1 w-52 rounded-xl border shadow-xl z-50 overflow-hidden ${
          isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"
        }`}>
          {/* Excel */}
          <button
            onClick={() => handle("excel", onExcel)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
              isDark
                ? "hover:bg-slate-700 text-gray-200"
                : "hover:bg-gray-50 text-gray-800"
            }`}
          >
            <div className={`p-1.5 rounded-lg ${isDark ? "bg-emerald-500/20" : "bg-emerald-100"}`}>
              <FileSpreadsheet size={14} className="text-emerald-500" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-xs">Exportar Excel</p>
              <p className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-500"}`}>.xlsx — editable</p>
            </div>
          </button>

          <div className={`mx-3 border-t ${isDark ? "border-slate-700" : "border-gray-100"}`} />

          {/* PDF */}
          <button
            onClick={() => handle("pdf", onPDF)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
              isDark
                ? "hover:bg-slate-700 text-gray-200"
                : "hover:bg-gray-50 text-gray-800"
            }`}
          >
            <div className={`p-1.5 rounded-lg ${isDark ? "bg-red-500/20" : "bg-red-100"}`}>
              <FileText size={14} className="text-red-500" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-xs">Exportar PDF</p>
              <p className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-500"}`}>.pdf — listo para imprimir</p>
            </div>
          </button>
        </div>
      )}
    </div>
  )
}
