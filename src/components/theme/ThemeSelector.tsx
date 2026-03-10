"use client";

// ─────────────────────────────────────────────────────────────────────────────
// ThemeSelector.tsx
// Selector de tema de 3 opciones: Oscuro / Sistema / Claro
// Uso: <ThemeSelector /> — funciona como dropdown o inline
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from "react";
import { Moon, Sun, Monitor, Check } from "lucide-react";
import { useTheme } from "../../context/themeContext";

const OPTIONS: { mode: any; label: string; icon: React.ReactNode; desc: string }[] = [
  { mode: "light",  label: "Claro",   icon: <Sun size={15} />,     desc: "Siempre modo claro"   },
  { mode: "dark",   label: "Oscuro",  icon: <Moon size={15} />,    desc: "Siempre modo oscuro"  },
  { mode: "system", label: "Sistema", icon: <Monitor size={15} />, desc: "Según tu dispositivo" },
];

// ─── Variante DROPDOWN (para usar en Navbar) ─────────────────────────────────
export const ThemeSelectorDropdown: React.FC = () => {
  const { isDarkMode, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = OPTIONS.find(o => o.mode === isDarkMode) ?? OPTIONS[1];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`p-2 rounded-lg transition-all duration-200 ${
          isDarkMode
            ? "text-slate-400 hover:text-amber-400 hover:bg-amber-400/10"
            : "text-gray-500 hover:text-indigo-600 hover:bg-indigo-50"
        }`}
        title={`Tema: ${current.label}`}
      >
        {current.icon}
      </button>

      {open && (
        <div className={`absolute right-0 mt-2 w-52 rounded-2xl border shadow-2xl z-[100] overflow-hidden ${
          isDarkMode
            ? "bg-slate-900 border-slate-700/50 shadow-black/40"
            : "bg-white border-gray-100 shadow-gray-200/80"
        }`}>
          {/* Header */}
          <div className={`px-4 py-2.5 border-b ${isDarkMode ? "border-slate-800" : "border-gray-100"}`}>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
              Apariencia
            </p>
          </div>

          {/* Options */}
          <div className="p-1.5 space-y-0.5">
            {OPTIONS.map(opt => {
              const active = isDarkMode === opt.mode;
              return (
                <button
                  key={opt.mode}
                  onClick={() => { toggleTheme(); setOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                    active
                      ? isDarkMode
                        ? "bg-blue-600/20 text-blue-400"
                        : "bg-blue-50 text-blue-700"
                      : isDarkMode
                        ? "text-slate-300 hover:bg-slate-800"
                        : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span className={active
                    ? isDarkMode ? "text-blue-400" : "text-blue-600"
                    : isDarkMode ? "text-slate-500" : "text-gray-400"
                  }>
                    {opt.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-tight">{opt.label}</p>
                    <p className={`text-[10px] leading-tight mt-0.5 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                      {opt.desc}
                    </p>
                  </div>
                  {active && <Check size={13} className={isDarkMode ? "text-blue-400" : "text-blue-600"} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Variante PILLS INLINE (para usar en Settings / Profile) ─────────────────
export const ThemeSelectorPills: React.FC<{ label?: boolean }> = ({ label = true }) => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <div>
      {label && (
        <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
          Apariencia
        </p>
      )}
      <div className={`flex rounded-xl p-1 gap-1 w-fit ${isDarkMode ? "bg-slate-800" : "bg-gray-100"}`}>
        {OPTIONS.map(opt => {
          const active = isDarkMode === opt.mode;
          return (
            <button
              key={opt.mode}
              onClick={() => toggleTheme()}
              title={opt.desc}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                active
                  ? isDarkMode
                    ? "bg-slate-700 text-white shadow-sm"
                    : "bg-white text-gray-900 shadow-sm shadow-gray-200"
                  : isDarkMode
                    ? "text-slate-500 hover:text-slate-300"
                    : "text-gray-400 hover:text-gray-700"
              }`}
            >
              {opt.icon}
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ThemeSelectorDropdown;
