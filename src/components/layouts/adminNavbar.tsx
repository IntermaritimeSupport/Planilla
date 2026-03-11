import { useEffect, useRef, useState } from "react";
import { getMainRoutesForRole, getUserRoles } from "../../routes/routesConfig";
import { UserProfile } from "../../context/userProfileContext";
import Images from "../../assets";
import { Bell, Info, Menu, MessageCircle, Moon, Sun, TriangleAlert, X } from "lucide-react";
import useUser from "../../hook/useUser";
import CompanySelectorComponent from "../selector/CompanySelectorComponent";
import { useCompany } from "../../context/routerContext";
import SearchInput from "../selector/SearchInput";
import { useSearch } from "../../context/searchContext";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../../context/themeContext";
import LanguageSwitcher from "../selector/LanguageSwitcher";
import { useNotifications } from "../../context/notificationContext";

interface AdminNavbarProps {
  currentPathname?: { name: string };
  isLogged: boolean;
  profile: UserProfile | null;
}

const AdminNavbar: React.FC<AdminNavbarProps> = ({ profile }) => {
  const { logout } = useUser();
  const { selectedCompany } = useCompany();
  const { isDarkMode, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const { notifications, removeNotification } = useNotifications();
  const navigate = useNavigate();
  const userRoles = profile?.roles ? getUserRoles(profile) : ["user"];
  const { setSearch } = useSearch();
  const location = useLocation();
  const AppName = import.meta.env.VITE_APP_NAME || "Planilla";

  const roleLabel = profile?.roles
    ? profile.roles.split(",")[0].trim().toUpperCase().replace("_", " ")
    : "USER";

  const initials = profile?.username
    ? profile.username.slice(0, 2).toUpperCase()
    : "U";

  useEffect(() => {
    setSearch("");
  }, [location.pathname]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "";
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMenuOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isMenuOpen]);

  const allLinks = userRoles.flatMap((role: string) =>
    getMainRoutesForRole(
      role as "user" | "super_admin" | "admin" | "moderator"
    ).map((route: any) => ({
      href: route.href,
      name: route.name,
      icon: route.icon,
    }))
  );
  const seen = new Set<string>();
  const mobileLinks = allLinks.filter(({ href }) => {
    if (seen.has(href)) return false;
    seen.add(href);
    return true;
  });

  return (
    <nav
      id="navbar"
      className={`w-full z-20 transition-all duration-300 ${
        isDarkMode
          ? "bg-slate-900 border-b border-slate-800/60"
          : "bg-white border-b border-gray-200"
      }`}
    >
      <div className="w-full px-4 md:px-6">
        {/* Desktop */}
        <div className="hidden md:flex items-center h-14 gap-4">
          {/* Left: Logo + App name + Company badge */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <img
                src={Images?.logo || "#"}
                alt="logo"
                className="w-7 h-7 object-contain"
              />
              <span
                className={`text-sm font-bold tracking-wide ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                {AppName}
              </span>
            </div>
            {selectedCompany && selectedCompany.id !== "na" && (
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                  isDarkMode
                    ? "bg-teal-500/10 border-teal-500/30 text-teal-400"
                    : "bg-teal-50 border-teal-200 text-teal-700"
                }`}
              >
                {selectedCompany.name}
              </span>
            )}
          </div>

          {/* Center: Search */}
          <div className="flex-1 flex justify-center">
            <SearchInput />
          </div>

          {/* Right */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <div className="w-44">
              <CompanySelectorComponent isDarkMode={isDarkMode} />
            </div>

            <LanguageSwitcher />

            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode
                  ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              }`}
              aria-label="Toggle theme"
            >
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifications((v) => !v)}
                className={`relative p-2 rounded-lg transition-colors ${
                  isDarkMode
                    ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Bell size={16} />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white">
                    {notifications.length > 9 ? "9+" : notifications.length}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div
                  className={`absolute right-0 top-full mt-2 w-80 rounded-xl shadow-xl border z-50 ${
                    isDarkMode
                      ? "bg-slate-900 border-slate-700"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <div
                    className={`flex items-center justify-between px-4 py-3 border-b ${
                      isDarkMode ? "border-slate-700" : "border-gray-100"
                    }`}
                  >
                    <span
                      className={`text-sm font-semibold ${
                        isDarkMode ? "text-slate-100" : "text-gray-800"
                      }`}
                    >
                      Notificaciones
                    </span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full ${
                        notifications.length > 0
                          ? "bg-red-500 text-white"
                          : isDarkMode
                          ? "bg-slate-700 text-slate-400"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {notifications.length}
                    </span>
                  </div>

                  {notifications.length === 0 ? (
                    <div
                      className={`px-4 py-8 text-center text-sm ${
                        isDarkMode ? "text-slate-500" : "text-gray-400"
                      }`}
                    >
                      Sin notificaciones pendientes
                    </div>
                  ) : (
                    <ul className="max-h-80 overflow-y-auto divide-y divide-inherit">
                      {notifications.map((n) => {
                        const typeStyles = {
                          info: isDarkMode ? "text-blue-400" : "text-blue-600",
                          warning: isDarkMode ? "text-amber-400" : "text-amber-600",
                          success: isDarkMode ? "text-emerald-400" : "text-emerald-600",
                          error: isDarkMode ? "text-red-400" : "text-red-600",
                        }[n.type];
                        const TypeIcon = n.type === "warning" || n.type === "error"
                          ? TriangleAlert
                          : Info;
                        return (
                          <li
                            key={n.id}
                            className={`px-4 py-3 flex items-start gap-3 cursor-pointer transition-colors ${
                              isDarkMode ? "hover:bg-slate-800/60 border-slate-800" : "hover:bg-gray-50 border-gray-100"
                            }`}
                            onClick={() => {
                              if (n.href) navigate(n.href);
                              setShowNotifications(false);
                            }}
                          >
                            <TypeIcon size={15} className={`mt-0.5 flex-shrink-0 ${typeStyles}`} />
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-semibold truncate ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>
                                {n.title}
                              </p>
                              <p className={`text-[11px] mt-0.5 ${isDarkMode ? "text-slate-500" : "text-gray-500"}`}>
                                {n.message}
                              </p>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); removeNotification(n.id); }}
                              className={`flex-shrink-0 p-0.5 rounded ${isDarkMode ? "hover:bg-slate-700 text-slate-500" : "hover:bg-gray-200 text-gray-400"}`}
                            >
                              <X size={12} />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <button
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode
                  ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              }`}
            >
              <MessageCircle size={16} />
            </button>

            {/* User pill */}
            <Link
              to={`/${selectedCompany?.code || "account"}/profile/1`}
              className={`flex items-center gap-2 pl-2 pr-3 py-1 rounded-full transition-colors ${
                isDarkMode ? "hover:bg-slate-800" : "hover:bg-gray-100"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  isDarkMode
                    ? "bg-teal-500/20 text-teal-400"
                    : "bg-teal-100 text-teal-700"
                }`}
              >
                {initials}
              </div>
              <div className="hidden lg:block text-left">
                <p
                  className={`text-xs font-semibold leading-none ${
                    isDarkMode ? "text-slate-200" : "text-gray-800"
                  }`}
                >
                  {profile?.username || "Usuario"}
                </p>
                <p
                  className={`text-[10px] leading-none mt-0.5 ${
                    isDarkMode ? "text-slate-500" : "text-gray-400"
                  }`}
                >
                  {roleLabel}
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* Mobile */}
        <div className="md:hidden flex justify-between items-center h-12">
          <div className="flex items-center gap-2">
            <img
              src={Images?.logo || "#"}
              alt="logo"
              className="w-7 h-7 object-contain"
            />
            <span
              className={`text-sm font-bold ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              {AppName}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg ${
                isDarkMode
                  ? "text-slate-400 hover:text-white hover:bg-slate-800"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              onClick={() => setIsMenuOpen(true)}
              className={`p-2 rounded-lg ${
                isDarkMode
                  ? "text-slate-400 hover:text-white hover:bg-slate-800"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              <Menu size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`fixed top-0 right-0 h-screen w-72 z-50 shadow-2xl transform transition-transform duration-300 ease-in-out ${
          isMenuOpen ? "translate-x-0" : "translate-x-full"
        } ${isDarkMode ? "bg-slate-900" : "bg-white"}`}
      >
        <div
          className={`flex items-center justify-between px-4 h-12 border-b ${
            isDarkMode ? "border-slate-800" : "border-gray-200"
          }`}
        >
          <span
            className={`text-sm font-bold ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Menú
          </span>
          <button
            onClick={() => setIsMenuOpen(false)}
            className={`p-1.5 rounded-lg ${
              isDarkMode ? "text-slate-400 hover:text-white" : "text-gray-500"
            }`}
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col h-[calc(100%-3rem)] overflow-y-auto">
          <div
            className={`p-4 border-b ${
              isDarkMode ? "border-slate-800" : "border-gray-100"
            }`}
          >
            <CompanySelectorComponent isDarkMode={isDarkMode} />
          </div>

          <div className="px-2 py-3 space-y-0.5 flex-1">
            {mobileLinks.map((link, index) => {
              const IconComp = link.icon;
              return (
                <a
                  key={index}
                  href={`/${selectedCompany?.code || "account"}${link.href}`}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    isDarkMode
                      ? "text-slate-300 hover:bg-slate-800 hover:text-white"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  {IconComp && (
                    <span
                      className={
                        isDarkMode ? "text-slate-500" : "text-gray-400"
                      }
                    >
                      <IconComp size={16} />
                    </span>
                  )}
                  <span>{link.name}</span>
                </a>
              );
            })}
          </div>

          <div
            className={`border-t ${
              isDarkMode ? "border-slate-800" : "border-gray-200"
            }`}
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  isDarkMode
                    ? "bg-teal-500/20 text-teal-400"
                    : "bg-teal-100 text-teal-700"
                }`}
              >
                {initials}
              </div>
              <div>
                <p
                  className={`text-sm font-semibold ${
                    isDarkMode ? "text-slate-100" : "text-gray-800"
                  }`}
                >
                  {profile?.username || "Usuario"}
                </p>
                <p
                  className={`text-xs ${
                    isDarkMode ? "text-slate-500" : "text-gray-400"
                  }`}
                >
                  {roleLabel}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                logout();
                setIsMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm border-t transition-colors ${
                isDarkMode
                  ? "border-slate-800 text-red-400 hover:bg-red-950/30"
                  : "border-gray-100 text-red-500 hover:bg-red-50"
              }`}
            >
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default AdminNavbar;
