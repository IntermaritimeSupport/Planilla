import { useEffect, useState } from "react";
import { getMainRoutesForRole, getUserRoles } from "../../routes/routesConfig";
import { UserProfile } from "../../context/userProfileContext";
import Images from "../../assets";
import { LogOut, Menu, X, Bell } from "lucide-react";
import { ThemeSelectorDropdown } from "../theme/ThemeSelector";
import useUser from "../../hook/useUser";
import CompanySelectorComponent from "../selector/CompanySelectorComponent";
import { useCompany } from "../../context/routerContext";
import SearchInput from "../selector/SearchInput";
import { useSearch } from "../../context/searchContext";
import { useLocation } from "react-router-dom";
import { useTheme } from "../../context/themeContext";

interface CurrentPathname { name: string }
interface AdminNavbarProps {
  currentPathname?: CurrentPathname;
  isLogged: boolean;
  profile: UserProfile | null;
}

const AdminNavbar: React.FC<AdminNavbarProps> = ({ profile }) => {
  const { logout } = useUser();
  const { selectedCompany } = useCompany();
  const { isDarkMode } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const userRoles = profile?.roles ? getUserRoles(profile) : ["user"];
  const { setSearch } = useSearch();
  const location = useLocation();
  const AppName = import.meta.env.VITE_APP_NAME || "Planilla";

  useEffect(() => { setSearch("") }, [location.pathname]);
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "";
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setIsMenuOpen(false); };
    document.addEventListener("keydown", handleEsc);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", handleEsc); };
  }, [isMenuOpen]);

  const filteredNavLinks = userRoles.flatMap((role: string) =>
    getMainRoutesForRole(role as any).map((route: any) => ({
      href: typeof route === "string" ? route : route.href,
      name: typeof route === "string" ? route : route.name,
      icon: typeof route === "string" ? undefined : route.icon ? <route.icon size={16} /> : undefined,
    }))
  ) || [];

  const avatar = profile?.username ? profile.username.slice(0, 2).toUpperCase() : "US";
  const gradients = ["from-violet-500 to-purple-600","from-blue-500 to-cyan-600","from-emerald-500 to-teal-600","from-orange-500 to-amber-600"];
  const grad = gradients[(profile?.username?.charCodeAt(0) ?? 0) % gradients.length];

  return (
    <nav className={`w-full z-20 top-0 transition-all duration-300 ${
      scrolled
        ? isDarkMode
          ? "bg-slate-900/95 backdrop-blur-xl border-b border-white/5 shadow-2xl shadow-black/30"
          : "bg-white/95 backdrop-blur-xl border-b border-gray-200/80 shadow-lg shadow-gray-200/60"
        : isDarkMode
          ? "bg-slate-900 border-b border-slate-800/60"
          : "bg-white border-b border-gray-100"
    }`}>
      <div className="w-full px-4 md:px-6">

        {/* DESKTOP */}
        <div className="hidden md:flex justify-between items-center h-14">
          {/* Left */}
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center overflow-hidden ring-1 ${isDarkMode ? "ring-white/10 bg-slate-800" : "ring-gray-200 bg-gray-50"}`}>
              <img src={Images?.logo || "#"} alt="logo" className="w-6 h-6 object-contain" />
            </div>
            <span className={`text-sm font-bold tracking-tight ${isDarkMode ? "text-white" : "text-gray-900"}`}>{AppName}</span>
            <div className={`h-4 w-px ${isDarkMode ? "bg-slate-700" : "bg-gray-200"}`} />
            {selectedCompany && (
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md truncate max-w-[140px] ${isDarkMode ? "text-slate-400 bg-slate-800" : "text-gray-500 bg-gray-100"}`}>
                {selectedCompany.name}
              </span>
            )}
          </div>

          {/* Right */}
          <div className="flex items-center gap-1.5">
            <SearchInput />
            <div className="w-48"><CompanySelectorComponent isDarkMode={isDarkMode} /></div>
            <div className={`h-6 w-px mx-1 ${isDarkMode ? "bg-slate-700" : "bg-gray-200"}`} />

            {/* Notif */}
            <div className="relative">
              <button onClick={() => setNotifOpen(o => !o)} className={`relative p-2 rounded-lg transition-all ${isDarkMode ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"}`}>
                <Bell className="w-4 h-4" />
                <span className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full ring-1 ${isDarkMode ? "ring-slate-900" : "ring-white"}`} />
              </button>
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                  <div className={`absolute right-0 mt-2 w-72 rounded-2xl border shadow-2xl z-50 overflow-hidden ${isDarkMode ? "bg-slate-900 border-slate-700/50" : "bg-white border-gray-100"}`}>
                    <div className={`px-4 py-3 border-b ${isDarkMode ? "border-slate-800" : "border-gray-100"}`}>
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>Notificaciones</p>
                    </div>
                    <div className={`py-8 text-center ${isDarkMode ? "text-gray-600" : "text-gray-300"}`}>
                      <Bell className="w-7 h-7 mx-auto mb-2" />
                      <p className="text-xs">Sin notificaciones</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Theme */}
            <ThemeSelectorDropdown />
            <div className={`h-6 w-px mx-1 ${isDarkMode ? "bg-slate-700" : "bg-gray-200"}`} />

            {/* Profile / Logout */}
            <button onClick={logout} title="Cerrar sesión" className={`flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-xl transition-all ${isDarkMode ? "hover:bg-slate-800" : "hover:bg-gray-100"}`}>
              <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${grad} flex items-center justify-center text-[10px] font-bold text-white shrink-0`}>{avatar}</div>
              <div className="text-left hidden lg:block">
                <p className={`text-xs font-semibold leading-tight ${isDarkMode ? "text-white" : "text-gray-900"}`}>{profile?.username || "usuario"}</p>
                <p className={`text-[10px] leading-tight ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>{Array.isArray(profile?.roles) ? profile?.roles[0] : profile?.roles || "user"}</p>
              </div>
              <LogOut className={`w-3.5 h-3.5 ml-0.5 ${isDarkMode ? "text-slate-600" : "text-gray-300"}`} />
            </button>
          </div>
        </div>

        {/* MOBILE */}
        <div className="md:hidden flex justify-between items-center py-2.5">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg overflow-hidden ${isDarkMode ? "bg-slate-800" : "bg-gray-100"}`}>
              <img src={Images?.logo || "#"} alt="logo" className="w-full h-full object-contain" />
            </div>
            <span className={`text-sm font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>{AppName}</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeSelectorDropdown />
            <button onClick={() => setIsMenuOpen(true)} className={`p-2 rounded-lg ${isDarkMode ? "text-slate-400 hover:bg-slate-800" : "text-gray-500 hover:bg-gray-100"}`}>
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      <div onClick={() => setIsMenuOpen(false)} className={`fixed inset-0 z-40 transition-all duration-300 ${isMenuOpen ? "opacity-100 visible backdrop-blur-sm bg-black/40" : "opacity-0 invisible"}`} />

      {/* Mobile drawer */}
      <div className={`fixed top-0 right-0 h-screen w-72 z-50 transform transition-all duration-300 ease-out ${isMenuOpen ? "translate-x-0" : "translate-x-full"} ${isDarkMode ? "bg-slate-950 border-l border-slate-800" : "bg-white border-l border-gray-100"}`}>
        <div className={`flex justify-between items-center p-4 border-b ${isDarkMode ? "border-slate-800" : "border-gray-100"}`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${grad} flex items-center justify-center text-xs font-bold text-white`}>{avatar}</div>
            <div>
              <p className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>{profile?.username || "usuario"}</p>
              <p className={`text-[10px] ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>{Array.isArray(profile?.roles) ? profile?.roles[0] : profile?.roles || "user"}</p>
            </div>
          </div>
          <button onClick={() => setIsMenuOpen(false)} className={`p-1.5 rounded-lg ${isDarkMode ? "text-slate-400 hover:bg-slate-800" : "text-gray-500 hover:bg-gray-100"}`}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-3"><CompanySelectorComponent isDarkMode={isDarkMode} /></div>
        <div className="px-2 py-1 overflow-y-auto max-h-[calc(100vh-200px)]">
          {filteredNavLinks.map((link, i) => (
            <a key={i} href={`/${selectedCompany?.code || "code"}${link.href}`} onClick={() => setIsMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 transition-all ${isDarkMode ? "text-slate-300 hover:bg-slate-800 hover:text-white" : "text-gray-700 hover:bg-gray-100"}`}>
              {link.icon && <span className={isDarkMode ? "text-slate-500" : "text-gray-400"}>{link.icon}</span>}
              <span className="text-sm font-medium">{link.name}</span>
            </a>
          ))}
        </div>
        <div className={`absolute bottom-0 left-0 right-0 p-3 border-t ${isDarkMode ? "border-slate-800" : "border-gray-100"}`}>
          <button onClick={() => { logout(); setIsMenuOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${isDarkMode ? "text-red-400 hover:bg-red-950/40" : "text-red-600 hover:bg-red-50"}`}>
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Cerrar sesión</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default AdminNavbar;
