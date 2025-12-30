import { Search } from "lucide-react"
import { useLocation } from "react-router-dom"
import { useEffect } from "react"
import { usePageName } from "../../hook/usePageName"
import { useSearch } from "../../context/searchContext"

interface Props {
  isDarkMode?: boolean
}

const DISABLED_ROUTES = [
  "/dashboard/all",
  "/reports/all",
  "/profile/1"
]

const SearchInput: React.FC<Props> = ({ isDarkMode = true }) => {
  const { pageName } = usePageName()
  const { search, setSearch } = useSearch()
  const location = useLocation()

  const isDisabled = DISABLED_ROUTES.some((route) =>
    location.pathname.includes(route)
  )

  // Limpia el search cuando entras a una ruta deshabilitada
  useEffect(() => {
    if (isDisabled) {
      setSearch("")
    }
  }, [isDisabled, setSearch])

  // 👉 Si prefieres OCULTAR el search en vez de deshabilitarlo
  // if (isDisabled) return null

  return (
    <div
      className={`hidden xl:flex items-center rounded-full px-4 py-2 w-64 ${
        isDarkMode
          ? "bg-slate-800 border border-slate-700"
          : "bg-gray-100 border border-gray-200"
      } ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <Search
        className={`w-4 h-4 ${
          isDarkMode ? "text-slate-400" : "text-gray-400"
        }`}
      />

      <input
        type="text"
        value={search}
        disabled={isDisabled}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={
          isDisabled ? "Search disabled on this page" : `Search ${pageName}`
        }
        className={`bg-transparent ml-2 outline-none text-sm w-full ${
          isDarkMode
            ? "text-white placeholder-slate-400"
            : "text-gray-700 placeholder-gray-500"
        }`}
      />
    </div>
  )
}

export default SearchInput
