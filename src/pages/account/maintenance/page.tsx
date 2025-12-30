"use client"

import { Outlet } from "react-router-dom"

interface CurrentPathname {
  name: string;
}

interface SubRoutesProps {
  currentPathname?: CurrentPathname
  subroutes?: {
    name?: string
    href?: string
  }[]
}
const MaintenancePage:React.FC<SubRoutesProps> = () => {

  return (
    <div className="h-[90vh] bg-gray-900 text-white p-6 flex flex-col">
      <Outlet/>
    </div>
  )
}
export default MaintenancePage;