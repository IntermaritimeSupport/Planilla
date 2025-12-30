import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"

const API_URL = import.meta.env.VITE_API_URL

interface AssignedUser {
  id: string
  name: string
  lastName: string
  email?: string
  department?: string
}

export default function ExpenseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [expense, setExpense] = useState<any>(null)
  const [assignedUsers, setAssignedUsers] = useState<AssignedUser[]>([])
  const [loading, setLoading] = useState(true)

  // ===============================
  // Modal
  // ===============================
  const [showModal, setShowModal] = useState(false)
  const [newUser, setNewUser] = useState({
    name: "",
    lastName: "",
    email: "",
    department: "",
  })

  // ===============================
  // Cargar gasto
  // ===============================
  const loadExpense = async () => {
    setLoading(true)
    const res = await fetch(
      `${API_URL}/api/annual-software-expense/get/${id}`
    )
    const data = await res.json()
    setExpense(data)
    setAssignedUsers(data.assignedUsers || [])
    setLoading(false)
  }

  useEffect(() => {
    loadExpense()
  }, [id])

  // ===============================
  // Crear usuario asignado
  // ===============================
  const createAssignedUser = async () => {
    if (!newUser.name || !newUser.lastName) {
      alert("Nombre y apellido son obligatorios")
      return
    }

    const res = await fetch(
      `${API_URL}/api/annual-software-expense/assigned-users/create`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newUser.name,
          lastName: newUser.lastName,
          email: newUser.email || null,
          department: newUser.department || null,
          expenseId: id, // ✅ CLAVE CORRECTA
        }),
      }
    )

    if (!res.ok) {
      alert("Error al asignar usuario")
      return
    }

    const created = await res.json()
    setAssignedUsers((prev) => [...prev, created])
    setNewUser({ name: "", lastName: "", email: "", department: "" })
    setShowModal(false)
  }

  // ===============================
  // Eliminar usuario asignado
  // ===============================
  const removeUser = async (userId: string) => {
    if (!confirm("¿Eliminar usuario asignado?")) return

    const res = await fetch(
      `${API_URL}/api/annual-software-expense/assigned-users/delete/${userId}`,
      { method: "DELETE" }
    )

    if (!res.ok) {
      alert("Error al eliminar usuario")
      return
    }

    setAssignedUsers((prev) => prev.filter((u) => u.id !== userId))
  }

  if (loading) return <p className="p-6 text-gray-400">Cargando...</p>

  return (
    <div className="p-6 space-y-6 text-gray-100">
      {/* Volver */}
      <button onClick={() => navigate(-1)} className="text-sm text-gray-400">
        ← Volver
      </button>

      <h1 className="text-2xl font-semibold">
        Reporte: {expense.applicationName}
      </h1>

      {/* ===============================
          INFO DEL GASTO
      =============================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-800 p-4 rounded-xl text-sm">
        <p><strong>Proveedor:</strong> {expense.provider}</p>
        <p><strong>Categoría:</strong> {expense.category}</p>
        <p><strong>Estado:</strong> {expense.status}</p>
        <p><strong>Frecuencia de Pago:</strong> {expense.paymentFrequency}</p>
        <p><strong>Costo Anual:</strong> ${expense.annualCost.toFixed(2)}</p>
        <p><strong>Número de Usuarios:</strong> {expense.numberOfUsers}</p>
        <p><strong>Costo por Usuario:</strong> ${expense.costPerUser.toFixed(2)}</p>
        <p>
          <strong>Renovación:</strong>{" "}
          {new Date(expense.renewalDate).toLocaleDateString()}
        </p>

        {expense.additionalNotes && (
          <p className="md:col-span-2">
            <strong>Notas:</strong> {expense.additionalNotes}
          </p>
        )}
      </div>

      {/* ===============================
          USUARIOS ASIGNADOS
      =============================== */}
      <div className="bg-gray-800 p-4 rounded-xl">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-medium">Usuarios Asignados</h3>
          <button
            onClick={() => setShowModal(true)}
            className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded-lg text-sm"
          >
            + Asignar Usuario
          </button>
        </div>

        {assignedUsers.length === 0 ? (
          <p className="text-sm text-gray-400">No hay usuarios asignados.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-700">
                <th className="text-left py-2">Nombre</th>
                <th>Email</th>
                <th>Departamento</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {assignedUsers.map((u) => (
                <tr key={u.id} className="border-b border-gray-700">
                  <td className="py-2">
                    {u.name} {u.lastName}
                  </td>
                  <td>{u.email || "-"}</td>
                  <td>{u.department || "-"}</td>
                  <td className="text-right">
                    <button
                      onClick={() => removeUser(u.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ===============================
          MODAL ASIGNAR USUARIO
      =============================== */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">Asignar Usuario</h2>

            <input
              placeholder="Nombre *"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2"
              value={newUser.name}
              onChange={(e) =>
                setNewUser({ ...newUser, name: e.target.value })
              }
            />

            <input
              placeholder="Apellido *"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2"
              value={newUser.lastName}
              onChange={(e) =>
                setNewUser({ ...newUser, lastName: e.target.value })
              }
            />

            <input
              placeholder="Email (opcional)"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2"
              value={newUser.email}
              onChange={(e) =>
                setNewUser({ ...newUser, email: e.target.value })
              }
            />

            <input
              placeholder="Departamento (opcional)"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2"
              value={newUser.department}
              onChange={(e) =>
                setNewUser({ ...newUser, department: e.target.value })
              }
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-700 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={createAssignedUser}
                className="px-4 py-2 bg-white text-black rounded-lg"
              >
                Asignar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
