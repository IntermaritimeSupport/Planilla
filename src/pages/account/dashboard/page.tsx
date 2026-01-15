"use client"

import { Outlet } from "react-router-dom"
import { CurrentPathname } from "../../../components/layouts/main"


interface SubRoutesProps {
    currentPathname?: CurrentPathname
  subroutes?: {
    name?: string
    href?: string
  }[]
}
const DashboardPage:React.FC<SubRoutesProps> = () => {

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 flex flex-col">
      <Outlet />
    </div>
  )
}
export default DashboardPage;