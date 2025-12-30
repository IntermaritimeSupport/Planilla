"use client"

import { Outlet } from "react-router-dom"


interface SubRoutesProps {
  subroutes: {
    name: string
    href: string
  }[]
}
const DevicesPage:React.FC<SubRoutesProps> = () => {

  return (
    <div className="h-[90vh] bg-gray-900 text-white p-6">
      <Outlet />
    </div>
  )
}
export default DevicesPage;