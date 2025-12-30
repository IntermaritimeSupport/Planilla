"use client";
import type React from "react";
import { useEffect, useState } from "react";
import type { UserProfile } from "../../context/userProfileContext";
import LanguageSwitcher from "../buttons/languageSwitcher";
import { ChevronLeft, Menu, X } from "lucide-react";
import Images from "../../assets";
interface CurrentPathname {
  name: string;
}

interface NavbarProps {
  currentPathname?: CurrentPathname;
  isLogged?: boolean;
  profile: UserProfile | null;
}

const Navbar: React.FC<NavbarProps> = ({ currentPathname }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Efecto para el cambio de estilo de la barra de navegación al hacer scroll
  useEffect(() => {
    const navbar = document.getElementById("navbar");

    function handleScroll() {
      if (window.scrollY > 0) {
        navbar?.classList.add("scrolled");
      } else {
        navbar?.classList.remove("scrolled");
      }
    }
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Efecto para controlar el scroll del body cuando el menú está abierto/cerrado
  // y para cerrar el menú con la tecla 'Escape'
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden"; // Bloquea el scroll del body
    } else {
      document.body.style.overflow = ""; // Restaura el scroll del body
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = ""; // Limpieza al desmontar
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isMenuOpen]); // Se ejecuta cada vez que isMenuOpen cambia

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <nav
      id="navbar"
      className={`text-transition w-full z-40 transition-all duration-500 bg-white/95 backdrop-blur-sm border-b border-gray-100 select-none ${
        currentPathname?.name === "/" ? "shadow-sm" : ""
      }`}
    >
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between">
          <div className="flex-shrink-0 justify-center items-center flex space-x-2">
            {currentPathname?.name !== "/" ? (
              <a
                href="/"
                className="inline-flex items-center text-gray-700 hover:text-gray-900"
              >
                <ChevronLeft className="mr-2 h-7 w-7" />
                <span>Back</span>
              </a>
            ) : (
              <a href="/" className="flex items-center space-x-2">
                <img
                  src={Images?.logo || "#"}
                  alt="logo"
                  width={50}
                  height={50}
                  className="border-r-2 pr-2"
                />
                <span className="text-yellow-700 font-bold tracking-wider">
                  Flow
                </span>
              </a>
            )}
          </div>
          <div className=" md:flex justify-center">
            <LanguageSwitcher className={'hidden'}/>
            <div className=" flex items-center">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
              aria-expanded={isMenuOpen ? "true" : "false"}
            >
              <span className="sr-only">
                {isMenuOpen ? "Cerrar menú principal" : "Abrir menú principal"}
              </span>
              {isMenuOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`fixed inset-0 h-screen bg-black/50 z-40 transition-opacity duration-300 ${
          isMenuOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
        onClick={closeMenu}
        aria-hidden={!isMenuOpen}
      ></div>

      {/* Panel del menú móvil - Ocupa toda la pantalla y tiene fondo blanco */}
      <div
        className={`fixed top-0 right-0 h-screen w-full bg-white shadow-lg z-[100] transform transition-transform duration-300 ease-in-out md:w-1/4
          ${isMenuOpen ? "translate-x-0" : "translate-x-full"}`}
        role="dialog"
        aria-modal="true"
        aria-label="Menú principal"
      >
        <div className="flex justify-between p-4">
          <div className="flex items-center space-x-2">
                <img
                  src={Images?.logo || "#"}
                  alt="logo"
                  width={50}
                  height={50}
                  className="border-r-2 pr-2"
                />
                <span className="text-yellow-700 font-bold tracking-wider">
                  Flow
                </span>
              </div>
          <button
            onClick={closeMenu}
            className="text-gray-700 hover:text-gray-900 p-2 rounded-md hover:bg-gray-100"
            aria-label="Cerrar menú"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="px-4 pb-3 space-y-1">
          <a
            href="/login"
            onClick={closeMenu}
            className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
          >
            Account
          </a>

          <div className="block px-0 py-2">
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;