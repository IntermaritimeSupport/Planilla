import { useState } from "react"
import { ChevronUp, ChevronDown, Eye, Edit, Trash2 } from "lucide-react"

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
      <ChevronUp size={16} className="text-gray-300" />
    ) : (
      <ChevronDown size={16} className="text-gray-300" />
    )
  }

  if (!datos || datos.length === 0) {
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mt-6">
        <p className="text-gray-400">No hay datos disponibles</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 mt-6">
      <div className="p-6 border-b border-gray-700">
        <h2 className="text-xl font-semibold text-white capitalize">
          {titulo}
        </h2>
        <p className="text-gray-400 text-sm mt-1">
          {datos.length} registros encontrados
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              {columnas.map((col) => (
                <th
                  key={col}
                  onClick={() => ordenarDatos(col)}
                  className="py-3 px-4 text-left font-semibold text-gray-300 cursor-pointer hover:bg-gray-700 transition"
                >
                  <div className="flex items-center gap-2">
                    {col}
                    <IconoOrden columna={col} />
                  </div>
                </th>
              ))}
              {mostrarAcciones && (
                <th className="py-3 px-4 text-center font-semibold text-gray-300">
                  Acciones
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {datos.map((item, idx) => (
              <tr
                key={idx}
                className="border-b border-gray-700 hover:bg-gray-700 transition"
              >
                {columnas.map((col) => (
                  <td key={`${idx}-${col}`} className="py-3 px-4 text-gray-300">
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
                          className="flex items-center px-3 py-1 border border-blue-600 text-blue-400 rounded-lg hover:bg-blue-600 hover:text-white transition"
                          title="Ver"
                        >
                          <Eye size={14} />
                        </button>
                      )}

                      {onEditar && (
                        <button
                          onClick={() => onEditar(item)}
                          className="flex items-center px-3 py-1 border border-orange-600 text-orange-400 rounded-lg hover:bg-orange-600 hover:text-white transition"
                          title="Editar"
                        >
                          <Edit size={14} />
                        </button>
                      )}

                      {onEliminar && (
                        <button
                          onClick={() => onEliminar(item)}
                          className="flex items-center px-3 py-1 border border-red-600 text-red-400 rounded-lg hover:bg-red-600 hover:text-white transition"
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
