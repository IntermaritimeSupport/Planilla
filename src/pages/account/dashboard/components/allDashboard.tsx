// src/pages/Dashboard.tsx
"use client";

import useSWR from "swr";
import React, { useState } from "react";
import { useCompany } from "../../../../context/routerContext";
import Loader from "../../../../components/loaders/loader";
import ReportPreviewModal from "../../../../components/modals/ReportPreviewModal";
import PagesHeader from "../../../../components/headers/pagesHeader";
import { CurrentPathname } from "../../../../components/layouts/main";
import { usePageName } from "../../../../hook/usePageName";

const { VITE_API_URL } = import.meta.env;

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
    return res.json();
  });

// ------------ Tipos (igual que antes) -------------
export type Kpi = {
  count: number;
  change: number;
};

export type InventoryCategory = {
  name: string;
  count: number;
};

export type RecentActivity = {
  type: string;
  description: string;
  date: string;
  icon: string;
};

export type DashboardData = {
  kpi: {
    totalEquipments: Kpi;
    pendingMaintenances: Kpi;
    activeEquipments: Kpi;
    activeUsers: Kpi;
  };
  inventoryByCategory: InventoryCategory[];
  recentActivity: RecentActivity[];
};

interface DashboardProps {
  currentPathname?: CurrentPathname
}

// ------------ Format date helper (igual que antes) ----------
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return `Hace ${diffInSeconds} segundos`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `Hace ${diffInMinutes} minutos`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `Hace ${diffInHours} horas`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `Hace ${diffInDays} días`;
};

// ------------ Activity Icons (igual que antes) ----------
const ActivityIcon: React.FC<{ icon: string }> = ({ icon }) => {
  switch (icon) {
    case "plus":
      return (
        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mt-0.5">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="w-3 h-3"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>
      );

    case "user":
      return (
        <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center mt-0.5">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="w-3 h-3"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="m22 21-3-3m0 0a5.5 5.5 0 1 0-7.78-7.78 5.5 5.5 0 0 0 7.78 7.78Z" />
          </svg>
        </div>
      );

    default:
      return (
        <div className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center mt-0.5">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="w-3 h-3"
          >
            <circle cx="12" cy="12" r="10" />
          </svg>
        </div>
      );
  }
};

// ------------ COMPONENTE PRINCIPAL ACTUALIZADO ----------
const AllDashboard: React.FC<DashboardProps> = ({}) => {
  const { selectedCompany } = useCompany();
  const [showReportModal, setShowReportModal] = useState(false); // ← Estado del modal
  const { pageName } = usePageName();
  const {
    data: dashboardData,
    error,
    isLoading,
    isValidating,
  } = useSWR<DashboardData>(
    selectedCompany ? `${VITE_API_URL}/api/dashboard/${selectedCompany.id}` : null,
    fetcher,
    {
      revalidateOnFocus: true,
      shouldRetryOnError: true,
      errorRetryInterval: 0,
      errorRetryCount: 10,
    }
  );

  // ------------ Abrir Modal con Vista Previa ----------
  const handleGenerateReport = async () => {
    if (!selectedCompany) {
      alert("Seleccione una empresa primero.");
      return;
    }

    if (!dashboardData) {
      alert("Cargando datos del dashboard...");
      return;
    }

    setShowReportModal(true);
  };

  // ------------ Render ----------
  if (isLoading || isValidating) return <Loader />;

  if (error)
    return (
      <div className="flex-1 p-6 text-center text-red-500">
        Error al cargar el dashboard: {error.message}
      </div>
    );

  if (!dashboardData)
    return (
      <div className="flex-1 p-6 text-center text-gray-400">
        No hay datos disponibles para esta empresa.
      </div>
    );

  const totalInventoryCount =
    dashboardData.inventoryByCategory.reduce((sum, item) => sum + item.count, 0) || 1;

  return (
    <>
      <div className="flex-1">
        {/* Header */}
        <PagesHeader title={pageName} description={pageName ? `${pageName} in ${selectedCompany?.name}` : "Cargando compañía..."} onExport={handleGenerateReport}/>

        {/* KPI CARDS (igual que antes) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Equipos */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <span className="text-gray-400 text-sm">Total Equipos</span>
            <div className="text-3xl font-bold">{dashboardData?.kpi?.totalEquipments?.count}</div>
            <div
              className={`mt-2 text-sm ${
                dashboardData?.kpi?.totalEquipments?.change >= 0
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {dashboardData?.kpi?.totalEquipments?.change >= 0 ? "↗" : "↘"}{" "}
              {dashboardData?.kpi?.totalEquipments?.change}%
            </div>
          </div>

          {/* Mantenimientos Pendientes */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <span className="text-gray-400 text-sm">Mantenimientos Pendientes</span>
            <div className="text-3xl font-bold">
              {dashboardData.kpi.pendingMaintenances.count}
            </div>
            <div
              className={`mt-2 text-sm ${
                dashboardData.kpi.pendingMaintenances.change >= 0
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {dashboardData.kpi.pendingMaintenances.change >= 0 ? "↗" : "↘"}{" "}
              {dashboardData.kpi.pendingMaintenances.change}%
            </div>
          </div>

          {/* Equipos Activos */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <span className="text-gray-400 text-sm">Equipos Activos</span>
            <div className="text-3xl font-bold">
              {dashboardData.kpi.activeEquipments.count}
            </div>
            <div
              className={`mt-2 text-sm ${
                dashboardData.kpi.activeEquipments.change >= 0
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {dashboardData.kpi.activeEquipments.change >= 0 ? "↗" : "↘"}{" "}
              {dashboardData.kpi.activeEquipments.change}%
            </div>
          </div>

          {/* Usuarios Activos */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <span className="text-gray-400 text-sm">Usuarios Activos</span>
            <div className="text-3xl font-bold">{dashboardData.kpi.activeUsers.count}</div>
            <div
              className={`mt-2 text-sm ${
                dashboardData.kpi.activeUsers.change >= 0
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {dashboardData.kpi.activeUsers.change >= 0 ? "↗" : "↘"}{" "}
              {dashboardData.kpi.activeUsers.change}%
            </div>
          </div>
        </div>

        {/* INVENTARIO + ACTIVIDAD (igual que antes) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* INVENTARIO POR CATEGORÍA */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-bold mb-2">Inventario por Categoría</h2>
            <p className="text-gray-400 text-sm mb-6">
              Distribución de equipos por tipo
            </p>

            <div className="space-y-4">
              {dashboardData.inventoryByCategory.map((category, idx) => (
                <div key={idx}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>{category.name}</span>
                    </div>
                    <span>{category.count}</span>
                  </div>

                  <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{
                        width: `${(category.count / totalInventoryCount) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ACTIVIDAD RECIENTE */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-bold mb-2">Actividad Reciente</h2>
            <p className="text-gray-400 text-sm mb-6">Últimas acciones registradas</p>

            <div className="space-y-4">
              {dashboardData.recentActivity.map((activity, idx) => (
                <div key={idx} className="flex items-start space-x-3">
                  <ActivityIcon icon={activity.icon} />
                  <div className="flex-1">
                    <p className="text-sm">{activity.type}</p>
                    <p className="text-gray-400 text-sm">{activity.description}</p>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatDate(activity.date)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Vista Previa */}
      {dashboardData && (
        <ReportPreviewModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          data={dashboardData}
          companyName={selectedCompany?.name || 'Empresa'}
        />
      )}
    </>
  );
};

export default AllDashboard;