interface Company {
  id: string
  code: string
  name: string
  address: string | null
  phone: string | null
  email: string | null
  ruc: string | null
  logoUrl: string | null
  isActive: boolean  // ❌ Era string | null, debe ser boolean
  createdAt: string
  updatedAt: string
  createdByUserId: string | null  // ✅ Puede ser null
}

interface UserCompany {
  userId: string
  companyId: string
  company: Company
}

export interface UsuarioFull {
  id: string
  username: string
  email: string
  role: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  companies: UserCompany[]  // ❌ Era companyId, debe ser companies
  person: {
    id: string
    userId: string
    firstName: string | null  // ✅ Puede ser null
    lastName: string | null   // ✅ Puede ser null
    fullName: string | null   // ✅ Puede ser null
    contactEmail: string | null  // ✅ Puede ser null
    phoneNumber: string | null   // ✅ Puede ser null
    departmentId: string | null  // ✅ Puede ser null
    position: string | null      // ✅ Puede ser null
    status: string | null         // ✅ Puede ser null
    userCode: string
    createdAt: string
    updatedAt: string
    companyId: string | null  // ✅ Agregado (existe en el schema)
    department: {
      id: string
      name: string
      description: string | null  // ✅ Puede ser null
      companyId: string
      isActive: boolean
      createdAt: string  // ✅ Agregado
      updatedAt: string  // ✅ Agregado
    } | null  // ✅ Department puede ser null
  } | null  // ✅ Person puede ser null
  assignedEquipments?: any[]  // ✅ Del JSON que mostraste
  assignedMaintenances?: any[]  // ✅ Del JSON que mostraste
  assignedNetworks?: any[]  // ✅ Del JSON que mostraste
}