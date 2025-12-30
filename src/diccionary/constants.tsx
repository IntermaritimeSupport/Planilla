export const constants = {
    roles: [
      { id: 1, name: "SUPER_ADMIN", key: "super_admin" },
      { id: 2, name: "ADMIN", key: "admin" },
      { id: 3, name: "MODERATOR", key: "moderator" },
      { id: 4, name: "USER", key: "user" },
    ],
    statuses: [
      { id: 1, name: "RESOLVED", key: "resolved" },
      { id: 2, name: "IN_PROCESS", key: "in process" },
      { id: 3, name: "STANDBY", key: "standby" },
      { id: 4, name: "PENDING", key: "pending" },
    ],
    ticketPriorities: [
      { id: 1, name: "URGENT", key: "urgent" },
      { id: 2, name: "HIGH", key: "high" },
      { id: 3, name: "MEDIUM", key: "medium" },
      { id: 4, name: "LOW", key: "low" },
      { id: 5, name: "TRIVIAL", key: "trivial" },
    ],
    vacations: [
      { id: 1, name: "APPROVED", key: "approved" },
    ],
};

export const authRoles = {
    super_admin: constants.roles.find((role) => role.id === 1)?.key || "super_admin",
    admin: constants.roles.find((role) => role.id === 2)?.key || "admin",
    moderator: constants.roles.find((role) => role.id === 3)?.key || "moderator",
    user: constants.roles.find((role) => role.id === 4)?.key || "user",
}
  
export const findRoleByKey = (roleKey : string) => {
  const role = constants.roles.find((role) => role.key === roleKey);
  return role || constants.roles.find((role) => role.key === 'user');
};

export const findRole = ({ roleKey, roleId }: { roleKey?: string; roleId?: number }) => {
  const role = constants.roles.find((role) => role.key === roleKey || role.id === roleId);
  return role || constants.roles.find((role) => role.key === 'user');
};