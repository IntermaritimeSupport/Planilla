import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';

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
  handleCompanyChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}

export const CompanyContext = createContext<CompanyContextType | null>(null);

interface CompanyProviderProps {
  children: ReactNode;
  initialCompanies: Company[];
}

export const CompanyProvider = ({ children, initialCompanies }: CompanyProviderProps) => {
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
    if (initialCompanies && initialCompanies.length > 0 && !selectedCompany) {
      setSelectedCompany(initialCompanies[0]);
    }
    if (initialCompanies && initialCompanies.length > 0 && companies !== initialCompanies) {
        setCompanies(initialCompanies);
    }
  }, [initialCompanies, selectedCompany, companies]);
  const handleCompanyChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const companyCode = event.target.value;
    const company = companies.find(c => c.code === companyCode);
    setSelectedCompany(company || null);
  };

  return (
    <CompanyContext.Provider value={{ selectedCompany, setSelectedCompany, companies, handleCompanyChange }}>
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