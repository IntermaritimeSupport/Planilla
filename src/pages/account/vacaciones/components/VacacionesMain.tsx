"use client"
import { useState } from "react"
import { useTheme } from "../../../../context/themeContext"
import { AllVacaciones } from "./AllVacaciones"
import { VacacionesHistory } from "./VacacionesHistory"
import { Calculator, History } from "lucide-react"

export const VacacionesMain: React.FC = () => {
  const { isDarkMode } = useTheme()
  const [tab, setTab] = useState<"calc" | "history">("calc")

  return (
    <div>
      {/* Tabs */}
      <div className={`flex items-center gap-1 mb-6 p-1 rounded-xl w-fit ${isDarkMode ? "bg-slate-800" : "bg-white border border-gray-200"}`}>
        <button
          onClick={() => setTab("calc")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            tab === "calc"
              ? "bg-teal-600 text-white shadow"
              : isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Calculator size={15} />
          Cálculo Vacaciones
        </button>
        <button
          onClick={() => setTab("history")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            tab === "history"
              ? "bg-teal-600 text-white shadow"
              : isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <History size={15} />
          Historial de Permisos
        </button>
      </div>

      {tab === "calc" ? <AllVacaciones /> : <VacacionesHistory />}
    </div>
  )
}
