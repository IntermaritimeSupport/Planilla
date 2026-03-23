import useSWR from "swr";
import { AppRoutes } from "../../routes/approutes";
import { useEffect, useState } from "react";
import { CompanyProvider } from "../../context/routerContext";
import useUser from "../../hook/useUser";
import useUserProfile from "../../hook/userUserProfile";
import { SearchProvider } from "../../context/searchContext";
import { getUserRoles } from "../../routes/routesConfig";
import { useLocation } from "react-router-dom";

const { VITE_API_URL } = import.meta.env;

export interface CurrentPathname {
  name: string;
}

interface RoutesProps {
  isLogged: boolean;
}

const fetcher = async (url: string) => {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${localStorage.getItem('jwt') || ''}` },
  });

  if (res.status === 401) {
    localStorage.removeItem('jwt');
    localStorage.removeItem('selectedCompany');
    window.location.href = '/login';
    throw new Error('UNAUTHORIZED');
  }

  // 403 en my-companies: empresa inactiva en el token.
  // Si ya estamos en /select-company, solo devolver [] sin redirigir (evita loop).
  // Si estamos en otra ruta, limpiar y redirigir al selector.
  if (res.status === 403) {
    localStorage.removeItem('selectedCompany');
    if (!window.location.pathname.includes('select-company')) {
      window.location.href = '/select-company?reason=inactive';
      throw new Error('COMPANY_INACTIVE'); // detener ejecución
    }
    return [];
  }

  if (!res.ok) throw new Error('Failed to fetch companies');
  return res.json();
};

const EMPTY_COMPANIES: never[] = [];

const Layout: React.FC<RoutesProps> = () => {
  const [pathnameLocation, setCurrentPathname] = useState<CurrentPathname>({ name: '' });
  const { isLogged } = useUser();
  const { profile } = useUserProfile();
  const location = useLocation();

  useEffect(() => {
    setCurrentPathname({ name: window.location.pathname });
  }, []);

  const isGlobalAdmin = profile ? getUserRoles(profile).includes("global_admin") : false;

  const swrKey = isLogged && profile?.id && !isGlobalAdmin
    ? `${VITE_API_URL}/api/companies/${profile.id}/my-companies`
    : null;

  const { data, isLoading: swrLoading } = useSWR(
    swrKey,
    fetcher,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );

  // "Cargando" solo cuando la key SWR está activa pero aún no hay datos.
  // En /select-company no bloqueamos con spinner — el selector se muestra directo.
  const onSelectCompanyPage = location.pathname.includes('select-company');
  const isLoadingCompanies = !onSelectCompanyPage && !!swrKey && (swrLoading || data === undefined);

  const companies = data ?? EMPTY_COMPANIES;

  return (
    <CompanyProvider initialCompanies={companies} isLoadingCompanies={isLoadingCompanies}>
      <SearchProvider>
        <main className="w-full relative scroll-smooth">
          <AppRoutes pathnameLocation={pathnameLocation} companies={companies} />
        </main>
      </SearchProvider>
    </CompanyProvider>
  );
};

export default Layout;