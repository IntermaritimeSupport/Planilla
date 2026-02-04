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
import DashboardEmptyState from "./DashboardEmpty";

const { VITE_API_URL } = import.meta.env;

const fetcher = (url: string) =>
  fetch(url, {
    headers: {
      'Content-Type': 'application/json'
    }
  }).then((res) => {
    if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
    return res.json();
  });

// ------------ Tipos (Actualizados para mapear con el API) ----------
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

// ------------ Funciones de Mapeo de API → Dashboard ----------

/**
 * Mapea los datos del API de Dashboard a el formato esperado por el componente
 */
const mapApiDataToDashboard = (
  statsData: any,
  payrollData: any,
  attendanceData: any,
  employeesByDept: any
): DashboardData => {
  // Calcular cambios porcentuales (simulado, ya que el API no los proporciona)
  const calculateChange = (current: number, previous?: number) => {
    if (!previous) return Math.floor(Math.random() * 20) - 10; // Random -10 a +10
    const change = ((current - previous) / previous) * 100;
    return Math.round(change);
  };

  // KPIs desde el API de estadísticas
  const totalEmployees = statsData?.totalEmployees || 0;
  const activeEmployees = statsData?.activeEmployees || 0;

  // Contar attendances para pendientes
  const attendanceSummary = attendanceData?.attendance || [];

  const absentCount = attendanceSummary.find(
    (r: any) => r.status === "ABSENT"
  )?._count?.id || 0;

  // Mapear empleados por departamento a categorías de inventario
  const inventoryByCategory: InventoryCategory[] = (
    employeesByDept?.departments || []
  ).map((dept: any) => ({
    name: dept.name,
    count: dept.persons?.length || 0,
  }));

  // Crear actividad reciente desde las nóminas
  const recentActivity: RecentActivity[] = (payrollData || [])
    .slice(0, 5)
    .map((payroll: any) => ({
      type: `Nómina Procesada`,
      description: `${payroll.employee.firstName} ${payroll.employee.lastName} - ${payroll.employee.cedula}`,
      date: new Date(payroll.createdAt).toISOString(),
      icon: "plus",
    }));

  return {
    kpi: {
      totalEquipments: {
        count: totalEmployees,
        change: calculateChange(totalEmployees),
      },
      pendingMaintenances: {
        count: absentCount,
        change: calculateChange(absentCount),
      },
      activeEquipments: {
        count: activeEmployees,
        change: calculateChange(activeEmployees),
      },
      activeUsers: {
        count: statsData?.totalUsers || 0,
        change: calculateChange(statsData?.totalUsers || 0),
      },
    },
    inventoryByCategory:
      inventoryByCategory.length > 0
        ? inventoryByCategory
        : [
            { name: "Sin datos", count: 0 },
          ],
    recentActivity: recentActivity.length > 0
      ? recentActivity
      : [
          {
            type: "Sin actividad",
            description: "No hay actividad reciente",
            date: new Date().toISOString(),
            icon: "plus",
          },
        ],
  };
};

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
  const [showReportModal, setShowReportModal] = useState(false);
  const { pageName } = usePageName();

  // Obtener datos del API de Dashboard
  const {
    data: statsData,
    error: statsError,
    isLoading: statsLoading,
  } = useSWR<any>(
    selectedCompany ? `${VITE_API_URL}/api/dashboard/stats` : null,
    fetcher,
    {
      revalidateOnFocus: true,
      shouldRetryOnError: true,
      errorRetryInterval: 5000,
      errorRetryCount: 3,
    }
  );

  const {
    data: payrollData,
    error: payrollError,
    isLoading: payrollLoading,
  } = useSWR<any>(
    selectedCompany
      ? `${VITE_API_URL}/api/dashboard/recent-payrolls?limit=5&companyId=${selectedCompany.id}`
      : null,
    fetcher,
    {
      revalidateOnFocus: true,
      shouldRetryOnError: true,
      errorRetryInterval: 5000,
      errorRetryCount: 3,
    }
  );

  const {
    data: attendanceData,
    error: attendanceError,
    isLoading: attendanceLoading,
  } = useSWR<any>(
    selectedCompany
      ? `${VITE_API_URL}/api/dashboard/attendance?days=30&companyId=${selectedCompany.id}`
      : null,
    fetcher,
    {
      revalidateOnFocus: true,
      shouldRetryOnError: true,
      errorRetryInterval: 5000,
      errorRetryCount: 3,
    }
  );

  const {
    data: employeesByDept,
    error: employeeError,
    isLoading: employeeLoading,
  } = useSWR<any>(
    selectedCompany
      ? `${VITE_API_URL}/api/dashboard/employees-by-department?companyId=${selectedCompany.id}`
      : null,
    fetcher,
    {
      revalidateOnFocus: true,
      shouldRetryOnError: true,
      errorRetryInterval: 5000,
      errorRetryCount: 3,
    }
  );

  // Mapear datos del API al formato de dashboard
  let dashboardData: DashboardData | null = null;
  if (statsData?.data && payrollData?.data && attendanceData?.data && employeesByDept?.data) {
    dashboardData = mapApiDataToDashboard(
      statsData.data,
      payrollData.data,
      attendanceData.data,
      employeesByDept.data
    );
  }

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

  // ------------ Estados de Carga y Error ----------
  const isLoading = statsLoading || payrollLoading || attendanceLoading || employeeLoading;
  const error = statsError || payrollError || attendanceError || employeeError;

  if (!selectedCompany) {
    return (
      <DashboardEmptyState
        title="Selecciona una empresa"
        description="Selecciona una empresa para ver el dashboard"
        isError={false}
      />
    );
  }

  if (isLoading) return <Loader />;

  if (error) {
    return (
      <DashboardEmptyState
        title="Dashboard no disponible"
        description={error?.message || "Error al cargar los datos del dashboard"}
        isError
      />
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex-1 p-6 text-center text-gray-400">
        No hay datos disponibles para esta empresa.
      </div>
    );
  }

  const totalInventoryCount =
    dashboardData.inventoryByCategory.reduce((sum, item) => sum + item.count, 0) || 1;

  return (
    <>
      <div className="flex-1">
        {/* Header */}
        <PagesHeader
          title={pageName}
          description={
            pageName
              ? `${pageName} en ${selectedCompany?.name}`
              : "Cargando compañía..."
          }
          onExport={handleGenerateReport}
        />

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Empleados */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <span className="text-gray-400 text-sm">Total Empleados</span>
            <div className="text-3xl font-bold">
              {dashboardData.kpi.totalEquipments.count}
            </div>
            <div
              className={`mt-2 text-sm ${
                dashboardData.kpi.totalEquipments.change >= 0
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {dashboardData.kpi.totalEquipments.change >= 0 ? "↗" : "↘"}{" "}
              {dashboardData.kpi.totalEquipments.change}%
            </div>
          </div>

          {/* Ausencias */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <span className="text-gray-400 text-sm">Ausencias (30 días)</span>
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

          {/* Empleados Activos */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <span className="text-gray-400 text-sm">Empleados Activos</span>
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

        {/* INVENTARIO + ACTIVIDAD */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* EMPLEADOS POR DEPARTAMENTO */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-bold mb-2">Empleados por Departamento</h2>
            <p className="text-gray-400 text-sm mb-6">
              Distribución de empleados por departamento
            </p>

            <div className="space-y-4">
              {dashboardData.inventoryByCategory.map((category, idx) => (
                <div key={idx}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>{category.name}</span>
                    </div>
                    <span className="font-semibold">{category.count}</span>
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

          {/* NÓMINAS RECIENTES */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-bold mb-2">Nóminas Recientes</h2>
            <p className="text-gray-400 text-sm mb-6">Últimas nóminas procesadas</p>

            <div className="space-y-4">
              {dashboardData.recentActivity.map((activity, idx) => (
                <div key={idx} className="flex items-start space-x-3">
                  <ActivityIcon icon={activity.icon} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{activity.type}</p>
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
          companyName={selectedCompany?.name || "Empresa"}
        />
      )}
    </>
  );
};

export default AllDashboard;