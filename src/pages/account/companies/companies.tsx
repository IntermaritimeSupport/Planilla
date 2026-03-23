import { LogOut, AlertTriangle, Lock, CheckCircle2, ChevronRight, Building2 } from "lucide-react"
import React, { useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import useUser from "../../../hook/useUser"
import { useCompany } from "../../../context/routerContext"
import { UserProfile } from "../../../context/userProfileContext"
import Images from "../../../assets"

type Props = {
  profile: UserProfile | null;
};

const AVATAR_COLORS = [
  "bg-violet-600",
  "bg-blue-600",
  "bg-emerald-600",
  "bg-orange-500",
  "bg-pink-600",
  "bg-teal-600",
  "bg-indigo-600",
  "bg-rose-600",
];

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const CompanySelector: React.FC<Props> = ({ profile }) => {
  const { handleCompanyChange, companies: allCompanies, isLoadingCompanies, selectedCompany } = useCompany();
  const { logout } = useUser();
  const [searchParams] = useSearchParams();
  const inactiveReason = searchParams.get("reason") === "inactive";

  const { active, inactive } = useMemo(() => {
    const valid = allCompanies.filter(c => c.id !== "na");
    return {
      active: valid.filter(c => c.isActive),
      inactive: valid.filter(c => !c.isActive),
    };
  }, [allCompanies]);

  const handleSelectCompany = (companyCode: string) => {
    handleCompanyChange({ target: { value: companyCode } } as any);
    window.location.href = `/${companyCode}/dashboard/all`;
  };

  const displayName = profile?.username ?? "";
  const firstLetter = displayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen flex bg-[#f5f5f7]">

      {/* ── Panel izquierdo — branding ──────────────────────────────────── */}
      <div className="hidden lg:flex w-[420px] shrink-0 bg-[#1c1c2e] flex-col justify-between p-10 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-600/40">
            <img src={Images.logo} alt="FlowPlanilla" className="w-5 h-5 select-none" />
          </div>
          <span className="text-white font-bold text-base tracking-tight">FlowPlanilla</span>
        </div>

        {/* Center content */}
        <div className="relative z-10 space-y-4">
          <p className="text-slate-400 text-xs uppercase tracking-widest font-semibold">Bienvenido de vuelta</p>
          <h2 className="text-3xl font-bold text-white leading-snug">
            Elige la empresa<br />
            <span className="text-violet-400">con la que trabajar</span>
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
            Cada empresa tiene su propio espacio de trabajo, empleados y configuración independiente.
          </p>
        </div>

        <p className="relative z-10 text-slate-600 text-xs">
          © {new Date().getFullYear()} FlowPlanilla · Todos los derechos reservados
        </p>
      </div>

      {/* ── Panel derecho — selector ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-6">

          {/* Avatar + saludo */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-violet-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-violet-600/30 shrink-0">
              {firstLetter || "U"}
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Conectado como</p>
              <p className="text-gray-900 font-semibold text-base leading-tight">{displayName || "Usuario"}</p>
            </div>
          </div>

          {/* Título */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Seleccionar empresa</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {active.length > 0
                ? `Tienes acceso a ${active.length} empresa${active.length > 1 ? "s" : ""}`
                : "No tienes empresas activas disponibles"}
            </p>
          </div>

          {/* Advertencia empresa desactivada */}
          {inactiveReason && (
            <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Empresa desactivada</p>
                <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                  La empresa en la que estabas fue desactivada. Selecciona otra para continuar.
                </p>
              </div>
            </div>
          )}

          {/* Lista de empresas */}
          <div className="space-y-2">
            {isLoadingCompanies ? (
              /* Skeleton */
              [1, 2].map(i => (
                <div key={i} className="flex items-center gap-4 px-4 py-4 rounded-xl bg-white border border-gray-100 animate-pulse">
                  <div className="w-10 h-10 rounded-xl bg-gray-200 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                    <div className="h-2.5 bg-gray-100 rounded w-1/4" />
                  </div>
                </div>
              ))
            ) : active.length === 0 ? (
              /* Sin empresas activas */
              <div className="flex flex-col items-center py-10 gap-3 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-gray-400" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Sin acceso a empresas activas</p>
                  <p className="text-sm text-gray-500 mt-0.5">Contacta a tu administrador.</p>
                </div>
              </div>
            ) : (
              <>
                {active.map((company) => {
                  const isSelected = selectedCompany?.code === company.code;
                  return (
                    <button
                      key={company.id}
                      onClick={() => handleSelectCompany(company.code)}
                      className={`group w-full flex items-center gap-4 px-4 py-4 rounded-xl border transition-all text-left ${
                        isSelected
                          ? "bg-violet-50 border-violet-300 shadow-sm shadow-violet-100"
                          : "bg-white border-gray-100 hover:border-violet-200 hover:bg-violet-50/50 hover:shadow-sm"
                      }`}
                    >
                      {/* Avatar empresa */}
                      <div className={`w-10 h-10 rounded-xl ${getAvatarColor(company.name)} flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm`}>
                        {getInitials(company.name)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{company.name}</p>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">{company.code}</p>
                      </div>

                      {/* Estado / flecha */}
                      {isSelected ? (
                        <CheckCircle2 className="h-5 w-5 text-violet-500 shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-violet-400 transition-colors shrink-0" />
                      )}
                    </button>
                  );
                })}

                {/* Empresas inactivas */}
                {inactive.map((company) => (
                  <div
                    key={company.id}
                    className="flex items-center gap-4 px-4 py-4 rounded-xl bg-gray-50 border border-gray-100 opacity-50 cursor-not-allowed"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gray-200 flex items-center justify-center shrink-0">
                      <Lock className="h-4 w-4 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-500 text-sm truncate line-through">{company.name}</p>
                      <p className="text-xs text-red-400 font-medium mt-0.5">Desactivada</p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100" />

          {/* Cerrar sesión */}
          <button
            onClick={() => logout()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 hover:text-gray-900 hover:border-gray-300 hover:bg-gray-50 transition-all text-sm font-medium"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>

          <p className="text-center text-xs text-gray-400">
            ¿No ves tu empresa?{" "}
            <a href="mailto:soporte@flowplanilla.com" className="text-violet-600 hover:text-violet-700 font-medium">
              Contactar soporte
            </a>
          </p>

        </div>
      </div>
    </div>
  );
};

export { CompanySelector };
