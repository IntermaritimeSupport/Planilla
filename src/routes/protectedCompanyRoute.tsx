import { Navigate, useLocation } from "react-router-dom";
import { useCompany } from "../context/routerContext";

interface ProtectedCompanyRouteProps {
  children: React.ReactNode;
  isLogged: boolean;
}

const ProtectedCompanyRoute: React.FC<ProtectedCompanyRouteProps> = ({children, isLogged }) => {
  const location = useLocation();
  const { selectedCompany } = useCompany();

  // 🚪 1. No logueado → login
  if (!isLogged) {
    return <Navigate to="/" replace={false} state={{ from: location }} />;
  }

  // 🚪 2. Ya hay empresa → dashboard
  if (selectedCompany && selectedCompany?.id !== "na") {
    return <Navigate to={`/${selectedCompany?.code}/dashboard/all`} replace={false} />;
  }

  // ✅ 3. Logueado pero sin empresa → mostrar selector
  return children;
};

export default ProtectedCompanyRoute;
