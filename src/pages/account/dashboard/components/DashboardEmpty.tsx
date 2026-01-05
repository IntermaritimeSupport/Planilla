"use client";

import { FolderOpen, AlertTriangle } from "lucide-react";

interface DashboardEmptyStateProps {
  title?: string;
  description?: string;
  isError?: boolean;
}

export default function DashboardEmptyState({
  title = "No hay información para mostrar",
  description = "Cuando haya datos disponibles, aparecerán aquí automáticamente.",
  isError = false,
}: DashboardEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center">
      {/* Icon */}
      <div
        className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
          isError
            ? "bg-red-100 text-red-600"
            : "bg-gray-100 text-gray-500"
        }`}
      >
        {isError ? (
          <AlertTriangle className="h-8 w-8" />
        ) : (
          <FolderOpen className="h-8 w-8" />
        )}
      </div>

      {/* Text */}
      <h2 className="text-lg font-semibold text-white-800">
        {title}
      </h2>
      <p className="mt-1 max-w-md text-sm text-gray-500">
        {description}
      </p>
    </div>
  );
}
