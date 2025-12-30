// Notification.tsx
"use client";

import { X, CheckCircle, AlertTriangle } from "lucide-react";

interface NotificationProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

export function Notification({ message, type, onClose }: NotificationProps) {
  const baseClasses = "fixed bottom-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center space-x-3 transition-opacity duration-300";
  
  const typeClasses = type === 'success'
    ? "bg-green-500 text-white"
    : "bg-red-600 text-white";

  const Icon = type === 'success' ? CheckCircle : AlertTriangle;

  return (
    <div className={`${baseClasses} ${typeClasses}`}>
      <Icon className="w-5 h-5" />
      <p className="text-sm font-medium">{message}</p>
      <button onClick={onClose} className="p-1 rounded-full hover:bg-white/20">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}