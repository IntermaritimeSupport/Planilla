import { useState } from "react";
import LoginForm from "../../components/forms/loginForm";
import Images from "../../assets";
import { BarChart3, Users, FileText, Shield } from "lucide-react";

const FEATURES = [
  { icon: BarChart3, label: "Dashboard en tiempo real" },
  { icon: Users,    label: "Gestión de empleados" },
  { icon: FileText, label: "Nómina automatizada" },
  { icon: Shield,   label: "Seguridad multi-empresa" },
];

export default function LoginPage() {
  const [pending, setPending]           = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState<Error | null>(null);

  return (
    <div className="min-h-screen flex">

      {/* ── Lado izquierdo — branding ───────────────────────────────── */}
      <div className="hidden lg:flex w-1/2 bg-[#0f0f1a] relative overflow-hidden flex-col justify-between p-12">
        {/* Glow de fondo */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Logo + nombre */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-600/40">
            <img src={Images.logo} alt="FlowPlanilla" className="w-6 h-6 select-none" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">FlowPlanilla</span>
        </div>

        {/* Headline */}
        <div className="relative z-10 space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight">
              Gestiona tu nómina<br />
              <span className="text-violet-400">sin complicaciones</span>
            </h1>
            <p className="mt-3 text-slate-400 text-sm leading-relaxed max-w-xs">
              Plataforma SaaS multi-empresa para administrar planillas, empleados y reportes en un solo lugar.
            </p>
          </div>

          {/* Feature list */}
          <ul className="space-y-3">
            {FEATURES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-violet-600/20 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                  <Icon size={13} className="text-violet-400" />
                </div>
                <span className="text-slate-300 text-sm">{label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer branding */}
        <p className="relative z-10 text-slate-600 text-xs">
          © {new Date().getFullYear()} FlowPlanilla. Todos los derechos reservados.
        </p>
      </div>

      {/* ── Lado derecho — formulario ───────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center items-center bg-white px-6 py-12">
        {/* Logo mobile */}
        <div className="flex lg:hidden items-center gap-2 mb-10">
          <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center">
            <img src={Images.logo} alt="FlowPlanilla" className="w-5 h-5 select-none" />
          </div>
          <span className="text-gray-900 font-bold text-base tracking-tight">FlowPlanilla</span>
        </div>

        <div className="w-full max-w-sm space-y-8">
          {/* Encabezado */}
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-gray-900">Bienvenido de vuelta</h2>
            <p className="text-sm text-gray-500">Ingresa tus credenciales para continuar</p>
          </div>

          {/* Form */}
          <LoginForm
            pending={pending}
            setPending={setPending}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            error={error}
            setError={setError}
          />

          {/* Footer */}
          <p className="text-center text-xs text-gray-400">
            ¿Problemas para acceder?{" "}
            <a href="mailto:soporte@flowplanilla.com" className="text-violet-600 hover:text-violet-700 font-medium">
              Contactar soporte
            </a>
          </p>
        </div>
      </div>

    </div>
  );
}