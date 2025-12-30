import React, { useCallback, useContext, useState } from 'react';
import Context from '../context/userContext';
import { authServices } from '../actions/authentication';

interface UserContextValue {
  jwt: string | null;
  setJWT: React.Dispatch<React.SetStateAction<string | null>>;
}

interface UseUserReturn {
  isLogged: boolean;
  isLoginLoading: boolean;
  hasLoginError: boolean;
  login: ({ email, password }: { email: string; password: string }) => Promise<void>;
  logout: () => void;
}

export default function useUser(): UseUserReturn {
  const { jwt, setJWT } = useContext(Context) as UserContextValue;
  const [state, setState] = useState<{ loading: boolean; error: boolean }>({
    loading: false,
    error: false,
  });

  const login = useCallback(
    async ({ email, password }: { email: string; password: string }): Promise<void> => {
      setState({ loading: true, error: false });

      try {
        const token = await authServices.login(email, password);
        
        // Guardar token en storage
        window.localStorage.setItem('jwt', token);
        window.sessionStorage.setItem('jwt', token);
        
        setState({ loading: false, error: false });
        setJWT(token);
      } catch (err) {
        window.localStorage.removeItem('jwt');
        window.sessionStorage.removeItem('jwt');
        setState({ loading: false, error: true });
        setJWT(null);
        console.error(err);
        throw err;
      }
    },
    [setJWT]
  );

  const logout = useCallback(async (): Promise<void> => {
    setState({ loading: true, error: false });

    try {
      if (jwt) {
        // Limpiar el token (remover comillas si las tiene)
        const cleanToken = jwt.replace(/^"|"$/g, '');
        await authServices.logout(cleanToken);
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // Limpiar estado sin importar si logout falló
      setJWT(null);
      window.localStorage.removeItem('jwt');
      window.sessionStorage.removeItem('jwt');
      setState({ loading: false, error: false });
      
      // Navegar usando window.location (fallback sin React Router)
      window.location.href = '/login';
    }
  }, [setJWT, jwt]);

  return {
    isLogged: Boolean(jwt),
    isLoginLoading: state.loading,
    hasLoginError: state.error,
    login,
    logout,
  };
}