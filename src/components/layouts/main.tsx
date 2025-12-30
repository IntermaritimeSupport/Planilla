import useSWR from "swr";
import { AppRoutes } from "../../routes/approutes";
import { useEffect, useState } from "react";
import { CompanyProvider } from "../../context/routerContext";
import useUser from "../../hook/useUser";
import useUserProfile from "../../hook/userUserProfile";
import { SearchProvider } from "../../context/searchContext";

const { VITE_API_URL } = import.meta.env;

export interface CurrentPathname {
  name: string;
}

interface RoutesProps {
  isLogged: boolean;
}

const fetcher = (url: string) => 
  fetch(url, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('jwt') || ''}`,
    },
  }).then((res) => {
    if (!res.ok) throw new Error('Failed to fetch companies');
    return res.json();
  });

const fallbackCompanies = [
  {
    id: "na",
    name: "N/A",
    address: "N/A",
    phone: "N/A",
    email: "N/A",
    isActive: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export interface CurrentPathname {
  name: string;
}

const Layout: React.FC<RoutesProps> = () => {
  const [pathnameLocation, setCurrentPathname] = useState<CurrentPathname>({ name: '' });
  const [, setShowError] = useState(false);
  const { isLogged } = useUser();
  const { profile } = useUserProfile();

  useEffect(() => {
    setCurrentPathname({ name: window.location.pathname });
  }, []);

  const { data, error } = useSWR(
    isLogged ? `${VITE_API_URL}/api/companies/${profile?.id}/my-companies` : null,
    fetcher,
    {
      fallbackData: fallbackCompanies,
      revalidateOnFocus: true,
      shouldRetryOnError: true,
      errorRetryInterval: 5000,
      errorRetryCount: 10,
    }
  );

  useEffect(() => {
    if (error) {
      console.error("Error al cargar compañías:", error);
      setShowError(true);
    } else if (data && data[0]?.id !== "na") {
      setShowError(false);
    }
  }, [error, data]);

  const companies = data || fallbackCompanies;

  return (
    <CompanyProvider initialCompanies={companies}>
      <SearchProvider>
        <main className="w-full relative scroll-smooth">
          <AppRoutes pathnameLocation={pathnameLocation} companies={companies} />
        </main>
      </SearchProvider>
    </CompanyProvider>
  );
};

export default Layout;