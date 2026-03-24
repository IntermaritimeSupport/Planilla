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
  const companies = initialCompanies || [];

  const [selectedCompany, setSelectedCompany] = useState<Company | null>(() => {
    try {
      const saved = localStorage.getItem('selectedCompany');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Persistir en localStorage cada vez que cambia
  useEffect(() => {
    if (selectedCompany) {
      localStorage.setItem('selectedCompany', JSON.stringify(selectedCompany));
    } else {
      localStorage.removeItem('selectedCompany');
    }
  }, [selectedCompany]);

  // Solo cuando llega la lista real: limpiar empresa eliminada o auto-seleccionar si no hay ninguna
  useEffect(() => {
    if (isLoadingCompanies || companies.length === 0) return;

    setSelectedCompany(prev => {
      if (prev) {
        // Si la empresa seleccionada ya no existe → limpiar
        const stillExists = companies.find(c => c.id === prev.id);
        return stillExists ?? null;
      }
      // Sin empresa seleccionada y no estamos en el selector → tomar la primera activa
      if (!onSelectorPage) {
        return companies.find(c => c.isActive && c.id !== "na") ?? null;
      }
      return null;
    });
  }, [companies, isLoadingCompanies, onSelectorPage]);

  const handleCompanyChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const company = companies.find(c => c.code === event.target.value);
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