"use client"
import { Outlet } from "react-router-dom"
import { useTheme } from "../../../context/themeContext"

// layout for the users page
// this will render the Outlet for nested routes like /users/all, /users/create, etc.

interface SubRoutesProps {
  subroutes?: {
    name?: string
    href?: string
  }[]
}

const SettingsPage:React.FC<SubRoutesProps> = () => {
  const { isDarkMode, } = useTheme();
  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-900'} p-6`}>
      <Outlet />
    </div>
  )
}
export default SettingsPage;