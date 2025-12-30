"use client";

import React from "react";
import {
  Plus,
  Upload,
  Download,
  FileText,
} from "lucide-react";

interface PagesHeaderProps {
  title: string;
  description?: string;

  /** Botón crear (si true se renderiza) */
  showCreate?: boolean;

  /** Botones estándar (si existe la función → se renderiza) */
  onExport?: () => void;
  onImport?: () => void;
  onReport?: () => void;

  /** Botones especiales */
  onDownloadTemplate?: () => void;
  onImportCsv?: () => void;
  importingCsv?: boolean;
}

const BUTTON_BASE =
  "flex items-center justify-center gap-2 h-10 min-w-[160px] px-4 rounded-lg text-sm font-medium transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed";

const PagesHeader: React.FC<PagesHeaderProps> = ({
  title,
  description,

  showCreate = false,

  onExport,
  onImport,
  onReport,

  onDownloadTemplate,
  onImportCsv,
  importingCsv = false,
}) => {
  return (
    <div className="mb-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        {/* ================= LEFT ================= */}
        <div>
          <h1 className="text-2xl font-bold capitalize">
            {title}
          </h1>
          {description && (
            <p className="text-gray-400 mt-1 capitalize">
              {description}
            </p>
          )}
        </div>

        {/* ================= RIGHT ================= */}
        <div
          className="
            grid grid-cols-2 gap-2
            sm:grid-cols-3
            md:grid-cols-4
            lg:flex lg:flex-wrap lg:justify-end
          "
        >
          {/* EXPORT */}
          {onExport && (
            <button
              onClick={onExport}
              className={`${BUTTON_BASE} bg-gray-700 hover:bg-gray-600 text-white`}
            >
              <Download className="w-4 h-4" />
              <span>Exportar</span>
            </button>
          )}

          {/* IMPORT */}
          {onImport && (
            <button
              onClick={onImport}
              className={`${BUTTON_BASE} bg-gray-700 hover:bg-gray-600 text-white`}
            >
              <Upload className="w-4 h-4" />
              <span>Importar</span>
            </button>
          )}

          {/* DOWNLOAD TEMPLATE */}
          {onDownloadTemplate && (
            <button
              onClick={onDownloadTemplate}
              className={`${BUTTON_BASE} bg-purple-600 hover:bg-purple-700 text-white`}
            >
              <Download className="w-4 h-4" />
              <span>Descargar Template</span>
            </button>
          )}

          {/* IMPORT CSV */}
          {onImportCsv && (
            <button
              onClick={onImportCsv}
              disabled={importingCsv}
              className={`${BUTTON_BASE} bg-gray-700 hover:bg-gray-600 text-white`}
            >
              {importingCsv ? (
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              ) : (
                <Upload className="w-4 h-4" />
              )}
              <span>
                {importingCsv
                  ? "Importando..."
                  : "Importar CSV"}
              </span>
            </button>
          )}

          {/* REPORT */}
          {onReport && (
            <button
              onClick={onReport}
              className={`${BUTTON_BASE} bg-purple-600 hover:bg-purple-700 text-white`}
            >
              <FileText className="w-4 h-4" />
              <span>Reporte</span>
            </button>
          )}

          {/* CREATE */}
          {showCreate && (
            <a
              href="create"
              className={`${BUTTON_BASE} bg-blue-600 hover:bg-blue-700 text-white col-span-2 sm:col-span-1`}
            >
              <Plus className="w-4 h-4" />
              <span>Crear</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default PagesHeader;
