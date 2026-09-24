/**
 * Permission codes the backend actually enforces. Mirrors
 * identity_access/application/catalogue.py: add a code here only once a backend handler
 * checks it. The UI keys off these codes, never off role names or actor_type.
 */
export const IdentityPermission = {
  USER_VIEW: "identity.user.view",
  USER_DISABLE: "identity.user.disable",
  USER_REACTIVATE: "identity.user.reactivate",
  ROLE_VIEW: "identity.role.view",
  ROLE_CREATE: "identity.role.create",
  ROLE_PERMISSION_MANAGE: "identity.role_permission.manage",
  ROLE_ASSIGN: "identity.role.assign",
  ROLE_REVOKE: "identity.role.revoke",
  PERMISSION_VIEW: "identity.permission.view",
} as const;

export type IdentityPermissionCode = (typeof IdentityPermission)[keyof typeof IdentityPermission];

export type PermissionCode = IdentityPermissionCode;
