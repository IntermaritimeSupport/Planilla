"use client"

import useSWR from "swr"
import { formatValue } from "../../../utils/formatNull"
import { UsuarioFull } from "../../../utils/usuarioFull"
import Loader from "../../../components/loaders/loader.tsx"

const { VITE_API_URL } = import.meta.env

interface ProfilePageProps {
    userId : string
}
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ProfilePage({ userId }: ProfilePageProps) {
  const { data, error, isLoading } = useSWR(`${VITE_API_URL}/api/users/profile/${userId}`, fetcher)
  console.log("User Data:", data);
  if (isLoading) {
    return (
        <Loader/>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <span>Error al cargar el perfil.</span>
      </div>
    );
  }

  const userData: UsuarioFull = data;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "bg-red-600 text-red-100"
      case "ADMIN":
        return "bg-orange-600 text-orange-100"
      case "USER":
        return "bg-blue-600 text-blue-100"
      default:
        return "bg-gray-600 text-gray-100"
    }
  }

  const getStatusBadge = (status: any, isActive: boolean) => {
    if (!isActive) return "bg-red-600 text-red-100"
    switch (status) {
      case "Activo":
        return "bg-green-600 text-green-100"
      case "Inactivo":
        return "bg-red-600 text-red-100"
      default:
        return "bg-gray-600 text-gray-100"
    }
  }

  const getInitials = (fullName: string) => {
    return fullName
      .split(" ")
      .map((name) => name[0])
      .join("")
      .toUpperCase()
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="p-6">
        {/* Profile Header */}
        <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 mb-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-6">
              {/* Avatar */}
              <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                {getInitials(formatValue(userData?.person?.fullName))}
              </div>

              {/* Basic Info */}
              <div>
                <h1 className="text-3xl font-bold mb-2">{formatValue(userData?.person?.fullName)}</h1>
                <p className="text-gray-400 text-lg mb-3">{formatValue(userData?.person?.department?.name)}</p>
                <div className="flex items-center space-x-4">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRoleBadge(userData?.role)}`}
                  >
                    {userData?.role?.replace("_", " ")}
                  </span>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(userData?.person?.status, userData?.isActive)}`}
                  >
                    {userData?.isActive ? userData?.person?.status : "Inactivo"}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <span>Editar Perfil</span>
              </button>
              <button className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                <span>Configuración</span>
              </button>
            </div>
          </div>
        </div>

        {/* Profile Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Personal Information */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-6 h-6">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-full h-full text-blue-400"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="m22 21-3-3m0 0a5.5 5.5 0 1 0-7.78-7.78 5.5 5.5 0 0 0 7.78 7.78Z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold">Información Personal</h2>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Nombre</label>
                  <p className="text-white">{formatValue(userData?.person?.firstName)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Apellido</label>
                  <p className="text-white">{formatValue(userData?.person?.lastName)}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Nombre Completo</label>
                <p className="text-white">{formatValue(userData?.person?.fullName)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Código de Usuario</label>
                <p className="text-white font-mono">{formatValue(userData?.person?.userCode)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">ID de Usuario</label>
                <p className="text-white font-mono text-sm">{formatValue(userData?.id)}</p>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-6 h-6">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-full h-full text-green-400"
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <h2 className="text-xl font-bold">Información de Contacto</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Email Principal</label>
                <div className="flex items-center space-x-2">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="w-4 h-4 text-gray-400"
                  >
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  <p className="text-white">{formatValue(userData?.email)}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Email de Contacto</label>
                <div className="flex items-center space-x-2">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="w-4 h-4 text-gray-400"
                  >
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  <p className="text-white">{formatValue(userData?.person?.contactEmail)}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Teléfono</label>
                <div className="flex items-center space-x-2">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="w-4 h-4 text-gray-400"
                  >
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  <p className="text-white">{formatValue(userData?.person?.phoneNumber)}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Nombre de Usuario</label>
                <p className="text-white font-mono">{formatValue(userData?.username)}</p>
              </div>
            </div>
          </div>

          {/* Professional Information */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-6 h-6">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-full h-full text-purple-400"
                >
                  <path d="M3 21h18" />
                  <path d="M5 21V7l8-4v18" />
                  <path d="M19 21V11l-6-4" />
                </svg>
              </div>
              <h2 className="text-xl font-bold">Información Profesional</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Departamento</label>
                <p className="text-white">{formatValue(userData?.person?.department?.name)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Posición</label>
                <p className="text-white">{formatValue(userData?.person?.position)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Rol del Sistema</label>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRoleBadge(userData?.role)}`}
                >
                  {userData?.role?.replace("_", " ")}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Estado</label>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(userData?.person?.status, userData?.isActive)}`}
                >
                  {userData?.isActive ? userData?.person?.status : "Inactivo"}
                </span>
              </div>
            </div>
          </div>

          {/* Companies Information */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-6 h-6">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-full h-full text-yellow-400"
                >
                  <path d="M3 21h18" />
                  <path d="M5 21V7l8-4v18" />
                  <path d="M19 21V11l-6-4" />
                  <path d="M9 9v.01" />
                  <path d="M9 12v.01" />
                  <path d="M9 15v.01" />
                  <path d="M9 18v.01" />
                </svg>
              </div>
              <h2 className="text-xl font-bold">Compañías Asignadas</h2>
            </div>

            <div className="space-y-4">
              {userData?.companies && userData.companies.length > 0 ? (
                userData.companies.map((userCompany, index) => (
                  <div key={index} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-white">{userCompany.company.name}</h3>
                      <span className="text-xs font-mono text-gray-400">{userCompany.company.code}</span>
                    </div>
                    <div className="space-y-1 text-sm">
                      {userCompany.company.address && (
                        <p className="text-gray-300">📍 {userCompany.company.address}</p>
                      )}
                      {userCompany.company.phone && (
                        <p className="text-gray-300">📞 {userCompany.company.phone}</p>
                      )}
                      {userCompany.company.email && (
                        <p className="text-gray-300">✉️ {userCompany.company.email}</p>
                      )}
                      {userCompany.company.ruc && (
                        <p className="text-gray-300">🆔 RUC: {userCompany.company.ruc}</p>
                      )}
                      <div className="flex items-center space-x-2 mt-2">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            userCompany.company.isActive
                              ? "bg-green-600 text-green-100"
                              : "bg-red-600 text-red-100"
                          }`}
                        >
                          {userCompany.company.isActive ? "Activa" : "Inactiva"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-400">No tiene compañías asignadas</p>
              )}
            </div>
          </div>

          {/* System Information */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-6 h-6">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-full h-full text-orange-400"
                >
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
              <h2 className="text-xl font-bold">Información del Sistema</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Fecha de Creación</label>
                <div className="flex items-center space-x-2">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="w-4 h-4 text-gray-400"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <p className="text-white">{formatValue(formatDate(userData?.createdAt))}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Última Actualización</label>
                <div className="flex items-center space-x-2">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="w-4 h-4 text-gray-400"
                  >
                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                    <path d="M21 3v5h-5" />
                    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                    <path d="M8 16H3v5" />
                  </svg>
                  <p className="text-white">{formatValue(formatDate(userData?.updatedAt))}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">ID de Persona</label>
                <p className="text-white font-mono text-sm">{formatValue(userData?.person?.id)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Cuenta Activa</label>
                <div className="flex items-center space-x-2">
                  {userData.isActive ? (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="w-4 h-4 text-green-400"
                    >
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22,4 12,14.01 9,11.01" />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="w-4 h-4 text-red-400"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                  )}
                  <p className="text-white">{userData?.isActive ? "Sí" : "No"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}