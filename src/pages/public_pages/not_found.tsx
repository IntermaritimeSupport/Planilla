// use client
import { useState } from "react";
import { useNavigate } from "react-router-dom";
// Importa el icono de react-icons
import { FaSyncAlt } from "react-icons/fa"; // Usaremos FaSyncAlt de Font Awesome
import { useTranslation } from "react-i18next";

export default function NotFound() {
  const [isHovering, setIsHovering] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation()

  const handleRefresh = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center space-y-8">
        <h1 className="text-4xl md:text-5xl font-extralight tracking-tighter text-black font-mono">404</h1>

        <p className="text-2xl md:text-4xl font-light text-black tracking-wide">{t("It's not you, it's us")}</p>

        <button
          onClick={handleRefresh}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          // Añadimos 'flex items-center justify-center' para alinear el icono y el texto
          // Y 'group' para poder aplicar efectos de hover a los hijos (el icono)
          className="mt-6 text-sm text-gray-600 hover:text-black transition-all duration-300 relative uppercase font-bold
                     flex items-center justify-center group" // Añadido flex, items-center, justify-center y group
        >
          {/* El icono de recarga. Añadimos un margen a la derecha (mr-2) y una transición para la rotación. */}
          <FaSyncAlt
            className={`mr-2 transition-transform duration-300 ${
              isHovering ? "rotate-180" : "" // Rotamos el icono 180 grados al hacer hover
            }`}
            size={16} // Puedes ajustar el tamaño del icono aquí
          />
          {t("Go to home page")}
          <span
            className={`absolute bottom-0 left-0 w-full h-px bg-gray-300 transform origin-left transition-transform duration-300 ${
              isHovering ? "scale-x-100" : "scale-x-0"
            }`}
          />
        </button>
      </div>
    </div>
  );
}