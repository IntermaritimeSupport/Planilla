import React from 'react';
import * as XLSX from 'xlsx';
import { Report } from "./allReportPage"; // Asegúrate de que la ruta sea correcta

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: Report | null;
}

// --- LÓGICA DE FORMATEO (SEPARADA PARA REUTILIZAR) ---

/**
 * Convierte un valor de celda a un TEXTO PLANO para exportar.
 * Esta es la función clave para que el Excel coincida con la tabla.
 */
const formatCellForExport = (data: any): string | number => {
  if (data === null || data === undefined) {
    return "N/A";
  }

  if (typeof data === 'object') {
    if (data.person?.fullName) return data.person.fullName;
    if (data.username) return data.username;
    if (data.name) return data.name;

    if (data.serialNumber && data.type) {
      const description = [data.type, data.brand, data.model].filter(Boolean).join(' ');
      return `${description} (SN: ${data.serialNumber})`;
    }
    
    // Fallback para objetos desconocidos: convertirlos a JSON
    return JSON.stringify(data);
  }

  const isIsoDate = typeof data === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(data);
  if (isIsoDate) {
    return new Date(data).toLocaleString();
  }

  if (typeof data === 'boolean') {
    return data ? "Sí" : "No";
  }

  return data; // Devuelve números y otros tipos directamente
};

/**
 * Convierte un valor de celda a JSX para renderizar en la tabla del modal.
 */
const renderCellForDisplay = (data: any): React.ReactNode => {
  const formattedText = formatCellForExport(data);

  if (typeof formattedText === 'string' && formattedText.startsWith('{')) {
    // Si el texto formateado es un JSON (el fallback), lo mostramos en un <pre>
    return (
      <pre className="text-xs bg-gray-700 p-2 rounded max-w-xs overflow-x-auto">
        {JSON.stringify(JSON.parse(formattedText), null, 2)}
      </pre>
    );
  }

  if (data === null || data === undefined) return <span className="text-gray-500">N/A</span>;
  if (typeof data === 'boolean') return data ? 
      <span className="text-green-400 font-semibold">Sí</span> : 
      <span className="text-red-400 font-semibold">No</span>;

  return formattedText;
};


// --- COMPONENTE PRINCIPAL ---

const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, report }) => {
  if (!isOpen || !report) return null;

  const hasData = report.apiData && report.apiData.length > 0;
  const headers = hasData ? Object.keys(report.apiData[0]) : [];

  const handleDownloadExcel = () => {
    if (!report || !hasData) return;

    // 1. PROCESAR los datos ANTES de pasarlos a la biblioteca XLSX
    const processedData = report.apiData.map(row => {
      const newRow: { [key: string]: string | number } = {};
      // Iteramos sobre las llaves/headers para mantener el orden
      headers.forEach(header => {
        newRow[header] = formatCellForExport(row[header]);
      });
      return newRow;
    });

    // 2. Usar los datos ya procesados para crear la hoja
    const worksheet = XLSX.utils.json_to_sheet(processedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Datos");
    XLSX.writeFile(workbook, `${report.reportKey || 'reporte'}.xlsx`);
  };

  return (
    // Contenedor principal (overlay/backdrop)
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ease-in-out ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black bg-opacity-70" />

      {/* Panel del Modal */}
      <div
        className={`bg-gray-800 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col transform transition-all duration-300 ease-in-out ${
          isOpen ? 'scale-100' : 'scale-95'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">{report.titulo}</h2>
            <p className="text-sm text-gray-400">{report.descripcion}</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadExcel}
              disabled={!hasData}
              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span className="text-sm font-medium">Descargar Excel</span>
            </button>
            <button onClick={onClose} className="p-2 text-gray-400 rounded-full hover:bg-gray-700 hover:text-white transition">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* Contenido con scroll */}
        <div className="p-6 overflow-auto">
          {hasData ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left text-gray-300">
                <thead className="text-xs text-gray-400 uppercase bg-gray-700/50 sticky top-0">
                  <tr>
                    {headers.map(header => <th key={header} className="px-6 py-3 whitespace-nowrap">{header}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {report.apiData.map((row, index) => (
                    <tr key={index} className="hover:bg-gray-700/50">
                      {headers.map(header => (
                        <td key={header} className="px-6 py-4 align-top">
                          {/* Ahora usamos la nueva función de renderizado */}
                          {renderCellForDisplay(row[header])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-400 py-10">No hay datos disponibles para este reporte.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportModal;