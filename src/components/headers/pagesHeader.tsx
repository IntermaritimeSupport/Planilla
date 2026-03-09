"use client";

import React from "react";
import { Plus, Upload, Download, FileText } from "lucide-react";
import { useTheme } from "../../context/themeContext";

interface PagesHeaderProps {
  title: string;
  description?: string;
  showCreate?: boolean;
  onExport?: () => void;
  onImport?: () => void;
  onReport?: () => void;
  onDownloadTemplate?: () => void;
  onImportCsv?: () => void;
  onModal?: () => void;
  importingCsv?: boolean;
}

const PagesHeader: React.FC<PagesHeaderProps> = ({
  title, description,
  showCreate = false,
  onExport, onImport, onReport,
  onDownloadTemplate, onImportCsv, onModal,
  importingCsv = false,
}) => {
  const { isDarkMode } = useTheme();

  return (
    <div className="mb-6">
      {/* Breadcrumb line accent */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-5 rounded-full bg-gradient-to-b from-blue-500 to-blue-600" />
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 flex-1">
          <h1 className={`text-lg font-bold tracking-tight ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            {title}
          </h1>
          {description && (
            <span className={`text-xs ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
              {description}
            </span>
          )}
        </div>

        {/* Action buttons */}
        {(onExport || onImport || onReport || onDownloadTemplate || onImportCsv || onModal || showCreate) && (
          <div className="flex items-center gap-2 ml-auto">

            {onExport && (
              <button onClick={onExport}
                className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-all ${
                  isDarkMode
                    ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/50"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200"
                }`}>
                <Download size={13} /> Exportar
              </button>
            )}

            {onModal && (
              <button onClick={onModal}
                className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-all ${
                  isDarkMode
                    ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/50"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200"
                }`}>
                <Plus size={13} /> Crear
              </button>
            )}

            {onImport && (
              <button onClick={onImport}
                className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-all ${
                  isDarkMode
                    ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/50"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200"
                }`}>
                <Upload size={13} /> Importar
              </button>
            )}

            {onDownloadTemplate && (
              <button onClick={onDownloadTemplate}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium bg-purple-600 hover:bg-purple-700 text-white transition-all">
                <Download size={13} /> Template
              </button>
            )}

            {onImportCsv && (
              <button onClick={onImportCsv} disabled={importingCsv}
                className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-all disabled:opacity-50 ${
                  isDarkMode
                    ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/50"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200"
                }`}>
                {importingCsv ? (
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : <Upload size={13} />}
                {importingCsv ? "Importando..." : "Importar CSV"}
              </button>
            )}

            {onReport && (
              <button onClick={onReport}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium bg-purple-600 hover:bg-purple-700 text-white transition-all">
                <FileText size={13} /> Reporte
              </button>
            )}

            {showCreate && (
              <a href="create"
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-md shadow-blue-600/20">
                <Plus size={13} /> Crear
              </a>
            )}
          </div>
        )}
      </div>

      {/* Subtle divider */}
      <div className={`h-px w-full ${isDarkMode ? "bg-slate-800" : "bg-gray-100"}`} />
    </div>
  );
};

export default PagesHeader;
