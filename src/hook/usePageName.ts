import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export interface CurrentPathname {
  name: string;
}

/**
 * Devuelve el pathname completo y el pageName
 */
export const usePageName = () => {
  const location = useLocation();

  const [pathnameLocation, setPathnameLocation] =
    useState<CurrentPathname>({ name: "" });

  const [pageName, setPageName] = useState("");

  useEffect(() => {
    const pathname = location.pathname;

    setPathnameLocation({ name: pathname });
    setPageName(pathname.split("/")[2] || "");
  }, [location.pathname]); // ✅ AQUÍ ESTÁ LA CLAVE

  return {
    pathnameLocation,
    pageName,
  };
};
