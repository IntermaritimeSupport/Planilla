import { Navigate, useLocation } from "react-router-dom";
import { useCompany } from "../context/routerContext";
import useUserProfile from "../hook/userUserProfile";
import { getUserRoles } from "./routesConfig";
import { Loader2 } from "lucide-react";

interface ProtectedCompanyRouteProps {
  children: React.ReactNode;
  isLogged: boolean;
}

const ProtectedCompanyRoute: React.FC<ProtectedCompanyRouteProps> = ({children, isLogged }) => {
  const location = useLocation();
  const { selectedCompany, isLoadingCompanies } = useCompany();
  const { profile } = useUserProfile();

  // 🚪 1. No logueado → login
  if (!isLogged) {
    return <Navigate to="/" replace={false} state={{ from: location }} />;
  }

  // 🚪 2. GLOBAL_ADMIN nunca necesita seleccionar empresa → su panel
  const isGlobalAdmin = profile ? getUserRoles(profile).includes("global_admin") : false;
  if (isGlobalAdmin) {
    return <Navigate to="/admin/overview" replace />;
  }

  // ⏳ 3. Esperando que carguen las empresas del usuario
  if (isLoadingCompanies) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1a3e] to-[#2d1b4e] flex items-center justify-center">
        <Loader2 className="text-purple-400 animate-spin" size={32} />
      </div>
    );
  }

  // 🚪 4. Ya hay empresa válida Y viene de una navegación interna (no post-login) → dashboard
  // Si selectedCompany está en localStorage y el usuario ya eligió antes, lo mandamos directo.
  // Pero si llegamos aquí sin selectedCompany (post-login con localStorage limpio), mostramos selector.
  const hasSavedCompany = Boolean(localStorage.getItem('selectedCompany'));
  if (hasSavedCompany && selectedCompany && selectedCompany.id !== "na") {
    return <Navigate to={`/${selectedCompany.code}/dashboard/all`} replace={false} />;
  }

  // ✅ 5. Logueado pero sin empresa guardada → mostrar selector
  return children;
};

export default ProtectedCompanyRoute;
