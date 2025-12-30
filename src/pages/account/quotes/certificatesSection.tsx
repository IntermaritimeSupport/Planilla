export default function CertificatesSection() {
    const certificates = [
      {
        id: "CERT-2023-001",
        name: "Certificado de Seguro de Vida",
        issueDate: "10/01/2023",
        expiryDate: "10/01/2024",
        status: "Vigente",
      },
      {
        id: "CERT-2023-002",
        name: "Certificado de Seguro de Auto",
        issueDate: "15/03/2023",
        expiryDate: "15/03/2024",
        status: "Vigente",
      },
      {
        id: "CERT-2022-003",
        name: "Certificado de Seguro de Viaje",
        issueDate: "20/11/2022",
        expiryDate: "20/11/2023",
        status: "Por vencer",
      },
    ]
  
    return (
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Mis Certificados</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {certificates.map((certificate) => (
            <div key={certificate.id} className="bg-white overflow-hidden shadow rounded-lg border">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">{certificate.name}</h3>
                <div className="mt-3 flex flex-col space-y-1">
                  <p className="text-sm text-gray-500">
                    ID: <span className="font-medium text-gray-700">{certificate.id}</span>
                  </p>
                  <p className="text-sm text-gray-500">
                    Emitido: <span className="font-medium text-gray-700">{certificate.issueDate}</span>
                  </p>
                  <p className="text-sm text-gray-500">
                    Vence: <span className="font-medium text-gray-700">{certificate.expiryDate}</span>
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Estado:{" "}
                    <span
                      className={`font-medium ${certificate.status === "Vigente" ? "text-green-600" : "text-yellow-600"}`}
                    >
                      {certificate.status}
                    </span>
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-4 sm:px-6 flex justify-between">
                <button className="text-sm text-orange-600 hover:text-orange-800">Ver certificado</button>
                <button className="text-sm text-orange-600 hover:text-orange-800">Descargar PDF</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }