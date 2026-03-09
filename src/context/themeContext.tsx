import React, { createContext, useContext, useState, useEffect } from "react";

export type ThemeMode = "dark" | "light" | "system";

interface ThemeContextType {
  isDarkMode: boolean;
  themeMode: ThemeMode;
  toggleTheme: () => void;         // toggle rápido dark↔light (compatibilidad)
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const getSystemPreference = (): boolean =>
  window.matchMedia("(prefers-color-scheme: dark)").matches;

const resolveIsDark = (mode: ThemeMode): boolean => {
  if (mode === "system") return getSystemPreference();
  return mode === "dark";
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem("themeMode") as ThemeMode | null;
    // Migrar valor legacy "dark"/"light" a nuevo formato
    if (saved === "dark" || saved === "light" || saved === "system") return saved;
    const legacy = localStorage.getItem("theme");
    if (legacy === "dark") return "dark";
    if (legacy === "light") return "light";
    return "system";
  });

  const [isDarkMode, setIsDarkMode] = useState(() => resolveIsDark(themeMode));

  // Escuchar cambios en preferencia del sistema
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (themeMode === "system") setIsDarkMode(mq.matches);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [themeMode]);

  // Aplicar al DOM cada vez que cambia
  useEffect(() => {
    const dark = resolveIsDark(themeMode);
    setIsDarkMode(dark);
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
      document.body.classList.add("bg-slate-900", "text-white");
      document.body.classList.remove("bg-white", "text-gray-900");
    } else {
      root.classList.remove("dark");
      document.body.classList.add("bg-white", "text-gray-900");
      document.body.classList.remove("bg-slate-900", "text-white");
    }
    localStorage.setItem("themeMode", themeMode);
    localStorage.setItem("theme", dark ? "dark" : "light"); // compatibilidad legacy
  }, [themeMode]);

  const setThemeMode = (mode: ThemeMode) => setThemeModeState(mode);

  const toggleTheme = () =>
    setThemeModeState(prev => (resolveIsDark(prev) ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ isDarkMode, themeMode, toggleTheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme debe usarse dentro de ThemeProvider");
  return context;
};
