
// import { TicketIcon } from "lucide-react";
import { Banknote, Building2, HandCoins, LayoutDashboard, LucideBookUser, Palmtree, PercentCircle, ReceiptText, Scale, ShieldCheck, UserMinus, Users } from "lucide-react";
import { DashboardIcon, SettingsIcon, UsersIcon } from "../components/icons/icons";
import { UserProfile } from "../context/userProfileContext";
import { authRoles } from "../diccionary/constants";

export type RouteGroup = 'PRINCIPAL' | 'NÓMINA' | 'REPORTES' | 'CONFIGURACIÓN' | 'ADMINISTRACIÓN';

const routesConfig = [
  {
    disable: false,
    icon: DashboardIcon,
    name: "Dashboard",
    href: "/dashboard/all",
    group: 'PRINCIPAL' as RouteGroup,
    roles: [authRoles.super_admin, authRoles.admin, authRoles.moderator, authRoles.user],
    subroutes: [
      { name: "Dashboard", href: "/dashboard/all" },
    ]
  },
  {
    disable: true,
    icon: UsersIcon,
    name: "Users",
    href: "/users/all",
    group: 'PRINCIPAL' as RouteGroup,
    roles: [authRoles.super_admin, authRoles.admin],
    subroutes: [
      { name: "Create User", href: "/users/create" },
      { name: "Edit User", href: "/users/edit" },
    ]
  },
  {
    disable: false,
    icon: LucideBookUser,
    name: "Employees",
    href: "/employees/all",
    group: 'PRINCIPAL' as RouteGroup,
    roles: [authRoles.super_admin, authRoles.admin, authRoles.moderator],
    subroutes: [
      { name: "Create Employee", href: "/employees/create" },
      { name: "Edit Employee", href: "/employees/edit" },
    ]
  },
  {
    disable: false,
    icon: ReceiptText,
    name: "Payrolls",
    href: "/payrolls/all",
    group: 'PRINCIPAL' as RouteGroup,
    roles: [authRoles.super_admin, authRoles.admin, authRoles.moderator],
    subroutes: [
      { name: "Payrolls", href: "/payrolls/all" },
    ]
  },
  {
    disable: false,
    icon: Banknote,
    name: "Sipe",
    href: "/sipe/all",
    group: 'NÓMINA' as RouteGroup,
    roles: [authRoles.super_admin, authRoles.admin, authRoles.moderator],
    subroutes: [
      { name: "Sipe", href: "/sipe/all" },
    ]
  },
  {
    disable: false,
    icon: PercentCircle,
    name: "ISR",
    href: "/isr/all",
    group: 'NÓMINA' as RouteGroup,
    roles: [authRoles.super_admin, authRoles.admin, authRoles.moderator],
    subroutes: [
      { name: "ISR", href: "/isr/all" },
    ]
  },
  {
    disable: false,
    icon: HandCoins,
    name: "Decimo",
    href: "/decimo/all",
    group: 'NÓMINA' as RouteGroup,
    roles: [authRoles.super_admin, authRoles.admin, authRoles.moderator],
    subroutes: [
      { name: "Decimo", href: "/decimo/all" },
    ]
  },
  {
    disable: false,
    icon: Palmtree,
    name: "Vacaciones",
    href: "/vacaciones/all",
    group: 'NÓMINA' as RouteGroup,
    roles: [authRoles.super_admin, authRoles.admin, authRoles.moderator],
    subroutes: [
      { name: "Vacaciones", href: "/vacaciones/all" },
    ]
  },
  {
    disable: false,
    icon: UserMinus,
    name: "Liquidaciones",
    href: "/liquidaciones/all",
    group: 'NÓMINA' as RouteGroup,
    roles: [authRoles.super_admin, authRoles.admin, authRoles.moderator],
    subroutes: [
      { name: "Liquidaciones", href: "/liquidaciones/all" },
    ]
  },
  {
    disable: false,
    icon: Scale,
    name: "Legal",
    href: "/legal/all",
    group: 'REPORTES' as RouteGroup,
    roles: [authRoles.super_admin, authRoles.admin, authRoles.moderator],
    subroutes: [
      { name: "Legal", href: "/legal/all" },
    ]
  },
  {
    disable: false,
    icon: Scale,
    name: "LegalDecimo",
    href: "/legaldecimo/all",
    group: 'REPORTES' as RouteGroup,
    roles: [authRoles.super_admin, authRoles.admin, authRoles.moderator],
    subroutes: [
      { name: "LegalDecimo", href: "/legaldecimo/all" },
    ]
  },
  {
    disable: false,
    icon: SettingsIcon,
    name: "Settings",
    href: "/settings/all",
    group: 'CONFIGURACIÓN' as RouteGroup,
    roles: [authRoles.super_admin, authRoles.admin],
    subroutes: [
      { name: "My Settings", href: "/settings/all" },
    ]
  },
  // --- Panel exclusivo GLOBAL_ADMIN ---
  {
    disable: false,
    icon: LayoutDashboard,
    name: "AdminOverview",
    href: "/admin/overview",
    group: 'ADMINISTRACIÓN' as RouteGroup,
    roles: [authRoles.global_admin],
    subroutes: [
      { name: "Resumen", href: "/admin/overview" },
    ]
  },
  {
    disable: false,
    icon: Building2,
    name: "AdminCompanies",
    href: "/admin/companies",
    group: 'ADMINISTRACIÓN' as RouteGroup,
    roles: [authRoles.global_admin],
    subroutes: [
      { name: "Empresas", href: "/admin/companies" },
    ]
  },
  {
    disable: false,
    icon: Users,
    name: "AdminUsers",
    href: "/admin/users",
    group: 'ADMINISTRACIÓN' as RouteGroup,
    roles: [authRoles.global_admin],
    subroutes: [
      { name: "Usuarios", href: "/admin/users" },
    ]
  },
  {
    disable: false,
    icon: ShieldCheck,
    name: "AdminLicenses",
    href: "/admin/licenses",
    group: 'ADMINISTRACIÓN' as RouteGroup,
    roles: [authRoles.global_admin],
    subroutes: [
      { name: "Licencias", href: "/admin/licenses" },
    ]
  },
];

export default routesConfig;


const getRoutesForRole = (roleKey: keyof typeof authRoles) => {
  const role = authRoles[roleKey];

  if (!role) {
    return [];
  }

  const filteredRoutes = routesConfig.reduce((acc: string[], route) => {
    if (route.roles.includes(role)) {
      acc.push(route.href);

      route.subroutes.forEach(subroute => {
        acc.push(subroute.href);
      });
    }
    return acc;
  }, []);

  return filteredRoutes;
};
export { getRoutesForRole };

const getMainRoutesForRole = (roleKey: keyof typeof authRoles | string) => {
  const role = (authRoles as Record<string, string>)[roleKey] || authRoles.user;
  if (!role) {
    return [];
  }

  const filteredRoutes = routesConfig.filter((route) => route.roles.includes(role) && !route.disable);

  return filteredRoutes;
};

export { getMainRoutesForRole };


export const getUserRoles = (profile: UserProfile) => {
  if (!profile.roles) {
    return ["user"];
  }

  const validRoles = ["global_admin", "super_admin", "admin", "moderator", "user"];

  const rolesArray = profile.roles
    .split(',')
    .map((role) => role.trim().toLowerCase())
    .filter((role) => validRoles.includes(role));

  return rolesArray.length > 0 ? rolesArray : ["user"];
};
