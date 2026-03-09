"use client";

import { UserProfile } from "../../context/userProfileContext";
import useUser from "../../hook/useUser";
import { getMainRoutesForRole, getUserRoles } from "../../routes/routesConfig";
import { LogOut, ChevronRight } from "lucide-react";
import { InventoryIcon } from "../icons/icons";
import { useCompany } from "../../context/routerContext";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "../../context/themeContext";

export interface Company {
  id: string; code: string; name: string; address: string; phone: string;
  email: string; isActive: boolean; createdAt: string; updatedAt: string;
  createdByUserId: string;
  _count: { users: number; equipments: number; licenses: number; documents: number; maintenances: number };
}

type DashboardProps = {
  subroutes?: { name: string; href: string }[];
  isLogged: boolean;
  profile: UserProfile | null;
  companies?: Company[];
};

const SlideBar: React.FC<DashboardProps> = ({ profile }) => {
  const { logout } = useUser();
  const { selectedCompany } = useCompany();
  const { isDarkMode } = useTheme();
  const location = useLocation();
  const currentSegments = location.pathname.split("/").filter(Boolean);
  const baseRoute = currentSegments.length > 1 ? currentSegments[1] : "";

  const userRoles = profile?.roles ? getUserRoles(profile) : ["user"];
  const navLinks = userRoles.flatMap((role) =>
    getMainRoutesForRole(role as any).map((route: any) => ({
      href: typeof route === "string" ? route : route.href,
      name: typeof route === "string" ? route : route.name,
      icon: typeof route === "string" ? undefined : route.icon ? <route.icon size={16} /> : undefined,
    }))
  ) || [];

  const avatar = profile?.username ? profile.username.slice(0, 2).toUpperCase() : "US";
  const gradients = ["from-violet-500 to-purple-600","from-blue-500 to-cyan-600","from-emerald-500 to-teal-600","from-orange-500 to-amber-600"];
  const grad = gradients[(profile?.username?.charCodeAt(0) ?? 0) % gradients.length];

  // Group links into categories of 5 for visual separation
  const CATEGORY_LABELS: Record<number, string> = { 0: "Principal", 5: "Nómina", 10: "Reportes" };

  return (
    <div className={`h-full w-56 flex flex-col transition-colors duration-300 border-r ${
      isDarkMode ? "bg-slate-950 border-slate-800/60" : "bg-white border-gray-100"
    }`}>

      {/* ── NAVIGATION ── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 scrollbar-thin">
        {navLinks.length > 0 ? (
          <ul className="space-y-0.5">
            {navLinks.map((link, i) => {
              const linkBase = link.href.split("/").filter(Boolean)[0] || "";
              const isActive = baseRoute === linkBase;
              const label = CATEGORY_LABELS[i];

              return (
                <li key={i}>
                  {/* Section label */}
                  {label && i > 0 && (
                    <div className={`px-3 pt-4 pb-1.5 ${isDarkMode ? "text-slate-600" : "text-gray-300"}`}>
                      <p className="text-[9px] font-bold uppercase tracking-widest">{label}</p>
                    </div>
                  )}
                  {label && i === 0 && (
                    <div className={`px-3 pb-1.5 ${isDarkMode ? "text-slate-600" : "text-gray-300"}`}>
                      <p className="text-[9px] font-bold uppercase tracking-widest">{label}</p>
                    </div>
                  )}

                  <Link
                    to={`/${selectedCompany?.code || "code"}${link.href}`}
                    className={`group flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-200 ${
                      isActive
                        ? isDarkMode
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                          : "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                        : isDarkMode
                          ? "text-slate-400 hover:bg-slate-800/70 hover:text-white"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`shrink-0 transition-colors ${
                        isActive ? "text-white" : isDarkMode ? "text-slate-500 group-hover:text-slate-300" : "text-gray-400 group-hover:text-gray-600"
                      }`}>
                        {link.icon || <InventoryIcon />}
                      </span>
                      <span className="text-[13px] font-medium truncate">{link.name}</span>
                    </div>
                    {isActive && <ChevronRight size={12} className="shrink-0 opacity-60" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className={`text-xs px-3 py-2 ${isDarkMode ? "text-slate-600" : "text-gray-400"}`}>
            Sin acceso a rutas
          </p>
        )}
      </nav>

      {/* ── FOOTER ── */}
      <div className={`p-2 border-t space-y-1 ${isDarkMode ? "border-slate-800/60" : "border-gray-100"}`}>

        {/* Profile */}
        <Link
          to={`/${selectedCompany?.code || "code"}/profile/1`}
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all group ${
            baseRoute === "profile"
              ? isDarkMode ? "bg-slate-800 text-white" : "bg-gray-100 text-gray-900"
              : isDarkMode ? "hover:bg-slate-800" : "hover:bg-gray-50"
          }`}
        >
          <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${grad} flex items-center justify-center text-[10px] font-bold text-white shrink-0`}>
            {avatar}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-[12px] font-semibold truncate ${isDarkMode ? "text-white" : "text-gray-900"}`}>
              {profile?.username || "usuario"}
            </p>
            <p className={`text-[10px] truncate ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
              Ver perfil
            </p>
          </div>
        </Link>

        {/* Logout */}
        <button
          onClick={logout}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-left ${
            isDarkMode ? "text-slate-500 hover:bg-red-950/40 hover:text-red-400" : "text-gray-400 hover:bg-red-50 hover:text-red-600"
          }`}
        >
          <LogOut size={15} className="shrink-0" />
          <span className="text-[12px] font-medium">Cerrar sesión</span>
        </button>
      </div>
    </div>
  );
};

export default SlideBar;
