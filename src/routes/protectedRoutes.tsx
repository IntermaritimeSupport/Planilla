import { Navigate, useLocation } from "react-router-dom";
import { User } from "./approutes";
import { useCompany } from "../context/routerContext";

interface ProtectedRouteProps {
  auth: User;
  allowedRoles: string[];
  children: React.ReactNode;
  isLogged: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ auth, allowedRoles, children, isLogged }) => {
  const location = useLocation();
  const { selectedCompany, companies, isLoadingCompanies } = useCompany();

  // 🔒 1. No está logueado → redirigir al login
  if (!isLogged) {
    return <Navigate to="/" replace={false} state={{ from: location }} />;
  }

  // 🔒 2. Perfil/roles aún no disponibles → esperar sin redirigir
  if (auth.roles.length === 0) {
    return null;
  }

  const isGlobalAdmin = auth.roles.includes("global_admin");

  // 🔒 3. Empresas cargando → esperar sin redirigir
  if (!isGlobalAdmin && isLoadingCompanies) {
    return null;
  }

  // 🔒 4. Sin empresa → solo settings permitido, resto bloqueado
  if (!isGlobalAdmin && companies.length === 0) {
    const isSettings = location.pathname.includes("/settings");
    if (!isSettings) {
      return <Navigate to="/setup/settings/all" replace />;
    }
    return children;
  }

  // 🔒 5. Sin empresa seleccionada → redirigir a selector
  if (!isGlobalAdmin && (!selectedCompany || selectedCompany?.id === "na")) {
    return <Navigate to="/select-company" replace={false} state={{ from: location }} />;
  }

  // 🔒 6. Verificar roles permitidos
  if (!auth.roles.some((role) => allowedRoles.includes(role))) {
    const fallback = selectedCompany?.code
      ? `/${selectedCompany.code}/dashboard/all`
      : "/";
    return <Navigate to={fallback} replace={false} state={{ from: location }} />;
  }

  // ✅ Todo bien → mostrar el contenido
  return children;
};

export default ProtectedRoute;
