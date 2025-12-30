"use client"
import { Building2, LogOut, Mail, ChevronRight } from "lucide-react"
import React from "react"
import useUser from "../../../hook/useUser"
import { useCompany } from "../../../context/routerContext"
import { UserProfile } from "../../../context/userProfileContext"
import Images from "../../../assets"

type Props = {
  profile: UserProfile | null;
};

const CompanySelector: React.FC<Props> = ({profile}) => {
    const { selectedCompany, handleCompanyChange, companies } = useCompany();
    const { logout } = useUser();

    const handleSelectCompany = (companyCode: string) => {
        handleCompanyChange({ target: { value: companyCode } } as any);
        window.location.href = `/${companyCode}/dashboard/all`;
    };

    if (companies.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#1a1a3e] to-[#2d1b4e] flex items-center justify-center p-4">
                <div className="w-full max-w-md space-y-6">
                    <div className="bg-white rounded-2xl p-8 shadow-2xl">
                        <div className="text-center">
                            <div className="flex justify-center mb-4">
                                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center">
                                    <img src={Images.logo || "/placeholder.svg"} alt="logo" width={100} height={100} className="rounded-lg" />
                                </div>
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900">Sin Acceso a Empresas</h1>
                            <p className="text-gray-500 mt-2">
                                Hola <span className="font-medium">{profile?.username}</span>, actualmente no tienes acceso a ninguna empresa.
                            </p>
                        </div>

                        <div className="mt-6 space-y-4">
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <Mail className="h-5 w-5 text-purple-600" />
                                <div>
                                    <p className="font-medium text-gray-900">Email de Soporte</p>
                                    <p className="text-sm text-gray-500">soporte@empresa.com</p>
                                </div>
                            </div>

                            <button
                                onClick={logout}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 bg-transparent rounded-lg text-gray-900 hover:bg-gray-50 transition-colors font-medium"
                            >
                                <LogOut className="h-4 w-4" />
                                Cerrar Sesión
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#1a1a3e] to-[#2d1b4e] flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl p-8 shadow-2xl space-y-6">
                    {/* Header */}
                    <div className="text-center space-y-3">
                        <div className="flex justify-center">
                            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center">
                                <img src={Images.logo || "/placeholder.svg"} alt="logo" width={100} height={100} className="rounded-lg" />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Seleccionar Empresa</h1>
                            <p className="text-gray-500 text-sm mt-1">
                                Hola <span className="font-medium">{profile?.username}</span>, elige tu empresa
                            </p>
                        </div>
                    </div>

                    {/* Companies List */}
                    <div className="space-y-2">
                        {companies.map((company) => (
                            <button
                                key={company.id}
                                onClick={() => handleSelectCompany(company.code)}
                                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors text-left font-medium
                                    ${selectedCompany?.code === company.code 
                                        ? "bg-purple-50 border border-purple-200" 
                                        : "bg-gray-50 border border-gray-100 hover:bg-gray-100"}`}
                            >
                                <div className="flex items-center gap-3">
                                    <Building2 className="h-5 w-5 text-purple-600" />
                                    <div>
                                        <p className="text-gray-900">{company.name}</p>
                                        <p className="text-xs text-gray-500">{company.code}</p>
                                    </div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-gray-400" />
                            </button>
                        ))}
                    </div>

                    {/* Logout Button */}
                    <button
                        onClick={() => { logout() }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 bg-transparent rounded-lg text-gray-900 hover:bg-gray-50 transition-colors font-medium"
                    >
                        <LogOut className="h-4 w-4" />
                        Cerrar Sesión
                    </button>

                    {/* Footer Info */}
                    <div className="text-center text-sm text-gray-500 pt-2 border-t border-gray-100">
                        <p>
                            ¿No ves tu empresa?{" "}
                            <a href="#" className="text-purple-600 hover:text-purple-700 font-medium">
                                Contactar soporte
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export { CompanySelector };