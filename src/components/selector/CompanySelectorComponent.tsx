// CompanySelectorComponent.tsx
import { useLocation } from 'react-router-dom';
import { useCompany } from '../../context/routerContext.tsx';
import { useCallback } from 'react';
import { UserProfile } from '../../context/userProfileContext.tsx';
import { ChevronDown } from 'lucide-react';

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

  const handleChangeAndNavigate = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    // Guardar la nueva empresa en el contexto/localStorage antes de recargar
    handleCompanyChange(event);
    const newCompanyCode = event.target.value;

    // Reemplazar el code en la ruta actual o ir al dashboard
    const pathSegments = location.pathname.split('/');
    let newPath: string;
    if (pathSegments.length >= 2 && pathSegments[1] && pathSegments[1] !== 'select-company') {
      pathSegments[1] = newCompanyCode;
      newPath = pathSegments.join('/');
    } else {
      newPath = `/${newCompanyCode}/dashboard/all`;
    }

    // Hard reload para que todos los SWR se reinicien con el nuevo companyId
    window.location.href = newPath;
  }, [handleCompanyChange, location.pathname]);

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