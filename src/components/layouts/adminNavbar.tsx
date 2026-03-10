import { useEffect, useState } from "react";
import { getMainRoutesForRole, getUserRoles } from "../../routes/routesConfig";
import { UserProfile } from "../../context/userProfileContext";
import Images from "../../assets";
import { LogOut, Menu, X, Search, Bell, Sun, Moon } from "lucide-react";
import useUser from "../../hook/useUser";
import CompanySelectorComponent from "../selector/CompanySelectorComponent";
import { useCompany } from "../../context/routerContext";
import SearchInput from "../selector/SearchInput";
import { useSearch } from "../../context/searchContext";
import { useLocation } from "react-router-dom";
import { useTheme } from "../../context/themeContext";

interface CurrentPathname {
  name: string;
}

interface AdminNavbarProps {
  currentPathname?: CurrentPathname;
  isLogged: boolean;
  profile: UserProfile | null;
}

const AdminNavbar: React.FC<AdminNavbarProps> = ({
  profile,
}) => {
  const { logout } = useUser();
  const { selectedCompany } = useCompany();
  const { isDarkMode, toggleTheme } = useTheme(); // Usar el contexto
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const userRoles = profile?.roles ? getUserRoles(profile) : ["user"];
  const { setSearch } = useSearch()
  const location = useLocation()
  const AppName = import.meta.env.VITE_APP_NAME || "Planilla";
  
  useEffect(() => {
    setSearch("")
  }, [location.pathname])
  
  const filteredNavLinks: { href: string; name: string; icon?: React.ReactNode }[] =
    userRoles.flatMap((role: string) =>
      getMainRoutesForRole(
        role as "user" | "super_admin" | "admin" | "moderator"
      ).map((route: any) => ({
        href: typeof route === "string" ? route : route.href,
        name: typeof route === "string" ? route : route.name,
        icon: typeof route === "string"
          ? undefined
          : route.icon
            ? <route.icon />
            : undefined,
      }))
    ) || [];

  useEffect(() => {
    const navbar = document.getElementById("navbar");

    const handleScroll = () => {
      if (window.scrollY > 0) {
        navbar?.classList.add("scrolled");
      } else {
        navbar?.classList.remove("scrolled");
      }
    };
    window.addEventListener("scroll", handleScroll);

    const openButton = document?.getElementById("open-menu");
    const side = document?.getElementById("sidebar");
    const hiddenrelative = document?.getElementById("hidden-relative");

    if (!openButton) return;
    const openMenu = () => {
      document.body.classList.add("overflow-hidden");
      side?.classList.remove("invisible", "translate-x-full", "hidden");
      hiddenrelative?.classList.remove("relative");
    };
    openButton.addEventListener("click", openMenu);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      openButton.removeEventListener("click", openMenu);
    };
  }, []);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isMenuOpen]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <nav
      id="navbar"
      className={`w-full z-20 top-0 transition-all duration-300 ${
        isDarkMode
          ? "bg-slate-900 border-b border-slate-800"
          : "bg-white border-b border-gray-200"
      }`}
    >
      <div className="w-full px-6 md:px-6 lg:px-8 py-3 md:py-0">
        {/* Desktop Layout */}
        <div className="hidden md:flex justify-between items-center h-16">
          {/* Left Section */}
          <div className="flex items-center gap-4 lg:gap-8">
            <div className="flex items-center gap-2">
              <img
                src={Images?.logo || "#"}
                alt="logo"
                width={40}
                height={40}
                className="w-10 h-10 bg-cover object-contain"
              />
              <span
                className={`text-lg font-bold tracking-wider ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                {AppName}
              </span>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-4 lg:gap-6">
            {/* Search Bar */}
            <SearchInput/>

            {/* Company Selector */}
            <div className="flex items-center gap-2 w-56">
              <CompanySelectorComponent isDarkMode={isDarkMode} />
            </div>

            {/* Notifications */}
            <button
              className={`relative p-2 transition-colors duration-300 ${
                isDarkMode
                  ? "text-slate-400 hover:text-white"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-colors duration-300 ${
                isDarkMode
                  ? "text-slate-400 hover:text-white hover:bg-slate-800"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
              aria-label="Toggle theme"
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>

          </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden flex justify-between items-center h-14">
          {/* Left - Logo */}
          <div className="flex items-center gap-2">
            <img
              src={Images?.logo || "#"}
              alt="logo"
              width={36}
              height={36}
              className="w-9 h-9 bg-cover object-contain"
            />
            <span
              className={`text-base font-bold truncate ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              {AppName}
            </span>
          </div>

          {/* Right - Icons */}
          <div className="flex items-center gap-2">
            {/* Search Icon */}
            <button
              className={`p-2 transition-colors ${
                isDarkMode
                  ? "text-slate-400 hover:text-white"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Notifications */}
            <button
              className={`relative p-2 transition-colors ${
                isDarkMode
                  ? "text-slate-400 hover:text-white"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode
                  ? "text-slate-400 hover:text-white hover:bg-slate-800"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
              aria-label="Toggle theme"
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>

            {/* Menu Button */}
            <button
              id="open-menu"
              onClick={toggleMenu}
              className={`inline-flex items-center justify-center p-2 rounded-md transition-colors ${
                isDarkMode
                  ? "text-slate-400 hover:text-white hover:bg-slate-800"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
              aria-expanded={isMenuOpen ? "true" : "false"}
            >
              <span className="sr-only">
                {isMenuOpen ? "Cerrar menú principal" : "Abrir menú principal"}
              </span>
              {isMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      <div
        className={`fixed inset-0 h-screen z-40 transition-opacity duration-300 ${
          isMenuOpen ? "opacity-100 visible" : "opacity-0 invisible"
        } ${isDarkMode ? "bg-black/50" : "bg-black/30"}`}
        onClick={closeMenu}
        aria-hidden={!isMenuOpen}
      ></div>

      {/* Mobile Menu Drawer */}
      <div
        className={`fixed top-0 right-0 h-screen w-full sm:w-80 shadow-lg z-50 transform transition-transform duration-300 ease-in-out ${
          isMenuOpen ? "translate-x-0" : "translate-x-full"
        } ${isDarkMode ? "bg-slate-900" : "bg-white"}`}
        role="dialog"
        aria-modal="true"
        aria-label="Menú principal"
      >
        {/* Mobile Menu Header */}
        <div
          className={`flex justify-between items-center p-4 h-16 ${
            isDarkMode ? "border-b border-slate-800" : "border-b border-gray-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <img
              src={Images?.logo || "#"}
              alt="logo"
              width={40}
              height={40}
              className="w-10 h-10"
            />
            <span
              className={`font-bold tracking-wider ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              {AppName}
            </span>
          </div>
          <button
            onClick={closeMenu}
            className={`p-2 rounded-md transition-colors ${
              isDarkMode
                ? "text-slate-400 hover:text-white hover:bg-slate-800"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
            aria-label="Cerrar menú"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Mobile Menu Content */}
        <div className="flex flex-col h-[calc(100vh-4rem)] overflow-y-auto">
          {/* Company Selector Mobile */}
          <div
            className={`p-4 ${
              isDarkMode ? "border-b border-slate-800" : "border-b border-gray-200"
            }`}
          >
            <CompanySelectorComponent isDarkMode={isDarkMode} />
          </div>

          {/* Search Bar Mobile */}
          <div
            className={`p-4 ${
              isDarkMode ? "border-b border-slate-800" : "border-b border-gray-200"
            }`}
          >
            <div
              className={`flex items-center rounded-full px-4 py-2 ${
                isDarkMode
                  ? "bg-slate-800 border border-slate-700"
                  : "bg-gray-100 border border-gray-200"
              }`}
            >
              <Search
                className={`w-4 h-4 ${
                  isDarkMode ? "text-slate-400" : "text-gray-400"
                }`}
              />
              <input
                type="text"
                placeholder="Search"
                className={`bg-transparent ml-2 outline-none text-sm w-full ${
                  isDarkMode
                    ? "text-white placeholder-slate-400"
                    : "text-gray-700 placeholder-gray-500"
                }`}
              />
            </div>
          </div>

          {/* Mobile Nav Links */}
          <div className="px-2 py-3 space-y-1">
            {filteredNavLinks.length > 0 ? (
              filteredNavLinks.map((link, index) => (
                <a
                  key={index}
                  href={`/${selectedCompany?.code || 'code'}${link?.href}`}
                  onClick={closeMenu}
                  className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors duration-300 ${
                    isDarkMode
                      ? "text-slate-300 hover:bg-slate-800"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {link.icon && (
                    <span className={isDarkMode ? "text-slate-400" : "text-gray-600"}>
                      {link.icon}
                    </span>
                  )}
                  <span className="text-sm font-medium">{link.name}</span>
                </a>
              ))
            ) : (
              <span
                className={`text-sm px-4 py-2 ${
                  isDarkMode ? "text-slate-400" : "text-gray-500"
                }`}
              >
                No tienes acceso a ninguna ruta
              </span>
            )}
          </div>

          {/* Divider */}
          <hr
            className={`my-2 ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}
          />

          {/* Mobile Profile Section */}
          <div className="px-2 py-3 space-y-2 flex-1">
            <div className="flex items-center gap-3 px-2 py-2">
              <img
                src={Images?.logo || "#"}
                alt="profile"
                width={32}
                height={32}
                className="w-8 h-8 rounded-full bg-gray-200 object-cover"
              />
              <div>
                <p
                  className={`text-sm font-medium ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  {profile?.username || "user"}
                </p>
                <p
                  className={`text-xs ${
                    isDarkMode ? "text-slate-400" : "text-gray-500"
                  }`}
                >
                  {profile?.roles || "user"}
                </p>
              </div>
            </div>

            <div className="px-2 pt-2 space-y-2 mt-4">
              <button
                onClick={() => {
                  logout();
                  closeMenu();
                }}
                className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-colors duration-300 ${
                  isDarkMode
                    ? "text-red-400 hover:bg-red-900/30"
                    : "text-red-600 hover:bg-red-50"
                }`}
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm font-medium">Cerrar sesión</span>
              </button>

            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default AdminNavbar;