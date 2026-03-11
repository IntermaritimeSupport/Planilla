import React, { ReactNode, useState } from 'react';
import { authServices } from '../actions/authentication';

// Define types for the context value
interface UserContextValue {
  jwt: string | null;
  setJWT: React.Dispatch<React.SetStateAction<string | null>>;
}

const Context = React.createContext<UserContextValue | undefined>(undefined);

interface UserContextProps {
  children: ReactNode;
}

export function UserContextProvider({ children }: UserContextProps) {
  const [jwt, setJWT] = useState<string | null>(() => {
    return authServices.getCurrentUser() ?? null;
  });
  return (
    <Context.Provider value={{ jwt, setJWT }}>
      {children}
    </Context.Provider>
  );
}

export default Context;
