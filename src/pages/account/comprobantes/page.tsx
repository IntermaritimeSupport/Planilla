"use client"
import { Outlet } from "react-router-dom"
import { useTheme } from "../../../context/themeContext"

interface SubRoutesProps {
  subroutes?: { name?: string; href?: string }[]
}

const ComprobantesPage: React.FC<SubRoutesProps> = () => {
  const { isDarkMode } = useTheme()
  return (
    <div
      className={`min-h-screen ${
        isDarkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-900"
      } flex flex-col`}
    >
      <Outlet />
    </div>
  )
}

export default ComprobantesPage
