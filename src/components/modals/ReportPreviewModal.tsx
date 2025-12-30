import React, { useState } from 'react';
import { Download, X } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ReportData {
  kpi: {
    totalEquipments: { count: number; change: number };
    pendingMaintenances: { count: number; change: number };
    activeEquipments: { count: number; change: number };
    activeUsers: { count: number; change: number };
  };
  inventoryByCategory: Array<{ name: string; count: number }>;
  recentActivity: Array<{ type: string; description: string; date: string; icon: string }>;
}

interface ReportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ReportData;
  companyName: string;
}

const ReportPreviewModal: React.FC<ReportPreviewModalProps> = ({
  isOpen,
  onClose,
  data,
  companyName,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadExcel = () => {
    try {
      setIsDownloading(true);

      // Crear un nuevo libro de trabajo
      const workbook = XLSX.utils.book_new();

      // ============ HOJA 1: RESUMEN KPIs ============
      const kpiData = [
        ['RESUMEN DE KPIs', ''],
        ['', ''],
        ['Métrica', 'Valor', 'Cambio'],
        ['Total Equipos', data.kpi.totalEquipments.count, `${data.kpi.totalEquipments.change}%`],
        ['Mantenimientos Pendientes', data.kpi.pendingMaintenances.count, `${data.kpi.pendingMaintenances.change}%`],
        ['Equipos Activos', data.kpi.activeEquipments.count, `${data.kpi.activeEquipments.change}%`],
        ['Usuarios Activos', data.kpi.activeUsers.count, `${data.kpi.activeUsers.change}%`],
      ];

      const kpiSheet = XLSX.utils.aoa_to_sheet(kpiData);
      kpiSheet['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(workbook, kpiSheet, 'KPIs');

      // ============ HOJA 2: INVENTARIO ============
      const inventoryData = [
        ['INVENTARIO POR CATEGORÍA', ''],
        ['', ''],
        ['Categoría', 'Cantidad'],
        ...data.inventoryByCategory.map(cat => [cat.name, cat.count]),
      ];

      const inventorySheet = XLSX.utils.aoa_to_sheet(inventoryData);
      inventorySheet['!cols'] = [{ wch: 25 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(workbook, inventorySheet, 'Inventario');

      // ============ HOJA 3: ACTIVIDAD RECIENTE ============
      const activityData = [
        ['ACTIVIDAD RECIENTE', '', '', ''],
        ['', '', '', ''],
        ['Tipo', 'Descripción', 'Fecha', 'Icono'],
        ...data.recentActivity.map(activity => [
          activity.type,
          activity.description,
          new Date(activity.date).toLocaleString('es-ES'),
          activity.icon,
        ]),
      ];

      const activitySheet = XLSX.utils.aoa_to_sheet(activityData);
      activitySheet['!cols'] = [{ wch: 20 }, { wch: 40 }, { wch: 20 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(workbook, activitySheet, 'Actividad');

      // ============ HOJA 4: RESUMEN EJECUTIVO ============
      const summaryData = [
        ['REPORTE EJECUTIVO - DASHBOARD IT', ''],
        ['Empresa:', companyName],
        ['Fecha de Generación:', new Date().toLocaleString('es-ES')],
        ['', ''],
        ['INDICADORES PRINCIPALES', ''],
        ['Total de Equipos:', data.kpi.totalEquipments.count],
        ['Equipos Activos:', data.kpi.activeEquipments.count],
        ['Tasa de Actividad:', `${((data.kpi.activeEquipments.count / data.kpi.totalEquipments.count) * 100).toFixed(2)}%`],
        ['', ''],
        ['MANTENIMIENTO', ''],
        ['Mantenimientos Pendientes:', data.kpi.pendingMaintenances.count],
        ['', ''],
        ['RECURSO HUMANO', ''],
        ['Usuarios Activos:', data.kpi.activeUsers.count],
        ['Total Categorías de Inventario:', data.inventoryByCategory.length],
      ];

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      summarySheet['!cols'] = [{ wch: 30 }, { wch: 25 }];
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');

      // Descargar
      XLSX.writeFile(workbook, `Reporte_${companyName}_${new Date().toISOString().split('T')[0]}.xlsx`);
      setIsDownloading(false);
      onClose();
    } catch (error) {
      console.error('Error descargando Excel:', error);
      alert('Error al descargar el reporte');
      setIsDownloading(false);
    }
  };

  if (!isOpen) return null;

  const totalInventory = data.inventoryByCategory.reduce((sum, cat) => sum + cat.count, 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">Vista Previa del Reporte</h2>
            <p className="text-gray-400 text-sm mt-1">Empresa: {companyName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* KPIs Preview */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
              <span className="w-1 h-6 bg-blue-500 rounded" />
              <span>Indicadores Clave (KPIs)</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
                <p className="text-gray-400 text-xs uppercase">Total Equipos</p>
                <p className="text-2xl font-bold text-white">{data.kpi.totalEquipments.count}</p>
                <p className={`text-sm ${data.kpi.totalEquipments.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {data.kpi.totalEquipments.change >= 0 ? '↗' : '↘'} {data.kpi.totalEquipments.change}%
                </p>
              </div>
              <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
                <p className="text-gray-400 text-xs uppercase">Mantenimientos</p>
                <p className="text-2xl font-bold text-white">{data.kpi.pendingMaintenances.count}</p>
                <p className={`text-sm ${data.kpi.pendingMaintenances.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {data.kpi.pendingMaintenances.change >= 0 ? '↗' : '↘'} {data.kpi.pendingMaintenances.change}%
                </p>
              </div>
              <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
                <p className="text-gray-400 text-xs uppercase">Equipos Activos</p>
                <p className="text-2xl font-bold text-white">{data.kpi.activeEquipments.count}</p>
                <p className={`text-sm ${data.kpi.activeEquipments.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {data.kpi.activeEquipments.change >= 0 ? '↗' : '↘'} {data.kpi.activeEquipments.change}%
                </p>
              </div>
              <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
                <p className="text-gray-400 text-xs uppercase">Usuarios Activos</p>
                <p className="text-2xl font-bold text-white">{data.kpi.activeUsers.count}</p>
                <p className={`text-sm ${data.kpi.activeUsers.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {data.kpi.activeUsers.change >= 0 ? '↗' : '↘'} {data.kpi.activeUsers.change}%
                </p>
              </div>
            </div>
          </div>

          {/* Inventario Preview */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
              <span className="w-1 h-6 bg-purple-500 rounded" />
              <span>Inventario por Categoría</span>
            </h3>
            <div className="space-y-3 bg-gray-700/30 p-4 rounded-lg border border-gray-600">
              {data.inventoryByCategory.map((category, idx) => (
                <div key={idx}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-300">{category.name}</span>
                    <span className="text-sm font-bold text-white">{category.count}</span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full transition-all"
                      style={{ width: `${(category.count / totalInventory) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actividad Reciente Preview */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
              <span className="w-1 h-6 bg-green-500 rounded" />
              <span>Actividad Reciente (Últimas 5)</span>
            </h3>
            <div className="space-y-3 bg-gray-700/30 p-4 rounded-lg border border-gray-600">
              {data.recentActivity.slice(0, 5).map((activity, idx) => (
                <div key={idx} className="flex items-start space-x-3 pb-3 border-b border-gray-600 last:border-b-0">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 text-xs">
                    {activity.icon[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{activity.type}</p>
                    <p className="text-xs text-gray-400 truncate">{activity.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(activity.date).toLocaleString('es-ES')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Información del Reporte */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <p className="text-sm text-gray-300">
              ℹ️ El reporte Excel contendrá 4 hojas: <strong>Resumen Ejecutivo</strong>, <strong>KPIs</strong>, 
              <strong> Inventario</strong> y <strong>Actividad Reciente</strong> completa
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-900 border-t border-gray-700 p-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={downloadExcel}
            disabled={isDownloading}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center space-x-2 font-medium"
          >
            <Download size={18} />
            <span>{isDownloading ? 'Descargando...' : 'Descargar Excel'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportPreviewModal;