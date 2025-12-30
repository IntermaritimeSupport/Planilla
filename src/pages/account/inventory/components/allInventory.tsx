"use client";

import { useState, useEffect, useRef } from "react";
import * as XLSX from 'xlsx';
import { useCompany } from "../../../../context/routerContext";
import Loader from "../../../../components/loaders/loader";
import { usePageName } from "../../../../hook/usePageName";
import PagesHeader from "../../../../components/headers/pagesHeader";
import { useSearch } from "../../../../context/searchContext";
import Tabla from "../../../../components/tables/Table";
import { X } from "lucide-react";

interface Equipment {
  id: string;
  brand: string;
  model: string;
  type: string;
  plateNumber?: string | null;
  serialNumber: string;
  location?: string | null;
  assignedToUser?: {
    fullName?: string | null;
  } | null;
  status: string;
  cost?: number | null;
}

interface ImportResult {
  success: boolean;
  inserted: number;
  skipped: number;
  errors: number;
  totalRows: number;
  details: {
    insertedRecords: string[];
    skippedRecords: Array<{ row: number; serialNumber: string; reason: string }>;
    errorRecords: Array<{ row: number; serialNumber?: string; message: string }>;
  };
}

const { VITE_API_URL } = import.meta.env

export default function AllInventory() {
  const { search } = useSearch();
  const { selectedCompany } = useCompany();
  const [inventory, setInventory] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [importing, setImporting] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportResultModal, setShowImportResultModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [equipmentToDelete, setEquipmentToDelete] = useState<Equipment | null>(null);
  const { pageName } = usePageName();
  const [newEquipment, setNewEquipment] = useState({
    brand: "",
    model: "",
    type: "",
    plateNumber: "",
    serialNumber: "",
    location: "",
    status: "Activo",
    cost: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case "En Uso":
        return "bg-blue-600 text-blue-100";
      case "Mantenimiento":
        return "bg-yellow-600 text-yellow-100";
      case "Activo":
        return "bg-green-600 text-green-100";
      default:
        return "bg-gray-600 text-gray-100";
    }
  };

  const fetchInventory = async () => {
    if (!selectedCompany?.id) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${VITE_API_URL}/api/inventory/${selectedCompany.id}/inventory/all`);
      if (!res.ok) throw new Error("Error al cargar inventario");
      const data = await res.json();
      setInventory(data);
    } catch (error) {
      console.error(error);
      setInventory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [selectedCompany?.id]);

  const filteredInventory = Array.isArray(inventory)
    ? inventory.filter((item) => {
        if (search.trim() === "") return true;

        const term = search.toLowerCase();

        return (
          item.brand.toLowerCase().includes(term) ||
          item.model.toLowerCase().includes(term) ||
          item.type.toLowerCase().includes(term) ||
          item.serialNumber.toLowerCase().includes(term) ||
          item.plateNumber?.toLowerCase().includes(term) ||
          item.location?.toLowerCase().includes(term) ||
          item.assignedToUser?.fullName?.toLowerCase().includes(term)
        );
      })
    : [];

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCompany?.id) return;

    setImporting(true);

    try {
      const formData = new FormData();
      formData.append("csvFile", file);

      const res = await fetch(
        `${VITE_API_URL}/api/inventory/${selectedCompany.id}/inventory/import`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data: ImportResult = await res.json();
      setImportResult(data);
      setShowImportResultModal(true);
      await fetchInventory();
    } catch (error) {
      alert(`Error en importación: ${error}`);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleEdit = (equipment: Equipment) => {
    setEditingEquipment(equipment);
    setShowEditModal(true);
  };

  const abrirModalEliminar = (equipment: Equipment) => {
    setEquipmentToDelete(equipment);
    setShowDeleteModal(true);
  };

  const cerrarModalEliminar = () => {
    setShowDeleteModal(false);
    setEquipmentToDelete(null);
  };

  const handleDelete = async () => {
    if (!equipmentToDelete) return;

    try {
      const res = await fetch(
        `${VITE_API_URL}/api/inventory/${selectedCompany?.id}/inventory/${equipmentToDelete.id}`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) throw new Error("Error al eliminar equipo");

      alert("Equipo eliminado correctamente");
      cerrarModalEliminar();
      await fetchInventory();
    } catch (error) {
      alert(`Error al eliminar: ${error}`);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingEquipment) return;

    try {
      const res = await fetch(
        `${VITE_API_URL}/api/inventory/${selectedCompany?.id}/inventory/${editingEquipment.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            brand: editingEquipment.brand,
            model: editingEquipment.model,
            type: editingEquipment.type,
            plateNumber: editingEquipment.plateNumber,
            serialNumber: editingEquipment.serialNumber,
            location: editingEquipment.location,
            status: editingEquipment.status,
            cost: editingEquipment.cost,
          }),
        }
      );

      if (!res.ok) throw new Error("Error al actualizar equipo");

      alert("Equipo actualizado correctamente");
      setShowEditModal(false);
      setEditingEquipment(null);
      await fetchInventory();
    } catch (error) {
      alert(`Error al actualizar: ${error}`);
    }
  };

  const handleAddEquipment = async () => {
    if (!selectedCompany?.id) return;

    try {
      const res = await fetch(
        `${VITE_API_URL}/api/inventory/${selectedCompany?.id}/inventory/create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            brand: newEquipment.brand,
            model: newEquipment.model,
            type: newEquipment.type,
            plateNumber: newEquipment.plateNumber,
            serialNumber: newEquipment.serialNumber,
            location: newEquipment.location,
            status: newEquipment.status,
            cost: Number(newEquipment.cost),
          }),
        }
      );

      if (!res.ok) throw new Error("Error al crear el equipo");

      alert("Equipo creado correctamente");
      setShowAddModal(false);
      setNewEquipment({
        brand: "",
        model: "",
        type: "",
        plateNumber: "",
        serialNumber: "",
        location: "",
        status: "Activo",
        cost: "",
      });
      await fetchInventory();
    } catch (error) {
      alert(`Error al crear: ${error}`);
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        'Marca': 'Dell',
        'Modelo': 'Latitude 5420',
        'Tipo': 'Laptop',
        'Numero de Serie': 'DL123456789',
        'Numero de Placa': 'PLC-001',
        'Ubicacion': 'Oficina Principal',
        'Costos': '1200',
        'Sistema Operativo': 'Windows 11',
        'Usuario Final': 'Juan Pérez'
      },
      {
        'Marca': 'HP',
        'Modelo': 'ProDesk 600',
        'Tipo': 'Desktop',
        'Numero de Serie': 'HP987654321',
        'Numero de Placa': 'PLC-002',
        'Ubicacion': 'Sala de Servidores',
        'Costos': '800',
        'Sistema Operativo': 'Windows 10',
        'Usuario Final': 'María García'
      },
      {
        'Marca': 'Cisco',
        'Modelo': 'Catalyst 2960',
        'Tipo': 'Switch',
        'Numero de Serie': 'CS456789123',
        'Numero de Placa': 'PLC-003',
        'Ubicacion': 'Rack Principal',
        'Costos': '500',
        'Sistema Operativo': 'IOS',
        'Usuario Final': 'Departamento IT'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Equipos');

    const maxWidth = 30;
    const columnWidths = Object.keys(templateData[0]).map(key => {
      const maxLength = Math.max(
        key.length,
        ...templateData.map(row => String(row[key as keyof typeof row]).length)
      );
      return { wch: Math.min(maxLength + 2, maxWidth) };
    });
    worksheet['!cols'] = columnWidths;

    XLSX.writeFile(workbook, 'template_importacion_equipos.xlsx');
  };

  // Configuración de columnas personalizadas
  const columnConfig = {
    "Marca/Modelo": (item: Equipment) => (
      <div>
        <div className="font-medium">{item.brand}</div>
        <div className="text-sm text-gray-400">{item.model}</div>
      </div>
    ),
    "Tipo": (item: Equipment) => item.type,
    "Placa/Serie": (item: Equipment) => (
      <div>
        <div>{item.plateNumber ?? "-"}</div>
        <div className="text-xs text-gray-400">{item.serialNumber}</div>
      </div>
    ),
    "Ubicación": (item: Equipment) => item.location ?? "-",
    "Encargado": (item: Equipment) => item.assignedToUser?.fullName ?? "-",
    "Estado": (item: Equipment) => (
      <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(item.status)}`}>
        {item.status}
      </span>
    ),
    "Costo": (item: Equipment) => item.cost ?? "-",
  };

  if (loading) return <Loader />;

  if (!selectedCompany?.id) return <p className="text-gray-400">No se encontró el código de empresa.</p>;

  return (
    <div className="flex-1">
      <PagesHeader
        title={pageName}
        description={pageName ? `${pageName} in ${selectedCompany?.name}` : "Cargando compañía..."}
        showCreate
        onDownloadTemplate={downloadTemplate}
        onImportCsv={handleImportClick}
      />

      <input
        name="csvFile"
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Modal de carga durante importación */}
      {importing && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-8 shadow-2xl max-w-md w-full border border-gray-700">
            <div className="flex flex-col items-center">
              <svg className="animate-spin h-16 w-16 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <h3 className="text-xl font-bold mb-2 text-white">Importando Datos</h3>
              <p className="text-gray-400 text-center">Por favor espera mientras procesamos tu archivo CSV...</p>
              <div className="mt-4 w-full bg-gray-700 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Resultado de Importación */}
      {showImportResultModal && importResult && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 shadow-2xl max-w-3xl w-full border border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-2xl font-bold text-white">
                {importResult.success ? '✅ Importación Completada' : '⚠️ Importación con Errores'}
              </h3>
              <button
                onClick={() => setShowImportResultModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-700 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Total Filas</p>
                <p className="text-2xl font-bold text-white">{importResult.totalRows}</p>
              </div>
              <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
                <p className="text-green-400 text-sm">Insertados</p>
                <p className="text-2xl font-bold text-green-300">{importResult.inserted}</p>
              </div>
              <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4">
                <p className="text-yellow-400 text-sm">Omitidos</p>
                <p className="text-2xl font-bold text-yellow-300">{importResult.skipped}</p>
              </div>
              <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
                <p className="text-red-400 text-sm">Errores</p>
                <p className="text-2xl font-bold text-red-300">{importResult.errors}</p>
              </div>
            </div>

            {importResult.details.skippedRecords.length > 0 && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-yellow-400 mb-3">
                  📋 Registros Omitidos ({importResult.details.skippedRecords.length})
                </h4>
                <div className="bg-gray-900 rounded-lg p-4 max-h-60 overflow-y-auto">
                  {importResult.details.skippedRecords.map((item, idx) => (
                    <div key={idx} className="mb-3 pb-3 border-b border-gray-700 last:border-0">
                      <p className="text-white font-medium">Fila {item.row}</p>
                      <p className="text-sm text-gray-400">Serial: {item.serialNumber}</p>
                      <p className="text-sm text-yellow-300">{item.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {importResult.details.errorRecords.length > 0 && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-red-400 mb-3">
                  ❌ Errores ({importResult.details.errorRecords.length})
                </h4>
                <div className="bg-gray-900 rounded-lg p-4 max-h-60 overflow-y-auto">
                  {importResult.details.errorRecords.map((item, idx) => (
                    <div key={idx} className="mb-3 pb-3 border-b border-gray-700 last:border-0">
                      <p className="text-white font-medium">Fila {item.row}</p>
                      {item.serialNumber && (
                        <p className="text-sm text-gray-400">Serial: {item.serialNumber}</p>
                      )}
                      <p className="text-sm text-red-300">{item.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {importResult.details.insertedRecords.length > 0 && (
              <div className="mb-4">
                <h4 className="text-lg font-semibold text-green-400 mb-3">
                  ✅ Registros Insertados ({importResult.details.insertedRecords.length})
                </h4>
                <div className="bg-gray-900 rounded-lg p-4 max-h-40 overflow-y-auto">
                  <div className="flex flex-wrap gap-2">
                    {importResult.details.insertedRecords.map((serial, idx) => (
                      <span key={idx} className="bg-green-900/30 border border-green-700 px-3 py-1 rounded text-sm text-green-300">
                        {serial}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowImportResultModal(false)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para eliminar */}
      {showDeleteModal && equipmentToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-sm w-full mx-4 border border-gray-700">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">Confirmar eliminación</h3>
              <button
                onClick={cerrarModalEliminar}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <p className="text-gray-300 mb-2">
                ¿Estás seguro de que deseas eliminar este equipo?
              </p>
              <p className="text-white font-semibold text-lg">
                {equipmentToDelete.brand} {equipmentToDelete.model}
              </p>
              <p className="text-gray-400 text-sm mt-2">
                Serie: {equipmentToDelete.serialNumber}
              </p>
              <p className="text-gray-500 text-sm mt-4">
                Esta acción no se puede deshacer.
              </p>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-700 bg-gray-750">
              <button
                onClick={cerrarModalEliminar}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TABLA DINÁMICA */}
      {filteredInventory.length > 0 ? (
        <Tabla
          datos={filteredInventory}
          titulo={`${pageName || "Inventario"} List`}
          columnasPersonalizadas={columnConfig}
          onEditar={handleEdit}
          onEliminar={abrirModalEliminar}
          mostrarAcciones={true}
        />
      ) : (
        <p className="text-gray-400 mt-6">No hay equipos aún. Puedes agregar uno o importar un CSV.</p>
      )}

      {/* Modal Agregar Equipo */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl border border-gray-700">
            <h3 className="text-xl font-bold mb-4 text-white">Agregar Nuevo Equipo</h3>

            <div className="grid grid-cols-2 gap-4">
              <input
                className="bg-gray-700 border border-gray-600 p-2 rounded text-white placeholder-gray-400"
                placeholder="Marca"
                value={newEquipment.brand}
                onChange={(e) => setNewEquipment({ ...newEquipment, brand: e.target.value })}
              />
              <input
                className="bg-gray-700 border border-gray-600 p-2 rounded text-white placeholder-gray-400"
                placeholder="Modelo"
                value={newEquipment.model}
                onChange={(e) => setNewEquipment({ ...newEquipment, model: e.target.value })}
              />
              <input
                className="bg-gray-700 border border-gray-600 p-2 rounded text-white placeholder-gray-400"
                placeholder="Tipo"
                value={newEquipment.type}
                onChange={(e) => setNewEquipment({ ...newEquipment, type: e.target.value })}
              />
              <input
                className="bg-gray-700 border border-gray-600 p-2 rounded text-white placeholder-gray-400"
                placeholder="Número de Serie"
                value={newEquipment.serialNumber}
                onChange={(e) => setNewEquipment({ ...newEquipment, serialNumber: e.target.value })}
              />
              <input
                className="bg-gray-700 border border-gray-600 p-2 rounded text-white placeholder-gray-400"
                placeholder="Placa (opcional)"
                value={newEquipment.plateNumber}
                onChange={(e) => setNewEquipment({ ...newEquipment, plateNumber: e.target.value })}
              />
              <input
                className="bg-gray-700 border border-gray-600 p-2 rounded text-white placeholder-gray-400"
                placeholder="Ubicación"
                value={newEquipment.location}
                onChange={(e) => setNewEquipment({ ...newEquipment, location: e.target.value })}
              />
              <select
                className="bg-gray-700 border border-gray-600 p-2 rounded text-white"
                value={newEquipment.status}
                onChange={(e) => setNewEquipment({ ...newEquipment, status: e.target.value })}
              >
                <option value="Activo">Activo</option>
                <option value="En Uso">En Uso</option>
                <option value="Mantenimiento">Mantenimiento</option>
              </select>
              <input
                className="bg-gray-700 border border-gray-600 p-2 rounded text-white placeholder-gray-400"
                placeholder="Costo"
                type="number"
                value={newEquipment.cost}
                onChange={(e) => setNewEquipment({ ...newEquipment, cost: e.target.value })}
              />
            </div>

            <div className="flex justify-end mt-6 gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddEquipment}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white font-medium"
              >
                Guardar Equipo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Equipo */}
      {showEditModal && editingEquipment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-700">
            <h3 className="text-xl font-bold mb-4 text-white">Editar Equipo</h3>

            <div className="grid grid-cols-2 gap-4">
              <input
                className="bg-gray-700 border border-gray-600 p-2 rounded text-white"
                value={editingEquipment.brand}
                onChange={(e) => setEditingEquipment({ ...editingEquipment, brand: e.target.value })}
              />
              <input
                className="bg-gray-700 border border-gray-600 p-2 rounded text-white"
                value={editingEquipment.model}
                onChange={(e) => setEditingEquipment({ ...editingEquipment, model: e.target.value })}
              />
              <input
                className="bg-gray-700 border border-gray-600 p-2 rounded text-white"
                value={editingEquipment.type}
                onChange={(e) => setEditingEquipment({ ...editingEquipment, type: e.target.value })}
              />
              <input
                className="bg-gray-700 border border-gray-600 p-2 rounded text-white"
                value={editingEquipment.serialNumber}
                onChange={(e) => setEditingEquipment({ ...editingEquipment, serialNumber: e.target.value })}
              />
              <input
                className="bg-gray-700 border border-gray-600 p-2 rounded text-white"
                value={editingEquipment.plateNumber || ""}
                onChange={(e) => setEditingEquipment({ ...editingEquipment, plateNumber: e.target.value })}
              />
              <input
                className="bg-gray-700 border border-gray-600 p-2 rounded text-white"
                value={editingEquipment.location || ""}
                onChange={(e) => setEditingEquipment({ ...editingEquipment, location: e.target.value })}
              />
              <select
                className="bg-gray-700 border border-gray-600 p-2 rounded text-white"
                value={editingEquipment.status}
                onChange={(e) => setEditingEquipment({ ...editingEquipment, status: e.target.value })}
              >
                <option value="Activo">Activo</option>
                <option value="En Uso">En Uso</option>
                <option value="Mantenimiento">Mantenimiento</option>
              </select>
              <input
                type="number"
                className="bg-gray-700 border border-gray-600 p-2 rounded text-white"
                value={editingEquipment.cost || ""}
                onChange={(e) => setEditingEquipment({ ...editingEquipment, cost: Number(e.target.value) })}
              />
            </div>

            <div className="flex justify-end mt-6 gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingEquipment(null);
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-medium"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}