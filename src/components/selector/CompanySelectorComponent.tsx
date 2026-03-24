// CompanySelectorComponent.tsx
import { useLocation, useNavigate } from 'react-router-dom';
import { useCompany } from '../../context/routerContext.tsx';
import { useCallback } from 'react';
import { UserProfile } from '../../context/userProfileContext.tsx';
import { ChevronDown } from 'lucide-react';
import { mutate } from 'swr';

export interface Company {
  id: string;
  code: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string;
  _count: {
    users: number;
    equipments: number;
    licenses: number;
    documents: number;
    maintenances: number;
  };
}

type Props = {
  profile?: UserProfile | null;
  isDarkMode?: boolean;
};

const CompanySelectorComponent: React.FC<Props> = ({ isDarkMode = true }) => {
  const { selectedCompany, handleCompanyChange, companies } = useCompany();
  const location = useLocation();
  const navigate = useNavigate();

  const handleChangeAndNavigate = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const newCompanyCode = event.target.value;
    const newCompany = companies.find(c => c.code === newCompanyCode);

    if (newCompany) {
      localStorage.setItem('selectedCompany', JSON.stringify(newCompany));
    }
    handleCompanyChange(event);

    // Forzar revalidación de todo el caché SWR para que las páginas fetchen datos frescos
    mutate(() => true);

    // Reemplazar el primer segmento (companyCode) manteniendo el resto de la ruta
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const knownCodes = companies.map(c => c.code);
    let newPath: string;
    if (pathSegments.length >= 1 && knownCodes.includes(pathSegments[0])) {
      pathSegments[0] = newCompanyCode;
      newPath = '/' + pathSegments.join('/');
    } else {
      newPath = `/${newCompanyCode}/dashboard/all`;
    }

    // Navegación sin reload — los SWR reaccionan al cambio de selectedCompany en el contexto
    navigate(newPath, { replace: true });
  }, [handleCompanyChange, location.pathname, companies, navigate]);

  // Solo mostrar activas en el selector del navbar
  const activeCompanies = companies.filter(c => c.isActive);

  return (
    <div className="w-full">
      <div className="relative w-full">
        <select
          className={`w-full rounded-lg px-3 py-2 text-sm appearance-none cursor-pointer transition-colors border ${
            isDarkMode
              ? "bg-slate-800 border-slate-700 text-white hover:border-slate-600 focus:ring-blue-500"
              : "bg-white border-gray-300 text-gray-900 hover:border-gray-400 focus:ring-blue-500"
          } focus:outline-none focus:ring-2 focus:border-transparent`}
          onChange={handleChangeAndNavigate}
          value={selectedCompany?.isActive ? selectedCompany.code : ''}
        >
          {activeCompanies.length > 0 ? (
            activeCompanies.map((company) => (
              <option key={company.id} value={company.code} className={isDarkMode ? "bg-slate-800 text-white" : "bg-white text-gray-900"}>
                {company.name}
              </option>
            ))
          ) : (
            <option value="">Sin empresas activas</option>
          )}
        </select>
        <div className={`absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none ${isDarkMode ? "text-slate-400" : "text-gray-400"}`}>
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}

export default CompanySelectorComponent;