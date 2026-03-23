"use client";

import { UserProfile } from "../../context/userProfileContext";
import useUser from "../../hook/useUser";
import { getMainRoutesForRole, getUserRoles, RouteGroup } from "../../routes/routesConfig";
import { ChevronRight, LogOut, UserCircle } from "lucide-react";
import { useCompany } from "../../context/routerContext";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "../../context/themeContext";
import { useTranslation } from "react-i18next";

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

type DashboardProps = {
  subroutes?: { name: string; href: string }[];
  isLogged: boolean;
  profile: UserProfile | null;
  companies?: Company[];
};

const GROUP_ORDER: RouteGroup[] = ['ADMINISTRACIÓN', 'PRINCIPAL', 'NÓMINA', 'REPORTES', 'CONFIGURACIÓN'];

const SlideBar: React.FC<DashboardProps> = ({ profile }) => {
  const { logout } = useUser();
  const { selectedCompany } = useCompany();
  const { isDarkMode } = useTheme();
  const { t } = useTranslation();
  const location = useLocation();

  const currentPathSegments = location.pathname.split("/").filter(Boolean);
  // Para rutas /admin/* el primer segmento es "admin", para el resto es el segundo
  const isAdminPath = currentPathSegments[0] === "admin";
  const baseRoute = isAdminPath
    ? `admin/${currentPathSegments[1] ?? ""}`
    : currentPathSegments.length > 1 ? currentPathSegments[1] : "";

  const userRoles = profile?.roles ? getUserRoles(profile) : ["user"];
  const isGlobalAdmin = userRoles.includes("global_admin");
  const allLinks = userRoles.flatMap((role) =>
    getMainRoutesForRole(role)
  );

  // Deduplicate by href
  const seen = new Set<string>();
  const filteredNavLinks = allLinks.filter((route) => {
    if (seen.has(route.href)) return false;
    seen.add(route.href);
    return true;
  });

  // Group routes
  // GLOBAL_ADMIN solo ve ADMINISTRACIÓN; los demás ven todo excepto ADMINISTRACIÓN
  const visibleGroups = isGlobalAdmin
    ? GROUP_ORDER.filter((g) => g === 'ADMINISTRACIÓN')
    : GROUP_ORDER.filter((g) => g !== 'ADMINISTRACIÓN');

  const groupedLinks = visibleGroups.reduce<Record<string, typeof filteredNavLinks>>(
    (acc, group) => {
      const items = filteredNavLinks.filter((r) => (r as any).group === group);
      if (items.length > 0) acc[group] = items;
      return acc;
    },
    {}
  );

  const initials = profile?.username
    ? profile.username.slice(0, 2).toUpperCase()
    : "U";

  // const roleLabel = profile?.roles
  //   ? profile.roles.split(',')[0].trim().toUpperCase().replace('_', ' ')
  //   : 'USER';

  return (
    <div
      className={`h-full w-56 border-r flex flex-col transition-colors duration-300 ${
        isDarkMode
          ? "bg-slate-950 border-slate-800/60"
          : "bg-white border-gray-200"
      }`}
    >
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {Object.entries(groupedLinks).map(([group, links]) => (
          <div key={group} className="mb-4">
            {/* Section label */}
            <p
              className={`px-3 mb-1 text-[10px] font-semibold tracking-widest uppercase ${
                isDarkMode ? "text-slate-500" : "text-gray-400"
              }`}
            >
              {t(group)}
            </p>

            <ul className="space-y-0.5">
              {links.map((link, index) => {
                // Para rutas admin: comparar "admin/overview" vs "admin/overview"
                // Para rutas normales: comparar segundo segmento
                const hrefParts = link.href.split("/").filter(Boolean);
                const linkBase = hrefParts[0] === "admin"
                  ? `admin/${hrefParts[1] ?? ""}`
                  : hrefParts[0] || "";
                const isActive = baseRoute === linkBase;
                const IconComp = (link as any).icon;

                return (
                  <li key={index}>
                    <Link
                      to={link.href.startsWith("/admin/") ? link.href : `/${selectedCompany?.code ?? ""}${link.href}`}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150 group relative ${
                        isActive
                          ? isDarkMode
                            ? "bg-teal-500/10 text-teal-400"
                            : "bg-teal-50 text-teal-700"
                          : isDarkMode
                          ? "text-slate-400 hover:bg-slate-800/70 hover:text-slate-100"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                    >
                      {/* Active left bar */}
                      {isActive && (
                        <span
                          className={`absolute left-0 top-1 bottom-1 w-0.5 rounded-full ${
                            isDarkMode ? "bg-teal-400" : "bg-teal-600"
                          }`}
                        />
                      )}

                      {/* Icon */}
                      {IconComp && (
                        <span
                          className={`flex-shrink-0 w-4 h-4 ${
                            isActive
                              ? isDarkMode ? "text-teal-400" : "text-teal-600"
                              : isDarkMode
                              ? "text-slate-500 group-hover:text-slate-300"
                              : "text-gray-400 group-hover:text-gray-600"
                          }`}
                        >
                          <IconComp size={16} />
                        </span>
                      )}

                      <span className="flex-1 truncate">{t(link.name)}</span>

                      {isActive && (
                        <ChevronRight
                          size={14}
                          className={isDarkMode ? "text-teal-400/60" : "text-teal-500/60"}
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div
        className={`border-t flex-shrink-0 ${
          isDarkMode ? "border-slate-800/60" : "border-gray-200"
        }`}
      >
        {/* User info */}
        <Link
          to={isGlobalAdmin ? "/admin/overview" : `/${selectedCompany?.code ?? ""}/profile/1`}
          className={`flex items-center gap-3 px-4 py-3 transition-colors duration-150 group ${
            isDarkMode
              ? "hover:bg-slate-800/50"
              : "hover:bg-gray-50"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
              isDarkMode
                ? "bg-teal-500/20 text-teal-400"
                : "bg-teal-100 text-teal-700"
            }`}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className={`text-sm font-semibold truncate ${
                isDarkMode ? "text-slate-200" : "text-gray-800"
              }`}
            >
              {profile?.username || "Usuario"}
            </p>
            <p
              className={`text-[10px] truncate ${
                isDarkMode ? "text-slate-500" : "text-gray-400"
              }`}
            >
              {t("profile")}
            </p>
          </div>
          <UserCircle
            size={14}
            className={`flex-shrink-0 ${
              isDarkMode ? "text-slate-600 group-hover:text-slate-400" : "text-gray-300 group-hover:text-gray-500"
            }`}
          />
        </Link>

        {/* Logout */}
        <button
          onClick={logout}
          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors duration-150 border-t ${
            isDarkMode
              ? "border-slate-800/60 text-slate-500 hover:bg-red-950/30 hover:text-red-400"
              : "border-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-600"
          }`}
        >
          <LogOut size={15} />
          <span>{t("logout")}</span>
        </button>
      </div>
    </div>
  );
};

export default SlideBar;
