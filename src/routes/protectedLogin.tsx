import { Navigate, useLocation} from "react-router-dom";
import { User } from "./approutes";

interface ProtectedLoginProps {
  auth: User;
  children: React.ReactNode;
}

const ProtectedLogin: React.FC<ProtectedLoginProps> = ({auth, children}) => {
  const location = useLocation();
  if (auth.isSignedIn===true) {
    const redirectPath = localStorage.getItem('externalUrl')
    localStorage.removeItem('externalUrl')
    return <Navigate to={redirectPath ? redirectPath : "/account"}  replace state={{ from: location }} /> 
  }
  return children
}
export default ProtectedLogin
