import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import LoginPage from "../pages/auth/loginPage";
// import Dashboard from "../pages/account/principal";
import ProtectedLogin from "./protectedLogin";
import ProtectedRoute from "./protectedRoutes";
import useUser from "../hook/useUser";
import { CurrentPathname } from "../components/layouts/main";
import EnvolveLayout from "../components/layouts/childLayout";
import { authRoles } from "../diccionary/constants";
import routesConfig, { getUserRoles } from "./routesConfig";
import useUserProfile from "../hook/userUserProfile";
import NotFound from "../pages/public_pages/not_found";
import NextworkPage from "../pages/account/network/network";
import UsersPage from "../pages/account/users/page";
import ProfilePage from "../pages/account/profile/page";
import { Company } from "../components/layouts/slideBar";
import { useCompany } from "../context/routerContext";
import CreateUserPage from "../pages/account/users/components/CreatePage";
import AllNetwork from "../pages/account/network/components/AllNetwork";
import UpdateNetworkPage from "../pages/account/network/components/updateNetwork";
import { CompanySelector } from "../pages/account/companies/companies";
import ProtectedCompanyRoute from "./protectedCompanyRoute";
import NetworkProvidersPage from "../pages/account/network/components/AllProvider";
import UpdateNetworkProviderPage from "../pages/account/network/components/updateNetworkProvider";
import TicketPage from "../pages/account/tickets/page";
import EditTicketPage from "../pages/account/tickets/[id]/page";
import ExpenseDetailPage from "../pages/account/expense/[id]/updateExpense";
import ExpensePage from "../pages/account/expense/page";
import AllExpensePage from "../pages/account/expense/components/allExpense";
import ReportsPage from "../pages/account/reports/page";
import AllReportsPage from "../pages/account/reports/components/allReportPage";
import SettingsPage from "../pages/account/settings/page";
import AllSettingsPage from "../pages/account/settings/components/allSettingsPage";
import DashboardPage from "../pages/account/dashboard/page";
import AllDashboard from "../pages/account/dashboard/components/allDashboard";
import UpdateExpensePage from "../pages/account/expense/components/updateExpense";
import UpdateCompany from "../pages/account/settings/components/updateCompany";
import { AllUsers } from "../pages/account/users/components/AllUsers";
import { AllTickets } from "../pages/account/tickets/components/AllTickets";
import PayrollsPage from "../pages/account/payrolls/page";
import { AllPayrolls } from "../pages/account/payrolls/components/AllPayrolls";
import { AllLegalParameters } from "../pages/account/legal/components/AllLegal";
import LegalPage from "../pages/account/legal/page";
import { AllEmployees } from "../pages/account/employees/components/AllEmployees";
import EmployeesPage from "../pages/account/employees/page";
import ManageEmployeePage from "../pages/account/employees/components/updateEmployee";
import SipePage from "../pages/account/sipe/page";
import { AllSipe } from "../pages/account/sipe/components/AllSipe";
import IsrPage from "../pages/account/isr/page";
import { AllISR } from "../pages/account/isr/components/page";
import { AllDecimo } from "../pages/account/decimo/components/AllDecimo";
import { UpdateDepartment } from "../pages/account/settings/components/updateDepartment";
import LegalDecimoPage from "../pages/account/legaldecimo/page";
import { AllLegalDecimoParameters } from "../pages/account/legaldecimo/components/AllLegalDecimo";
import VacacionesPage from "../pages/account/vacaciones/page";
import { VacacionesMain } from "../pages/account/vacaciones/components/VacacionesMain";
import { VacacionesEmpleadoPerfil } from "../pages/account/vacaciones/components/VacacionesEmpleadoPerfil";
import LiquidacionesPage from "../pages/account/liquidaciones/page";
import { AllLiquidaciones } from "../pages/account/liquidaciones/components/AllLiquidaciones";
import ProtectedAdminRoute from "./protectedAdminRoute";
import SetupCompany from "../pages/onboarding/SetupCompany";
import { AdminOverview } from "../pages/admin/overview/AdminOverview";
import { AdminCompanies } from "../pages/admin/companies/AdminCompanies";
import { AdminCompanyForm } from "../pages/admin/companies/AdminCompanyForm";
import { AdminUsers } from "../pages/admin/users/AdminUsers";
import { AdminUserForm } from "../pages/admin/users/AdminUserForm";
import { AdminLicenses } from "../pages/admin/licenses/AdminLicenses";
import { AdminLicenseForm } from "../pages/admin/licenses/AdminLicenseForm";
import { AdminPlans } from "../pages/admin/plans/AdminPlans";

