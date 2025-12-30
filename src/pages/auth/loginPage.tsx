import { useState } from "react";
import LoginForm from "../../components/forms/loginForm";
import Images from "../../assets";

export default function LoginPage() {
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a3e] to-[#2d1b4e] flex items-center justify-center relative overflow-hidden">
      {/* Onda izquierda */}
      <div
        className="absolute bottom-0 left-0 w-1/2 h-40 bg-white"
        style={{ clipPath: 'polygon(0 40%, 100% 0%, 100% 100%, 0 100%)' }}
      ></div>

      {/* Onda derecha */}
      <div
        className="absolute bottom-0 right-0 w-1/2 h-40 bg-white"
        style={{ clipPath: 'polygon(0 0%, 100% 40%, 100% 100%, 0 100%)' }}
      ></div>

      {/* Contenedor principal */}
      <div className="flex w-full relative z-10 px-4 md:px-8 lg:px-16">
        {/* Sección de bienvenida */}
        <div className="hidden lg:flex flex-1 flex-col justify-center py-20">
          <h1 className="text-5xl font-bold text-white mb-2 leading-tight">
            Welcome back
          </h1>
          <h2 className="text-gray-300 text-2xl font-semibold leading-tight max-w-sm">
            IT System
          </h2>
        </div>

        {/* Sección del formulario */}
        <div className="flex-1 flex flex-col justify-center items-center py-20">
          <div className="bg-white rounded-2xl p-8 md:p-12 w-full max-w-md shadow-2xl">
            {/* Logo y encabezado */}
            <div className="flex flex-col items-center space-y-4 mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl shadow-sm border border-purple-200 flex items-center justify-center">
                <img src={Images?.logo} alt="logo" className="select-none" />
              </div>

              <div className="text-center space-y-2">
                <h2 className="text-3xl font-semibold text-gray-900">
                  Iniciar Sesión
                </h2>
                <p className="text-gray-500 text-sm">
                  Accede con tus credenciales
                </p>
              </div>
            </div>

            {/* Formulario */}
            <div>
              <LoginForm
                pending={pending}
                setPending={setPending}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                error={error}
                setError={setError}
              />
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}