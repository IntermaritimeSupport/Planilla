
// import { TicketIcon } from "lucide-react";
import { SettingsIcon, UsersIcon } from "../components/icons/icons";
// import { DashboardIcon, DevicesIcon, InventoryIcon, MaintenanceIcon, NetworkIcon, ReportsIcon, SettingsIcon, UsersIcon } from "../components/icons/icons";
import { UserProfile } from "../context/userProfileContext";
import { authRoles } from "../diccionary/constants";
import { FaMoneyBill } from "react-icons/fa";

const routesConfig = [
  // {
  //   disable:true,
  //   icon: DashboardIcon,
  //   name: "Dashboard",
  //   href: "/dashboard/all",
  //   roles: [authRoles.super_admin, authRoles.admin, authRoles.moderator, authRoles.user],
  //   subroutes: [
  //     { name: "Dashboard", href: "/dashboard/all" },
  //   ]
  // },
  // {
  //   disable:false,
  //   icon: InventoryIcon,
  //   name: "Inventory",
  //   href: "/inventory/all",
  //   roles: [authRoles.super_admin, authRoles.admin, authRoles.moderator],
  //   subroutes: [
  //     { name: "View Certificates", href: "/inventory/view" },
  //   ]
  // },

  // {
  //   disable:false,
  //   icon: DevicesIcon,
  //   name: "Devices",
  //   href: "/devices/all",
  //   roles: [authRoles.super_admin, authRoles.admin, authRoles.moderator],
  //   subroutes: [
  //     { name: "All devices", href: "/devices/all" },
  //   ]
  // },
  // {
  //   disable:false,
  //   icon: MaintenanceIcon,
  //   name: "Maintenance",
  //   href: "/maintenance/all",
  //   roles: [authRoles.super_admin, authRoles.admin, authRoles.moderator],
  //   subroutes: [
  //     { name: "All maintenance", href: "/maintenance/all" },
  //     { name: "Create maintenance", href: "/maintenance/create" },
  //     { name: "Edit maintenance", href: "/maintenance/edit" },
  //   ]
  // },
  // {
  //   disable:false,
  //   icon: NetworkIcon,
  //   name: "Network",
  //   href: "/network/all",
  //   roles: [authRoles.super_admin, authRoles.admin, authRoles.moderator],
  //   subroutes: [
  //     { name: "All Clients", href: "/network/all" },
  //   ]
  // },
  {
    disable:false,
    icon: UsersIcon,
    name: "Users",
    href: "/users/all",
    roles: [authRoles.super_admin, authRoles.admin, authRoles.moderator],
    subroutes: [
      { name: "Create User", href: "/users/create" },
      { name: "Edit User", href: "/users/edit" },
    ]
  },
  {
    disable:false,
    icon: UsersIcon,
    name: "Employees",
    href: "/employees/all",
    roles: [authRoles.super_admin, authRoles.admin, authRoles.moderator],
    subroutes: [
      { name: "Create Employee", href: "/employees/create" },
      { name: "Edit Employee", href: "/employees/edit" },
    ]
  },
  // {
  //   disable:false,
  //   icon: ReportsIcon,
  //   name: "Reports",
  //   href: "/reports/all",
  //   roles: [authRoles.super_admin, authRoles.admin, authRoles.moderator],
  //   subroutes: [
  //     { name: "Sales Reports", href: "/reports/all" },
  //   ]
  // },
  // {
  //   disable:false,
  //   icon: TicketIcon,
  //   name: "Tickets",
  //   href: "/tickets/all",
  //   roles: [authRoles.super_admin, authRoles.admin, authRoles.moderator],
  //   subroutes: [
  //     { name: "Tickets", href: "/tickets/all" },
  //   ]
  // },
  // {
  //   disable:false,
  //   icon: FaMoneyBill,
  //   name: "Expenses",
  //   href: "/expenses/all",
  //   roles: [authRoles.super_admin, authRoles.admin, authRoles.moderator],
  //   subroutes: [
  //     { name: "Expenses", href: "/expenses/all" },
  //     { name: "Expense Detail", href: "/expenses/edit" },
  //   ]
  // },
  {
    disable:false,
    icon: SettingsIcon,
    name: "Settings",
    href: "/settings/all",
    roles: [authRoles.super_admin, authRoles.admin, authRoles.moderator],
    subroutes: [
      { name: "My Settings", href: "/settings/all" },

    ]
  },
    {
    disable:false,
    icon: FaMoneyBill,
    name: "Payrolls",
    href: "/payrolls/all",
    roles: [authRoles.super_admin, authRoles.admin, authRoles.moderator],
    subroutes: [
      { name: "Payrolls", href: "/payrolls/all" },

    ]
  },
  {
    disable:false,
    icon: FaMoneyBill,
    name: "Sipe",
    href: "/sipe/all",
    roles: [authRoles.super_admin, authRoles.admin, authRoles.moderator],
    subroutes: [
      { name: "Sipe", href: "/sipe/all" },

    ]
  },
  {
    disable:false,
    icon: FaMoneyBill,
    name: "ISR",
    href: "/isr/all",
    roles: [authRoles.super_admin, authRoles.admin, authRoles.moderator],
    subroutes: [
      { name: "ISR", href: "/isr/all" },

    ]
  },
  {
    disable:false,
    icon: FaMoneyBill,
    name: "Decimo",
    href: "/decimo/all",
    roles: [authRoles.super_admin, authRoles.admin, authRoles.moderator],
    subroutes: [
      { name: "Decimo", href: "/decimo/all" },

    ]
  },
  {
    disable:false,
    icon: FaMoneyBill,
    name: "Legal",
    href: "/legal/all",
    roles: [authRoles.super_admin, authRoles.admin, authRoles.moderator],
    subroutes: [
      { name: "Legal", href: "/legal/all" },

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

const getMainRoutesForRole = (roleKey: keyof typeof authRoles) => {
  const role = authRoles[roleKey] || authRoles.user;
  if (!role) {
    return [];
  }

  const filteredRoutes = routesConfig.filter((route) => route.roles.includes(role));

  return filteredRoutes;
};

export { getMainRoutesForRole };


export const getUserRoles = (profile: UserProfile) => {
  if (!profile.roles) {
    return ["user"];
  }

  const validRoles = ["super_admin", "admin", "moderator", "user"];

  // profile.roles es un string, convertir a minúsculas y dividir si contiene múltiples roles
  const rolesArray = profile.roles
    .split(',') // Por si hay múltiples roles separados por comas
    .map((role) => role.trim().toLowerCase())
    .filter((role) => validRoles.includes(role));

  return rolesArray.length > 0 ? rolesArray : ["user"];
};