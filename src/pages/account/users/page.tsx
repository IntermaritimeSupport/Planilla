"use client"
import { Outlet } from "react-router-dom"

// layout for the users page
// this will render the Outlet for nested routes like /users/all, /users/create, etc.

interface SubRoutesProps {
  subroutes?: {
    name?: string
    href?: string
  }[]
}

const UsersPage:React.FC<SubRoutesProps> = () => {

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Page Header */}
      <Outlet />
    </div>
  )
}
export default UsersPage;