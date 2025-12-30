"use client"

import type React from "react"
import { Eye, EyeOff } from "lucide-react"

import useUser from "../../hook/useUser"
import { useCompany } from "../../context/routerContext"

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
  const { selectedCompany } = useCompany()
  const { login } = useUser()

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPending(true)
    const formData = new FormData(event.currentTarget)
    const email = formData.get("email")?.toString()
    const password = formData.get("password")?.toString()

    if (!email || !password) {
      setError(new Error("Todos los campos son obligatorios."))
      setPending(false)
      return
    }

    try {
      await login({ email, password })
      window.location.href = `/${selectedCompany?.code || "code"}/select-company`
    } catch (error) {
      setError(new Error(error instanceof Error ? error.message : "Error al iniciar sesión."))
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Email */}
      <div>
        <input
          type="email"
          required
          placeholder="Email"
          id="email"
          name="email"
          className="w-full px-4 py-3 bg-gray-100 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:bg-gray-200 transition"
        />
      </div>

      {/* Contraseña */}
      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          required
          placeholder="Contraseña"
          id="password"
          name="password"
          className="w-full px-4 py-3 bg-gray-100 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:bg-gray-200 transition pr-12"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-purple-600 hover:text-purple-700 transition"
        >
          {showPassword ? (
            <EyeOff size={20} />
          ) : (
            <Eye size={20} />
          )}
        </button>
      </div>

      {/* Checkbox Mostrar contraseña */}
      <div className="flex items-center">
        <input
          type="checkbox"
          checked={showPassword}
          onChange={() => setShowPassword(!showPassword)}
          className="w-4 h-4 rounded border-gray-300"
          id="showPassword"
        />
        <label htmlFor="showPassword" className="ml-2 text-sm text-gray-600 cursor-pointer">
          Mostrar contraseña
        </label>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-orange-600 text-sm">
          {error.message}
        </div>
      )}

      {/* Botón Sign In */}
      <button
        type="submit"
        disabled={pending}
        className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-semibold py-3 rounded-lg transition duration-300 mt-2"
      >
        {pending ? "Iniciando sesión..." : "Iniciar Sesión"}
      </button>


    </form>
  )
}