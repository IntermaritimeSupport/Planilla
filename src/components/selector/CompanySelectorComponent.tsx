// CompanySelectorComponent.tsx
import { useNavigate, useLocation } from 'react-router-dom';
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
  const navigate = useNavigate();
  const location = useLocation();
  
  const handleChangeAndNavigate = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    handleCompanyChange(event);
    const newCompanyCode = event.target.value;
    console.log("New Company Code selected:", newCompanyCode);
    const currentPath = location.pathname;
    const pathSegments = currentPath.split('/');

    if (pathSegments.length >= 2) {
      pathSegments[1] = newCompanyCode;
      const newPath = pathSegments.join('/');
      navigate(newPath);
    } else {
      navigate(`/${newCompanyCode}/dashboard/all`);
    }
  }, [handleCompanyChange, navigate, location.pathname]);

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
          value={selectedCompany ? selectedCompany.code : ''}
        >
          {companies && companies.length > 0 ? (
            companies.map((company) => (
              <option key={company?.id} value={company?.code} className={isDarkMode ? "bg-slate-800 text-white" : "bg-white text-gray-900"}>
                {company?.name}
              </option>
            ))
          ) : (
            <option value="">No companies available</option>
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