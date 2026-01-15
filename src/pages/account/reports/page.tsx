"use client"

import { Outlet } from "react-router-dom"


interface SubRoutesProps {
  subroutes?: {
    name?: string
    href?: string
  }[]
}
const ReportsPage:React.FC<SubRoutesProps> = () => {

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 flex flex-col">
      <Outlet />
    </div>
  )
}
export default ReportsPage;