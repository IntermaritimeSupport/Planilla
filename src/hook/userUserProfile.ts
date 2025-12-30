// hooks/useUserProfile.ts
import { useContext } from 'react';
import UserProfileContext, { UserProfileContextValue } from '../context/userProfileContext';

export default function useUserProfile(): UserProfileContextValue {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error('useUserProfile debe usarse dentro de un <UserProfileProvider>');
  }
  return context;
}
