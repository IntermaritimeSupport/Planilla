"use client";

import { UserProfile } from "../../context/userProfileContext";
import useUser from "../../hook/useUser";
import { getMainRoutesForRole, getUserRoles } from "../../routes/routesConfig";
import { LogOut } from "lucide-react";
import { InventoryIcon } from "../icons/icons";
import { useCompany } from "../../context/routerContext";
import { Link, useLocation } from "react-router-dom";

export interface Company {
  id: string;
  code: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string;
  _count: {
    users: number;
    equipments: number;
    licenses: number;
    documents: number;
    maintenances: number;
  };
}

type Subroutes = {
  name: string;
  href: string;
};

type DashboardProps = {
  subroutes?: Subroutes[];
  isLogged: boolean;
  profile: UserProfile | null;
  companies?: Company[];
  isDarkMode?: boolean;
};

const SlideBar: React.FC<DashboardProps> = ({
  profile,
  isDarkMode = true,
}) => {
  const { logout } = useUser();
  const { selectedCompany } = useCompany();
  const location = useLocation();
  const currentPathSegments = location.pathname.split("/").filter(Boolean);
  const baseRoute = currentPathSegments.length > 1 ? currentPathSegments[1] : "";
  const userRoles = profile?.roles ? getUserRoles(profile) : ["user"];
  const filteredNavLinks =
    userRoles.flatMap((role) =>
      getMainRoutesForRole(
        role as "user" | "super_admin" | "admin" | "moderator"
      ).map((route) => ({
        href: typeof route === "string" ? route : route.href,
        name: typeof route === "string" ? route : route.name,
        icon:
          typeof route === "string"
            ? undefined
            : route.icon
            ? <route.icon />
            : undefined,
      }))
    ) || [];

  return (
    <div
      className={`h-full w-56 border-r flex flex-col transition-colors duration-300 ${
        isDarkMode
          ? "bg-slate-950 border-slate-800"
          : "bg-white border-gray-200"
      }`}
    >
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {filteredNavLinks?.length > 0 ? (
            filteredNavLinks?.map((link, index) => {
              const linkBase = link.href.split("/").filter(Boolean)[0] || "";
              const isActive = baseRoute === linkBase;

              return (
                <li key={index}>
                  <Link
                    to={`/${selectedCompany?.code || 'code'}${link?.href}`}
                    className={`flex items-center space-x-3 px-4 py-2.5 rounded-sm transition-all duration-300 group ${
                      isActive
                        ? isDarkMode
                          ? "bg-blue-600/50 text-white shadow-lg shadow-blue-600/20"
                          : "bg-blue-500/50 text-white shadow-lg shadow-blue-500/20"
                        : isDarkMode
                        ? "text-slate-300 hover:bg-slate-800 hover:text-white"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <span
                      className={`flex-shrink-0 ${
                        isActive
                          ? "text-white"
                          : isDarkMode
                          ? "text-slate-400 group-hover:text-slate-300"
                          : "text-gray-500 group-hover:text-gray-600"
                      }`}
                    >
                      {link?.icon || <InventoryIcon />}
                    </span>
                    <span className="text-sm font-medium">{link?.name}</span>
                  </Link>
                </li>
              );
            })
          ) : (
            <span
              className={`text-sm ${
                isDarkMode ? "text-slate-500" : "text-gray-500"
              }`}
            >
              No tienes acceso a ninguna ruta
            </span>
          )}
        </ul>
      </nav>

      {/* Footer Section */}
      <div
        className={`p-4 border-t ${
          isDarkMode ? "border-slate-800" : "border-gray-200"
        } flex flex-col space-y-2 flex-shrink-0`}
      >
        {/* Profile Link */}
        <Link
          to={`/${selectedCompany?.code || 'code'}/profile/1`}
          className={`flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-all duration-300 group ${
            baseRoute === "profile"
              ? isDarkMode
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                : "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
              : isDarkMode
              ? "text-slate-300 hover:bg-slate-800 hover:text-white"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
              baseRoute === "profile"
                ? "bg-blue-700 text-white"
                : isDarkMode
                ? "bg-slate-700 text-slate-200 group-hover:bg-slate-600"
                : "bg-gray-200 text-gray-600 group-hover:bg-gray-300"
            }`}
          >
            {profile?.username ? profile.username[0].toUpperCase() : "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className={`text-sm font-medium truncate ${
                baseRoute === "profile"
                  ? "text-white"
                  : isDarkMode
                  ? "text-slate-300"
                  : "text-gray-600"
              }`}
            >
              {profile?.username || "user"}
            </p>
            <p
              className={`text-xs truncate ${
                isDarkMode ? "text-slate-500" : "text-gray-500"
              }`}
            >
              Perfil
            </p>
          </div>
        </Link>

        {/* Logout Button */}
        <button
          className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-all duration-300 group ${
            isDarkMode
              ? "text-slate-300 hover:bg-red-900/20 hover:text-red-400"
              : "text-gray-600 hover:bg-red-50 hover:text-red-600"
          }`}
          onClick={logout}
        >
          <LogOut
            className={`h-5 w-5 flex-shrink-0 ${
              isDarkMode
                ? "text-slate-400 group-hover:text-red-400"
                : "text-gray-500 group-hover:text-red-600"
            }`}
          />
          <span className="text-sm font-medium">Cerrar sesión</span>
        </button>
      </div>
    </div>
  );
};

export default SlideBar;