"use client"

/**
 * Pagination.tsx — Componente de paginación reutilizable (Fase 4)
 * Uso: <Pagination total={100} pageSize={20} page={page} onChange={setPage} />
 */

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { useTheme } from "../../context/themeContext"

interface PaginationProps {
  total:    number          // total de items
  pageSize: number          // items por página
  page:     number          // página actual (1-based)
  onChange: (p: number) => void
  showInfo?: boolean        // mostrar "Mostrando X–Y de Z" (default true)
  compact?: boolean         // versión compacta sin texto (default false)
}

export default function Pagination({
  total,
  pageSize,
  page,
  onChange,
  showInfo = true,
  compact = false,
}: PaginationProps) {
  const { isDarkMode } = useTheme()
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (totalPages <= 1) return null

  const from = (page - 1) * pageSize + 1
  const to   = Math.min(page * pageSize, total)

  // Ventana de páginas visibles (máximo 5 botones)
  const window_size = 5
  let start = Math.max(1, page - Math.floor(window_size / 2))
  let end   = Math.min(totalPages, start + window_size - 1)
  if (end - start < window_size - 1) {
    start = Math.max(1, end - window_size + 1)
  }
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i)

  const btnBase = `flex items-center justify-center rounded-lg text-xs font-semibold transition-all select-none ${
    compact ? "h-7 w-7" : "h-8 min-w-[2rem] px-2"
  }`

  const btnActive = isDarkMode
    ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
    : "bg-blue-600 text-white shadow-md"

  const btnInactive = isDarkMode
    ? "bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white"
    : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100 hover:text-gray-900"

  const btnDisabled = `opacity-30 cursor-not-allowed ${isDarkMode ? "bg-gray-800 text-gray-600" : "bg-gray-100 text-gray-400"}`

  return (
    <div className={`flex items-center ${compact ? "gap-1" : "gap-3"} flex-wrap`}>
      {/* Info texto */}
      {showInfo && !compact && (
        <span className={`text-xs mr-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
          Mostrando <span className="font-bold">{from}–{to}</span> de <span className="font-bold">{total}</span>
        </span>
      )}

      {/* Primera */}
      <button
        className={`${btnBase} ${page === 1 ? btnDisabled : btnInactive}`}
        onClick={() => page > 1 && onChange(1)}
        disabled={page === 1}
        title="Primera página"
      >
        <ChevronsLeft size={13} />
      </button>

      {/* Anterior */}
      <button
        className={`${btnBase} ${page === 1 ? btnDisabled : btnInactive}`}
        onClick={() => page > 1 && onChange(page - 1)}
        disabled={page === 1}
        title="Página anterior"
      >
        <ChevronLeft size={13} />
      </button>

      {/* Elipsis izquierdo */}
      {start > 1 && (
        <span className={`${btnBase} ${btnInactive} cursor-default opacity-50`}>…</span>
      )}

      {/* Páginas */}
      {pages.map((p) => (
        <button
          key={p}
          className={`${btnBase} ${p === page ? btnActive : btnInactive}`}
          onClick={() => onChange(p)}
        >
          {p}
        </button>
      ))}

      {/* Elipsis derecho */}
      {end < totalPages && (
        <span className={`${btnBase} ${btnInactive} cursor-default opacity-50`}>…</span>
      )}

      {/* Siguiente */}
      <button
        className={`${btnBase} ${page === totalPages ? btnDisabled : btnInactive}`}
        onClick={() => page < totalPages && onChange(page + 1)}
        disabled={page === totalPages}
        title="Página siguiente"
      >
        <ChevronRight size={13} />
      </button>

      {/* Última */}
      <button
        className={`${btnBase} ${page === totalPages ? btnDisabled : btnInactive}`}
        onClick={() => page < totalPages && onChange(totalPages)}
        disabled={page === totalPages}
        title="Última página"
      >
        <ChevronsRight size={13} />
      </button>

      {/* Selector de página (no compact) */}
      {!compact && totalPages > 5 && (
        <select
          value={page}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`ml-1 h-8 rounded-lg px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            isDarkMode
              ? "bg-gray-700 border border-gray-600 text-white"
              : "bg-white border border-gray-200 text-gray-900"
          }`}
          title="Ir a página"
        >
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <option key={p} value={p}>Pág {p}</option>
          ))}
        </select>
      )}
    </div>
  )
}

/**
 * Hook helper para usar con Pagination
 * const { page, setPage, pageData, totalPages } = usePagination(data, 20)
 */
export function usePagination<T>(data: T[], pageSize: number) {
  return {
    // Solo exporta la función — el estado debe vivir en el componente padre
    slice: (page: number) => data.slice((page - 1) * pageSize, page * pageSize),
    totalPages: Math.ceil(data.length / pageSize),
  }
}
