import { useState } from "react"
import { ChevronUp, ChevronDown, Eye, Edit, Trash2 } from "lucide-react"
import { useTheme } from "../../context/themeContext"

interface TablaProps {
  datos: any[]
  titulo: string
  columnasPersonalizadas?: Record<string, (item: any) => React.ReactNode>
  onVer?: (item: any) => void
  onEditar?: (item: any) => void
  onEliminar?: (item: any) => void
  mostrarAcciones?: boolean
}

export default function Tabla({
  datos,
  titulo,
  columnasPersonalizadas,
  onVer,
  onEditar,
  onEliminar,
  mostrarAcciones = true,
}: TablaProps) {
  const { isDarkMode } = useTheme()
  const [ordenar, setOrdenar] = useState<{
    columna: string | null
    direccion: "asc" | "desc"
  }>({
    columna: null,
    direccion: "asc",
  })

  const obtenerColumnas = () => {
    if (columnasPersonalizadas) {
      return Object.keys(columnasPersonalizadas)
    }

    if (datos && datos.length > 0) {
      return Object.keys(datos[0]).filter((col) => col !== "id")
    }
    return []
  }

  const columnas = obtenerColumnas()

  const ordenarDatos = (columna: string) => {
    let nuevaDireccion: "asc" | "desc" = "asc"

    if (ordenar.columna === columna && ordenar.direccion === "asc") {
      nuevaDireccion = "desc"
    }

    const datosOrdenados = [...datos].sort((a, b) => {
      const valA = a[columna]
      const valB = b[columna]

      if (typeof valA === "string") {
        return nuevaDireccion === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA)
      }

      return nuevaDireccion === "asc" ? valA - valB : valB - valA
    })

    setOrdenar({ columna, direccion: nuevaDireccion })
    datos.splice(0, datos.length, ...datosOrdenados)
  }

  const IconoOrden = ({ columna }: { columna: string }) => {
    if (ordenar.columna !== columna) return <div className="w-4 h-4" />
    return ordenar.direccion === "asc" ? (
      <ChevronUp size={16} className={isDarkMode ? "text-gray-300" : "text-gray-600"} />
    ) : (
      <ChevronDown size={16} className={isDarkMode ? "text-gray-300" : "text-gray-600"} />
    )
  }

  if (!datos || datos.length === 0) {
    return (
      <div className={`rounded-xl border p-6 mt-6 transition-colors ${
        isDarkMode
          ? 'bg-gray-800 border-gray-700'
          : 'bg-white border-gray-200'
      }`}>
        <p className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
          No hay datos disponibles
        </p>
      </div>
    )
  }

  return (
    <div className={`rounded-xl border mt-6 transition-colors ${
      isDarkMode
        ? 'bg-gray-800 border-gray-700'
        : 'bg-white border-gray-200'
    }`}>
      <div className={`p-6 border-b transition-colors ${
        isDarkMode
          ? 'border-gray-700'
          : 'border-gray-200'
      }`}>
        <h2 className={`text-xl font-semibold capitalize ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        }`}>
          {titulo}
        </h2>
        <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {datos.length} registros encontrados
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className={`border-b transition-colors ${
              isDarkMode
                ? 'border-gray-700'
                : 'border-gray-200'
            }`}>
              {columnas.map((col) => (
                <th
                  key={col}
                  onClick={() => ordenarDatos(col)}
                  className={`py-3 px-4 text-left font-semibold cursor-pointer transition ${
                    isDarkMode
                      ? 'text-gray-300 hover:bg-gray-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {col}
                    <IconoOrden columna={col} />
                  </div>
                </th>
              ))}
              {mostrarAcciones && (
                <th className={`py-3 px-4 text-center font-semibold ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Acciones
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {datos.map((item, idx) => (
              <tr
                key={idx}
                className={`border-b transition ${
                  isDarkMode
                    ? 'border-gray-700 hover:bg-gray-700'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                {columnas.map((col) => (
                  <td 
                    key={`${idx}-${col}`} 
                    className={`py-3 px-4 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    {columnasPersonalizadas?.[col]
                      ? columnasPersonalizadas[col](item)
                      : typeof item[col] === "boolean"
                      ? item[col]
                        ? "Sí"
                        : "No"
                      : String(item[col] ?? "-")}
                  </td>
                ))}

                {mostrarAcciones && (
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-2">
                      {onVer && (
                        <button
                          onClick={() => onVer(item)}
                          className={`flex items-center px-3 py-1 border rounded-lg transition ${
                            isDarkMode
                              ? 'border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white'
                              : 'border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white'
                          }`}
                          title="Ver"
                        >
                          <Eye size={14} />
                        </button>
                      )}

                      {onEditar && (
                        <button
                          onClick={() => onEditar(item)}
                          className={`flex items-center px-3 py-1 border rounded-lg transition ${
                            isDarkMode
                              ? 'border-orange-600 text-orange-400 hover:bg-orange-600 hover:text-white'
                              : 'border-orange-500 text-orange-600 hover:bg-orange-500 hover:text-white'
                          }`}
                          title="Editar"
                        >
                          <Edit size={14} />
                        </button>
                      )}

                      {onEliminar && (
                        <button
                          onClick={() => onEliminar(item)}
                          className={`flex items-center px-3 py-1 border rounded-lg transition ${
                            isDarkMode
                              ? 'border-red-600 text-red-400 hover:bg-red-600 hover:text-white'
                              : 'border-red-500 text-red-600 hover:bg-red-500 hover:text-white'
                          }`}
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}