// Tipado de usuario
export interface User {
  isSignedIn: boolean;
  roles: string[];
  redirectPath: string | null;
}

export interface UserContextValue {
  jwt: string | null;
  setJWT: React.Dispatch<React.SetStateAction<string | null>>;
}

type Props = {
  pathnameLocation: CurrentPathname;
  companies?: Company[];
};

export const AppRoutes: React.FC<Props> = ({ pathnameLocation, companies }) => {
  const { pathname } = useLocation();
  const initialPathSet = useRef(false);
  const { isLogged } = useUser();
  const { companies: userCompanies, isLoadingCompanies } = useCompany();
  const { profile } = useUserProfile();
  useEffect(() => {
    if (!isLogged) {
      if (!initialPathSet.current && pathname !== "/") {
        localStorage.setItem("externalUrl", pathname);
        initialPathSet.current = true;
      }
    }
  }, [isLogged, pathname]);

  const userRole = profile?.roles ? getUserRoles(profile) : ["user"];
  const user: User = {
    isSignedIn: isLogged,
    roles: userRole,
    redirectPath: localStorage.getItem("externalUrl"),
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          <EnvolveLayout
            title="FlowRH | Home"
            description="FlowRH | Home"
            isLogged={isLogged}
            profile={profile}
            currentPathname={pathnameLocation}
            publicRoute={true}
          >
            <LoginPage />
          </EnvolveLayout>
        }
      />
      <Route path="/home" element={<Navigate to="/" replace />} />

      <Route
        path="/login"
        element={
          <ProtectedLogin auth={user}>
            <EnvolveLayout
              title="Login"
              description="Login"
              isLogged={isLogged}
              profile={profile}
              currentPathname={pathnameLocation}
              publicRoute={true}
              companies={companies}
            >
              <LoginPage />
            </EnvolveLayout>
          </ProtectedLogin>
        }
      />

      {/* Ruta fija — usada tras el login para evitar dependencia del code */}
      <Route
        path="/select-company"
        element={
          <ProtectedCompanyRoute isLogged={isLogged}>
            <CompanySelector profile={profile} />
          </ProtectedCompanyRoute>
        }
      />
      {/* Onboarding — crear primera empresa (solo si no tiene empresa aún) */}
      <Route
        path="/setup"
        element={
          !isLogged
            ? <Navigate to="/" replace />
            : isLoadingCompanies
              ? null
              : (userCompanies && userCompanies.length > 0)
                ? <Navigate to="/select-company" replace />
                : <SetupCompany />
        }
      />

      {/* Settings sin empresa — accesible mientras el usuario no haya creado su empresa */}
      <Route
        path="/setup/settings/*"
        element={
          !isLogged
            ? <Navigate to="/" replace />
            : (userCompanies && userCompanies.length > 0)
              ? <Navigate to="/select-company" replace />
              : (
                <EnvolveLayout
                  title="Configuración"
                  description="Configuración de cuenta"
                  isLogged={isLogged}
                  profile={profile}
                  currentPathname={pathnameLocation}
                  publicRoute={false}
                  companies={companies}
                >
                  <SettingsPage />
                </EnvolveLayout>
              )
        }
      >
        <Route path="all" element={<AllSettingsPage />} />
        <Route path="create" element={<UpdateCompany />} />
        <Route path="edit/:id" element={<UpdateCompany />} />
        <Route path="departments/edit" element={<UpdateDepartment />} />
        <Route path="departments/create" element={<UpdateDepartment />} />
      </Route>

      {/* Ruta legacy con prefijo de empresa (por compatibilidad con links existentes) */}
      <Route
        path="/:companyCode/select-company"
        element={
          <ProtectedCompanyRoute isLogged={isLogged}>
            <CompanySelector profile={profile} />
          </ProtectedCompanyRoute>
        }
      />

      <Route
        path="/:companyCode/dashboard/*"
        element={
          <ProtectedRoute
            isLogged={isLogged}
            auth={user}
            allowedRoles={[
              authRoles.user,
              authRoles.admin,
              authRoles.moderator,
              authRoles.super_admin,
            ]}
          >
            <EnvolveLayout
              title="Dashboard"
              description="Dashboard"
              isLogged={isLogged}
              profile={profile}
              currentPathname={pathnameLocation}
              publicRoute={false}
              companies={companies}
            >
              <DashboardPage
                currentPathname={pathnameLocation}
                subroutes={
                  routesConfig.find((route) => route.name === "Dashboard")
                    ?.subroutes || []
                }
              />
            </EnvolveLayout>
          </ProtectedRoute>
        }
      >
        <Route path="all" element={<AllDashboard />} />
      </Route>

      <Route
        path="/:companyCode/network/*"
        element={
          <ProtectedRoute
            isLogged={isLogged}
            auth={user}
            allowedRoles={[
              authRoles.user,
              authRoles.admin,
              authRoles.moderator,
              authRoles.super_admin,
            ]}
          >
            <EnvolveLayout
              title="network"
              description="network"
              isLogged={isLogged}
              profile={profile}
              currentPathname={pathnameLocation}
              publicRoute={false}
              companies={companies}
            >
              <NextworkPage
              // subroutes={
              //   routesConfig.find((route) => route.name === "reports")
              //     ?.subroutes || []
              // }
              />
            </EnvolveLayout>
          </ProtectedRoute>
        }
      >
        <Route path="all" element={<AllNetwork />} />
        <Route path="providers" element={<NetworkProvidersPage />} />
        <Route path="create" element={<UpdateNetworkPage />} />
        <Route path="edit/:id" element={<UpdateNetworkPage />} />
        <Route path="create-provider" element={<UpdateNetworkProviderPage />} />
        <Route path="edit-provider/:id" element={<UpdateNetworkProviderPage />} />
      </Route>

      <Route
        path="/:companyCode/users/*"
        element={
          <ProtectedRoute
            isLogged={isLogged}
            auth={user}
            allowedRoles={[
              authRoles.user,
              authRoles.admin,
              authRoles.moderator,
              authRoles.super_admin,
            ]}
          >
            <EnvolveLayout
              title="users"
              description="users"
              isLogged={isLogged}
              profile={profile}
              currentPathname={pathnameLocation}
              publicRoute={false}
            >
              <UsersPage
                subroutes={
                  routesConfig.find((route) => route.name === "Users")
                    ?.subroutes || []
                }
              />
            </EnvolveLayout>
          </ProtectedRoute>
        }
      >
        <Route path="all" element={<AllUsers />} />
        <Route path="create" element={<CreateUserPage />} />
        <Route path="edit/:id" element={<CreateUserPage />} />
      </Route>

      <Route
        path="/:companyCode/reports/*"
        element={
          <ProtectedRoute
            isLogged={isLogged}
            auth={user}
            allowedRoles={[
              authRoles.user,
              authRoles.admin,
              authRoles.moderator,
              authRoles.super_admin,
            ]}
          >
            <EnvolveLayout
              title="reports"
              description="reports"
              isLogged={isLogged}
              profile={profile}
              currentPathname={pathnameLocation}
              publicRoute={false}
              companies={companies}
            >
              <ReportsPage
                subroutes={
                  routesConfig.find((route) => route.name === "reports")
                    ?.subroutes || []
                }
              />
            </EnvolveLayout>
          </ProtectedRoute>
        }
      >
        <Route path="all" element={<AllReportsPage />} />
      </Route>

      <Route
        path="/:companyCode/tickets/*"
        element={
          <ProtectedRoute
            isLogged={isLogged}
            auth={user}
            allowedRoles={[
              authRoles.user,
              authRoles.admin,
              authRoles.moderator,
              authRoles.super_admin,
            ]}
          >
            <EnvolveLayout
              title="tickets"
              description="tickets"
              isLogged={isLogged}
              profile={profile}
              currentPathname={pathnameLocation}
              publicRoute={false}
              companies={companies}
            >
              <TicketPage
              // subroutes={
              //   routesConfig.find((route) => route.name === "reports")
              //     ?.subroutes || []
              // }
              />
            </EnvolveLayout>
          </ProtectedRoute>
        }
      >
        <Route path="all" element={<AllTickets />} />
        <Route path="create" element={<EditTicketPage />} />
        <Route path="edit/:id" element={<EditTicketPage />} />
      </Route>

      <Route
        path="/:companyCode/expenses/*"
        element={
          <ProtectedRoute
            isLogged={isLogged}
            auth={user}
            allowedRoles={[
              authRoles.user,
              authRoles.admin,
              authRoles.moderator,
              authRoles.super_admin,
            ]}
          >
            <EnvolveLayout
              title="Expenses"
              description="Expense Page"
              isLogged={isLogged}
              profile={profile}
              currentPathname={pathnameLocation}
              publicRoute={false}
              companies={companies}
            >
              <ExpensePage
                subroutes={
                  routesConfig.find((route) => route.name === "Expenses")
                    ?.subroutes || []
                }
              />
            </EnvolveLayout>
          </ProtectedRoute>
        }
      >
        <Route path="all" element={<AllExpensePage />} />
        <Route path="create" element={<UpdateExpensePage />} />
        <Route path="edit/:id" element={<ExpenseDetailPage />} />
      </Route>

      <Route
        path="/:companyCode/legal/*"
        element={
          <ProtectedRoute
            isLogged={isLogged}
            auth={user}
            allowedRoles={[
              authRoles.user,
              authRoles.admin,
              authRoles.moderator,
              authRoles.super_admin,
            ]}
          >
            <EnvolveLayout
              title="Legal"
              description="Legal Page"
              isLogged={isLogged}
              profile={profile}
              currentPathname={pathnameLocation}
              publicRoute={false}
              companies={companies}
            >
              <LegalPage
                subroutes={
                  routesConfig.find((route) => route.name === "Legal")
                    ?.subroutes || []
                }
              />
            </EnvolveLayout>
          </ProtectedRoute>
        }
      >
        <Route path="all" element={<AllLegalParameters />} />
        {/* <Route path="create" element={<UpdateExpensePage/>} />
        <Route path="edit/:id" element={<ExpenseDetailPage/>} /> */}
      </Route>

      <Route
        path="/:companyCode/legaldecimo/*"
        element={
          <ProtectedRoute
            isLogged={isLogged}
            auth={user}
            allowedRoles={[
              authRoles.user,
              authRoles.admin,
              authRoles.moderator,
              authRoles.super_admin,
            ]}
          >
            <EnvolveLayout
              title="Legal Decimo"
              description="Legal Decimo Page"
              isLogged={isLogged}
              profile={profile}
              currentPathname={pathnameLocation}
              publicRoute={false}
              companies={companies}
            >
              <LegalDecimoPage
                subroutes={
                  routesConfig.find((route) => route.name === "LegalDecimo")
                    ?.subroutes || []
                }
              />
            </EnvolveLayout>
          </ProtectedRoute>
        }
      >
        <Route path="all" element={<AllLegalDecimoParameters />} />
        {/* <Route path="create" element={<UpdateExpensePage/>} />
        <Route path="edit/:id" element={<ExpenseDetailPage/>} /> */}
      </Route>

      <Route
        path="/:companyCode/employees/*"
        element={
          <ProtectedRoute
            isLogged={isLogged}
            auth={user}
            allowedRoles={[
              authRoles.user,
              authRoles.admin,
              authRoles.moderator,
              authRoles.super_admin,
            ]}
          >
            <EnvolveLayout
              title="Employees"
              description="Employees Page"
              isLogged={isLogged}
              profile={profile}
              currentPathname={pathnameLocation}
              publicRoute={false}
              companies={companies}
            >
              <EmployeesPage
                subroutes={
                  routesConfig.find((route) => route.name === "Employees")
                    ?.subroutes || []
                }
              />
            </EnvolveLayout>
          </ProtectedRoute>
        }
      >
        <Route path="all" element={<AllEmployees />} />
        <Route path="create" element={<ManageEmployeePage />} />
        <Route path="edit/:id" element={<ManageEmployeePage />} />
      </Route>

      <Route
        path="/:companyCode/payrolls/*"
        element={
          <ProtectedRoute
            isLogged={isLogged}
            auth={user}
            allowedRoles={[
              authRoles.user,
              authRoles.admin,
              authRoles.moderator,
              authRoles.super_admin,
            ]}
          >
            <EnvolveLayout
              title="Payrolls"
              description="Payrolls Page"
              isLogged={isLogged}
              profile={profile}
              currentPathname={pathnameLocation}
              publicRoute={false}
              companies={companies}
            >
              <PayrollsPage
                subroutes={
                  routesConfig.find((route) => route.name === "Payrolls")
                    ?.subroutes || []
                }
              />
            </EnvolveLayout>
          </ProtectedRoute>
        }
      >
        <Route path="all" element={<AllPayrolls />} />
        {/* <Route path="create" element={<UpdateExpensePage/>} />
        <Route path="edit/:id" element={<ExpenseDetailPage/>} /> */}
      </Route>

      <Route
        path="/:companyCode/sipe/*"
        element={
          <ProtectedRoute
            isLogged={isLogged}
            auth={user}
            allowedRoles={[
              authRoles.user,
              authRoles.admin,
              authRoles.moderator,
              authRoles.super_admin,
            ]}
          >
            <EnvolveLayout
              title="Sipe"
              description="Sipe Page"
              isLogged={isLogged}
              profile={profile}
              currentPathname={pathnameLocation}
              publicRoute={false}
              companies={companies}
            >
              <SipePage
                subroutes={
                  routesConfig.find((route) => route.name === "Sipe")
                    ?.subroutes || []
                }
              />
            </EnvolveLayout>
          </ProtectedRoute>
        }
      >
        <Route path="all" element={<AllSipe />} />
        {/* <Route path="create" element={<UpdateExpensePage/>} />
        <Route path="edit/:id" element={<ExpenseDetailPage/>} /> */}
      </Route>
      <Route
        path="/:companyCode/decimo/*"
        element={
          <ProtectedRoute
            isLogged={isLogged}
            auth={user}
            allowedRoles={[
              authRoles.user,
              authRoles.admin,
              authRoles.moderator,
              authRoles.super_admin,
            ]}
          >
            <EnvolveLayout
              title="Decimo"
              description="Decimo Page"
              isLogged={isLogged}
              profile={profile}
              currentPathname={pathnameLocation}
              publicRoute={false}
              companies={companies}
            >
              <SipePage
                subroutes={
                  routesConfig.find((route) => route.name === "Decimo")
                    ?.subroutes || []
                }
              />
            </EnvolveLayout>
          </ProtectedRoute>
        }
      >
        <Route path="all" element={<AllDecimo />} />
        {/* <Route path="create" element={<UpdateExpensePage/>} />
        <Route path="edit/:id" element={<ExpenseDetailPage/>} /> */}
      </Route>

      <Route
        path="/:companyCode/vacaciones/*"
        element={
          <ProtectedRoute
            isLogged={isLogged}
            auth={user}
            allowedRoles={[
              authRoles.user,
              authRoles.admin,
              authRoles.moderator,
              authRoles.super_admin,
            ]}
          >
            <EnvolveLayout
              title="Vacaciones"
              description="Vacaciones Page"
              isLogged={isLogged}
              profile={profile}
              currentPathname={pathnameLocation}
              publicRoute={false}
              companies={companies}
            >
              <VacacionesPage
                subroutes={
                  routesConfig.find((route) => route.name === "Vacaciones")
                    ?.subroutes || []
                }
              />
            </EnvolveLayout>
          </ProtectedRoute>
        }
      >
        <Route path="all" element={<VacacionesMain />} />
        <Route path="empleado/:employeeId" element={<VacacionesEmpleadoPerfil />} />
      </Route>

      <Route
        path="/:companyCode/liquidaciones/*"
        element={
          <ProtectedRoute
            isLogged={isLogged}
            auth={user}
            allowedRoles={[
              authRoles.admin,
              authRoles.moderator,
              authRoles.super_admin,
            ]}
          >
            <EnvolveLayout
              title="Liquidaciones"
              description="Liquidaciones Page"
              isLogged={isLogged}
              profile={profile}
              currentPathname={pathnameLocation}
              publicRoute={false}
              companies={companies}
            >
              <LiquidacionesPage
                subroutes={
                  routesConfig.find((route) => route.name === "Liquidaciones")
                    ?.subroutes || []
                }
              />
            </EnvolveLayout>
          </ProtectedRoute>
        }
      >
        <Route path="all" element={<AllLiquidaciones />} />
      </Route>

      <Route
        path="/:companyCode/isr/*"
        element={
          <ProtectedRoute
            isLogged={isLogged}
            auth={user}
            allowedRoles={[
              authRoles.user,
              authRoles.admin,
              authRoles.moderator,
              authRoles.super_admin,
            ]}
          >
            <EnvolveLayout
              title="Isr"
              description="Isr Page"
              isLogged={isLogged}
              profile={profile}
              currentPathname={pathnameLocation}
              publicRoute={false}
              companies={companies}
            >
              <IsrPage
                subroutes={
                  routesConfig.find((route) => route.name === "Isr")
                    ?.subroutes || []
                }
              />
            </EnvolveLayout>
          </ProtectedRoute>
        }
      >
        <Route path="all" element={<AllISR />} />
        {/* <Route path="create" element={<UpdateExpensePage/>} />
        <Route path="edit/:id" element={<ExpenseDetailPage/>} /> */}
      </Route>

      <Route
        path="/:companyCode/settings/*"
        element={
          <ProtectedRoute
            isLogged={isLogged}
            auth={user}
            allowedRoles={[
              authRoles.user,
              authRoles.admin,
              authRoles.moderator,
              authRoles.super_admin,
            ]}
          >
            <EnvolveLayout
              title="settings"
              description="settings"
              isLogged={isLogged}
              profile={profile}
              currentPathname={pathnameLocation}
              publicRoute={false}
              companies={companies}
            >
              <SettingsPage
              // subroutes={
              //   routesConfig.find((route) => route.name === "reports")
              //     ?.subroutes || []
              // }
              />
            </EnvolveLayout>
          </ProtectedRoute>
        }
      >
        <Route path="all" element={<AllSettingsPage />} />
        <Route path="create" element={<UpdateCompany />} />
        <Route path="edit/:id" element={<UpdateCompany />} />
        <Route path="departments/edit" element={<UpdateDepartment />} />
        <Route path="departments/create" element={<UpdateDepartment />} />
      </Route>

      <Route
        path="/:companyCode/profile/:id/*"
        element={
          <ProtectedRoute
            isLogged={isLogged}
            auth={user}
            allowedRoles={[
              authRoles.user,
              authRoles.admin,
              authRoles.moderator,
              authRoles.super_admin,
            ]}
          >
            <EnvolveLayout
              title="users"
              description="users"
              isLogged={isLogged}
              profile={profile}
              currentPathname={pathnameLocation}
              publicRoute={false}
              companies={companies}
            >
              <ProfilePage
                userId={profile?.id || "default-id"}
              // subroutes={
              //   routesConfig.find((route) => route.name === "users")
              //     ?.subroutes || []
              // }
              />
            </EnvolveLayout>
          </ProtectedRoute>
        }
      >
      </Route>

      {/* ── Panel Global Admin ───────────────────────────────────────── */}
      <Route
        path="/admin/overview"
        element={
          <ProtectedAdminRoute>
            <EnvolveLayout
              title="Admin — Resumen"
              description="Panel de administración global"
              isLogged={isLogged}
              profile={profile}
              currentPathname={pathnameLocation}
              publicRoute={false}
              companies={companies}
            >
              <AdminOverview />
            </EnvolveLayout>
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin/companies"
        element={
          <ProtectedAdminRoute>
            <EnvolveLayout
              title="Admin — Empresas"
              description="Gestión de empresas"
              isLogged={isLogged}
              profile={profile}
              currentPathname={pathnameLocation}
              publicRoute={false}
              companies={companies}
            >
              <AdminCompanies />
            </EnvolveLayout>
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin/companies/create"
        element={
          <ProtectedAdminRoute>
            <EnvolveLayout title="Admin — Nueva Empresa" description="Crear empresa" isLogged={isLogged} profile={profile} currentPathname={pathnameLocation} publicRoute={false} companies={companies}>
              <AdminCompanyForm />
            </EnvolveLayout>
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin/companies/edit/:id"
        element={
          <ProtectedAdminRoute>
            <EnvolveLayout title="Admin — Editar Empresa" description="Editar empresa" isLogged={isLogged} profile={profile} currentPathname={pathnameLocation} publicRoute={false} companies={companies}>
              <AdminCompanyForm />
            </EnvolveLayout>
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedAdminRoute>
            <EnvolveLayout
              title="Admin — Usuarios"
              description="Gestión de usuarios"
              isLogged={isLogged}
              profile={profile}
              currentPathname={pathnameLocation}
              publicRoute={false}
              companies={companies}
            >
              <AdminUsers />
            </EnvolveLayout>
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin/users/create"
        element={
          <ProtectedAdminRoute>
            <EnvolveLayout title="Admin — Nuevo Usuario" description="Crear usuario admin" isLogged={isLogged} profile={profile} currentPathname={pathnameLocation} publicRoute={false} companies={companies}>
              <AdminUserForm />
            </EnvolveLayout>
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin/users/edit/:id"
        element={
          <ProtectedAdminRoute>
            <EnvolveLayout title="Admin — Editar Usuario" description="Editar usuario admin" isLogged={isLogged} profile={profile} currentPathname={pathnameLocation} publicRoute={false} companies={companies}>
              <AdminUserForm />
            </EnvolveLayout>
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin/licenses/edit/:userId"
        element={
          <ProtectedAdminRoute>
            <EnvolveLayout title="Admin — Licencia" description="Editar licencia" isLogged={isLogged} profile={profile} currentPathname={pathnameLocation} publicRoute={false} companies={companies}>
              <AdminLicenseForm />
            </EnvolveLayout>
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin/plans"
        element={
          <ProtectedAdminRoute>
            <EnvolveLayout
              title="Admin — Planes"
              description="Planes disponibles"
              isLogged={isLogged}
              profile={profile}
              currentPathname={pathnameLocation}
              publicRoute={false}
              companies={companies}
            >
              <AdminPlans />
            </EnvolveLayout>
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin/licenses"
        element={
          <ProtectedAdminRoute>
            <EnvolveLayout
              title="Admin — Licencias"
              description="Gestión de licencias"
              isLogged={isLogged}
              profile={profile}
              currentPathname={pathnameLocation}
              publicRoute={false}
              companies={companies}
            >
              <AdminLicenses />
            </EnvolveLayout>
          </ProtectedAdminRoute>
        }
      />

      <Route
        path="*"
        element={
          <EnvolveLayout
            title="No Found"
            description="No Found"
            isLogged={isLogged}
            profile={profile}
            currentPathname={pathnameLocation}
            publicRoute={true}
          >
            <NotFound />
          </EnvolveLayout>
        }
      />
    </Routes>
  );
};
