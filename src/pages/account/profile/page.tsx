"use client"

import useSWR from "swr"
import { useTheme } from "../../../context/themeContext"
import { formatValue } from "../../../utils/formatNull"
import { UsuarioFull } from "../../../utils/usuarioFull"
import Loader from "../../../components/loaders/loader.tsx"

const { VITE_API_URL } = import.meta.env

interface ProfilePageProps {
    userId : string
}
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ProfilePage({ userId }: ProfilePageProps) {
  const { isDarkMode } = useTheme()
  const { data, error, isLoading } = useSWR(`${VITE_API_URL}/api/users/profile/${userId}`, fetcher)
  console.log("User Data:", data);
  if (isLoading) {
    return (
        <Loader/>
    );
  }

  if (error || !data) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors ${
        isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
      }`}>
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
        return isDarkMode ? "bg-red-600 text-red-100" : "bg-red-100 text-red-800"
      case "ADMIN":
        return isDarkMode ? "bg-orange-600 text-orange-100" : "bg-orange-100 text-orange-800"
      case "USER":
        return isDarkMode ? "bg-blue-600 text-blue-100" : "bg-blue-100 text-blue-800"
      default:
        return isDarkMode ? "bg-gray-600 text-gray-100" : "bg-gray-200 text-gray-800"
    }
  }

  const getStatusBadge = (status: any, isActive: boolean) => {
    if (!isActive) return isDarkMode ? "bg-red-600 text-red-100" : "bg-red-100 text-red-800"
    switch (status) {
      case "Activo":
        return isDarkMode ? "bg-green-600 text-green-100" : "bg-green-100 text-green-800"
      case "Inactivo":
        return isDarkMode ? "bg-red-600 text-red-100" : "bg-red-100 text-red-800"
      default:
        return isDarkMode ? "bg-gray-600 text-gray-100" : "bg-gray-200 text-gray-800"
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
    <div className={`min-h-screen transition-colors ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="p-6">
        {/* Profile Header */}
        <div className={`rounded-lg p-8 border mb-8 transition-colors ${
          isDarkMode
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-6">
              {/* Avatar */}
              <div className={`w-24 h-24 rounded-full flex items-center justify-center font-bold text-2xl transition-colors ${
                isDarkMode
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-500 text-white'
              }`}>
                {getInitials(formatValue(userData?.person?.fullName))}
              </div>

              {/* Basic Info */}
              <div>
                <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {formatValue(userData?.person?.fullName)}
                </h1>
                <p className={`text-lg mb-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {formatValue(userData?.person?.department?.name)}
                </p>
                <div className="flex items-center space-x-4">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors ${getRoleBadge(userData?.role)}`}
                  >
                    {userData?.role?.replace("_", " ")}
                  </span>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors ${getStatusBadge(userData?.person?.status, userData?.isActive)}`}
                  >
                    {userData?.isActive ? userData?.person?.status : "Inactivo"}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button className={`flex items-center space-x-2 text-white px-4 py-2 rounded-lg transition-colors ${
                isDarkMode
                  ? 'bg-gray-700 hover:bg-gray-600'
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}>
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
          <div className={`rounded-lg p-6 border transition-colors ${
            isDarkMode
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-6 h-6">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`w-full h-full ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="m22 21-3-3m0 0a5.5 5.5 0 1 0-7.78-7.78 5.5 5.5 0 0 0 7.78 7.78Z" />
                </svg>
              </div>
              <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Información Personal
              </h2>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Nombre
                  </label>
                  <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                    {formatValue(userData?.person?.firstName)}
                  </p>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Apellido
                  </label>
                  <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                    {formatValue(userData?.person?.lastName)}
                  </p>
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Nombre Completo
                </label>
                <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                  {formatValue(userData?.person?.fullName)}
                </p>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Código de Usuario
                </label>
                <p className={`font-mono ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {formatValue(userData?.person?.userCode)}
                </p>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  ID de Usuario
                </label>
                <p className={`font-mono text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {formatValue(userData?.id)}
                </p>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className={`rounded-lg p-6 border transition-colors ${
            isDarkMode
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-6 h-6">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`w-full h-full ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Información de Contacto
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Email Principal
                </label>
                <div className="flex items-center space-x-2">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
                  >
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                    {formatValue(userData?.email)}
                  </p>
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Email de Contacto
                </label>
                <div className="flex items-center space-x-2">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
                  >
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                    {formatValue(userData?.person?.contactEmail)}
                  </p>
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Teléfono
                </label>
                <div className="flex items-center space-x-2">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
                  >
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                    {formatValue(userData?.person?.phoneNumber)}
                  </p>
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Nombre de Usuario
                </label>
                <p className={`font-mono ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {formatValue(userData?.username)}
                </p>
              </div>
            </div>
          </div>

          {/* Professional Information */}
          <div className={`rounded-lg p-6 border transition-colors ${
            isDarkMode
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-6 h-6">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`w-full h-full ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}
                >
                  <path d="M3 21h18" />
                  <path d="M5 21V7l8-4v18" />
                  <path d="M19 21V11l-6-4" />
                </svg>
              </div>
              <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Información Profesional
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Departamento
                </label>
                <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                  {formatValue(userData?.person?.department?.name)}
                </p>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Posición
                </label>
                <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                  {formatValue(userData?.person?.position)}
                </p>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Rol del Sistema
                </label>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors ${getRoleBadge(userData?.role)}`}
                >
                  {userData?.role?.replace("_", " ")}
                </span>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Estado
                </label>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors ${getStatusBadge(userData?.person?.status, userData?.isActive)}`}
                >
                  {userData?.isActive ? userData?.person?.status : "Inactivo"}
                </span>
              </div>
            </div>
          </div>

          {/* Companies Information */}
          <div className={`rounded-lg p-6 border transition-colors ${
            isDarkMode
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-6 h-6">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`w-full h-full ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}
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
              <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Compañías Asignadas
              </h2>
            </div>

            <div className="space-y-4">
              {userData?.companies && userData.companies.length > 0 ? (
                userData.companies.map((userCompany, index) => (
                  <div 
                    key={index} 
                    className={`rounded-lg p-4 border transition-colors ${
                      isDarkMode
                        ? 'bg-gray-700 border-gray-600'
                        : 'bg-gray-100 border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {userCompany.company.name}
                      </h3>
                      <span className={`text-xs font-mono ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {userCompany.company.code}
                      </span>
                    </div>
                    <div className={`space-y-1 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {userCompany.company.address && (
                        <p>📍 {userCompany.company.address}</p>
                      )}
                      {userCompany.company.phone && (
                        <p>📞 {userCompany.company.phone}</p>
                      )}
                      {userCompany.company.email && (
                        <p>✉️ {userCompany.company.email}</p>
                      )}
                      {userCompany.company.ruc && (
                        <p>🆔 RUC: {userCompany.company.ruc}</p>
                      )}
                      <div className="flex items-center space-x-2 mt-2">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                            userCompany.company.isActive
                              ? isDarkMode
                                ? 'bg-green-600 text-green-100'
                                : 'bg-green-100 text-green-800'
                              : isDarkMode
                              ? 'bg-red-600 text-red-100'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {userCompany.company.isActive ? "Activa" : "Inactiva"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                  No tiene compañías asignadas
                </p>
              )}
            </div>
          </div>

          {/* System Information */}
          <div className={`rounded-lg p-6 border transition-colors ${
            isDarkMode
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-6 h-6">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`w-full h-full ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}
                >
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
              <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Información del Sistema
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Fecha de Creación
                </label>
                <div className="flex items-center space-x-2">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                    {formatValue(formatDate(userData?.createdAt))}
                  </p>
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Última Actualización
                </label>
                <div className="flex items-center space-x-2">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
                  >
                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                    <path d="M21 3v5h-5" />
                    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                    <path d="M8 16H3v5" />
                  </svg>
                  <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                    {formatValue(formatDate(userData?.updatedAt))}
                  </p>
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  ID de Persona
                </label>
                <p className={`font-mono text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {formatValue(userData?.person?.id)}
                </p>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Cuenta Activa
                </label>
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
                  <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                    {userData?.isActive ? "Sí" : "No"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}