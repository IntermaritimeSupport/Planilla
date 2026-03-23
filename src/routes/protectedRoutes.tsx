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
  const { selectedCompany } = useCompany();

  // 🔒 1. No está logueado → redirigir al login
  if (!isLogged) {
    return <Navigate to="/" replace={false} state={{ from: location }} />;
  }

  // 🔒 2. Logueado pero sin empresa válida seleccionada → redirigir a selector
  // Excepción: global_admin no necesita empresa seleccionada
  const isGlobalAdmin = auth.roles.includes("global_admin");
  if (!isGlobalAdmin && (!selectedCompany || selectedCompany?.id === "na")) {
    return <Navigate to="/select-company" replace={false} state={{ from: location }} />;
  }

  // 🔒 3. Verificar roles permitidos
  if (!auth.roles.some((role) => allowedRoles.includes(role))) {
    const fallback = selectedCompany?.code
      ? `/${selectedCompany.code}/dashboard`
      : "/";
    return <Navigate to={fallback} replace={false} state={{ from: location }} />;
  }

  // ✅ Todo bien → mostrar el contenido
  return children;
};

export default ProtectedRoute;
