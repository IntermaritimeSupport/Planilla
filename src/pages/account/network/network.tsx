// src/components/NextworkPage.tsx
"use client";

import { Outlet, NavLink } from "react-router-dom";
import React from "react"; // Importar React explícitamente

interface SubRoutesProps {
  // Esta interfaz parece no usarse directamente en este componente,
  // pero la mantenemos si es un patrón de tu proyecto.
  subroutes?: {
    name?: string;
    href?: string;
  }[];
}

const NextworkPage: React.FC<SubRoutesProps> = () => {

  return (
    <div className="bg-slate-900 text-gray-100 px-6 py-4">
      {/* Barra de navegación/switch */}
      <nav className="border-b border-slate-700 mb-4 py-2">
        <ul className="flex gap-4 py-2">
          <li>
            <NavLink
              to={`all`} // Ruta específica para conexiones locales
              className={({ isActive }) =>
                `text-lg font-medium py-2 px-4 rounded-md transition-colors duration-200 ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-slate-700"
                }`
              }
            >
              Conexiones de Red Local
            </NavLink>
          </li>
          <li>
            <NavLink
              to={`providers`} // Ruta para proveedores
              className={({ isActive }) =>
                `text-lg font-medium py-2 px-4 rounded-md transition-colors duration-200 ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-slate-700"
                }`
              }
            >
              Proveedores de Red
            </NavLink>
          </li>
        </ul>
      </nav>

      <Outlet />
    </div>
  );
};

export default NextworkPage;