// Suponiendo que este archivo está en algo como: src/pages/QuoteDetailPage.tsx

import { Link, useParams } from 'react-router-dom'; // 👈 1. Importar useParams
import useSWR from 'swr';
const { VITE_API_URL } = import.meta.env
// --- INTERFACES y HELPERS (sin cambios, están perfectos) ---
interface CourseInfo { id: number; name: string; abbr: string | null; imo_no: string | null; }
interface QuoteCourse { id: number; type: string; basePrice: number; surcharge: number; course: CourseInfo; }
interface UserInfo { id: number; name: string | null; email: string; }
interface Quote { id: number; createdAt: string; expiresAt: string; quotedPrice: number; status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED'; government: string | null; user: UserInfo; courses: QuoteCourse[]; }

const formatDate = (isoDate: string): string => new Date(isoDate).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
const formatCurrency = (amount: number): string => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
const translateStatus = (status: Quote['status']): string => ({ PENDING: 'Pendiente', APPROVED: 'Aprobada', REJECTED: 'Rechazada', EXPIRED: 'Expirada' }[status] || 'Desconocido');
const getStatusClass = (status: Quote['status']): string => {
  switch (status) {
    case 'APPROVED': return 'bg-green-100 text-green-800';
    case 'PENDING': return 'bg-yellow-100 text-yellow-800';
    case 'REJECTED': case 'EXPIRED': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

// Fetcher para SWR (sin cambios)
const fetcher = (url: string) => fetch(url).then((res) => res.json());

// --- EL COMPONENTE DE LA PÁGINA DE DETALLE (CORREGIDO) ---
export default function QuoteDetailPage() {
  // 👈 2. Usar useParams para obtener el 'id' de la URL
  const { id } = useParams<{ id: string }>();

  // 👈 3. Construir la URL completa de la API usando la variable de entorno
  const apiUrl = `${VITE_API_URL}/api/quotations/quote/${id}/get`;

  // SWR llamará a la API correcta. No se necesita la condición ternaria si la página
  // solo se renderiza cuando hay un 'id'.
  const { data: quote, error, isLoading } = useSWR<Quote>(apiUrl, fetcher);

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Cargando detalles...</div>;
  }

  // Manejar el caso de error de la API o si la cotización no se encuentra (la API devuelve 404)
  if (error || !quote?.id) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <h1 className="text-2xl font-bold mb-4">Cotización no encontrada</h1>
        <p className="text-gray-500 mb-6">No pudimos encontrar la cotización que buscas.</p>
        <Link to="/account/quotes" className="text-orange-600 hover:underline">
          Volver al listado
        </Link>
      </div>
    );
  }

  const formatQuoteId = `Flow/Q/${quote.id.toString().padStart(4, '0')}`;

  return (
    // El resto del JSX es idéntico, ya que es perfecto.
    <div className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Botón para volver */}
        <div className="mb-6">
          <Link to="/account/quotes" className="text-sm font-medium text-gray-600 hover:text-orange-600 flex items-center">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver al listado
          </Link>
        </div>
        
        {/* ... El resto del JSX de la interfaz de usuario no necesita cambios ... */}
        {/* Cabecera de la cotización */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Detalle de la Cotización</h1>
              <p className="text-gray-500 font-mono mt-1">{formatQuoteId}</p>
            </div>
            <span className={`mt-3 sm:mt-0 px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${getStatusClass(quote.status)}`}>
              {translateStatus(quote.status)}
            </span>
          </div>
        </div>
        
        {/* Resumen en dos columnas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Información del Solicitante */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold text-gray-700 border-b pb-2 mb-4">Información del Solicitante</h2>
            <div className="space-y-2 text-sm">
              <p><strong className="text-gray-600">Nombre:</strong> {quote.user.name || 'No especificado'}</p>
              <p><strong className="text-gray-600">Email:</strong> {quote.user.email}</p>
            </div>
          </div>
          {/* Resumen de la Cotización */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold text-gray-700 border-b pb-2 mb-4">Resumen de la Cotización</h2>
            <div className="space-y-2 text-sm">
              <p><strong className="text-gray-600">Fecha de Creación:</strong> {formatDate(quote.createdAt)}</p>
              <p><strong className="text-gray-600">Fecha de Expiración:</strong> {formatDate(quote.expiresAt)}</p>
              <p><strong className="text-gray-600">Gobierno Aplicado:</strong> <span className="capitalize">{quote.government || 'No especificado'}</span></p>
            </div>
          </div>
        </div>

        {/* Tabla de Cursos Incluidos */}
        <div className="bg-white rounded-lg shadow-md">
          <h2 className="text-lg font-semibold text-gray-700 p-6 border-b">Cursos Incluidos</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Curso</th>
                  <th scope="col" className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                  <th scope="col" className="px-6 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Precio Base</th>
                  <th scope="col" className="px-6 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Goverment fee</th>
                  <th scope="col" className="px-6 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Subtotal</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {quote.courses.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-800">{item.course.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600 capitalize">{item.type === 'new' ? 'Nuevo' : 'Renovación'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-gray-600">{formatCurrency(item.basePrice)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-gray-600">{formatCurrency(item.surcharge)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-gray-800">{formatCurrency(item.basePrice + item.surcharge)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-right font-bold text-gray-700 uppercase">Total de la Cotización</td>
                  <td className="px-6 py-4 text-right font-bold text-lg text-gray-900">{formatCurrency(quote.quotedPrice)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}