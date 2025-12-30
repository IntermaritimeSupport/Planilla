// UserProfileContext.tsx
import React, { ReactNode, useState, useEffect } from 'react';
import { decodeToken } from '../utils/decode';
import { authServices } from '../actions/authentication';

// Interfaz para los metadatos decodificados
export type DecodedMetaData = {
  id: string;
  username?: string;
  email?: string;
  roles?: string;
}

// Perfil de usuario que manejará el contexto
export type UserProfile = {
  id: string;
  username?: string;
  email?: string;
  roles?: string;
}

// Valor que maneja el contexto
export type UserProfileContextValue = {
  profile: UserProfile | null;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
}

// Crear contexto con valor inicial undefined
const UserProfileContext = React.createContext<UserProfileContextValue | undefined>(undefined);

// Props del provider
export type UserProfileProviderProps = {
  children: ReactNode;
}

export function UserProfileProvider({ children }: UserProfileProviderProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Inicializar el perfil desde el token
  useEffect(() => {
    try {
      // Obtener el token (ya es un string limpio)
      const token = authServices.getCurrentUser();
      
      if (!token) {
        setProfile(null);
        setIsInitialized(true);
        return;
      }

      // Decodificar el token
      const decoded = decodeToken();
      
      if (decoded) {
        setProfile({
          id: decoded.id,
          username: decoded.username ?? 'n/a',
          email: decoded.email ?? 'n/a',
          roles: decoded.roles ?? 'user',
        });
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error('Error inicializando perfil:', error);
      setProfile(null);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Mientras se inicializa, no renderizar nada
  if (!isInitialized) {
    return null;
  }

  return (
    <UserProfileContext.Provider value={{ profile, setProfile }}>
      {children}
    </UserProfileContext.Provider>
  );
}

export default UserProfileContext;