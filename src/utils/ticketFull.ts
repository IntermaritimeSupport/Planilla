// Types para Tickets según Schema Prisma

export type TicketType = "ticket" | "vacations" | "permission"
export type TicketStatus = "open" | "pending" | "approved" | "rejected" | "closed"
export type TicketPriority = "trivial" | "low" | "medium" | "high" | "urgent"

export interface User {
  id: string
  username: string
  email: string
  person?: {
    fullName?: string
    userCode?: string
  }
}

export interface Ticket {
  id: string
  ticketNumber?: number
  title: string
  description: string
  img?: string
  comment?: string
  type: TicketType
  priority: TicketPriority
  status: TicketStatus
  startDate?: Date | null
  endDate?: Date | null
  requestDays?: number | null
  approvedDays?: number | null
  view?: boolean
  reviewed?: boolean
  sendById?: string
  sendBy?: User
  sendToId?: string
  sendTo?: User
  companyId?: string
  company?: Company
  createdAt: Date
  updatedAt: Date
}

export type CreateTicketInput = Omit<Ticket, "id" | "createdAt" | "updatedAt" | "ticketNumber" | "company" | "sendBy" | "sendTo">
export type UpdateTicketInput = Partial<Omit<Ticket, "id" | "createdAt" | "updatedAt" | "ticketNumber">>

export interface Company {
  id: string
  name: string
  ticketCount: number
}

export interface User {
  id: string
  name: string
  email: string
  companyId: string
  ticketCount: number
}
