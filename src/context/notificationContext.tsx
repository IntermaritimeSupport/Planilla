import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type NotificationType = 'info' | 'warning' | 'success' | 'error';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  href?: string;
  createdAt: Date;
}

interface NotificationContextType {
  notifications: AppNotification[];
  addNotification: (n: Omit<AppNotification, 'createdAt'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const addNotification = useCallback((n: Omit<AppNotification, 'createdAt'>) => {
    setNotifications(prev => {
      if (prev.some(x => x.id === n.id)) return prev;
      return [{ ...n, createdAt: new Date() }, ...prev];
    });
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => setNotifications([]), []);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};
