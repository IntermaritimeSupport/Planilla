
export default function ServicesSection() {
    const services = [
      {
        id: "SRV-2023-001",
        name: "Seguro de Vida Familiar",
        startDate: "15/01/2023",
        endDate: "15/01/2024",
        status: "Activo",
        price: "$125.00/mes",
        coverage: "Cobertura completa para toda la familia",
      },
      {
        id: "SRV-2023-002",
        name: "Seguro de Auto",
        startDate: "22/02/2023",
        endDate: "22/02/2024",
        status: "Activo",
        price: "$78.50/mes",
        coverage: "Cobertura contra daños, robo y responsabilidad civil",
      },
      {
        id: "SRV-2022-003",
        name: "Seguro de Hogar",
        startDate: "10/11/2022",
        endDate: "10/11/2023",
        status: "Por renovar",
        price: "$95.75/mes",
        coverage: "Protección contra incendios, robos y desastres naturales",
      },
    ]
  
    return (
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Mis Servicios Contratados</h2>
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {services.map((service) => (
              <li key={service.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">{service.name}</h3>
                  <p
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${service.status === "Activo" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}
                  >
                    {service.status}
                  </p>
                </div>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                  <div className="text-sm text-gray-500">
                    ID: <span className="text-gray-700">{service.id}</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    Precio: <span className="text-gray-700">{service.price}</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    Inicio: <span className="text-gray-700">{service.startDate}</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    Fin: <span className="text-gray-700">{service.endDate}</span>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    Cobertura: <span className="text-gray-700">{service.coverage}</span>
                  </p>
                </div>
                <div className="mt-3 flex space-x-4">
                  <button className="text-sm text-orange-600 hover:text-orange-800">Ver detalles</button>
                  <button className="text-sm text-orange-600 hover:text-orange-800">Renovar servicio</button>
                  <button className="text-sm text-orange-600 hover:text-orange-800">Reportar problema</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  }