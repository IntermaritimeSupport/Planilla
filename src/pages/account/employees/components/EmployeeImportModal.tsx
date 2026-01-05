import React, { useState } from 'react';
import { Upload, Download, X, AlertCircle, CheckCircle } from 'lucide-react';

interface EmployeeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId?: string;
  onImportSuccess?: () => void;
}

interface PreviewData {
  totalRows: number;
  validEmployees: number;
  errors: Array<{ fila: number; error: string }>;
  employees: Array<any>;
}

interface ImportResult {
  totalImported: number;
  totalFailed: number;
  createdEmployees: Array<any>;
  failedEmployees: Array<{ cedula: string; nombre: string; error: string }>;
}

export const EmployeeImportModal: React.FC<EmployeeImportModalProps> = ({ 
  isOpen, 
  onClose, 
  companyId, 
  onImportSuccess 
}) => {
  const [step, setStep] = useState<'upload' | 'preview' | 'confirm'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) {
        setFile(selectedFile);
        setError('');
      } else {
        setError('Por favor selecciona un archivo Excel válido (.xlsx o .xls)');
      }
    }
  };

  const handleProcessFile = async () => {
    if (!file) {
      setError('Por favor selecciona un archivo');
      return;
    }

    if (!companyId) {
      setError('Compañía no seleccionada');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('companyId', companyId);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/payroll/employees/import/preview`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al procesar el archivo');
      }

      setPreviewData(data);
      setStep('preview');
    } catch (err: any) {
      setError(err.message || 'Error al procesar el archivo');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!previewData?.employees) return;

    if (!companyId) {
      setError('Compañía no seleccionada');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/payroll/employees/import/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employees: previewData.employees,
          companyId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al confirmar la importación');
      }

      setImportResult(data);
      setStep('confirm');
      
      setTimeout(() => {
        onImportSuccess?.();
        handleClose();
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Error al confirmar la importación');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/payroll/employees/template/download`, {
        method: 'GET',
      });

      if (!response.ok) throw new Error('Error al descargar template');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'template_empleados.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError('Error al descargar el template');
    }
  };

  const handleClose = () => {
    setStep('upload');
    setFile(null);
    setPreviewData(null);
    setError('');
    setImportResult(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            {step === 'upload' && 'Importar Empleados'}
            {step === 'preview' && 'Vista Previa de Empleados'}
            {step === 'confirm' && 'Importación Completada'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* STEP 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-6">
              <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
                <p className="text-blue-200 text-sm">
                  Descarga el template para asegurate de usar el formato correcto.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white transition"
                >
                  <Download size={18} />
                  Descargar Template
                </button>
              </div>

              <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
                <label className="cursor-pointer">
                  <Upload size={32} className="mx-auto mb-3 text-gray-400" />
                  <p className="text-white font-medium mb-1">Arrastra tu archivo aquí</p>
                  <p className="text-gray-400 text-sm mb-4">o haz clic para seleccionar</p>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                {file && (
                  <p className="text-green-400 text-sm mt-3">✓ {file.name}</p>
                )}
              </div>

              {error && (
                <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 flex gap-3">
                  <AlertCircle size={20} className="text-red-400 flex-shrink-0" />
                  <p className="text-red-200 text-sm">{error}</p>
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleProcessFile}
                  disabled={!file || loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition disabled:opacity-50"
                >
                  {loading ? 'Procesando...' : 'Continuar'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Preview */}
          {step === 'preview' && previewData && (
            <div className="space-y-6">
              {/* Resumen */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-700 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Total en archivo</p>
                  <p className="text-2xl font-bold text-white">{previewData.totalRows}</p>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Válidos</p>
                  <p className="text-2xl font-bold text-green-400">{previewData.validEmployees}</p>
                </div>
              </div>

              {/* Errores */}
              {previewData.errors && previewData.errors.length > 0 && (
                <div>
                  <h3 className="text-white font-medium mb-3">Errores encontrados:</h3>
                  <div className="bg-red-900/30 border border-red-700 rounded-lg max-h-48 overflow-y-auto">
                    {previewData.errors.map((err, idx) => (
                      <div key={idx} className="px-4 py-3 border-b border-red-800 last:border-b-0">
                        <p className="text-red-200 text-sm">
                          <span className="font-medium">Fila {err.fila}:</span> {err.error}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tabla de empleados válidos */}
              {previewData.employees && previewData.employees.length > 0 && (
                <div>
                  <h3 className="text-white font-medium mb-3">Empleados a importar:</h3>
                  <div className="bg-gray-700 rounded-lg overflow-x-auto max-h-64 overflow-y-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-600 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-gray-200">Cédula</th>
                          <th className="px-4 py-2 text-gray-200">Nombre</th>
                          <th className="px-4 py-2 text-gray-200">Email</th>
                          <th className="px-4 py-2 text-gray-200">Posición</th>
                          <th className="px-4 py-2 text-gray-200">Salario</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.employees.map((emp: any, idx: number) => (
                          <tr key={idx} className="border-b border-gray-600 hover:bg-gray-600/50">
                            <td className="px-4 py-2 text-gray-300">{emp.cedula}</td>
                            <td className="px-4 py-2 text-gray-300">
                              {emp.firstName} {emp.lastName}
                            </td>
                            <td className="px-4 py-2 text-gray-300">{emp.email || '-'}</td>
                            <td className="px-4 py-2 text-gray-300">{emp.position || '-'}</td>
                            <td className="px-4 py-2 text-gray-300">${emp.salary}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition"
                >
                  Atrás
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={previewData.validEmployees === 0 || loading}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white transition disabled:opacity-50"
                >
                  {loading ? 'Importando...' : 'Importar Empleados'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Confirmation */}
          {step === 'confirm' && importResult && (
            <div className="space-y-6">
              <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 flex gap-3">
                <CheckCircle size={20} className="text-green-400 flex-shrink-0" />
                <div>
                  <p className="text-green-200 font-medium">¡Importación exitosa!</p>
                  <p className="text-green-200 text-sm">
                    Se importaron {importResult.totalImported} empleados correctamente.
                  </p>
                </div>
              </div>

              {importResult.failedEmployees && importResult.failedEmployees.length > 0 && (
                <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4">
                  <p className="text-yellow-200 font-medium mb-2">
                    {importResult.totalFailed} empleado(s) no pudieron ser importados:
                  </p>
                  <div className="space-y-2">
                    {importResult.failedEmployees.map((emp: any, idx: number) => (
                      <p key={idx} className="text-yellow-200 text-sm">
                        • {emp.nombre} ({emp.cedula}): {emp.error}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeImportModal;