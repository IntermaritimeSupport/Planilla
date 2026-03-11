import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Globe, Check } from "lucide-react";
import { useTheme } from "../../context/themeContext";

const LANGUAGES = [
  { code: "es", label: "Español", flag: "🇵🇦" },
  { code: "en", label: "English", flag: "🇺🇸" },
];

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const { isDarkMode } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0];

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem("i18nextLng", code);
    setOpen(false);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
          isDarkMode
            ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
        }`}
        title="Change language"
      >
        <Globe size={15} />
        <span className="hidden sm:inline">{current.flag} {current.label}</span>
      </button>

      {open && (
        <div
          className={`absolute right-0 top-full mt-1.5 w-36 rounded-xl shadow-xl border z-50 overflow-hidden ${
            isDarkMode
              ? "bg-slate-900 border-slate-700"
              : "bg-white border-gray-200"
          }`}
        >
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors ${
                lang.code === i18n.language
                  ? isDarkMode
                    ? "bg-teal-500/10 text-teal-400"
                    : "bg-teal-50 text-teal-700"
                  : isDarkMode
                  ? "text-slate-300 hover:bg-slate-800"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <span className="flex items-center gap-2">
                <span>{lang.flag}</span>
                <span>{lang.label}</span>
              </span>
              {lang.code === i18n.language && <Check size={13} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
