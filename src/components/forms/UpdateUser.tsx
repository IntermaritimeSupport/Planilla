import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useSWR from "swr";
import Select from "react-select";
import { useTheme } from "../../context/themeContext";
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
  const { isDarkMode } = useTheme();
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
    userCode: "",
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
        userCode: userData.person?.userCode || "",
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
      if (!selectedCompanies || selectedCompanies.length === 0) {
        throw new Error("Debe seleccionar al menos una compañía");
      }
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
        companyIds: selectedCompanies.map(c => c.value),
        ...(formData.userCode && { userCode: formData.userCode }),
      };

      if (formData.password) {
        payload.password = formData.password;
      }

      if (isEditMode) {
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
        const response = await fetch(`${VITE_API_URL}/api/users/create`, {
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
      backgroundColor: isDarkMode ? "#374151" : "#ffffff",
      borderColor: errors.companies ? "#ef4444" : isDarkMode ? "#4b5563" : "#d1d5db",
      color: isDarkMode ? "#ffffff" : "#1f2937",
      minHeight: "42px",
      "&:hover": {
        borderColor: isDarkMode ? "#6b7280" : "#9ca3af",
      },
    }),
    menu: (base: any) => ({
      ...base,
      backgroundColor: isDarkMode ? "#374151" : "#ffffff",
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isFocused 
        ? isDarkMode ? "#4b5563" : "#e5e7eb"
        : isDarkMode ? "#374151" : "#ffffff",
      color: isDarkMode ? "#ffffff" : "#1f2937",
      "&:hover": {
        backgroundColor: isDarkMode ? "#4b5563" : "#e5e7eb",
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
      color: isDarkMode ? "#ffffff" : "#1f2937",
    }),
    placeholder: (base: any) => ({
      ...base,
      color: isDarkMode ? "#9ca3af" : "#6b7280",
    }),
    singleValue: (base: any) => ({
      ...base,
      color: isDarkMode ? "#ffffff" : "#1f2937",
    }),
  };

  if (userError) {
    return (
      <div className={`border rounded-lg p-6 ${
        isDarkMode
          ? 'bg-red-900/30 border-red-600 text-red-300'
          : 'bg-red-100 border-red-300 text-red-800'
      }`}>
        <p>Error al cargar los datos del usuario</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {submitError && (
        <div className={`border rounded-lg p-4 ${
          isDarkMode
            ? 'bg-red-900/30 border-red-600 text-red-300'
            : 'bg-red-100 border-red-300 text-red-800'
        }`}>
          {submitError}
        </div>
      )}

      {/* Información de Cuenta */}
      <div className={`rounded-lg p-6 border transition-colors ${
        isDarkMode
          ? 'bg-gray-800 border-gray-700'
          : 'bg-white border-gray-200'
      }`}>
        <h2 className={`text-xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Información de Cuenta
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Nombre de Usuario *
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                errors.username
                  ? "border-red-500"
                  : isDarkMode
                  ? "border-gray-600"
                  : "border-gray-300"
              } ${
                isDarkMode
                  ? 'bg-gray-700 text-white'
                  : 'bg-white text-gray-900'
              }`}
              placeholder="usuario123"
            />
            {errors.username && <p className="text-red-400 text-sm mt-1">{errors.username}</p>}
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Email *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                errors.email
                  ? "border-red-500"
                  : isDarkMode
                  ? "border-gray-600"
                  : "border-gray-300"
              } ${
                isDarkMode
                  ? 'bg-gray-700 text-white'
                  : 'bg-white text-gray-900'
              }`}
              placeholder="usuario@ejemplo.com"
            />
            {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Contraseña {!isEditMode && "*"}
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                errors.password
                  ? "border-red-500"
                  : isDarkMode
                  ? "border-gray-600"
                  : "border-gray-300"
              } ${
                isDarkMode
                  ? 'bg-gray-700 text-white'
                  : 'bg-white text-gray-900'
              }`}
              placeholder={isEditMode ? "Dejar vacío para mantener la actual" : "••••••••"}
            />
            {errors.password && <p className="text-red-400 text-sm mt-1">{errors.password}</p>}
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Confirmar Contraseña {!isEditMode && "*"}
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                errors.confirmPassword
                  ? "border-red-500"
                  : isDarkMode
                  ? "border-gray-600"
                  : "border-gray-300"
              } ${
                isDarkMode
                  ? 'bg-gray-700 text-white'
                  : 'bg-white text-gray-900'
              }`}
              placeholder="••••••••"
            />
            {errors.confirmPassword && (
              <p className="text-red-400 text-sm mt-1">{errors.confirmPassword}</p>
            )}
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Rol *
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
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
              className={`w-4 h-4 rounded focus:ring-blue-500 ${
                isDarkMode
                  ? 'text-blue-600 bg-gray-700 border-gray-600'
                  : 'text-blue-600 bg-white border-gray-300'
              }`}
            />
            <label className={`ml-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Cuenta Activa
            </label>
          </div>
        </div>
      </div>

      {/* Información Personal */}
      <div className={`rounded-lg p-6 border transition-colors ${
        isDarkMode
          ? 'bg-gray-800 border-gray-700'
          : 'bg-white border-gray-200'
      }`}>
        <h2 className={`text-xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Información Personal
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Nombre *
            </label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                errors.firstName
                  ? "border-red-500"
                  : isDarkMode
                  ? "border-gray-600"
                  : "border-gray-300"
              } ${
                isDarkMode
                  ? 'bg-gray-700 text-white'
                  : 'bg-white text-gray-900'
              }`}
              placeholder="Juan"
            />
            {errors.firstName && <p className="text-red-400 text-sm mt-1">{errors.firstName}</p>}
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Apellido *
            </label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                errors.lastName
                  ? "border-red-500"
                  : isDarkMode
                  ? "border-gray-600"
                  : "border-gray-300"
              } ${
                isDarkMode
                  ? 'bg-gray-700 text-white'
                  : 'bg-white text-gray-900'
              }`}
              placeholder="Pérez"
            />
            {errors.lastName && <p className="text-red-400 text-sm mt-1">{errors.lastName}</p>}
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Email de Contacto
            </label>
            <input
              type="email"
              name="contactEmail"
              value={formData.contactEmail}
              onChange={handleChange}
              className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="contacto@ejemplo.com"
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Teléfono
            </label>
            <input
              type="tel"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="+507 1234-5678"
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Posición
            </label>
            <input
              type="text"
              name="position"
              value={formData.position}
              onChange={handleChange}
              className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="Desarrollador"
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Departamento
            </label>
            <select
              name="departmentId"
              value={formData.departmentId}
              onChange={handleChange}
              className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
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
            <label className={`block text-sm font-medium mb-2 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Estado
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>

          {isEditMode && formData.userCode && (
            <div className="md:col-span-2">
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Código de Usuario
              </label>
              <input
                type="text"
                name="userCode"
                value={formData.userCode}
                disabled
                className={`w-full border rounded-lg px-4 py-2 cursor-not-allowed transition-colors ${
                  isDarkMode
                    ? 'bg-gray-600 border-gray-500 text-gray-400'
                    : 'bg-gray-100 border-gray-300 text-gray-600'
                }`}
              />
              <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                El código de usuario se asigna automáticamente y no puede ser modificado
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Compañías Asignadas */}
      <div className={`rounded-lg p-6 border transition-colors ${
        isDarkMode
          ? 'bg-gray-800 border-gray-700'
          : 'bg-white border-gray-200'
      }`}>
        <h2 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Compañías Asignadas *
        </h2>
        <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
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
            <p className={`text-sm mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
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
          className={`px-6 py-2 rounded-lg transition-colors disabled:opacity-50 ${
            isDarkMode
              ? 'bg-gray-700 hover:bg-gray-600 text-white'
              : 'bg-gray-300 hover:bg-gray-400 text-gray-900'
          }`}
          disabled={isSubmitting}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2 disabled:opacity-50"
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