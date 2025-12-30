import { Link } from 'react-router-dom';
import useSWR from 'swr'; // 👈 1. Importar el hook useSWR
const { VITE_API_URL } = import.meta.env

interface CourseInfo {
  id: number;
  name: string;
  abbr: string | null;
  imo_no: string | null;
}

interface QuoteCourse {
  id: number;
  type: string;
  basePrice: number;
  surcharge: number;
  course: CourseInfo;
}

interface UserInfo {
  id: number;
  name: string | null;
  email: string;
}

interface Quote {
  id: number;
  createdAt: string;
  quotedPrice: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  user: UserInfo;
  courses: QuoteCourse[];
}

// --- FUNCIONES AYUDANTES (Sin cambios) ---
const formatQuoteId = (id: number): string => `Flow/Q/${id.toString().padStart(4, '0')}`;
const formatDate = (isoDate: string): string => new Date(isoDate).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
const generateDescription = (courses: QuoteCourse[]): string => {
  if (!courses || courses.length === 0) return 'Sin cursos';
  const courseNames = courses.map(qc => qc.course.name);
  let description = courseNames.slice(0, 2).join(', ');
  if (courseNames.length > 2) description += '...';
  return description;
};
const formatCurrency = (amount: number): string => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
const translateStatus = (status: Quote['status']): string => ({
  PENDING: 'Pendiente',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
  EXPIRED: 'Expirada',
}[status] || 'Desconocido');
const getStatusClass = (status: Quote['status']): string => {
  switch (status) {
    case 'APPROVED': return 'bg-green-100 text-green-800';
    case 'PENDING': return 'bg-yellow-100 text-yellow-800';
    case 'REJECTED': case 'EXPIRED': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

// 👈 2. Definir una función "fetcher" global o local.
// SWR la usará para obtener los datos. Solo necesita recibir la URL.
const fetcher = (url: string) => fetch(url).then((res) => res.json());

// --- EL COMPONENTE ACTUALIZADO ---
export function QuotesSection() {
  const {
    data: quotes,
    error,
    isLoading
  } = useSWR<Quote[]>(`${VITE_API_URL}/api/quotations/all/getAll`, fetcher);

  // El manejo de estados de carga y error es más limpio
  if (error) return <p className="text-center p-8 text-red-600">Error al cargar los datos.</p>;
  if (isLoading) return <p className="text-center p-8">Cargando cotizaciones...</p>;

  return (
    <div className="">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        Historial de Cotizaciones
      </h2>
      <div className="overflow-x-auto bg-white border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              {/* 👇 4. Añadir la nueva columna "Solicitante" */}
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Solicitante</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {/* Si no hay cotizaciones, mostramos un mensaje amigable */}
            {(!quotes || quotes.length === 0) && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-500">
                  No se encontraron cotizaciones.
                </td>
              </tr>
            )}
            {/* Mapeamos los datos que nos devuelve SWR */}
            {quotes && quotes.map((quote) => (
              <tr key={quote.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{formatQuoteId(quote.id)}</td>
                {/* 👇 5. Mostrar el nombre del solicitante. Si no tiene nombre, muestra el email. */}
                <td className="px-6 py-4 whitespace-nowrap text-gray-600 font-medium">{quote.user.name || quote.user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">{generateDescription(quote.courses)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{formatDate(quote.createdAt)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">{formatCurrency(quote.quotedPrice)}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(quote.status)}`}>
                    {translateStatus(quote.status)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link to={`/account/quotes/${quote.id}`} className="text-orange-600 hover:text-orange-900">
                    Ver
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}