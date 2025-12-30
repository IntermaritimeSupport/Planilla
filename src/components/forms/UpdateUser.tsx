import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useSWR from "swr";
import Select from "react-select";
import { Company } from "../../context/routerContext";

const { VITE_API_URL } = import.meta.env;

interface Department {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
}

interface UserCompany {
  userId: string;
  companyId: string;
  company: {
    id: string;
    code: string;
    name: string;
  };
}

interface UserData {
  id: string;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  companies: UserCompany[];
  person: {
    firstName: string | null;
    lastName: string | null;
    fullName: string | null;
    contactEmail: string | null;
    phoneNumber: string | null;
    departmentId: string | null;
    position: string | null;
    status: string;
    userCode: string;
    department: {
      id: string;
      name: string;
    } | null;
  } | null;
}

interface CompanyOption {
  value: string;
  label: string;
  code: string;
}

interface UpdateUserProps {
  userID?: string;
  departments: Department[];
  selectedCompany: Company | null;
}

const fetcher = async (url: string) => {
  const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(url, {
    method: "GET",
    headers,
    credentials: "include",
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

export default function UpdateUser({ userID, departments, selectedCompany }: UpdateUserProps) {
  const navigate = useNavigate();
  const isEditMode = Boolean(userID);

  const { data: userData, error: userError } = useSWR<UserData>(
    userID ? `${VITE_API_URL}/api/users/profile/${userID}` : null,
    fetcher
  );

  const { data: allCompanies } = useSWR<Array<{ id: string; name: string; code: string }>>(
    `${VITE_API_URL}/api/companies/all`,
    fetcher
  );

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "USER",
    firstName: "",
    lastName: "",
    contactEmail: "",
    phoneNumber: "",
    departmentId: "",
    position: "",
    status: "Activo",
    isActive: true,
    userCode: "", // ✅ Agregar userCode
  });

  const [selectedCompanies, setSelectedCompanies] = useState<CompanyOption[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>("");

  useEffect(() => {
    if (userData && isEditMode && allCompanies) {
      setFormData({
        username: userData.username || "",
        email: userData.email || "",
        password: "",
        confirmPassword: "",
        role: userData.role || "USER",
        firstName: userData.person?.firstName || "",
        lastName: userData.person?.lastName || "",
        contactEmail: userData.person?.contactEmail || "",
        phoneNumber: userData.person?.phoneNumber || "",
        departmentId: userData.person?.departmentId || "",
        position: userData.person?.position || "",
        status: userData.person?.status || "Activo",
        isActive: userData.isActive,
        userCode: userData.person?.userCode || "", // ✅ Incluir userCode
      });

      const userCompanyOptions = userData.companies.map((uc) => ({
        value: uc.company.id,
        label: uc.company.name,
        code: uc.company.code,
      }));
      setSelectedCompanies(userCompanyOptions);
    } else if (!isEditMode && selectedCompany) {
      setSelectedCompanies([
        {
          value: selectedCompany.id,
          label: selectedCompany.name,
          code: selectedCompany.code,
        },
      ]);
    }
  }, [userData, isEditMode, allCompanies, selectedCompany]);

  const companyOptions: CompanyOption[] =
    allCompanies?.map((company) => ({
      value: company.id,
      label: company.name,
      code: company.code,
    })) || [];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim()) newErrors.username = "El nombre de usuario es requerido";
    if (!formData.email.trim()) newErrors.email = "El email es requerido";
    if (!/^\S+@\S+\.\S+$/.test(formData.email)) newErrors.email = "Email inválido";

    if (!isEditMode) {
      if (!formData.password) newErrors.password = "La contraseña es requerida";
      if (formData.password.length < 8)
        newErrors.password = "La contraseña debe tener al menos 8 caracteres";
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Las contraseñas no coinciden";
    }

    if (!formData.firstName.trim()) newErrors.firstName = "El nombre es requerido";
    if (!formData.lastName.trim()) newErrors.lastName = "El apellido es requerido";
    if (selectedCompanies.length === 0)
      newErrors.companies = "Debe seleccionar al menos una compañía";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

      // ✅ Preparar payload con companyIds como array
      const payload: any = {
        username: formData.username,
        email: formData.email,
        role: formData.role,
        firstName: formData.firstName,
        lastName: formData.lastName,
        contactEmail: formData.contactEmail || formData.email,
        phoneNumber: formData.phoneNumber,
        departmentId: formData.departmentId || null,
        position: formData.position,
        status: formData.status,
        isActive: formData.isActive,
        companyIds: selectedCompanies.map(c => c.value), // ✅ Array de IDs
        userCode: formData.userCode || undefined, // ✅ Incluir userCode
      };

      if (formData.password) {
        payload.password = formData.password;
      }

      if (isEditMode) {
        // ✅ MODO EDICIÓN: Una sola llamada PUT con companyIds
        const response = await fetch(`${VITE_API_URL}/api/users/edit/${userID}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          credentials: "include",
          body: JSON.stringify(payload),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Error al actualizar el usuario");
        }
      } else {
        // ✅ MODO CREACIÓN: Una sola llamada POST con companyIds
        const response = await fetch(`${VITE_API_URL}/api/users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          credentials: "include",
          body: JSON.stringify(payload),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Error al crear el usuario");
        }
      }

      navigate(`/${selectedCompany?.code}/users/all`);
    } catch (error: any) {
      console.error("Error submitting form:", error);
      setSubmitError(error.message || "Error al guardar el usuario");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const customStyles = {
    control: (base: any) => ({
      ...base,
      backgroundColor: "#374151",
      borderColor: errors.companies ? "#ef4444" : "#4b5563",
      minHeight: "42px",
      "&:hover": {
        borderColor: "#6b7280",
      },
    }),
    menu: (base: any) => ({
      ...base,
      backgroundColor: "#374151",
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isFocused ? "#4b5563" : "#374151",
      color: "#ffffff",
      "&:hover": {
        backgroundColor: "#4b5563",
      },
    }),
    multiValue: (base: any) => ({
      ...base,
      backgroundColor: "#3b82f6",
    }),
    multiValueLabel: (base: any) => ({
      ...base,
      color: "#ffffff",
    }),
    multiValueRemove: (base: any) => ({
      ...base,
      color: "#ffffff",
      "&:hover": {
        backgroundColor: "#2563eb",
        color: "#ffffff",
      },
    }),
    input: (base: any) => ({
      ...base,
      color: "#ffffff",
    }),
    placeholder: (base: any) => ({
      ...base,
      color: "#9ca3af",
    }),
    singleValue: (base: any) => ({
      ...base,
      color: "#ffffff",
    }),
  };

  if (userError) {
    return (
      <div className="bg-red-900/30 border border-red-600 rounded-lg p-6 text-red-300">
        <p>Error al cargar los datos del usuario</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {submitError && (
        <div className="bg-red-900/30 border border-red-600 rounded-lg p-4 text-red-300">
          {submitError}
        </div>
      )}

      {/* Información de Cuenta */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-xl font-bold mb-6 text-white">Información de Cuenta</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nombre de Usuario *
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className={`w-full bg-gray-700 border ${
                errors.username ? "border-red-500" : "border-gray-600"
              } rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="usuario123"
            />
            {errors.username && <p className="text-red-400 text-sm mt-1">{errors.username}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full bg-gray-700 border ${
                errors.email ? "border-red-500" : "border-gray-600"
              } rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="usuario@ejemplo.com"
            />
            {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Contraseña {!isEditMode && "*"}
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={`w-full bg-gray-700 border ${
                errors.password ? "border-red-500" : "border-gray-600"
              } rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder={isEditMode ? "Dejar vacío para mantener la actual" : "••••••••"}
            />
            {errors.password && <p className="text-red-400 text-sm mt-1">{errors.password}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Confirmar Contraseña {!isEditMode && "*"}
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={`w-full bg-gray-700 border ${
                errors.confirmPassword ? "border-red-500" : "border-gray-600"
              } rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="••••••••"
            />
            {errors.confirmPassword && (
              <p className="text-red-400 text-sm mt-1">{errors.confirmPassword}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Rol *</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="USER">Usuario</option>
              <option value="ADMIN">Administrador</option>
              <option value="MODERATOR">Moderador</option>
              <option value="SUPER_ADMIN">Super Administrador</option>
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            />
            <label className="ml-2 text-sm text-gray-300">Cuenta Activa</label>
          </div>
        </div>
      </div>

      {/* Información Personal */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-xl font-bold mb-6 text-white">Información Personal</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Nombre *</label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              className={`w-full bg-gray-700 border ${
                errors.firstName ? "border-red-500" : "border-gray-600"
              } rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="Juan"
            />
            {errors.firstName && <p className="text-red-400 text-sm mt-1">{errors.firstName}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Apellido *</label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              className={`w-full bg-gray-700 border ${
                errors.lastName ? "border-red-500" : "border-gray-600"
              } rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="Pérez"
            />
            {errors.lastName && <p className="text-red-400 text-sm mt-1">{errors.lastName}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email de Contacto
            </label>
            <input
              type="email"
              name="contactEmail"
              value={formData.contactEmail}
              onChange={handleChange}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="contacto@ejemplo.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Teléfono</label>
            <input
              type="tel"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+507 1234-5678"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Posición</label>
            <input
              type="text"
              name="position"
              value={formData.position}
              onChange={handleChange}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Desarrollador"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Departamento</label>
            <select
              name="departmentId"
              value={formData.departmentId}
              onChange={handleChange}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar departamento</option>
              {departments?.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Estado</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>

          {/* ✅ Mostrar userCode solo en modo edición (solo lectura) */}
          {isEditMode && formData.userCode && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Código de Usuario
              </label>
              <input
                type="text"
                name="userCode"
                value={formData.userCode}
                disabled
                className="w-full bg-gray-600 border border-gray-500 rounded-lg px-4 py-2 text-gray-400 cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 mt-1">
                El código de usuario se asigna automáticamente y no puede ser modificado
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Compañías Asignadas */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-xl font-bold mb-4 text-white">Compañías Asignadas *</h2>
        <p className="text-gray-400 text-sm mb-4">
          Seleccione una o más compañías a las que pertenecerá este usuario
        </p>
        <Select
          isMulti
          options={companyOptions}
          value={selectedCompanies}
          onChange={(selected) => {
            setSelectedCompanies(selected as CompanyOption[]);
            if (errors.companies) {
              setErrors((prev) => ({ ...prev, companies: "" }));
            }
          }}
          styles={customStyles}
          placeholder="Seleccionar compañías..."
          noOptionsMessage={() => "No hay compañías disponibles"}
        />
        {errors.companies && <p className="text-red-400 text-sm mt-1">{errors.companies}</p>}

        {selectedCompanies.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-gray-400 mb-2">
              {selectedCompanies.length} compañía(s) seleccionada(s)
            </p>
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={() => navigate(`/${selectedCompany?.code}/users/all`)}
          className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          disabled={isSubmitting}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              <span>Guardando...</span>
            </>
          ) : (
            <span>{isEditMode ? "Actualizar Usuario" : "Crear Usuario"}</span>
          )}
        </button>
      </div>
    </form>
  );
}