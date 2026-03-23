import { Navigate } from "react-router-dom"
import useUserProfile from "../hook/userUserProfile"
import { getUserRoles } from "./routesConfig"

interface Props {
  children: React.ReactNode
}

/**
 * Ruta exclusiva para GLOBAL_ADMIN.
 * Cualquier otro rol recibe 403 → redirect a /login.
 */
const ProtectedAdminRoute = ({ children }: Props) => {
  const { profile } = useUserProfile()

  if (!profile) {
    return <Navigate to="/login" replace />
  }

  const roles = getUserRoles(profile)
  if (!roles.includes("global_admin")) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default ProtectedAdminRoute
