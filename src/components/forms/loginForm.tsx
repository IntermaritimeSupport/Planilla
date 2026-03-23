import type React from "react"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import useUser from "../../hook/useUser"
import { decodeToken } from "../../utils/decode"

interface LoginFormProps {
  pending: boolean
  setPending: (value: boolean) => void
  showPassword: boolean
  setShowPassword: (value: boolean) => void
  error: Error | null
  setError: (error: Error | null) => void
}

export default function LoginForm({
  pending,
  setPending,
  showPassword,
  setShowPassword,
  error,
  setError,
}: LoginFormProps) {
  const { login } = useUser()

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPending(true)
    const formData = new FormData(event.currentTarget)
    const email    = formData.get("email")?.toString()
    const password = formData.get("password")?.toString()

    if (!email || !password) {
      setError(new Error("Todos los campos son obligatorios."))
      setPending(false)
      return
    }

    try {
      await login({ email, password })
      const decoded = decodeToken()
      const role = decoded?.roles?.toLowerCase() ?? ""
      if (role === "global_admin") {
        window.location.href = "/admin/overview"
        return
      }
      // Limpiar empresa seleccionada para que el selector siempre aparezca tras login
      localStorage.removeItem("selectedCompany")
      window.location.href = "/select-company"
    } catch (err) {
      setError(new Error(err instanceof Error ? err.message : "Error al iniciar sesión."))
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Email */}
      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Correo electrónico
        </label>
        <input
          type="email"
          id="email"
          name="email"
          required
          autoComplete="email"
          placeholder="tu@empresa.com"
          className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-gray-900 text-sm placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
        />
      </div>

      {/* Contraseña */}
      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Contraseña
        </label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            id="password"
            name="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-gray-900 text-sm placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition pr-11"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          <span className="mt-0.5 flex-shrink-0">⚠</span>
          <span>{error.message}</span>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={pending}
        className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-lg transition-colors duration-200 mt-1"
      >
        {pending ? (
          <>
            <Loader2 size={15} className="animate-spin" />
            Iniciando sesión…
          </>
        ) : (
          "Iniciar Sesión"
        )}
      </button>

    </form>
  )
}