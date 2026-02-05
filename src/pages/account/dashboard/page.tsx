"use client"

import { Outlet } from "react-router-dom"
import { CurrentPathname } from "../../../components/layouts/main"
import { useTheme } from "../../../context/themeContext"


interface SubRoutesProps {
    currentPathname?: CurrentPathname
  subroutes?: {
    name?: string
    href?: string
  }[]
}
const DashboardPage:React.FC<SubRoutesProps> = () => {
  const { isDarkMode, } = useTheme();
  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'} p-6 flex flex-col`}>
      <Outlet />
    </div>
  )
}
export default DashboardPage;