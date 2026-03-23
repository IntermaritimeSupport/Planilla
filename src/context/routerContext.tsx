import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

// 1. Define the Company interface (Mantener esto aquí o en un archivo de tipos compartido)
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

interface CompanyContextType {
  selectedCompany: Company | null;
  setSelectedCompany: React.Dispatch<React.SetStateAction<Company | null>>;
  companies: Company[];
  isLoadingCompanies: boolean;
  handleCompanyChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}

export const CompanyContext = createContext<CompanyContextType | null>(null);

interface CompanyProviderProps {
  children: ReactNode;
  initialCompanies: Company[];
  isLoadingCompanies?: boolean;
}

export const CompanyProvider = ({ children, initialCompanies, isLoadingCompanies = false }: CompanyProviderProps) => {
  const location = useLocation();
  const onSelectorPage = location.pathname.includes('select-company');

  const [selectedCompany, setSelectedCompany] = useState<Company | null>(() => {
    const savedCompany = localStorage.getItem('selectedCompany');
    try {
      return savedCompany ? JSON.parse(savedCompany) : null;
    } catch (error) {
      console.error("Error parsing saved company from localStorage:", error);
      return null;
    }
  });

  const [companies, setCompanies] = useState<Company[]>(initialCompanies || []);

  useEffect(() => {
    if (selectedCompany) {
      localStorage.setItem('selectedCompany', JSON.stringify(selectedCompany));
    } else {
      localStorage.removeItem('selectedCompany');
    }
  }, [selectedCompany]);

  useEffect(() => {
    // No hacer nada mientras carga o si no hay datos reales
    if (isLoadingCompanies || !initialCompanies || initialCompanies.length === 0) return;

    // Sincronizar lista solo si los IDs cambiaron (evitar loop por referencia)
    const currentIds = companies.map(c => c.id).join(',');
    const newIds = initialCompanies.map(c => c.id).join(',');
    if (currentIds !== newIds) {
      setCompanies(initialCompanies);
    }

    // No auto-seleccionar mientras el usuario está eligiendo empresa manualmente
    if (onSelectorPage) return;

    // Auto-seleccionar primera empresa válida si no hay ninguna seleccionada aún
    if (!selectedCompany) {
      const first = initialCompanies.find(c => c.isActive && c.id !== "na") ?? null;
      if (first) setSelectedCompany(first);
    }
  }, [initialCompanies, isLoadingCompanies, onSelectorPage]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCompanyChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const companyCode = event.target.value;
    const company = companies.find(c => c.code === companyCode);
    setSelectedCompany(company || null);
  };

  return (
    <CompanyContext.Provider value={{ selectedCompany, setSelectedCompany, companies, isLoadingCompanies, handleCompanyChange }}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};