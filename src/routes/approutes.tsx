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
import DevicesPage from "../pages/account/devices/devices";
import NextworkPage from "../pages/account/network/network";
import UsersPage from "../pages/account/users/page";
import ProfilePage from "../pages/account/profile/page";
import { Company } from "../components/layouts/slideBar";
import { useCompany } from "../context/routerContext";
import CreateUserPage from "../pages/account/users/components/CreatePage";
import AllDevices from "../pages/account/devices/components/AllDevices";
import UpdateDevicesPage from "../pages/account/devices/components/updateDevicesPage";
import AllNetwork from "../pages/account/network/components/AllNetwork";
import UpdateNetworkPage from "../pages/account/network/components/updateNetwork";
import UpdateMaintenancePage from "../pages/account/maintenance/components/updateMaintenance";
import AllMaintenance from "../pages/account/maintenance/components/AllMaintenance";
import MaintenancePage from "../pages/account/maintenance/page";
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
import InventoryPage from "../pages/account/inventory/page";
import AllInventory from "../pages/account/inventory/components/allInventory";
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
  const { selectedCompany } = useCompany();
  const code = `${selectedCompany?.code || "default-code"}`;
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

      <Route
        path={`/:${code}/select-company`}
        element={
          <ProtectedCompanyRoute
            isLogged={isLogged}
          >
            <CompanySelector profile={profile} />
          </ProtectedCompanyRoute>
        }
      >
      </Route>

      <Route
        path={`/:${code}/dashboard/*`}
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
        path={`/:${code}/inventory/*`}
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
              title="Inventory"
              description="Inventory"
              isLogged={isLogged}
              profile={profile}
              currentPathname={pathnameLocation}
              publicRoute={false}
              companies={companies}
            >
              <InventoryPage
                subroutes={
                  routesConfig.find((route) => route.name === "Inventory")
                    ?.subroutes || []
                }
              />
            </EnvolveLayout>
          </ProtectedRoute>
        }
      >
        <Route path="all" element={<AllInventory />} />
        <Route path="create" element={<UpdateDevicesPage />} />
        <Route path="edit/:id" element={<UpdateDevicesPage />} />
      </Route>

      <Route
        path={`/:${code}/devices/*`}
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
              title="devices"
              description="devices"
              isLogged={isLogged}
              profile={profile}
              currentPathname={pathnameLocation}
              publicRoute={false}
              companies={companies}
            >
              <DevicesPage
                subroutes={
                  routesConfig.find((route) => route.name === "devices")
                    ?.subroutes || []
                }
              />
            </EnvolveLayout>
          </ProtectedRoute>
        }
      >
        <Route path="all" element={<AllDevices />} />
        <Route path="create" element={<UpdateDevicesPage />} />
        <Route path="edit/:id" element={<UpdateDevicesPage />} />
      </Route>

      <Route
        path={`/:${code}/network/*`}
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
        path={`/:${code}/maintenance/*`}
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
              title="maintenance"
              description="maintenance"
              isLogged={isLogged}
              profile={profile}
              currentPathname={pathnameLocation}
              publicRoute={false}
              companies={companies}
            >
              <MaintenancePage
                currentPathname={pathnameLocation}
                subroutes={
                  routesConfig.find((route) => route.name === "maintenance")
                    ?.subroutes || []
                }
              />
            </EnvolveLayout>
          </ProtectedRoute>
        }
      >
        <Route path="all" element={<AllMaintenance currentPathname={pathnameLocation} />} />
        <Route path="create" element={<UpdateMaintenancePage currentPathname={pathnameLocation} />} />
        <Route path="edit/:id" element={<UpdateMaintenancePage currentPathname={pathnameLocation} />} />
      </Route>

      <Route
        path={`/:${code}/users/*`}
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
        path={`/:${code}/reports/*`}
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
        path={`/:${code}/tickets/*`}
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
        path={`/:${code}/expenses/*`}
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
        path={`/:${code}/legal/*`}
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
        path={`/:${code}/employees/*`}
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
        path={`/:${code}/payrolls/*`}
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
        path={`/:${code}/sipe/*`}
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
        path={`/:${code}/decimo/*`}
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
        path={`/:${code}/isr/*`}
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
        path={`/:${code}/settings/*`}
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
        path={`/:${code}/profile/:id/*`}
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
