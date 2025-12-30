// src/components/forms/updateNetwork.tsx
import React, { useState, useEffect } from "react";
import useSWR from "swr";
import { useNavigate, useParams } from "react-router-dom";
import { useCompany } from "../../../../context/routerContext";
import { CurrentPathname } from "../../../../components/layouts/main";

const { VITE_API_URL } = import.meta.env;
const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface NetworkFormData {
  name: string;
  status: "ONLINE" | "OFFLINE" | "MAINTENANCE" | "DECOMMISSIONED" | "UNKNOWN";
  location: string;
  description: string;
  notes: string;
  ssid: string;
  password: string;
  ip: string;
  dns: string;
  gw: string;
  uploadSpeed: string;
  downloadSpeed: string;
  companyId: string;
  assignedToUserId: string;
  createdByUserId: string;
  providerId: string;
}

interface User {
  id: string;
  username: string;
  email: string;
}

interface Provider {
  id: string;
  name: string;
  speed?: string;
  cost?: number;
}

interface Company {
  id: string;
  name: string;
  code: string;
}

interface UpdateNetworkFormProps {
  networkID?: string;
  selectedCompany?: Company | null;
  currentPathname?: CurrentPathname

}

const UpdateNetworkForm: React.FC<UpdateNetworkFormProps> = ({
  networkID,
}) => {
  const navigate = useNavigate();
  const { id: urlNetworkId } = useParams<{ id: string }>();
  const actualNetworkId = networkID || urlNetworkId;
  const isEditing = !!actualNetworkId;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { selectedCompany } = useCompany();

  const [formData, setFormData] = useState<NetworkFormData>({
    name: "",
    status: "UNKNOWN",
    location: "",
    description: "",
    notes: "",
    ssid: "",
    password: "",
    ip: "",
    dns: "",
    gw: "",
    uploadSpeed: "",
    downloadSpeed: "",
    companyId: selectedCompany?.id || "",
    assignedToUserId: "",
    createdByUserId: "",
    providerId: "",
  });

  // Fetch usuarios
  const { data: users, isLoading: usersLoading, error: usersError } = useSWR<User[]>(
    `${VITE_API_URL}/api/users/getAll`,
    fetcher,
    { revalidateOnFocus: false }
  );

  // Fetch proveedores por compañía
  const { data: providersResponse, isLoading: providersLoading, error: providersError } = useSWR<any>(
    selectedCompany?.id ? `${VITE_API_URL}/api/network/providers/${selectedCompany.id}/all` : null,
    async (url) => {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          console.error(`Error ${res.status}: ${res.statusText}`);
          throw new Error(`HTTP ${res.status}`);
        }
        const text = await res.text();
        return JSON.parse(text);
      } catch (error) {
        console.error("Error fetching providers:", error);
        throw error;
      }
    },
    { revalidateOnFocus: false }
  );

  // Extraer providers del response
  const providers: Provider[] = Array.isArray(providersResponse)
    ? providersResponse
    : providersResponse?.providers || [];

  // Fetch network si es edición
  const { data: networkData, isLoading: networkLoading } = useSWR<any>(
    actualNetworkId ? `${VITE_API_URL}/api/network/${selectedCompany?.id}/${actualNetworkId}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  // Cargar datos cuando se edita
  useEffect(() => {
    if (isEditing && networkData) {
      setFormData({
        name: networkData.name || "",
        status: networkData.status || "UNKNOWN",
        location: networkData.location || "",
        description: networkData.description || "",
        notes: networkData.notes || "",
        ssid: networkData.ssid || "",
        password: networkData.password || "",
        ip: networkData.ip || "",
        dns: networkData.dns || "",
        gw: networkData.gw || "",
        uploadSpeed: networkData.uploadSpeed || "",
        downloadSpeed: networkData.downloadSpeed || "",
        companyId: networkData.companyId || selectedCompany?.id || "",
        assignedToUserId: networkData.assignedToUserId || "",
        createdByUserId: networkData.createdByUserId || "",
        providerId: networkData.providerId || "",
      });
    }
  }, [networkData, isEditing, selectedCompany]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    // Validación básica
    if (!formData.name.trim()) {
      setError("El nombre de la red es obligatorio");
      setLoading(false);
      return;
    }

    if (!formData.companyId) {
      setError("La compañía no está seleccionada. Por favor, recarga la página.");
      setLoading(false);
      return;
    }

    try {
      const method = isEditing ? "PUT" : "POST";
      const url = isEditing
        ? `${VITE_API_URL}/api/network/${selectedCompany?.id}/${actualNetworkId}`
        : `${VITE_API_URL}/api/network/create`;

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al guardar la red");
      }

      setSuccess(true);
      setTimeout(() => {
        navigate(`/${selectedCompany?.code}/network/all`);
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Error al guardar la red");
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (networkLoading) {
    return <div className="text-center text-gray-400">Cargando red...</div>;
  }

  if (!selectedCompany?.id) {
    return (
      <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-4 text-yellow-200">
        ⚠️ No hay compañía seleccionada. Por favor, selecciona una compañía antes de continuar.
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-slate-800 border border-slate-700 rounded-xl p-8 space-y-6"
    >
      {error && (
        <div className="p-4 bg-red-900 border border-red-700 rounded-lg text-red-200">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-900 border border-green-700 rounded-lg text-green-200">
          ✅ Red guardada exitosamente. Redirigiendo...
        </div>
      )}

      {/* Información Básica */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">
          Información Básica
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nombre de la Red *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Ej: WiFi Oficina Principal"
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Ubicación
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="Ej: Piso 3, Sala de Servidores"
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Estado
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="UNKNOWN">Desconocido</option>
              <option value="ONLINE">En línea</option>
              <option value="OFFLINE">Desconectado</option>
              <option value="MAINTENANCE">Mantenimiento</option>
              <option value="DECOMMISSIONED">Desactivado</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Descripción
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe la red..."
            rows={3}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Configuración WiFi */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">
          Configuración WiFi
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              SSID (Nombre WiFi)
            </label>
            <input
              type="text"
              name="ssid"
              value={formData.ssid}
              onChange={handleChange}
              placeholder="Ej: RED-OFFICE-5GHz"
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Contraseña WiFi
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-4.803m5.596-3.856a3.375 3.375 0 11-4.753 4.753m4.753-4.753L3.596 3.039m10.318 10.318L21 21"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Configuración de Red */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">
          Configuración de Red
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Dirección IP
            </label>
            <input
              type="text"
              name="ip"
              value={formData.ip}
              onChange={handleChange}
              placeholder="192.168.1.1"
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              DNS
            </label>
            <input
              type="text"
              name="dns"
              value={formData.dns}
              onChange={handleChange}
              placeholder="8.8.8.8"
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Gateway (GW)
            </label>
            <input
              type="text"
              name="gw"
              value={formData.gw}
              onChange={handleChange}
              placeholder="192.168.1.254"
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Velocidad */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Velocidad</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Velocidad de Descarga (Mbps)
            </label>
            <input
              type="text"
              name="downloadSpeed"
              value={formData.downloadSpeed}
              onChange={handleChange}
              placeholder="100"
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Velocidad de Subida (Mbps)
            </label>
            <input
              type="text"
              name="uploadSpeed"
              value={formData.uploadSpeed}
              onChange={handleChange}
              placeholder="50"
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Asignaciones */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Asignaciones</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Proveedor
            </label>
            {providersError && (
              <div className="text-xs text-red-400 mb-2">
                Error cargando proveedores
              </div>
            )}
            <select
              name="providerId"
              value={formData.providerId}
              onChange={handleChange}
              disabled={providersLoading}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="">
                {providersLoading ? "Cargando..." : "Sin proveedor"}
              </option>
              {Array.isArray(providers) &&
                providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}{" "}
                    {provider.speed ? `- ${provider.speed}` : ""}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Asignado a Usuario
            </label>
            {usersError && (
              <div className="text-xs text-red-400 mb-2">
                Error cargando usuarios
              </div>
            )}
            <select
              name="assignedToUserId"
              value={formData.assignedToUserId}
              onChange={handleChange}
              disabled={usersLoading}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="">
                {usersLoading ? "Cargando..." : "Sin asignar"}
              </option>
              {Array.isArray(users) &&
                users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.username} ({user.email})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Creado por
            </label>
            <select
              name="createdByUserId"
              value={formData.createdByUserId}
              onChange={handleChange}
              disabled={usersLoading}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="">Seleccionar usuario</option>
              {Array.isArray(users) &&
                users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.username}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* Notas */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Notas
        </label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Notas adicionales sobre la red..."
          rows={3}
          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Botones */}
      <div className="flex justify-end gap-4 pt-6">
        <button
          type="button"
          onClick={() => navigate(`/${selectedCompany?.code}/network/all`)}
          className="px-6 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white font-medium hover:bg-slate-600 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 rounded-lg text-white font-medium hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Guardando..." : isEditing ? "Actualizar" : "Crear"}
        </button>
      </div>
    </form>
  );
};

export default UpdateNetworkForm;